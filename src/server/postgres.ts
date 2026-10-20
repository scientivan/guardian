import { createHash, randomUUID } from "node:crypto";
import { basename, join } from "node:path";
import { MessageChannel, receiveMessageOnPort, Worker } from "node:worker_threads";
// Keep the worker's external dependency in Next.js serverless file tracing.
import "pg";

// The financial engine is synchronous. Keep its API while executing real Postgres
// queries in a worker. No database files or cached database images are used here.
let worker:Worker|undefined;
function rpc(operation:Record<string,unknown>):unknown {
  if(!worker) {
    worker=new Worker(join(process.cwd(),"src/server/postgres-worker.cjs"),{workerData:{url:process.env.SUPABASE_URL}});
    worker.on("error",error=>{console.error("guardian.database_worker_error",{code:(error as Error&{code?:string}).code??error.name});worker=undefined;});
  }
  worker.unref();
  const {port1,port2}=new MessageChannel();
  const signal=new Int32Array(new SharedArrayBuffer(4));
  worker.postMessage({...operation,signal,reply:port2},[port2]);
  try {
    if(Atomics.wait(signal,0,0,75000)==="timed-out")throw new Error("Postgres operation timed out.");
    const result=receiveMessageOnPort(port1)?.message as {ok:boolean;value?:unknown;error?:string;code?:string}|undefined;
    if(!result?.ok)throw Object.assign(new Error(result?.error??"Postgres operation failed."),{code:result?.code??"POSTGRES_OPERATION_FAILED"});
    return buffers(result.value);
  }finally{port1.close();}
}
function buffers(value:unknown):unknown {
  if(value instanceof Uint8Array)return Buffer.from(value);
  if(Array.isArray(value))return value.map(buffers);
  if(value && typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,buffers(v)]));
  return value;
}
export function postgresEnabled() {return process.env.GUARDIAN_DATABASE_DRIVER==="postgres";}
export function namespaceFor(path:string) {
  const name=basename(path);
  if(name==="access.db")return "guardian_access";
  if(name==="hospital-directory.db")return "guardian_directory";
  if(name==="guardian.db")return "guardian_legacy";
  const key=/^[a-f0-9]{64}\.db$/.test(name)?name.slice(0,-3):createHash("sha256").update(name).digest("hex");
  return `guardian_w_${key.slice(0,40)}`;
}

export class PostgresDatabase {
  readonly id=randomUUID();
  readonly namespace:string;
  open=true;
  constructor(readonly name:string) {
    if(!process.env.SUPABASE_URL?.startsWith("postgres"))throw new Error("SUPABASE_URL must be a server-only PostgreSQL connection string.");
    this.namespace=namespaceFor(name);
    rpc({action:"open",id:this.id,namespace:this.namespace,source:basename(name)});
  }
  exec(sql:string) {rpc({action:"exec",id:this.id,sql});return this;}
  prepare(sql:string) {
    const run=(mode:string,args:unknown[])=>rpc({action:"query",id:this.id,sql,mode,args});
    return {get:(...args:unknown[])=>run("get",args),all:(...args:unknown[])=>run("all",args),run:(...args:unknown[])=>run("run",args)};
  }
  pragma(sql:string) {
    if(sql==="integrity_check")throw new Error("SQLite integrity_check is unavailable for PostgreSQL. Verify imported rows and audit chains instead.");
    if(sql.startsWith("table_info"))return this.prepare(`PRAGMA ${sql}`).all();
    return [];
  }
  transaction<T>(fn:(...args:unknown[])=>T) {
    return (...args:unknown[])=>{
      rpc({action:"begin",id:this.id});
      let value:T;
      try {value=fn(...args);if(value instanceof Promise)throw new Error("Database transaction callbacks must be synchronous.");}
      catch(error){rpc({action:"rollback",id:this.id});throw error;}
      rpc({action:"commit",id:this.id});
      return value;
    };
  }
  close() {if(this.open){rpc({action:"close",id:this.id});this.open=false;}}
}

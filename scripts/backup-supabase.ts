import {mkdirSync,writeFileSync,chmodSync} from "node:fs";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {PostgresDatabase} from "../src/server/postgres";
import {readPrivateFile} from "../src/server/storage";

async function main() {
  const url=new URL(process.env.SUPABASE_URL??"");
  const root=join(process.env.GUARDIAN_BACKUP_DIR??join(process.cwd(),".cache/backups"),new Date().toISOString().replace(/[:.]/g,"-"));
  mkdirSync(join(root,"objects"),{recursive:true,mode:0o700});
  const dump=join(root,"guardian.dump");
  const result=spawnSync(process.env.PG_DUMP_BIN??"pg_dump",["--format=custom","--no-owner","--no-acl","--schema=guardian_*","--file",dump],{encoding:"utf8",env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1),PGSSLMODE:"verify-full",PGSSLROOTCERT:join(process.cwd(),"supabase/certs/prod-ca-2021.crt")}});
  if(result.status!==0)throw Error("Postgres backup failed. Check pg_dump availability/version and database connectivity. No successful backup is claimed.");
  chmodSync(dump,0o600);
  const db=new PostgresDatabase("access.db");
  const manifest:Record<string,{file:string;sha256:string}>={};
  try {
    const tables=db.prepare("SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema LIKE 'guardian_%' AND table_name IN ('web_uploads','request_invoices')").all() as {table_schema:string;table_name:string}[];
    for(const table of tables) {
      if(!/^[a-z0-9_]+$/.test(table.table_schema))throw Error("Invalid backup schema");
      const columns=db.prepare("SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=?").all(table.table_schema,table.table_name) as {column_name:string}[];
      if(!columns.some(c=>c.column_name==="storage_key"))continue;
      const prefix=`"${table.table_schema}"`;
      const sql=table.table_name==="web_uploads"?`SELECT u.storage_key,d.sha256 FROM ${prefix}.web_uploads u JOIN ${prefix}.documents d ON d.id=u.document_id WHERE u.storage_key IS NOT NULL`:`SELECT storage_key,sha256 FROM ${prefix}.request_invoices WHERE storage_key IS NOT NULL`;
      const objects=db.prepare(sql).all() as {storage_key:string;sha256:string}[];
      for(const object of objects) {
        if(manifest[object.storage_key])continue;
        const file=`${createHash("sha256").update(object.storage_key).digest("hex")}.bin`;
        writeFileSync(join(root,"objects",file),await readPrivateFile(object.storage_key,object.sha256),{mode:0o600});
        manifest[object.storage_key]={file,sha256:object.sha256};
      }
    }
  }finally{db.close();}
  writeFileSync(join(root,"objects.json"),JSON.stringify(manifest,null,2),{mode:0o600});
  console.log(JSON.stringify({postgresDump:true,verifiedObjects:Object.keys(manifest).length,directory:root}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

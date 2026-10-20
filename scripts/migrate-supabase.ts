import Database from "better-sqlite3";
import {createHash} from "node:crypto";
import {existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from "node:fs";
import {join,basename} from "node:path";
import {PostgresDatabase} from "../src/server/postgres";
import {ensurePrivateBucket,putPrivateFile,readPrivateFile} from "../src/server/storage";
import {verifyChain} from "../src/server/audit";
import type {DB} from "../src/server/db";

const ident=(s:string)=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error("Unexpected identifier");return `"${s}"`;};
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
type Row=Record<string,unknown>;
async function main() {
  if(process.env.GUARDIAN_DATABASE_DRIVER!=="postgres"||process.env.GUARDIAN_STORAGE_DRIVER!=="supabase")throw Error("Explicit postgres and supabase drivers are required.");
  await ensurePrivateBucket();
  const dir=process.env.GUARDIAN_ACCOUNTS_DIR??join(process.cwd(),".cache/accounts");
  const backups=join(process.cwd(),".cache/supabase-backups",new Date().toISOString().replace(/[:.]/g,"-"));
  mkdirSync(backups,{recursive:true,mode:0o700});
  const files=readdirSync(dir).filter(f=>f.endsWith(".db")).map(f=>join(dir,f));
  if(existsSync("guardian.db"))files.push(join(process.cwd(),"guardian.db"));
  const report:unknown[]=[];
  for(const file of files) {
    const live=new Database(file,{readonly:true});
    const backup=join(backups,basename(file));
    await live.backup(backup);live.close();
    const source=new Database(backup,{readonly:true});
    if(source.pragma("integrity_check",{simple:true})!=="ok")throw Error("Source integrity check failed");
    const tables=source.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all() as {name:string;sql:string}[];
    const rows=new Map(tables.map(t=>[t.name,source.prepare(`SELECT rowid AS _legacy_rowid,* FROM ${ident(t.name)} ORDER BY rowid`).all() as Row[]]));
    const digest=hash([...rows]);
    const target=new PostgresDatabase(file);
    target.exec(readFileSync("supabase/migrations/20261020091328_guardian_cloud_bootstrap.sql","utf8"));
    const completed=target.prepare("SELECT source_digest FROM guardian_meta.migration_runs WHERE source_key=?").get(basename(file)) as {source_digest:string}|undefined;
    if(completed) {
      if(completed.source_digest!==digest)throw Error("Local source changed after import. Refusing to overwrite cloud data.");
      report.push({source:basename(file),status:"already-imported"});source.close();target.close();continue;
    }
    const fileRows=new Map<string,Row[]>();
    for(const t of tables) {
      if(!["web_uploads","request_invoices"].includes(t.name))continue;
      const migrated:Row[]=[];
      for(const row of rows.get(t.name)!) {
        const bytes=row.bytes as Buffer;
        if(!bytes?.length){migrated.push(row);continue;}
        const id=String(row.document_id??row.id);
        const scope=`migration/${target.namespace}`;
        const key=await putPrivateFile(scope,bytes,String(row.mime),`${t.name}-${id}`);
        const sha=createHash("sha256").update(bytes).digest("hex");
        if(!key||!(await readPrivateFile(key,sha)).equals(bytes))throw Error("Storage verification failed");
        migrated.push({...row,bytes:Buffer.alloc(0),storage_key:key});
      }
      fileRows.set(t.name,migrated);
    }
    const counts:Record<string,number>={};
    target.transaction(()=>{
      for(const t of tables) {
        target.exec(t.sql.replace(/^CREATE TABLE /,"CREATE TABLE IF NOT EXISTS "));
        const cols=new Set((target.prepare(`PRAGMA table_info(${t.name})`).all() as {name:string}[]).map(c=>c.name));
        if(fileRows.has(t.name)&&!cols.has("storage_key"))target.exec(`ALTER TABLE ${t.name} ADD COLUMN storage_key TEXT`);
        const existing=target.prepare(`SELECT COUNT(*) AS n FROM ${t.name}`).get() as {n:number};
        if(existing.n)throw Error("Import destination is not empty. Refusing to overwrite existing data.");
        for(const row of fileRows.get(t.name)??rows.get(t.name)!) {
          const { _legacy_rowid,...data}=row;
          const values={...data,rowid:_legacy_rowid};
          target.prepare(`INSERT INTO ${t.name} (${Object.keys(values).map(ident).join(",")}) VALUES (${Object.keys(values).map(()=>"?").join(",")})`).run(...Object.values(values));
        }
        const columns=source.prepare(`PRAGMA table_info(${t.name})`).all() as {name:string}[];
        const names=columns.map(c=>c.name);
        const actual=target.prepare(`SELECT rowid AS _legacy_rowid,${names.map(ident).join(",")} FROM ${t.name} ORDER BY rowid`).all() as Row[];
        const expected=fileRows.get(t.name)??rows.get(t.name)!;
        // Compare the original columns, with the verified external file bytes removed.
        const canonical=(items:Row[])=>items.map(row=>Object.fromEntries(["_legacy_rowid",...names].map(k=>[k,row[k]])));
        if(hash(canonical(actual))!==hash(canonical(expected)))throw Error(`Row verification failed for ${t.name}`);
        counts[t.name]=actual.length;
        const identities=target.prepare("SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=? AND is_identity='YES'").all(target.namespace,t.name) as {column_name:string}[];
        for(const col of identities)target.prepare(`SELECT setval(pg_get_serial_sequence(?,?),COALESCE(MAX(${ident(col.column_name)}),1),COUNT(*)>0) FROM ${t.name}`).get(`${target.namespace}.${t.name}`,col.column_name);
      }
      if(tables.some(t=>t.name==="audit_log")&&verifyChain(target as unknown as DB)!==null)throw Error("Imported audit chain verification failed");
      target.prepare("INSERT INTO guardian_meta.migration_runs (source_key,source_digest,target_namespace,verification) VALUES (?,?,?,?::jsonb)").run(basename(file),digest,target.namespace,JSON.stringify(counts));
    })();
    report.push({source:basename(file),status:"verified",counts});
    source.close();target.close();
    console.log(JSON.stringify({source:basename(file),status:"verified",tables:tables.length}));
  }
  writeFileSync(join(backups,"verification.json"),JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify({complete:true,databases:report.length,backupDirectory:backups}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

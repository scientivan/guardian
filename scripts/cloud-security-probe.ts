import {PostgresDatabase} from "../src/server/postgres";
import assert from "node:assert/strict";
async function main() {
  const db=new PostgresDatabase("guardian-cloud-verification.db");
  try {
    const permissions=db.prepare("SELECT has_schema_privilege('anon',?,'USAGE') AS anon,has_schema_privilege('authenticated',?,'USAGE') AS authenticated").get(db.namespace,db.namespace) as {anon:boolean;authenticated:boolean};
    assert.deepEqual(permissions,{anon:false,authenticated:false});
    const tables=db.prepare("SELECT bool_and(c.relrowsecurity) AS protected FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=? AND c.relkind='r'").get(db.namespace) as {protected:boolean};
    assert.equal(tables.protected,true);
    const object=db.prepare("SELECT storage_key FROM request_invoices WHERE storage_key IS NOT NULL LIMIT 1").get() as {storage_key:string};
    const response=await fetch(`${process.env.SUPABASE_PROJECT_URL}/storage/v1/object/public/guardian-private/${object.storage_key}`);
    assert.ok(!response.ok,"Unauthenticated public object access must fail");
    console.log(JSON.stringify({anonSchemaAccess:false,authenticatedSchemaAccess:false,allTablesRls:true,publicObjectStatus:response.status}));
  }finally{db.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

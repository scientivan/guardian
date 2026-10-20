import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {openDb} from "../../src/server/db";
import {seed} from "../../src/server/seed";
import {extract} from "../../src/server/extract";
import {scrubCase} from "../../src/server/pii";
import {analyse} from "../../src/server/analysis";
import {secondCheck} from "../../src/server/secondcheck";
import {INTERIM_ITEMS} from "../../src/server/fixtures/demo-case";
async function main(){
 delete process.env.LLM_CACHE_DIR;
 const db=openDb(":memory:");seed(db);
 try{
  const docs=JSON.parse(readFileSync("evidence/live-services-2026-10-20/reader-output.json","utf8")) as {type:string;meta:Record<string,unknown>}[];
  const text=await extract(readFileSync("fixtures/pdf/interim-bill.pdf"),"application/pdf");assert(text.ok);
  const raw=scrubCase(db,"C1",text.text).text;
  for(const d of docs){const id=d.type==="estimate"?"LE":d.type==="interim"?"LI":"LF";db.prepare("INSERT INTO documents (id,case_id,type,sha256,meta,scrubbed_text,created_at) VALUES (?,'C1',?,'live-reconstructed',?,?,?)").run(id,d.type,JSON.stringify(d.meta),d.type==="interim"?raw:null,new Date().toISOString());}
  const insert=db.prepare("INSERT INTO bill_items (document_id,code,category,description,qty,unit_price) VALUES ('LI',?,?,?,?,?)");for(const i of INTERIM_ITEMS)insert.run(i.id,i.category,i.description,i.qty,i.unitPrice);
  const a=analyse(db,"C1","LI");assert(!("error" in a));
  const responseModelIds:string[]=[];
  const liveFetch:typeof fetch=async(input,init)=>{const response=await fetch(input,init);if(response.ok){const body=await response.clone().json() as {model?:string};if(body.model)responseModelIds.push(body.model);}return response;};
  const interactive=process.argv.includes("--interactive");const started=Date.now();
  const result=await secondCheck(db,a,[],{totalTimeoutMs:interactive?15000:180000,waitForCooldownMs:interactive?0:70000,fetchImpl:liveFetch});
  const first=String(docs.find(d=>d.type==="interim")!.meta.reader);
  const pass=Boolean(result.model&&result.checked.length>0&&result.model.split(":")[0]!==first.split(":")[0]);
  const report={interactiveBudgetMs:interactive?15000:180000,elapsedMs:Date.now()-started,responseModelIds,at:new Date().toISOString(),cache:"disabled",firstModel:first,pass,scope:"Live independent re-reading of the same PDF, compared to the verified live first-reader fields. Typed items reconstructed from matching fixture after the temporary first-reader DB was removed.",...result};
  writeFileSync(interactive?"evidence/live-services-2026-10-20/interactive-second-model.json":"evidence/live-services-2026-10-20/independent-second-model.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));if(!pass)process.exitCode=1;
 }finally{db.close()}
}
main().catch(e=>{console.error(e instanceof Error?e.name:"Live verification failed");process.exitCode=1});

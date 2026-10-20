import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {caseAccess} from "../../src/server/access";
import {Integration} from "../../src/server/integration";
import {analyse} from "../../src/server/analysis";
import {explain} from "../../src/server/explain";
import type {Session} from "next-auth";
import {spendsModelQuota} from "../../src/server/rate-limit";
import {storeTokens,scrub,restore} from "../../src/server/pii";
async function main(){
const dir=mkdtempSync(join(tmpdir(),"guardian-doc-audit-"));process.env.GUARDIAN_ACCOUNTS_DIR=dir;process.env.FISCO_BCOS_RPC_URL="";process.env.GROQ_API_KEY="audit-fake";process.env.LLM_CHAIN="groq:audit";
const session:Session={user:{id:"demo:docs-audit",name:"Rina",mode:"demo"},expires:"2099-01-01"};
const c=caseAccess(session,"C1","M_OWNER");const api=new Integration(c);
try{
const paid=api.view().requests.find(r=>r.status==="paid")!;
const invoice=await api.addInvoice(paid.id,new File(["PATIENT MEDICAL DETAIL SYNTHETIC"],"invoice.pdf",{type:"application/pdf"}));
const q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});await api.execute("R2");
const payer=caseAccess(session,"C1","M_JKT");try{const p=new Integration(payer);console.log(JSON.stringify({probe:"payer_projection",systemRows:p.view().audit.rows.filter(r=>r.actor==="gateway"&&JSON.stringify((r as typeof r & {result:Record<string,unknown>}).result).includes("M_")).map(r=>({action:r.action,result:(r as typeof r & {result:Record<string,unknown>}).result})),invoiceBytes:p.invoiceFile(paid.id,invoice.id).bytes.toString()}));}finally{payer.close()}
const analysis=analyse(c.db,"C1","D2");if("error" in analysis)throw Error(analysis.error);
const target=analysis.causes.find(x=>x.cause.kind==="longer_stay")!;
const fake:typeof fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({lines:[{type:"arithmetic_fact",causeRef:target.ref,itemIds:target.itemIds,text:"The stay is 5 days longer, adding CNY 34,000."},{type:"unknown_ask_hospital",itemIds:target.itemIds,text:"The patient has cancer."}]})}}]}));
const explained=await explain(analysis,"en",{fetchImpl:fake});console.log(JSON.stringify({probe:"explanation_guard",accepted:explained.lines.filter(l=>l.text.includes("34,000")||l.text.includes("cancer")),actualCause:target.cause}));
c.db.prepare("UPDATE payment_requests SET status=\u0027cancelled\u0027 WHERE status=\u0027pending\u0027").run();
api.reconcile("D3");
await api.addInvoice("R2",new File(["SYNTHETIC RECEIPT"],"receipt.pdf",{type:"application/pdf"}));await api.closeCase();
const before=c.db.prepare("SELECT COUNT(*) n FROM audit_log").get();
const realNow=Date.now;Date.now=()=>realNow()+15*86400000;
try {api.view();const after=c.db.prepare("SELECT COUNT(*) n FROM audit_log").get();console.log(JSON.stringify({probe:"closed_case_get_after_15_days",before,after,last:api.view().audit.rows.at(-1)?.action}));}finally{Date.now=realNow}
console.log(JSON.stringify({probe:"quota_get",getLimited:spendsModelQuota("GET",["cases","C1","explanation"]),postLimited:spendsModelQuota("POST",["cases","C1","explanation"])}));
let prompt="";
const chatApi=new Integration(c,{fetchImpl:async(_url,init)=>{prompt=String(init?.body);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({intent:"other",language:"en"})}}]}));}});
await chatApi.chat("Budi Santoso needs help");
console.log(JSON.stringify({probe:"chat_name_redaction",patientNameReachedModel:prompt.includes("Budi Santoso")}));
storeTokens(c.db,"C1",scrub("alpha@example.com"));try{storeTokens(c.db,"C1",scrub("beta@example.com"));}catch{console.log(JSON.stringify({probe:"legacy_token_collision_rejected",rejected:true}));}console.log(JSON.stringify({probe:"token_collision",first:scrub("alpha@example.com").text,second:scrub("beta@example.com").text,restored:restore(c.db,"C1","[EMAIL_1]","owner")}));
}finally{c.close();rmSync(dir,{recursive:true,force:true})}}
main().catch(e=>{console.error(e);process.exit(1)});

import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import assert from "node:assert/strict";
import {ownerDatabase} from "../src/server/workspace";
import {verifyChain} from "../src/server/audit";
import {createQuote} from "../src/server/fx";
import {recordApproval} from "../src/server/gateway";
import {executeRequest} from "../src/server/payments";
import {openRefunds} from "../src/server/refunds";

async function main() {
  const owner=`demo:concurrency-${randomUUID()}`;
  const code=`const {ownerDatabase,WorkspaceStore}=require('./src/server/workspace.ts');const {appendAudit}=require('./src/server/audit.ts');const db=ownerDatabase(process.env.GUARDIAN_PROBE_OWNER);new WorkspaceStore(db,'demo','Concurrency verification');for(let i=0;i<5;i++)appendAudit(db,{caseId:'C1',actor:'verification',action:'concurrency.probe',inputSources:['system'],decision:'info',result:{}});db.close();`;
  const run=()=>new Promise<void>((resolve,reject)=>{
    const child=spawn(process.execPath,["--import","tsx","-e",code],{env:{...process.env,GUARDIAN_PROBE_OWNER:owner},stdio:["ignore","ignore","pipe"]});
    let stderr="";child.stderr.on("data",chunk=>{stderr+=chunk.toString();});child.on("error",reject);child.on("exit",status=>status===0?resolve():reject(new Error(`Concurrent worker failed ${stderr.slice(0,1200)}`)));
  });
  await Promise.all([run(),run()]);
  const db=ownerDatabase(owner);
  try {
    const count=db.prepare("SELECT COUNT(*) AS n FROM bill_items WHERE document_id='D2'").get() as {n:number};
    const probes=db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='concurrency.probe'").get() as {n:number};
    assert.equal(count.n,40);assert.equal(probes.n,10);assert.equal(verifyChain(db),null);
    const quote=createQuote(db,"R2","M_OWNER",500000,new Date());
    assert.equal(db.transaction(()=>recordApproval(db,"R2","M_OWNER",500000,quote.id))().ok,true);
    const payment=await executeRequest(db,"R2","M_OWNER",async()=>({ok:true,ref:`verification-${randomUUID()}`}));
    assert.equal(payment.status,"paid");
    const refund=openRefunds(db,"C1","D3");
    assert.equal(refund.ok,true);assert.equal(refund.refund,900000);
    assert.equal(verifyChain(db),null);
    console.log(JSON.stringify({concurrentProcesses:2,seededItems:count.n,appendedAuditRows:probes.n,auditChain:true,paymentStatus:payment.status,refund:refund.refund}));
  }finally{db.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

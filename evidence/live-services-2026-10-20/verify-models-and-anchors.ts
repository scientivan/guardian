import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Session } from "next-auth";
import { Contract, Interface, JsonRpcProvider } from "ethers";
import { PDFDocument } from "pdf-lib";
import { openDb } from "../../src/server/db";
import { seed } from "../../src/server/seed";
import { ingestDocument } from "../../src/server/documents";
import { analyse } from "../../src/server/analysis";
import { explain } from "../../src/server/explain";
import { secondCheck } from "../../src/server/secondcheck";
import { handleMessage } from "../../src/server/agent";
import { INTERIM_ITEMS } from "../../src/server/fixtures/demo-case";
import { D2_KEY } from "../../src/server/fixtures/answer-keys";
import { caseAccess } from "../../src/server/access";
import { Integration } from "../../src/server/integration";
import { openHospitalDirectory } from "../../src/server/hospital-directory";
import { verifyChain } from "../../src/server/audit";

// Explicit live verification. Calls models without a response cache and writes local-chain anchors.
// Payments in this runner use the demo sandbox only. Email is tested in a separate runner.
const dir = "evidence/live-services-2026-10-20";
const runId = randomUUID();
const results: { stage:string; pass:boolean; detail:unknown }[] = [];
mkdirSync(dir,{recursive:true});
const save = () => writeFileSync(join(dir,process.argv.includes("--directory-only")?"directory-anchor.json":"models-and-anchors.json"),JSON.stringify({runId,at:new Date().toISOString(),cache:"disabled",results},null,2)+"\n");
function record(stage:string,pass:boolean,detail:unknown) {results.push({stage,pass,detail});save();console.log(JSON.stringify({stage,pass,detail}));}
async function step(stage:string,run:()=>Promise<unknown>) {
  if(process.argv.includes("--directory-only") && stage!=="directory_verification_anchor")return;
  if(process.argv.includes("--models-only") && !stage.startsWith("live_"))return;
  console.log(`START ${stage}`);
  try {record(stage,true,await run());}
  catch(error) {
    let message=error instanceof Error?error.message:"Unknown failure";
    for(const [key,value] of Object.entries(process.env))if(value && /KEY|PASSWORD|SECRET/.test(key))message=message.split(value).join("[REDACTED]");
    record(stage,false,{error:message.slice(0,500)});
  }
}
async function uniquePdf(name:string) {
  const doc=await PDFDocument.load(readFileSync(`fixtures/pdf/${name}.pdf`));
  doc.setSubject(`Guardian synthetic live verification ${runId}`);
  doc.setModificationDate(new Date());
  return new Uint8Array(await doc.save());
}
async function main() {
  delete process.env.LLM_CACHE_DIR;
  const accounts=mkdtempSync(join(tmpdir(),"guardian-live-anchors-"));
  process.env.GUARDIAN_ACCOUNTS_DIR=accounts;
  const db=openDb(":memory:");seed(db);
  const provider=new JsonRpcProvider(process.env.FISCO_BCOS_RPC_URL,Number(process.env.FISCO_BCOS_CHAIN_ID??20200),{staticNetwork:true});
  const contract=new Contract(process.env.FISCO_BCOS_CONTRACT_ADDRESS!,["function anchoredAt(bytes32) view returns (uint256)"],provider);
  const events=new Interface(["event Anchored(bytes32 indexed hash, string kind, address indexed by, uint256 at)"]);
  const documentAnchors:{hash:string;tx:string|null;kind:string}[]=[];
  async function verifyAnchor(hash:string,tx:string|null|undefined,kind:string) {
    assert(tx && /^0x[\da-f]{64}$/i.test(tx),"Expected an actual new transaction hash");
    const receipt=await provider.getTransactionReceipt(tx);
    assert.equal(receipt?.status,1,"Transaction must have status 1");
    const event=receipt!.logs.filter(l=>l.address.toLowerCase()===String(process.env.FISCO_BCOS_CONTRACT_ADDRESS).toLowerCase()).map(l=>{try{return events.parseLog(l);}catch{return null;}}).find(l=>l?.name==="Anchored" && l.args.hash===`0x${hash}` && l.args.kind===kind);
    assert(event,"Matching hash and kind must appear in the contract event");
    const anchoredAt=await contract.anchoredAt(`0x${hash}`) as bigint;
    assert(anchoredAt>BigInt(0),"Contract mapping must contain the hash");
    return {hash,tx,kind,status:receipt!.status,blockNumber:receipt!.blockNumber,anchoredAt:anchoredAt.toString(),eventMatches:true};
  }
  try {
    let interimId="";
    await step("live_reader",async()=>{
      const docs=[];
      for(const [file,type] of [["estimate","estimate"],["interim-bill","interim"],["final-bill","final"]] as const) {
        console.log(`READ ${file}`);
        const r=await ingestDocument(db,{caseId:"C1",actor:"M_COMP",type,data:await uniquePdf(file),mime:"application/pdf",interactive:true,anchor:!process.argv.includes("--models-only")});
        assert.equal(r.status,"parsed",r.reason);
        const meta=JSON.parse((db.prepare("SELECT meta FROM documents WHERE id=?").get(r.documentId) as {meta:string}).meta);
        docs.push({type,model:meta.reader,documentId:r.documentId,status:r.status,meta});
        writeFileSync(join(dir,"reader-output.json"),JSON.stringify(docs,null,2)+"\n");
        documentAnchors.push({hash:r.sha256,tx:r.anchoredTx,kind:`document:${type}`});
        if(type==="interim")interimId=r.documentId;
        if(type==="estimate"){assert.equal(meta.estimateLow,3000000);assert.equal(meta.estimateHigh,3400000);assert.equal(meta.assumedStayDays,3);}
        if(type==="final")assert.equal(meta.statedTotal,7100000);
      }
      const a=analyse(db,"C1",interimId);assert(!("error" in a),"Analysis must be available");
      assert.equal(a.items.length,40);assert.equal(a.comparison.total,D2_KEY.total);
      const mismatches=a.items.filter(i=>{const expected=INTERIM_ITEMS.find(f=>f.id===i.code);return !expected || expected.category!==i.category || expected.qty!==i.qty || expected.unitPrice!==i.unitPrice;}).map(i=>i.code);
      assert.deepEqual(mismatches,[]);
      const key=(value:object)=>JSON.stringify(Object.entries(value).sort());
      assert.equal(a.causes.length,D2_KEY.causes.length);assert(D2_KEY.causes.every(expected=>a.causes.some(c=>key(c.cause)===key(expected))),"Computed causes must match the key, independent of array order");
      return {documents:docs,itemsMatched:40,total:a.comparison.total,causesMatched:5,mismatches};
    });
    await step("live_independent_second_model",async()=>{
      const a=analyse(db,"C1",interimId);assert(!("error" in a));
      const sc=await secondCheck(db,a,[],{totalTimeoutMs:110000,waitForCooldownMs:0});
      assert(sc.model && sc.checked.length>0,sc.skipped??"Independent check did not run");
      const meta=JSON.parse((db.prepare("SELECT meta FROM documents WHERE id=?").get(interimId) as {meta:string}).meta);
      assert.notEqual(sc.model.split(":")[0],String(meta.reader).split(":")[0]);
      writeFileSync(join(dir,"second-model.json"),JSON.stringify(sc,null,2)+"\n");
      return {firstModel:meta.reader,secondModel:sc.model,checked:sc.checked,disagreements:sc.disagreements};
    });
    await step("live_explanation",async()=>{
      const a=analyse(db,"C1",interimId);assert(!("error" in a));
      const e=await explain(a,"en",{totalTimeoutMs:60000});
      assert(e.model,"A live planner model must answer");
      assert.equal(e.total,D2_KEY.total);assert.equal(e.lines.filter(l=>l.type==="arithmetic_fact").length,5);
      assert(e.lines.every(l=>l.itemIds.length>0));assert(!D2_KEY.forbiddenClaims.some(re=>re.test(e.lines.map(l=>l.text).join(" "))));
      writeFileSync(join(dir,"explanation.json"),JSON.stringify(e,null,2)+"\n");
      return {model:e.model,total:e.total,arithmeticCauses:5,citedLines:e.lines.length,noForbiddenClinicalClaim:true};
    });
    await step("live_chat_clarification",async()=>{
      const r=await handleMessage(db,"C1","M_OWNER","bayarin aja yg kemarin dong");
      assert(r.model,"A live classification model must answer");
      assert(r.actions.some(a=>a.type==="ask_clarification"));assert(!r.actions.some(a=>a.type==="prepare_payment"));
      return r;
    });
    await step("document_anchors",async()=>{
      assert.equal(documentAnchors.length,3);const verified=[];
      for(const a of documentAnchors)verified.push(await verifyAnchor(a.hash,a.tx,a.kind));
      return {chainId:(await provider.getNetwork()).chainId.toString(),network:"Configured local FISCO BCOS, not a public explorer",verified};
    });
    await step("invoice_payment_and_closing_anchors",async()=>{
      const session:Session={user:{id:`demo:live-anchor-${runId}`,name:"Rina",mode:"demo"},expires:"2099-01-01"};
      const c=caseAccess(session,"C1","M_OWNER");
      try {
        const api=new Integration(c);const q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});
        const executed=await api.execute("R2");assert.equal(executed.status,"paid");
        const verified=[await verifyAnchor(executed.anchor!.hash!,executed.anchor!.tx,"audit:C1")];
        for(const id of ["R1","R2"]) {
          const pdf=await PDFDocument.create();pdf.addPage().drawText(`Synthetic payment receipt ${runId} ${id}. No real hospital settlement.`);
          const invoice=await api.addInvoice(id,new File([new Uint8Array(await pdf.save())],`${id}-receipt.pdf`,{type:"application/pdf"}));
          verified.push(await verifyAnchor(invoice.sha256,invoice.anchoredTx,`invoice:${id}`));
        }
        const closure=(await api.closeCase()).case.closed!;
        verified.push(await verifyAnchor(closure.packSha256!,closure.packTx,"closing:C1"));
        verified.push(await verifyAnchor(closure.auditHash!,closure.auditTx,"audit:C1"));
        assert.equal(verifyChain(c.db),null);
        return {paymentAdapter:"demo sandbox, no Stripe network charge",closed:true,localAuditIntact:true,verified};
      } finally {c.close();}
    });
    await step("directory_verification_anchor",async()=>{
      const directory=openHospitalDirectory();
      const admin:Session={user:{id:`verifier-${runId}`,name:"Synthetic Verification Operator",email:"verifier@example.invalid",mode:"google"},expires:"2099-01-01"};
      const original=process.env.GUARDIAN_ADMIN_EMAILS;process.env.GUARDIAN_ADMIN_EMAILS=admin.user.email!;
      try {
        const profile={name:"Synthetic Verification Hospital",branch:"Synthetic campus",country:"China",city:"Shenzhen",address:"1 Synthetic Avenue",phone:"+86 755 12345678",website:"https://hospital.example",billingEmail:"billing@hospital.example",billingPhone:"+86 755 12345679"};
        const source={url:"https://authority.example/institutions/synthetic",title:"Synthetic test evidence",retrievedAt:new Date().toISOString(),excerpt:"Synthetic institutional evidence. No real confirmation occurred."};
        const review=directory.propose(admin,{payload:profile,sources:[source]});
        directory.decide(admin,review.id,{decision:"approve",notes:"Synthetic operator test only. No real hospital identity or ownership was confirmed.",proof:{confirmationChannel:profile.phone,independentSource:source.url,notes:"Synthetic operator attestation for software-path verification only. No call occurred and no real institution is approved.",identityChecked:true,ownershipChecked:true,recovery:false}});
        const record=directory.verifications(review.hospitalId)[0];
        await directory.anchor(admin,record.id);
        const updated=directory.verifications(review.hospitalId)[0];
        return {scope:"Synthetic institution in temporary directory, no real human confirmation",...await verifyAnchor(updated.hash,updated.tx,"hospital.verification")};
      }finally{process.env.GUARDIAN_ADMIN_EMAILS=original;directory.close();}
    });
  }finally{db.close();provider.destroy();rmSync(accounts,{recursive:true,force:true});save();}
  if(results.some(r=>!r.pass))process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.name:"Verification failed");save();process.exitCode=1;});

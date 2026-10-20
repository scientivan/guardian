import {openDb} from "../src/server/db";
import {WorkspaceStore} from "../src/server/workspace";
import {Integration} from "../src/server/integration";
import {verifyChain} from "../src/server/audit";
import {readPrivateFile,uploadTicket,uploadedFile} from "../src/server/storage";
import {extract} from "../src/server/extract";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import type {CaseAccess} from "../src/server/access";

async function main() {
  const db=openDb("guardian-cloud-verification.db");
  try {
    const store=new WorkspaceStore(db,"demo","Cloud verification");
    const member=store.view("C1").case.members.find(m=>m.role==="owner")!;
    const c:CaseAccess={db,store,caseId:"C1",ownerId:"cloud-verification",member,session:{user:{id:"cloud-verification",name:"Verification",mode:"demo"},expires:"2099-01-01"},close:()=>db.close()};
    const api=new Integration(c);
    const paid=api.view().requests.find(r=>r.status==="paid")!;
    const file=new File([Buffer.from("%PDF-1.4 private storage verification")],"verification.pdf",{type:"application/pdf"});
    const invoice=await api.addInvoice(paid.id,file);
    const stored=await api.invoiceFile(paid.id,invoice.id);
    assert.equal(stored.bytes.toString(),await file.text());
    assert.ok(stored.storage_key);
    assert.equal((db.prepare("SELECT length(bytes) AS n FROM request_invoices WHERE id=?").get(invoice.id) as {n:number}).n,0);
    assert.equal(verifyChain(db),null);
    const large=Buffer.alloc(5*1024*1024,65);
    const ticket=await uploadTicket("verification","verification-user","cases/C1/documents",{name:"large.pdf",mime:"application/pdf",size:large.length});
    const put=await fetch(ticket.signedUrl,{method:"PUT",headers:{"Content-Type":"application/pdf","x-upsert":"false"},body:large});
    assert.ok(put.ok,`Signed upload returned ${put.status}`);
    await assert.rejects(()=>uploadedFile(ticket.receipt,"other-user","cases/C1/documents"));
    await assert.rejects(()=>uploadedFile(ticket.receipt,"verification-user","payment-requests/R1/invoices"));
    const result=await uploadedFile(ticket.receipt,"verification-user","cases/C1/documents");
    assert.ok(Buffer.from(await result.arrayBuffer()).equals(large));
    assert.ok((await readPrivateFile(stored.storage_key,invoice.sha256)).equals(stored.bytes));
    process.env.VERCEL="1";
    const ocr=await extract(readFileSync("evidence/integration-2026-10-20/bill-review.png"),"image/png");
    assert.ok(ocr.ok,"Bundled OCR must read the test image");
    console.log(JSON.stringify({postgres:true,invoiceRoundTrip:true,databaseBlobBytes:0,auditChain:true,signedUploadBytes:large.length,wrongUserRejected:true,wrongRouteRejected:true,bundledOcr:ocr.ok}));
  }finally{db.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { caseAccess, invite, invitation } from "./access";
import { Integration } from "./integration";
import { ownerDatabase, WorkspaceStore } from "./workspace";
import { INTERIM_ITEMS, PATIENT } from "./fixtures/demo-case";

let dir:string;
const demo:Session={user:{id:"demo:integration",name:"Rina",mode:"demo"},expires:"2099-01-01"};
const google=(id:string,email:string):Session=>({user:{id,name:id,email,mode:"google"},expires:"2099-01-01"});
beforeEach(()=>{dir=mkdtempSync(join(tmpdir(),"guardian-integration-"));vi.stubEnv("GUARDIAN_ACCOUNTS_DIR",dir);vi.stubEnv("LLM_CHAIN","groq:test");vi.stubEnv("GROQ_API_KEY","test");vi.stubEnv("FISCO_BCOS_RPC_URL","");vi.stubEnv("FISCO_BCOS_PRIVATE_KEY","");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();rmSync(dir,{recursive:true,force:true});});

async function withCase<T>(member:string,run:(api:Integration)=>Promise<T>|T) {const c=caseAccess(demo,"C1",member);try{return await run(new Integration(c));}finally{c.close();}}
const model=(value:object)=>(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}))) as typeof fetch;

function readerFetch(suspicious=false,seen:string[]=[]) {
 return (async(_url:unknown,init?:RequestInit)=>{
  const body=JSON.parse(String(init?.body));const prompt=body.messages[0].content as string;seen.push(JSON.stringify(body));
  let value:unknown;
  if(prompt.includes("data extraction component"))value={docType:"interim",currency:"CNY",items:INTERIM_ITEMS.map(i=>({code:i.id,category:i.category,description:i.description,qty:i.qty,unitPrice:String(i.unitPrice/100)})),statedTotal:"36782",assumedStayDays:null,actualStayDays:5,estimateLow:null,estimateHigh:null,estimateByCategory:[],exclusions:[],statedReasons:["Antibiotic course extended to 5 days"],payeeMentions:[],suspiciousInstructions:suspicious};
  else value={lines:[]};
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));
 }) as typeof fetch;
}

describe("frontend backend service integration",()=>{
 it("projects progress and quotes from the core ledger",async()=>{await withCase("M_OWNER",api=>{const r=api.view().requests.find(r=>r.id==="R2")!;expect(r.approved).toBe(4500000);expect(r.remaining).toBe(500000);expect(r.approvals.find(a=>a.memberId==="M_KL")?.fxRate).toBe("0.5900");const q=api.quote("R2",500000);expect(q.memberId).toBe("M_OWNER");expect(q.quoteId).toBeTruthy();});});
 it("locks approval to the actual actor's own quote and preserves denied audit",async()=>{await withCase("M_OWNER",api=>{const q=api.quote("R2",500000);expect(()=>api.approve("R2",{amount:400000,quoteId:q.quoteId})).toThrow("same amount");expect(api.view().audit.rows.at(-1)?.decision).toBe("deny");expect(api.view().requests.find(r=>r.id==="R2")?.approved).toBe(4500000);});});
 it("approves, withdraws, pays covered shares and reconciles a proportional refund",async()=>{await withCase("M_OWNER",async api=>{let q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});api.withdraw("R2");expect(api.request("R2").remaining).toBe(500000);q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});const executed=await api.execute("R2");expect(executed.status).toBe("paid");expect(executed.charges).toHaveLength(4);expect(executed.charges?.every(c=>c.chargeRef?.startsWith("sandbox_"))).toBe(true);const result=api.reconcile("D3");expect(result.refund).toBe(900000);expect(api.view().refunds?.items.reduce((s,r)=>s+r.amount,0)).toBe(900000);expect(api.view().audit.chainValid).toBe(true);});});
 it("does not execute incomplete coverage and does not allow replay after payment",async()=>{await withCase("M_OWNER",async api=>{await expect(api.execute("R2")).rejects.toThrow("approved");const q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});await api.execute("R2");await expect(api.execute("R2")).rejects.toThrow("paid");});});
 it("enforces companion and helper permissions at the service layer",async()=>{await withCase("M_COMP",async api=>{expect(()=>api.quote("R2",100)).toThrow("Companions");await expect(api.execute("R2")).rejects.toThrow("owner");expect(()=>api.createRequest({})).toThrow("owner");});await withCase("M_JKT",api=>{expect(api.view().items).toEqual({});expect(api.document("D2").items).toEqual([]);expect(()=>api.reconcile("D3")).toThrow("owner");});});
 it("expires quotes and pending requests using the backend clock",async()=>{await withCase("M_OWNER",api=>{const q=api.quote("R2",500000);api.advance(1);expect(()=>api.approve("R2",{amount:500000,quoteId:q.quoteId})).toThrow("expired");expect(api.request("R2").status).toBe("expired");});});
 it("cancels a request and blocks further approval",async()=>{await withCase("M_OWNER",api=>{const q=api.quote("R2",100);api.cancel("R2");expect(()=>api.approve("R2",{amount:100,quoteId:q.quoteId})).toThrow("cancelled");});});
 it("uses the real agent action schema and persists the conversation",async()=>{await withCase("M_OWNER",async api=>{const live=new Integration(api.c,{fetchImpl:model({intent:"refund_status",language:"en"})});const reply=await live.chat("Where is my refund?");expect(reply.actions).toEqual([{type:"track_refund"}]);expect(live.messages()).toHaveLength(1);expect(live.view().audit.rows.at(-1)?.action).toBe("chat");});});
 it("handles a corrupt PDF as re-upload instead of a server failure",async()=>{await withCase("M_OWNER",async api=>{const uploaded=await api.upload(new File(["broken pdf"],"unreadable.pdf",{type:"application/pdf"}),"interim");expect(uploaded.status).toBe("needs_reupload");expect(api.view().documents.find(d=>d.id===uploaded.documentId)?.reason).toContain("could not be read");});});
 it("reads an uploaded PDF, removes PII, computes cited lines and supersedes a failed upload",async()=>{const seen:string[]=[];vi.stubGlobal("fetch",readerFetch(false,seen));await withCase("M_OWNER",async api=>{const failed=await api.upload(new File(["broken"],"old.pdf",{type:"application/pdf"}),"interim");const bytes=readFileSync("fixtures/pdf/interim-bill.pdf");const uploaded=await api.upload(new File([new Uint8Array(bytes)],"bill.pdf",{type:"application/pdf"}),"interim",failed.documentId);expect(uploaded.status).toBe("parsed");const view=api.view();expect(view.documents.some(d=>d.id===failed.documentId)).toBe(false);expect(view.explanation?.total).toBe(3678200);expect(view.explanation?.lines.length).toBeGreaterThan(0);expect(seen.join(" ")).not.toContain(PATIENT.passport);expect(seen.join(" ")).not.toContain(PATIENT.name);expect(view.audit.chainValid).toBe(true);});});
 it("keeps an injected upload from reaching payment execution",async()=>{vi.stubGlobal("fetch",readerFetch(true));await withCase("M_OWNER",async api=>{const bytes=readFileSync("fixtures/pdf/interim-bill-injected.pdf");await api.upload(new File([new Uint8Array(bytes)],"bill.pdf",{type:"application/pdf"}),"interim");const q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});await expect(api.execute("R2")).rejects.toThrow("open anomaly");});});
 it("binds Google invitations to the matching email and creates only the invited role",async()=>{
  const owner=google("owner","owner@example.com");const helper=google("helper","helper@example.com");const stranger=google("stranger","stranger@example.com");
  const db=ownerDatabase(owner.user.id);const store=new WorkspaceStore(db,"google","Owner");const created=store.create({patientName:"Patient",hospitalName:"Hospital",country:"China",currency:"CNY",ownerName:"Owner"});db.close();
  const c=caseAccess(owner,created.case.id);let token:string;try{token=invite(c,{name:"Helper",email:"helper@example.com",role:"payer",currency:"CNY",shareLimit:500000});}finally{c.close();}
  expect(()=>invitation(stranger,token!)).toThrow("not available");invitation(helper,token!,true);
  const shared=caseAccess(helper,created.case.id,"made-up-owner");try{expect(shared.member.role).toBe("payer");expect(()=>new Integration(shared).createRequest({})).toThrow("owner");await expect(new Integration(shared).upload(new File(["x"],"x.pdf",{type:"application/pdf"}),"estimate")).rejects.toThrow("owner or companion");}finally{shared.close();}
  expect(()=>caseAccess(stranger,created.case.id)).toThrow("not found");
 });
 it("does not invent payee trust for a personal hospital",async()=>{const session=google("personal","personal@example.com");const db=ownerDatabase(session.user.id);const store=new WorkspaceStore(db,"google","Owner");const data=store.create({patientName:"Patient",hospitalName:"Hospital",country:"China",currency:"CNY",ownerName:"Owner"});db.close();const c=caseAccess(session,data.case.id);try{await expect(new Integration(c).verifyPayees()).rejects.toThrow("have not been enrolled");expect(c.store.view(data.case.id).case.payees).toEqual([]);}finally{c.close();}});
});

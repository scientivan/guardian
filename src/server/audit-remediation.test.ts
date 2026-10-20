import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { caseAccess } from "./access";
import { Integration } from "./integration";
import { appendAudit } from "./audit";
import { analyse, type Analysis } from "./analysis";
import { explain } from "./explain";
import { scrubCase, restore } from "./pii";
import { dispatch } from "./api";
import { handleMessage } from "./agent";

vi.mock("next-auth",()=>({getServerSession:vi.fn()}));
const session:Session={user:{id:"demo:audit-regression",name:"Rina",mode:"demo"},expires:"2099-01-01"};
let dir:string;
beforeEach(()=>{
  dir=mkdtempSync(join(tmpdir(),"guardian-audit-fix-"));
  vi.stubEnv("GUARDIAN_ACCOUNTS_DIR",dir);
  vi.stubEnv("FISCO_BCOS_RPC_URL","");
  vi.stubEnv("LLM_CHAIN","groq:audit");
  vi.stubEnv("GROQ_API_KEY","fake");
  vi.stubEnv("LLM_CACHE_DIR","");
  vi.mocked(getServerSession).mockResolvedValue(session);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(dir,{recursive:true,force:true});});
const fakeModel=(value:object)=>(async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}))) as typeof fetch;
async function paid(api:Integration) {
  const q=api.quote("R2",500000);api.approve("R2",{amount:500000,quoteId:q.quoteId});await api.execute("R2");
}

describe("audit remediation regressions",()=>{
  it("removes other payers' nested charge, refund and notification details while retaining own charge",async()=>{
    const c=caseAccess(session,"C1","M_OWNER");
    try {
      const api=new Integration(c);await paid(api);api.reconcile("D3");
      appendAudit(c.db,{caseId:"C1",actor:"system",action:"notify.email",inputSources:["system"],decision:"info",result:{recipients:["private@example.com"],parts:[{memberId:"M_KL",amount:1234567}],nested:{chargeRef:"private-ref"}}});
      const payer=c.store.view("C1","M_JKT");
      const rows=payer.audit.rows as (typeof payer.audit.rows[number]&{result:Record<string,unknown>})[];
      const charges=rows.filter(r=>r.action==="charge");
      expect(charges).toHaveLength(1);expect(charges[0].result.memberId).toBe("M_JKT");
      const text=JSON.stringify(rows);
      expect(text).not.toContain("M_KL");expect(text).not.toContain("M_DXB");expect(text).not.toContain("private@example.com");expect(text).not.toContain("private-ref");
      expect(payer.refunds?.items.map(r=>r.memberId)).toEqual(["M_JKT"]);
      expect(payer.requests.flatMap(r=>r.approvals).every(a=>a.memberId==="M_JKT")).toBe(true);
    }finally{c.close();}
  });

  it("reconstructs false numeric and diagnostic model prose, including legacy snapshots",async()=>{
    const c=caseAccess(session,"C1");
    try {
      const a=analyse(c.db,"C1","D2") as Analysis;
      const e=await explain(a,"en",{fetchImpl:fakeModel({lines:[{type:"arithmetic_fact",causeRef:"C1",itemIds:["I01"],text:"The stay is 5 days longer, adding CNY 34,000."},{type:"unknown_ask_hospital",itemIds:["I01"],text:"The patient has cancer."}]})});
      expect(e.lines.find(l=>l.amount===300000)?.text).toContain("2 days");
      expect(e.lines.find(l=>l.amount===300000)?.text).toContain("3,000");
      expect(JSON.stringify(e.lines)).not.toContain("cancer");expect(JSON.stringify(e.lines)).not.toContain("34,000");
      const data=c.store.get("C1");data.explanation!.lines=[{type:"arithmetic_fact",text:"Legacy cancer claim",itemIds:["I01"]}];c.store.save(data);
      expect(JSON.stringify(c.store.view("C1").explanation?.lines)).not.toContain("Legacy cancer");
    }finally{c.close();}
  });

  it("allocates stable tokens across separate calls without collisions or mis-restoration",()=>{
    const c=caseAccess(session,"C1");
    try {
      const first=scrubCase(c.db,"C1","alpha@example.com");const second=scrubCase(c.db,"C1","beta@example.com");
      expect(first.text).not.toBe(second.text);expect(scrubCase(c.db,"C1","alpha@example.com").text).toBe(first.text);
      expect(restore(c.db,"C1",second.text,"owner")).toBe("beta@example.com");
      expect(scrubCase(c.db,"C1","Budi Santoso").text).toBe("[PASIEN_1]");
    }finally{c.close();}
  });

  it("scrubs the complete chat prompt including request purposes, and refuses free model prose",async()=>{
    const c=caseAccess(session,"C1");
    try {
      c.db.prepare("UPDATE payment_requests SET purpose=? WHERE id='R2'").run("Budi Santoso contact alpha@example.com");
      let prompt="";
      const api=new Integration(c,{fetchImpl:async(_url,init)=>{prompt=String(init?.body);return fakeModel({intent:"other",replyText:"The patient has cancer."})("https://fake.invalid");}});
      const r=await api.chat("Budi Santoso and Rina ask about alpha@example.com");
      expect(prompt).not.toContain("Budi Santoso");expect(prompt).not.toContain("Rina");expect(prompt).not.toContain("alpha@example.com");
      expect(prompt).toContain("[PASIEN_1]");expect(r.reply).not.toContain("cancer");
    }finally{c.close();}
  });

  it("serves explanation GET without model calls or database writes, including a cache miss",async()=>{
    const c=caseAccess(session,"C1");
    try {
      new Integration(c);
      const count=()=>c.db.prepare("SELECT COUNT(*) n FROM audit_log").get();
      const before=count();const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
      let r=await dispatch(new NextRequest("http://localhost:3000/api/cases/C1/explanation?documentId=D2"),["cases","C1","explanation"]);
      expect(r.status).toBe(409);expect(fetch).not.toHaveBeenCalled();expect(count()).toEqual(before);
      c.db.prepare("INSERT INTO web_explanations VALUES (?,?)").run("D2",JSON.stringify(c.store.get("C1").explanation));
      r=await dispatch(new NextRequest("http://localhost:3000/api/cases/C1/explanation?documentId=D2"),["cases","C1","explanation"]);
      expect(r.status).toBe(200);expect(fetch).not.toHaveBeenCalled();expect(count()).toEqual(before);
    }finally{c.close();}
  });

  it("keeps closed reads immutable after refund expiry and refuses new explanation generation",async()=>{
    const c=caseAccess(session,"C1");
    try {
      const api=new Integration(c);await paid(api);api.reconcile("D3");
      for(const id of ["R1","R2"])await api.addInvoice(id,new File(["synthetic receipt"],"receipt.pdf",{type:"application/pdf"}));
      await api.closeCase();
      const dump=()=>({audit:c.db.prepare("SELECT * FROM audit_log").all(),refunds:c.db.prepare("SELECT * FROM refunds").all(),payees:c.db.prepare("SELECT * FROM payees").all()});
      const before=dump();vi.useFakeTimers();vi.setSystemTime(Date.now()+15*86400000);
      expect(api.view().refunds?.items.every(r=>r.overdue)).toBe(true);
      const r=await dispatch(new NextRequest("http://localhost:3000/api/cases/C1"),["cases","C1"]);
      expect(r.status).toBe(200);expect(dump()).toEqual(before);
      await expect(api.explanation("D2",true)).rejects.toThrow("closed");
    }finally{c.close();}
  });

  it("prepares the global final-bill balance after deposits and never offers a superseded bill",async()=>{
    const c=caseAccess(session,"C1");
    try {
      const api=new Integration(c);api.cancel("R2");
      const r=await handleMessage(c.db,"C1","M_OWNER","pay the final bill in full",{fetchImpl:fakeModel({intent:"pay_bill",documentRef:"D3",amountIsFullBalance:true})});
      expect(r.actions).toEqual([{type:"prepare_payment",payeeId:"P1",documentId:"D3",amount:4100000,currency:"CNY"}]);
      expect(()=>api.createRequest({...r.actions[0],purpose:"Final bill"})).not.toThrow();
      const old=await handleMessage(c.db,"C1","M_OWNER","pay interim bill in full",{fetchImpl:fakeModel({intent:"pay_bill",documentRef:"D2",amountIsFullBalance:true})});
      expect(old.actions).toEqual([]);
    }finally{c.close();}
  });
});

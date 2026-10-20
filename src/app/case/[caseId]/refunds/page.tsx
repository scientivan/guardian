"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/landing/icons";
import { AskButton } from "@/components/app/Assistant";
import { MemberAvatar } from "@/components/app/people";
import { Chip, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { day,money } from "@/lib/format";
import { Spinner, useTask, WORK } from "@/components/app/Feedback";

export default function RefundsPage() {
  const {case:care,refunds,documents}=useCaseData();const {call,mode}=useWorkspace();
  const {busy,run}=useTask();const [feedback,setFeedback]=useState("");
  const final=documents.filter(d=>d.type==="final"&&d.status==="parsed").at(-1);
  async function action(path:string,body:object) {setFeedback("");const result=await run(()=>call(`/cases/${care.id}/${path}`,"POST",body,care.id) as Promise<{balanceDue?:number}>,{work:path==="refunds/reconcile"?WORK.reconcile:undefined});if(result)setFeedback(result.balanceDue?`The final bill has an open balance of ${money(result.balanceDue,care.currency)}.`:"Case updated.");}
  async function download() {const data=await run(()=>call(`/cases/${care.id}/recap`,"GET",undefined,care.id),{retry:true});if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`guardian-${care.id}-payment-record.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className="space-y-10">
    <Link href={`/case/${care.id}/pledges`} className={SECONDARY}><Arrow className="h-4 w-4 rotate-180" />Back to Pledges</Link>
    {feedback&&<p role="status" className="rounded-xl bg-ok-soft p-4 text-sm text-ok-ink">{feedback}</p>}
    <Section title="Final Bill and Deposits" agent="auditor"><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-ink-2">Deposits paid</p><MoneyFigure minor={care.totals.paid} currency={care.currency}/></div><div><p className="text-sm text-ink-2">Final bill</p>{final?<MoneyFigure minor={final.total??0} currency={care.currency}/>:<p>Upload the final bill after discharge.</p>}</div></div>
      {care.me.role==="owner"&&final&&!refunds&&<button type="button" disabled={busy} onClick={()=>action("refunds/reconcile",{documentId:final.id})} className={`${PRIMARY} mt-5`}>{busy?<><Spinner/>Reconciling…</>:"Reconcile final bill"}</button>}
    </Section>
    <Section title="Refund per Person" agent="auditor" action={<AskButton question="How is the refund split?" context={{ kind: "refund" }} />}>{refunds?<><p className="mb-4"><MoneyFigure minor={refunds.totalRefund} currency={refunds.currency}/><span className="ml-2 text-ink-2">coming back</span></p><ul className="divide-y divide-line">{refunds.items.map(r=><li key={r.memberId} className="flex flex-wrap items-center gap-3 py-4"><MemberAvatar id={r.memberId}/><div className="min-w-0 flex-1"><p className="font-semibold text-lead">{r.displayName}</p><p className="text-xs text-ink-2">Due {day(r.dueAt)}</p></div><b className="font-num text-serpent-dark">{money(r.amount,refunds.currency)}</b><Chip tone={r.overdue?"danger":r.status==="received"?"ok":"info"}>{r.overdue?"Overdue":r.status}</Chip>{r.status!=="received"&&<button type="button" disabled={busy} onClick={()=>action("follow-up",{memberId:r.memberId})} className={SECONDARY}>Request follow-up</button>}{mode==="demo"&&care.me.role==="owner"&&r.status!=="received"&&<button type="button" disabled={busy} onClick={()=>action("refunds/status",{memberId:r.memberId,status:r.status==="requested"?"processing":"received"})} className={SECONDARY}>{r.status==="requested"?"Mark processing":"Mark received"}</button>}</li>)}</ul></>:<p className="text-ink-2">Refund shares appear when deposits exceed the reconciled final bill.</p>}</Section>
    <Section title="Your Payment Record" agent="auditor"><p className="mb-4 text-ink-2">Download your contributions, purposes, charge receipts, refund share and document hashes.</p><button type="button" onClick={download} className={SECONDARY}>Download payment record</button>{mode==="demo"&&care.me.role==="owner"&&<button type="button" disabled={busy} onClick={()=>action("clock",{advanceDays:30})} className={`${SECONDARY} ml-3`}>Advance 30 days</button>}</Section>
  </div>;
}

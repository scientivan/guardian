"use client";

import { LocalizedText } from "@/components/i18n/LocaleProvider";

import { useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/landing/icons";
import { AskButton } from "@/components/app/Assistant";
import { MemberAvatar } from "@/components/app/people";
import { Chip, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { day,money } from "@/lib/format";
import { Spinner, useTask, WORK } from "@/components/app/Feedback";
import { PaymentRecord } from "@/components/app/PaymentRecord";

export default function RefundsPage() {
  const {case:care,refunds,documents}=useCaseData();const {call,mode}=useWorkspace();
  const {busy,run}=useTask();const [feedback,setFeedback]=useState("");
  const final=documents.filter(d=>d.type==="final"&&d.status==="parsed").at(-1);
  async function action(path:string,body:object) {setFeedback("");const result=await run(()=>call(`/cases/${care.id}/${path}`,"POST",body,care.id) as Promise<{balanceDue?:number}>,{work:path==="refunds/reconcile"?WORK.reconcile:undefined});if(result)setFeedback(result.balanceDue?`The final bill has an open balance of ${money(result.balanceDue,care.currency)}.`:"Case updated.");}
  async function download() {const data=await run(()=>call(`/cases/${care.id}/recap`,"GET",undefined,care.id),{retry:true});if(!data)return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=`guardian-${care.id}-payment-record.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <div className="space-y-10">
    <Link href={`/case/${care.id}/pledges`} className={SECONDARY}><Arrow className="h-4 w-4 rotate-180" /><LocalizedText>Back to Pledges</LocalizedText></Link>
    {feedback&&<p role="status" className="rounded-xl bg-ok-soft p-4 text-sm text-ok-ink"><LocalizedText>{feedback}</LocalizedText></p>}
    <Section title="Final Bill and Deposits" agent="auditor"><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-sm text-ink-2"><LocalizedText>Deposits paid</LocalizedText></p><MoneyFigure minor={care.totals.paid} currency={care.currency}/></div><div><p className="text-sm text-ink-2"><LocalizedText>Final bill</LocalizedText></p><LocalizedText>{final?<MoneyFigure minor={final.total??0} currency={care.currency}/>:<p><LocalizedText>Upload the final bill after discharge.</LocalizedText></p>}</LocalizedText></div></div>
      {care.me.role==="owner"&&!care.closed&&final&&!refunds&&<button type="button" disabled={busy} onClick={()=>action("refunds/reconcile",{documentId:final.id})} className={`${PRIMARY} mt-5`}><LocalizedText>{busy?<><Spinner/><LocalizedText>Reconciling…</LocalizedText></>:"Reconcile final bill"}</LocalizedText></button>}
    </Section>
    <Section title="Refund per Person" agent="auditor" action={<AskButton question="How is the refund split?" context={{ kind: "refund" }} />}><LocalizedText>{refunds?<><p className="mb-4"><MoneyFigure minor={refunds.totalRefund} currency={refunds.currency}/><span className="ml-2 text-ink-2"><LocalizedText>coming back</LocalizedText></span></p><ul className="divide-y divide-line">{refunds.items.map(r=><li key={r.memberId} className="flex flex-wrap items-center gap-3 py-4"><MemberAvatar id={r.memberId}/><div className="min-w-0 flex-1"><p className="font-semibold text-lead">{r.displayName}</p><p className="text-xs text-ink-2"><LocalizedText>Due </LocalizedText><LocalizedText>{day(r.dueAt)}</LocalizedText></p></div><b className="font-num text-serpent-dark"><LocalizedText>{money(r.amount,refunds.currency)}</LocalizedText></b><Chip tone={r.overdue?"danger":r.status==="received"?"ok":"info"}><LocalizedText>{r.overdue?"Overdue":r.status}</LocalizedText></Chip>{r.status!=="received"&&!care.closed&&<button type="button" disabled={busy} onClick={()=>action("follow-up",{memberId:r.memberId})} className={SECONDARY}><LocalizedText>Request follow-up</LocalizedText></button>}{mode==="demo"&&!care.closed&&care.me.role==="owner"&&r.status!=="received"&&<button type="button" disabled={busy} onClick={()=>action("refunds/status",{memberId:r.memberId,status:r.status==="requested"?"processing":"received"})} className={SECONDARY}><LocalizedText>{r.status==="requested"?"Mark processing":"Mark received"}</LocalizedText></button>}</li>)}</ul></>:<p className="text-ink-2"><LocalizedText>Refund shares appear when deposits exceed the reconciled final bill.</LocalizedText></p>}</LocalizedText></Section>
    <Section title="Your Payment Record" agent="auditor"><PaymentRecord caseId={care.id} />
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={download} className={SECONDARY}><LocalizedText>Download payment record</LocalizedText></button>{mode==="demo"&&!care.closed&&care.me.role==="owner"&&<button type="button" disabled={busy} onClick={()=>action("clock",{advanceDays:30})} className={SECONDARY}><LocalizedText>Advance 30 days</LocalizedText></button>}</div></Section>
  </div>;
}

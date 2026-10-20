"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Arrow } from "@/components/landing/icons";
import { AskButton } from "@/components/app/Assistant";
import { MemberAvatar } from "@/components/app/people";
import { Chip, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { converted,day,money } from "@/lib/format";
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
    <Section title="Your Payment Record" agent="auditor"><PaymentRecord caseId={care.id} />
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={download} className={SECONDARY}>Download payment record</button>{mode==="demo"&&care.me.role==="owner"&&<button type="button" disabled={busy} onClick={()=>action("clock",{advanceDays:30})} className={SECONDARY}>Advance 30 days</button>}</div></Section>
  </div>;
}

type PaymentRecordData = {
  paidTotal: number;
  member: { currency: string };
  payments: { requestId: string; purpose: string; amount: number; currency: string; payCurrency: string | null; payAmount: number | null; fee: number | null; status: string; chargeRef: string | null; ts: string }[];
  refund: { amount: number; status: string; dueAt: string } | null;
  documents: { id: string; type: string; sha256: string; anchoredTx: string | null; createdAt: string }[];
};

/** PRD F19 / step 8: each person's own record, shown here and downloadable as JSON. */
function PaymentRecord({ caseId }: { caseId: string }) {
  const { call } = useWorkspace();
  const { case: care, audit } = useCaseData();
  const [record, setRecord] = useState<PaymentRecordData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    call(`/cases/${caseId}/recap`, "GET", undefined, caseId).then(r => { if (active) setRecord(r as PaymentRecordData); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [call, caseId, care.me.id, audit.rows.length]);
  if (failed) return <p className="text-sm text-ink-2">Your record couldn’t be loaded. Try the download below.</p>;
  if (!record) return <p role="status" className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="h-4 w-4 text-serpent" />Loading your record…</p>;
  return (
    <div className="space-y-5">
      <p><MoneyFigure minor={record.paidTotal} currency={care.currency} /><span className="ml-2 text-ink-2">paid by you to the hospital</span></p>
      {record.payments.length ? <ul className="divide-y divide-line rounded-2xl bg-white px-4">{record.payments.map(p => (
        <li key={`${p.requestId}-${p.ts}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
          <span className="min-w-0 flex-1"><span className="block font-semibold text-lead">{p.purpose}</span><span className="block text-xs text-ink-2">{day(p.ts)} · {p.chargeRef ? `Receipt ${p.chargeRef}` : "No receipt"}</span></span>
          <span className="text-right"><b className="block font-num text-serpent-dark">{p.payCurrency && p.payAmount !== null ? converted(p.payAmount, p.payCurrency, p.amount, p.currency) : money(p.amount, p.currency)}</b>{p.payCurrency && p.payAmount !== null && <span className="text-xs text-ink-2">+ {money(p.fee ?? 0, p.payCurrency)} fee</span>}</span>
          <Chip tone={p.status === "charged" ? "ok" : "danger"}>{p.status === "charged" ? "Paid" : "Failed"}</Chip>
        </li>
      ))}</ul> : <p className="text-sm text-ink-2">No payments from you yet. A share is charged only when a request you pledged to is paid.</p>}
      {record.refund && <p className="text-sm text-lead">Your refund share: <b className="font-num">{money(record.refund.amount, care.currency)}</b> · {record.refund.status} · due {day(record.refund.dueAt)}</p>}
      <details className="text-sm"><summary className="cursor-pointer font-semibold text-serpent-dark">Document fingerprints ({record.documents.length})</summary>
        <ul className="mt-2 space-y-1.5">{record.documents.map(d => <li key={d.id} className="break-all text-xs text-ink-2"><b className="text-lead">{d.type}</b> · {d.sha256 || "fingerprint pending"}{d.anchoredTx ? ` · anchored ${d.anchoredTx}` : ""}</li>)}</ul>
      </details>
    </div>
  );
}


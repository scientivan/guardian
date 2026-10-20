"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Chip, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { money, share } from "@/lib/format";
import type { Quote } from "@/server/fx";

export default function PledgesPage() {
  const { case: care, requests } = useCaseData();
  const { call } = useWorkspace();
  const query=useSearchParams();
  const requested=query.get("requestId");
  const requestedId=requests.find(r=>r.id===requested)?.id;
  const [selected,setSelected]=useState(requestedId ?? requests.find(r=>r.status==="pending")?.id ?? requests[0]?.id ?? "");
  useEffect(()=>{if(requestedId)setSelected(requestedId);},[requestedId]);
  const [amount,setAmount]=useState("");
  const [purpose,setPurpose]=useState("Hospital deposit");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function create() {
    setBusy(true);setError("");
    try{const result=await call(`/cases/${care.id}/payment-requests`,"POST",{payeeId:care.payees[0]?.id,amount:Math.round(Number(amount)*100),purpose,expiresInMinutes:120},care.id) as {id:string};setSelected(result.id);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function verify() {setBusy(true);setError("");try{await call(`/cases/${care.id}/payees/verify`,"POST",{},care.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="space-y-10">
    {error && <p role="alert" className="text-danger-ink">{error}</p>}
    {care.anomalies.filter(a=>!a.resolved).map(a=><p key={a.id} className="rounded-xl bg-danger-soft p-4 text-danger-ink">{a.detail}</p>)}
    {care.me.role==="owner" && <Section title="Payment Requests" agent="gate">
      <p className="mb-4 leading-relaxed text-ink-2">Payments go only to the hospital’s verified account. Each person approves their own share before you review and execute the request.</p>
      <Link href={`/hospitals?caseId=${care.id}`} className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-serpent-dark underline">Find this institution in Hospital Directory</Link>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={verify} disabled={busy} className={SECONDARY}>Verify hospital account</button>{care.payees.map(p=><span key={p.id} className="text-sm text-serpent-dark">{p.name} · {p.accountMasked}</span>)}</div>
      {care.payees.length>0 && <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input aria-label="Payment purpose" value={purpose} onChange={e=>setPurpose(e.target.value)} className="rounded-xl border border-line bg-white p-3" /><input aria-label="Requested amount" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Amount in ${care.currency}`} className="rounded-xl border border-line bg-white p-3" /><button type="button" disabled={busy||!amount||Number(amount)<=0} onClick={create} className={PRIMARY}>Create request</button></div>}
    </Section>}
    {!requests.length ? <Section title="Pledges" agent="gate"><p>No payment request is waiting for approval. A hospital account must be verified before a request can be created.</p></Section> : <>
      <label className="block text-sm font-semibold text-ink-2">Payment request<select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-2 block w-full rounded-xl border border-line bg-white p-3">{requests.map(r=><option key={r.id} value={r.id}>{r.purpose} · {money(r.amount,r.currency)} · {r.status}</option>)}</select></label>
      <PaymentForm key={`${selected}:${care.me.id}`} requestId={selected || requests[0].id} />
    </>}
  </div>;
}

function PaymentForm({requestId}:{requestId:string}) {
  const {case:care,requests}=useCaseData();
  const {call,mode}=useWorkspace();
  const request=requests.find(r=>r.id===requestId)!;
  const mine=request.approvals.find(p=>p.memberId===care.me.id);
  const hasMine=Boolean(mine);
  const [amount,setAmount]=useState(request.remaining);
  const [quote,setQuote]=useState<(Quote & {quoteId:string;fxRate:string})|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [confirm,setConfirm]=useState(false);
  useEffect(()=>{
    let active=true;setQuote(null);
    if(hasMine || request.status!=="pending" || amount<=0 || amount>request.remaining || care.me.role==="companion")return;
    const timer=setTimeout(()=>{call(`/payment-requests/${requestId}/fx-quote`,"POST",{amount},care.id).then(q=>{if(active){setQuote(q as Quote & {quoteId:string;fxRate:string});setError("");}}).catch(e=>{if(active)setError(e.message);});},350);
    return()=>{active=false;clearTimeout(timer);};
  },[amount,requestId,hasMine,request.status,request.remaining,care.id,care.me.id,care.me.role,call]);
  async function action(path:string,body:object={},method="POST") {setBusy(true);setError("");try{const response=await call(path,method,body,care.id) as {ok?:boolean};if(response.ok===false)setError("Some shares could not be charged. Review the request and receipts.");setConfirm(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="space-y-8">
    {error && <p role="alert" className="text-danger-ink">{error}</p>}
    {request.status==="cancelled" && !care.payees.some(p=>p.id===request.payeeId) && <p role="status" className="rounded-xl bg-warn-soft p-4 text-sm leading-relaxed text-warn-ink">The hospital’s payment authority changed or was put on hold. This request’s approvals cannot be reused. Review the institution and create a new request after its account is verified again.</p>}
    <Section title={request.purpose} agent="gate" action={<Chip tone={request.status==="paid"?"ok":request.status==="pending"?"warn":"muted"}>{request.status==="pending"?(request.remaining?`${money(request.remaining,request.currency)} still missing`:"Covered"):request.status}</Chip>}>
      <MoneyFigure minor={request.approved} currency={request.currency} /><span className="ml-2 text-ink-2">of {money(request.amount,request.currency)}</span>
      <div className="mt-5 h-5 overflow-hidden rounded-full bg-white"><div className="h-full bg-serpent transition-all" style={{width:`${share(request.approved,request.amount)}%`}} /></div>
      <p className="mt-3 text-xs text-ink-2">Expires {new Date(request.expiresAt).toLocaleString()}</p>
      <ul className="mt-5 divide-y divide-line">{request.approvals.map(p=><li key={p.memberId} className="flex flex-wrap justify-between gap-2 py-3"><span className="font-semibold text-lead">{p.displayName}</span><span className="text-sm text-ink-2">{money(p.amount,request.currency)} · {money(p.payAmount,p.payCurrency)} + {money(p.fee,p.payCurrency)} fee · {p.status}</span></li>)}</ul>
      <Link href="members" className="mt-4 inline-block text-sm font-semibold text-serpent-dark underline">Invite more helpers</Link>
    </Section>
    {request.status==="pending" && <Section title="Your Pledge" agent="gate">
      {care.me.role==="companion" ? <p>Your companion role can upload documents and ask questions. It cannot approve payments.</p> : mine ? <div className="flex flex-wrap items-center gap-4"><p>You approved {money(mine.amount,request.currency)}.</p><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/approvals/me`,{},"DELETE")} className={SECONDARY}>Withdraw</button></div> : <>
        <label className="block text-sm font-semibold text-ink-2">Your share in {request.currency}<input aria-label="Your pledge amount" type="number" min="0.01" max={request.remaining/100} step="0.01" value={amount/100} onChange={e=>setAmount(Math.round(Number(e.target.value)*100))} className="mt-2 block w-full rounded-xl border border-line bg-white p-3" /></label>
        {quote ? <p className="mt-4 text-lead">You pay <b>{money(quote.payAmount,quote.payCurrency)}</b> plus {money(quote.fee,quote.payCurrency)} fee. Rate {quote.fxRate}. Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.</p> : <p role="status" className="mt-4 text-sm text-ink-2">{amount>0 && amount<=request.remaining ? "Getting your exchange-rate quote…" : "Choose an amount within the remaining balance."}</p>}
        <button type="button" disabled={busy||!quote||new Date(quote.expiresAt).getTime()<=Date.now()} onClick={()=>action(`/payment-requests/${request.id}/approvals`,{amount,quoteId:quote?.quoteId})} className={`${PRIMARY} mt-5`}>Pledge {money(amount,request.currency)}</button>
      </>}
    </Section>}
    {request.status==="pending" && care.me.role==="owner" && <Section title="Review and Pay" agent="gate">
      <p className="mb-4 leading-relaxed text-ink-2">The request must be fully covered. The gateway checks the recipient, permissions, approved amounts and open warnings again before executing.</p>
      {confirm ? <div className="space-y-4"><p className="text-sm text-warn-ink">{mode === "demo" ? "This execution uses an isolated payment sandbox." : "This execution uses Stripe test mode."}</p><p className="font-semibold text-lead">Pay {money(request.amount,request.currency)} to {request.payeeName}, account {request.accountMasked}, using the approved shares above?</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/execute`)} className={PRIMARY}>{busy?"Executing…":"Confirm and pay approved shares"}</button><button type="button" onClick={()=>setConfirm(false)} disabled={busy} className={SECONDARY}>Back</button></div></div> : <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setConfirm(true)} disabled={busy||request.remaining>0} className={PRIMARY}>Review payment</button><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/cancel`)} className={SECONDARY}>Cancel request</button></div>}
    </Section>}
  </div>;
}

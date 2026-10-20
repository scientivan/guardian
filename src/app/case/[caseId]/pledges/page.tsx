"use client";

import { Select } from "@/components/app/Select";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Chip, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { money, share } from "@/lib/format";
import { Arrow, Refund } from "@/components/landing/icons";
import { AskButton } from "@/components/app/Assistant";
import type { Quote } from "@/server/fx";
import { ClientError, explainError, Spinner, useFeedback, useTask, WORK } from "@/components/app/Feedback";
import { INVALID, useFieldErrors } from "@/components/app/FieldError";
import { amount as amountRule, check, text } from "@/lib/validate";

export default function PledgesPage() {
  const { case: care, requests, documents } = useCaseData();
  const { call } = useWorkspace();
  const query=useSearchParams();
  const requested=query.get("requestId");
  const requestedId=requests.find(r=>r.id===requested)?.id;
  const [selected,setSelected]=useState(requestedId ?? requests.find(r=>r.status==="pending")?.id ?? requests[0]?.id ?? "");
  useEffect(()=>{if(requestedId)setSelected(requestedId);},[requestedId]);
  const [amount,setAmount]=useState("");
  const [purpose,setPurpose]=useState("Hospital deposit");
  // A request either pays an uploaded bill (amount up to its open balance) or asks for a deposit or
  // guarantee the hospital requested without a bill.
  const bills=documents.filter(d=>d.type!=="estimate"&&d.status==="parsed"&&d.total).map(d=>{
    const asked=requests.filter(r=>r.documentId===d.id&&["pending","executing","paid"].includes(r.status)).reduce((s,r)=>s+r.amount,0);
    return {...d,open:Math.max(0,(d.total??0)-asked)};
  });
  const [kind,setKind]=useState<"bill"|"deposit">(bills.some(b=>b.open>0)?"bill":"deposit");
  const [billId,setBillId]=useState(bills.find(b=>b.open>0)?.id??"");
  const bill=bills.find(b=>b.id===billId);
  function chooseBill(id:string) {const b=bills.find(b=>b.id===id);setBillId(id);if(b){setAmount((b.open/100).toFixed(2));setPurpose(`Payment for ${b.title}`.slice(0,120));}}
  useEffect(()=>{if(kind==="bill"&&bill&&!amount){setAmount((bill.open/100).toFixed(2));setPurpose(`Payment for ${bill.title}`.slice(0,120));}},[kind,bill,amount]);
  const {busy,run}=useTask();
  const rv=useFieldErrors(check({purpose,amount,bill:kind==="bill"?billId:"-"},{purpose:text("what the payment is for",3,120),amount:amountRule("the amount",kind==="bill"&&bill?{max:bill.open/100}:{}),bill:v=>v?null:"Choose the bill to pay."}),"request");
  async function create() {
    if(!rv.submit())return;
    const result=await run(()=>call(`/cases/${care.id}/payment-requests`,"POST",{payeeId:care.payees[0]?.id,amount:Math.round(Number(amount)*100),purpose,expiresInMinutes:120,...(kind==="bill"?{documentId:billId}:{})},care.id) as Promise<{id:string}>);
    if(result)setSelected(result.id);
  }
  async function verify() {await run(()=>call(`/cases/${care.id}/payees/verify`,"POST",{},care.id),{work:WORK.verify,retry:true});}
  return <div className="space-y-10">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-2">Requests, pledges and payments to the hospital. Refunds of unused deposits are tracked on their own page.</p><Link href={`/case/${care.id}/refunds`} className={SECONDARY}><Refund className="h-4 w-4" />Refund Tracking<Arrow className="h-4 w-4" /></Link></div>
    {care.anomalies.filter(a=>!a.resolved).map(a=><p key={a.id} className="rounded-xl bg-danger-soft p-4 text-danger-ink">{a.detail}</p>)}
    {care.me.role==="owner" && <Section title="Payment Requests" agent="gate">
      <p className="mb-4 leading-relaxed text-ink-2">Payments go only to the hospital’s verified account. Each person approves their own share before you review and execute the request.</p>
      <Link href={`/hospitals?caseId=${care.id}`} className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-serpent-dark underline">Find this institution in Hospital Directory</Link>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={verify} disabled={busy} className={SECONDARY}>{busy?<><Spinner/>Checking…</>:"Verify hospital account"}</button>{care.payees.map(p=><span key={p.id} className="text-sm text-serpent-dark">{p.name} · {p.accountMasked}</span>)}</div>
      {care.payees.length>0 && <form noValidate onSubmit={e=>{e.preventDefault();void create();}} className="mt-6 space-y-4 rounded-2xl bg-white p-5">
        <div className="flex flex-wrap rounded-xl bg-mist p-1 text-sm font-semibold" role="radiogroup" aria-label="What is this request for">
          {([["bill","Pay an uploaded bill"],["deposit","Deposit or guarantee"]] as const).map(([value,label])=><button key={value} type="button" role="radio" aria-checked={kind===value} disabled={value==="bill"&&!bills.length} onClick={()=>{setKind(value);if(value==="deposit"){setPurpose("Hospital deposit");setAmount("");}else if(bill)chooseBill(bill.id);}} className={`flex-1 rounded-lg px-3 py-2 disabled:opacity-40 ${kind===value?"bg-serpent text-white":"text-ink-2 hover:text-lead"}`}>{label}</button>)}
        </div>
        <p className="text-xs leading-relaxed text-ink-2">{kind==="bill"?"The amount comes from the bill Guardian has read and checked. The money still goes only to the hospital’s verified account, never to an account printed on the bill.":"For a deposit or emergency guarantee the hospital asked for before there is a bill."}</p>
        {kind==="bill" && <div className="text-sm text-ink-2"><span>Bill</span><Select id="request-bill" label="Bill to pay" className="mt-1" value={billId} onChange={chooseBill} invalid={rv.invalid("bill")} placeholder="Choose the bill to pay" options={bills.map(b=>({value:b.id,label:b.title,disabled:b.open===0,hint:`${b.type==="final"?"Final":"Interim"} bill · total ${money(b.total??0,care.currency)} · ${b.open?`${money(b.open,care.currency)} left to pay`:"fully requested"}`}))}/>{rv.error("bill")}</div>}
        <div className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="text-sm text-ink-2"><label htmlFor="request-purpose">What it’s for</label><input id="request-purpose" value={purpose} onChange={e=>setPurpose(e.target.value)} className={`mt-1 w-full rounded-xl border border-line bg-white p-3 text-lead ${rv.invalid("purpose")?INVALID:""}`} {...rv.field("purpose")} />{rv.error("purpose")}</div>
          <div className="text-sm text-ink-2"><label htmlFor="request-amount">Amount in {care.currency}</label><input id="request-amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Amount in ${care.currency}`} className={`mt-1 w-full rounded-xl border border-line bg-white p-3 text-lead ${rv.invalid("amount")?INVALID:""}`} {...rv.field("amount")} />{rv.error("amount")}{kind==="bill"&&bill&&<span className="mt-1 block text-xs">Up to {money(bill.open,care.currency)}. You can ask for part of it.</span>}</div>
          <button type="submit" disabled={busy} className={`${PRIMARY} sm:mt-6`}>Create request</button>
        </div>
      </form>}
    </Section>}
    {!requests.length ? <Section title="Pledges" agent="gate"><p>No payment request is waiting for approval. A hospital account must be verified before a request can be created.</p></Section> : <>
      <div className="block text-sm font-semibold text-ink-2">Payment request<Select label="Payment request" className="mt-2" value={selected} onChange={setSelected} options={requests.map(r=>({value:r.id,label:r.purpose,hint:`${money(r.amount,r.currency)} · ${r.status}`}))}/></div>
      <PaymentForm key={`${selected}:${care.me.id}`} requestId={selected || requests[0].id} />
    </>}
  </div>;
}

function PaymentForm({requestId}:{requestId:string}) {
  const {case:care,requests,documents}=useCaseData();
  const {call,mode}=useWorkspace();
  const request=requests.find(r=>r.id===requestId)!;
  const mine=request.approvals.find(p=>p.memberId===care.me.id);
  const hasMine=Boolean(mine);
  const [amount,setAmount]=useState(request.remaining);
  const [typed,setTyped]=useState(String(request.remaining/100));
  const myLimit=care.members.find(m=>m.id===care.me.id)?.shareLimit??0;
  const cap=myLimit>0?Math.min(request.remaining,myLimit):request.remaining;
  const pledgeError=amountRule("your share",{max:cap/100});
  const pv=useFieldErrors(check({amount:typed},{amount:pledgeError}),"pledge");
  const [quote,setQuote]=useState<(Quote & {quoteId:string;fxRate:string})|null>(null);
  const [quoteError,setQuoteError]=useState("");
  const {busy,run}=useTask();
  const {showError}=useFeedback();
  const [confirm,setConfirm]=useState(false);
  useEffect(()=>{
    let active=true;setQuote(null);
    if(hasMine || request.status!=="pending" || amount<=0 || amount>request.remaining || care.me.role==="companion")return;
    const timer=setTimeout(()=>{call(`/payment-requests/${requestId}/fx-quote`,"POST",{amount},care.id).then(q=>{if(active){setQuote(q as Quote & {quoteId:string;fxRate:string});setQuoteError("");}}).catch(e=>{if(active){const x=explainError(e);setQuoteError(`${x.title}. ${x.body}`);}});},350);
    return()=>{active=false;clearTimeout(timer);};
  },[amount,requestId,hasMine,request.status,request.remaining,care.id,care.me.id,care.me.role,call]);
  async function action(path:string,body:object={},method="POST") {
    const response=await run(()=>call(path,method,body,care.id) as Promise<{ok?:boolean}>,{work:path.endsWith("/execute")?WORK.execute:undefined});
    if(!response)return;
    setConfirm(false);
    if(response.ok===false)showError(new ClientError("Some shares could not be charged. Review the request and each person’s receipt below.",409));
  }
  return <div className="space-y-8">
    {quoteError && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">{quoteError}</p>}
    {request.status==="cancelled" && !care.payees.some(p=>p.id===request.payeeId) && <p role="status" className="rounded-xl bg-warn-soft p-4 text-sm leading-relaxed text-warn-ink">The hospital’s payment authority changed or was put on hold. This request’s approvals cannot be reused. Review the institution and create a new request after its account is verified again.</p>}
    <Section title={request.purpose} agent="gate" action={<><AskButton question={`How does “${request.purpose}” work?`} context={{ kind: "request", requestId: request.id }} /><Chip tone={request.status==="paid"?"ok":request.status==="pending"?"warn":"muted"}>{request.status==="pending"?(request.remaining?`${money(request.remaining,request.currency)} still missing`:"Covered"):request.status}</Chip></>}>
      {request.documentId && <p className="mb-3 text-sm text-ink-2">Pays the bill <b className="font-semibold text-lead">{documents.find(d=>d.id===request.documentId)?.title ?? "on file"}</b>.</p>}
      <MoneyFigure minor={request.approved} currency={request.currency} /><span className="ml-2 text-ink-2">of {money(request.amount,request.currency)}</span>
      <div className="mt-5 h-5 overflow-hidden rounded-full bg-white"><div className="h-full bg-serpent transition-all" style={{width:`${share(request.approved,request.amount)}%`}} /></div>
      <p className="mt-3 text-xs text-ink-2">Expires {new Date(request.expiresAt).toLocaleString()}</p>
      <ul className="mt-5 divide-y divide-line">{request.approvals.map(p=><li key={p.memberId} className="flex flex-wrap justify-between gap-2 py-3"><span className="font-semibold text-lead">{p.displayName}</span><span className="text-sm text-ink-2">{money(p.amount,request.currency)} · {money(p.payAmount,p.payCurrency)} + {money(p.fee,p.payCurrency)} fee · {p.status}</span></li>)}</ul>
      {care.me.role==="payer" ? <p className="mt-4 text-xs text-ink-2">Other helpers’ pledges are private. The bar shows how much of the request is covered.</p> : care.me.role==="owner" && <Link href="members" className="mt-4 inline-block text-sm font-semibold text-serpent-dark underline">Invite more helpers</Link>}
    </Section>
    {request.status==="pending" && <Section title="Your Pledge" agent="gate">
      {care.me.role==="companion" ? <p>Your companion role can upload documents and ask questions. It cannot approve payments.</p> : mine ? <div className="flex flex-wrap items-center gap-4"><p>You approved {money(mine.amount,request.currency)}.</p><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/approvals/me`,{},"DELETE")} className={SECONDARY}>Withdraw</button></div> : <>
        <label className="block text-sm font-semibold text-ink-2">Your share in {request.currency}<input id="pledge-amount" aria-label="Your pledge amount" inputMode="decimal" value={typed} onChange={e=>{setTyped(e.target.value);const ok=!pledgeError(e.target.value);setAmount(ok?Math.round(Number(e.target.value)*100):0);}} className={`mt-2 block w-full rounded-xl border border-line bg-white p-3 ${pv.invalid("amount")?INVALID:""}`} {...pv.field("amount")} /></label>{pv.error("amount")}
        {quote ? <p className="mt-4 text-lead">You pay <b>{money(quote.payAmount,quote.payCurrency)}</b> plus {money(quote.fee,quote.payCurrency)} fee. Rate {quote.fxRate}. Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.</p> : <p role="status" className="mt-4 text-sm text-ink-2">{amount>0 && amount<=request.remaining ? "Getting your exchange-rate quote…" : "Choose an amount within the remaining balance."}</p>}
        <button type="button" disabled={busy||!quote||new Date(quote.expiresAt).getTime()<=Date.now()} onClick={()=>action(`/payment-requests/${request.id}/approvals`,{amount,quoteId:quote?.quoteId})} className={`${PRIMARY} mt-5`}>Pledge {money(amount,request.currency)}</button>
      </>}
    </Section>}
    {request.status==="pending" && care.me.role==="owner" && <Section title="Review and Pay" agent="gate">
      <p className="mb-4 leading-relaxed text-ink-2">The request must be fully covered. The gateway checks the recipient, permissions, approved amounts and open warnings again before executing.</p>
      {confirm ? <div className="space-y-4"><p className="text-sm text-warn-ink">{mode === "demo" ? "This execution uses an isolated payment sandbox." : "This execution uses Stripe test mode."}</p><p className="font-semibold text-lead">Pay {money(request.amount,request.currency)} to {request.payeeName}, account {request.accountMasked}, using the approved shares above?</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/execute`)} className={PRIMARY}>{busy?<><Spinner/>Paying…</>:"Confirm and pay approved shares"}</button><button type="button" onClick={()=>setConfirm(false)} disabled={busy} className={SECONDARY}>Back</button></div></div> : <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setConfirm(true)} disabled={busy||request.remaining>0} className={PRIMARY}>Review payment</button><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/cancel`)} className={SECONDARY}>Cancel request</button></div>}
    </Section>}
  </div>;
}

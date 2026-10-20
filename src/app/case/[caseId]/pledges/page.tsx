"use client";

import { Select } from "@/components/app/Select";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Chip, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { converted, money, rateLine, share } from "@/lib/format";
import { Arrow, Refund } from "@/components/landing/icons";
import { AskButton } from "@/components/app/Assistant";
import type { Quote } from "@/server/fx";
import { ClientError, explainError, Spinner, useFeedback, useTask, WORK } from "@/components/app/Feedback";
import { INVALID, useFieldErrors } from "@/components/app/FieldError";
import { amount as amountRule, check, text } from "@/lib/validate";
import { paymentPlan } from "@/lib/payment-plan";
import { PaidReceipt, RequestStages, SandboxCheckout } from "@/components/app/PaymentSheet";
import { HospitalMenu } from "@/components/app/HospitalMenu";
import { InvoiceSection } from "@/components/app/InvoiceSection";

export default function PledgesPage() {
  const { case: care, requests, documents } = useCaseData();
  const { call } = useWorkspace();
  const query=useSearchParams();
  const requested=query.get("requestId");
  const requestedId=requests.find(r=>r.id===requested)?.id;
  const [selected,setSelected]=useState(requestedId ?? requests.find(r=>r.status==="pending")?.id ?? requests[0]?.id ?? "");
  useEffect(()=>{if(requestedId)setSelected(requestedId);},[requestedId]);
  // Amounts come from the documents (src/lib/payment-plan.ts). Only an emergency guarantee, which
  // the hospital asks for in a letter Guardian doesn't read yet, is typed in.
  const plan=paymentPlan({documents,requests});
  const [kind,setKind]=useState<"deposit"|"bill"|"guarantee">(plan.bill&&plan.bill.balance>0&&!plan.bill.openId?"bill":plan.deposit&&!plan.deposit.requestedId?"deposit":"guarantee");
  const [end,setEnd]=useState<"low"|"high">("low");
  const [amount,setAmount]=useState("");
  const [purpose,setPurpose]=useState("Emergency guarantee");
  const {busy,run}=useTask();
  const rv=useFieldErrors(check({purpose,amount},{purpose:text("what the hospital asked for",3,120),amount:amountRule("the amount the hospital asked for")}),"request");
  const taken=kind==="deposit"?plan.deposit?.requestedId:kind==="bill"?plan.bill?.openId:null;
  const fixed=taken?null:kind==="deposit"&&plan.deposit?{amount:plan.deposit[end],purpose:"Initial deposit",documentId:plan.deposit.documentId}:kind==="bill"&&plan.bill&&plan.bill.balance>0?{amount:plan.bill.balance,purpose:`${plan.bill.type==="final"?"Final bill":"Interim bill"} balance`,documentId:plan.bill.documentId}:null;
  async function create() {
    if(kind==="guarantee"&&!rv.submit())return;
    if(kind!=="guarantee"&&!fixed)return;
    const body=fixed?{...fixed}:{amount:Math.round(Number(amount)*100),purpose};
    const result=await run(()=>call(`/cases/${care.id}/payment-requests`,"POST",{payeeId:care.payees[0]?.id,expiresInMinutes:120,...body},care.id) as Promise<{id:string}>);
    if(result)setSelected(result.id);
  }
  async function verify() {await run(()=>call(`/cases/${care.id}/payees/verify`,"POST",{},care.id),{work:WORK.verify,retry:true});}
  return <div className="space-y-10">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-2">Requests, pledges and payments to the hospital. Refunds of unused deposits are tracked on their own page.</p><Link href={`/case/${care.id}/refunds`} className={SECONDARY}><Refund className="h-4 w-4" />Refund Tracking<Arrow className="h-4 w-4" /></Link></div>
    {care.me.role==="owner" && <Section title="Payment Requests" agent="gate">
      <p className="mb-4 leading-relaxed text-ink-2">Payments go only to the hospital’s verified account. Each person approves their own share before you review and execute the request.</p>
      <HospitalMenu name={care.hospital.name} account={care.payees[0]?.accountMasked} source={care.payees[0]?.source} directoryHref={`/hospitals?caseId=${care.id}`} busy={busy} onVerify={verify} canVerify={!care.closed}/>
      {!care.payees.length&&<p className="mt-3 text-sm text-ink-2">No verified account yet. Open the hospital above and choose Verify hospital account before requesting a payment.</p>}
      {care.payees.length>0 && !care.closed && <form noValidate onSubmit={e=>{e.preventDefault();void create();}} className="mt-6 space-y-4 rounded-2xl bg-white p-5">
        <div className="grid gap-1 rounded-xl bg-mist p-1 text-sm font-semibold sm:grid-cols-3" role="radiogroup" aria-label="What is this request for">
          {([["deposit","Initial deposit","from the estimate"],["bill","Bill balance","from the latest bill"],["guarantee","Emergency guarantee","amount the hospital asked"]] as const).map(([value,label,hint])=><button key={value} type="button" role="radio" aria-checked={kind===value} onClick={()=>setKind(value)} className={`rounded-lg px-3 py-2 text-left ${kind===value?"bg-serpent text-white":"text-ink-2 hover:text-lead"}`}><span className="block">{label}</span><span className={`block text-xs font-normal ${kind===value?"text-cerulean":"text-ink-2"}`}>{hint}</span></button>)}
        </div>
        {kind==="deposit"&&(plan.deposit?<div className="space-y-3">
          <p className="text-sm leading-relaxed text-ink-2">From <b className="text-lead">{plan.deposit.title}</b>: the hospital estimated {money(plan.deposit.low,care.currency)} to {money(plan.deposit.high,care.currency)}{plan.deposit.assumedStayDays?` for ${plan.deposit.assumedStayDays} days`:""}. Choose which end the hospital asked for.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Deposit amount">{(["low","high"] as const).map(e=><button key={e} type="button" role="radio" aria-checked={end===e} onClick={()=>setEnd(e)} className={`rounded-xl border px-4 py-2.5 text-left ${end===e?"border-serpent bg-firstlight":"border-line hover:border-cerulean"}`}><span className="block text-xs text-ink-2">{e==="low"?"Lower end":"Upper end"}</span><b className="font-num text-serpent-dark">{money(plan.deposit![e],care.currency)}</b></button>)}</div>
        </div>:<p className="rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">Upload the hospital’s estimate first. The deposit is taken from its range.</p>)}
        {kind==="bill"&&(plan.bill?<div className="space-y-2 text-sm leading-relaxed">
          <dl className="divide-y divide-line rounded-xl border border-line px-4">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-2">{plan.bill.type==="final"?"Final bill":"Latest interim bill"} · {plan.bill.title}</dt><dd className="font-semibold text-lead">{money(plan.bill.total,care.currency)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-2">Deposits paid or already requested</dt><dd className="font-semibold text-lead">− {money(plan.bill.committed,care.currency)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="font-semibold text-lead">{plan.bill.balance>0?"Still to pay":"Nothing to pay"}</dt><dd className="font-num text-lg font-extrabold text-serpent-dark">{money(Math.max(0,plan.bill.balance),care.currency)}</dd></div>
          </dl>
          {plan.bill.balance<0&&<p className="text-ok-ink">Deposits are {money(-plan.bill.balance,care.currency)} more than the bill. That comes back as a refund: <Link href={`/case/${care.id}/refunds`} className="font-semibold underline">Refund Tracking</Link>.</p>}
          {plan.superseded.length>0&&<p className="text-xs text-ink-2">{plan.bill.type==="final"?"The final bill covers the whole stay, so it replaces":"The latest bill replaces"} {plan.superseded.map(b=>b.title).join(", ")}.</p>}
        </div>:<p className="rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">Upload an interim or final bill first. The amount is taken from it.</p>)}
        {kind==="guarantee"&&<div className="grid items-start gap-3 sm:grid-cols-2">
          <p className="text-xs leading-relaxed text-ink-2 sm:col-span-2">For a guarantee or top-up the hospital asks for in writing, before there is a bill for it. Enter exactly what their letter says.</p>
          <div className="text-sm text-ink-2"><label htmlFor="request-purpose">What the hospital asked for</label><input id="request-purpose" value={purpose} onChange={e=>setPurpose(e.target.value)} className={`mt-1 w-full rounded-xl border border-line bg-white p-3 text-lead ${rv.invalid("purpose")?INVALID:""}`} {...rv.field("purpose")} />{rv.error("purpose")}</div>
          <div className="text-sm text-ink-2"><label htmlFor="request-amount">Amount in {care.currency}</label><input id="request-amount" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} className={`mt-1 w-full rounded-xl border border-line bg-white p-3 text-lead ${rv.invalid("amount")?INVALID:""}`} {...rv.field("amount")} />{rv.error("amount")}</div>
        </div>}
        {taken&&<p className="rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">{kind==="deposit"?"The deposit from this estimate was already requested.":"A request for this bill is still open."} <button type="button" onClick={()=>setSelected(taken)} className="font-semibold underline">Open that request</button>. Each document is paid through one request.</p>}
        <p className="text-xs leading-relaxed text-ink-2">The money goes only to the hospital’s verified account, never to an account printed on a document.</p>
        <button type="submit" disabled={busy||(kind!=="guarantee"&&!fixed)} className={PRIMARY}>{fixed?`Ask for ${money(fixed.amount,care.currency)}`:"Create request"}</button>
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
  // The owner asks and pays; helpers pledge. An owner who also puts in their own money opts in here.
  const [ownShare,setOwnShare]=useState(false);
  const [checkout,setCheckout]=useState(false);
  // A helper whose share was charged sees the receipt once (remembered per browser).
  const seenKey=`guardian:paid:${request.id}:${care.me.id}`;
  const [receipt,setReceipt]=useState(false);
  useEffect(()=>{if(mine?.status!=="charged"||!mine.chargeRef)return;try{if(!localStorage.getItem(seenKey))setReceipt(true);}catch{setReceipt(true);}},[mine?.status,mine?.chargeRef,seenKey]);
  function closeReceipt(){setReceipt(false);try{localStorage.setItem(seenKey,"1");}catch{}}
  const sandbox=mode==="demo"?"Payment sandbox":"Stripe test mode";
  useEffect(()=>{
    let active=true;setQuote(null);
    if(hasMine || request.status!=="pending" || amount<=0 || amount>request.remaining || care.me.role==="companion")return;
    const timer=setTimeout(()=>{call(`/payment-requests/${requestId}/fx-quote`,"POST",{amount},care.id).then(q=>{if(active){setQuote(q as Quote & {quoteId:string;fxRate:string});setQuoteError("");}}).catch(e=>{if(active){const x=explainError(e);setQuoteError(`${x.title}. ${x.body}`);}});},350);
    return()=>{active=false;clearTimeout(timer);};
  },[amount,requestId,hasMine,request.status,request.remaining,care.id,care.me.id,care.me.role,call]);
  async function action(path:string,body:object={},method="POST") {
    const response=await run(()=>call(path,method,body,care.id) as Promise<{ok?:boolean}>,{work:path.endsWith("/execute")?WORK.execute:undefined});
    if(!response)return;
    setConfirm(false);setCheckout(false);
    if(response.ok===false)showError(new ClientError("Some shares could not be charged. Review the request and each person’s receipt below.",409));
  }
  return <div className="space-y-8">
    {receipt&&mine?.chargeRef&&<PaidReceipt hospital={request.payeeName} receipt={mine.chargeRef} total={money(mine.payAmount+mine.fee,mine.payCurrency)} onClose={closeReceipt}
      rows={[["Request",request.purpose],["Your share",converted(mine.payAmount,mine.payCurrency,mine.amount,request.currency)],...(mine.payCurrency!==request.currency?[["Rate",rateLine(mine.fxRate,request.currency,mine.payCurrency)] as [string,string]]:[]),["Fee",money(mine.fee,mine.payCurrency)],["Paid to",`${request.payeeName} ${request.accountMasked}`]]}/>}
    {quoteError && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">{quoteError}</p>}
    {request.status==="cancelled" && !care.payees.some(p=>p.id===request.payeeId) && <p role="status" className="rounded-xl bg-warn-soft p-4 text-sm leading-relaxed text-warn-ink">The hospital’s payment authority changed or was put on hold. This request’s approvals cannot be reused. Review the institution and create a new request after its account is verified again.</p>}
    <Section title={request.purpose} agent="gate" action={<><AskButton question={`How does “${request.purpose}” work?`} context={{ kind: "request", requestId: request.id }} /><Chip tone={request.status==="paid"?"ok":request.status==="pending"?"warn":"muted"}>{request.status==="pending"?(request.remaining?`${money(request.remaining,request.currency)} still missing`:"Covered"):request.status}</Chip></>}>
      <RequestStages status={request.status} approved={request.approved} amount={request.amount}/>
      {request.documentId && <p className="mb-3 text-sm text-ink-2">{documents.find(d=>d.id===request.documentId)?.type==="estimate"?"Deposit based on the estimate":"Pays the bill"} <b className="font-semibold text-lead">{documents.find(d=>d.id===request.documentId)?.title ?? "on file"}</b>.</p>}
      <MoneyFigure minor={request.approved} currency={request.currency} /><span className="ml-2 text-ink-2">of {money(request.amount,request.currency)}</span>
      <div className="mt-5 h-5 overflow-hidden rounded-full bg-white"><div className="h-full bg-serpent transition-all" style={{width:`${share(request.approved,request.amount)}%`}} /></div>
      <p className="mt-3 text-xs text-ink-2">{request.status==="pending"?<>Expires in <Countdown to={request.expiresAt}/> · {new Date(request.expiresAt).toLocaleString()}. Nothing is charged if it isn’t covered by then.</>:`Expiry ${new Date(request.expiresAt).toLocaleString()}`}</p>
      <ul className="mt-5 divide-y divide-line">{request.approvals.map(p=><li key={p.memberId} className="flex flex-wrap justify-between gap-2 py-3"><span className="font-semibold text-lead">{p.displayName}</span><span className="text-sm text-ink-2">{converted(p.payAmount,p.payCurrency,p.amount,request.currency)}{p.payCurrency!==request.currency&&<> at {rateLine(p.fxRate,request.currency,p.payCurrency)}</>} + {money(p.fee,p.payCurrency)} fee · {p.status==="charged"?"paid":p.status==="charge_failed"?"charge failed":p.status==="approved"?"pledged, not charged yet":p.status}</span>{p.chargeRef&&<span className="w-full text-xs text-ok-ink">Receipt {p.chargeRef} · paid straight to {request.payeeName} {request.accountMasked}</span>}</li>)}</ul>
      {care.me.role==="payer" ? <p className="mt-4 text-xs text-ink-2">Other helpers’ pledges are private. The bar shows how much of the request is covered.</p> : care.me.role==="owner" && request.status==="pending" && !care.closed && <Link href="members" className="mt-4 inline-block text-sm font-semibold text-serpent-dark underline">Invite more helpers</Link>}
    </Section>
    {request.status==="paid" && <InvoiceSection request={request}/>}
    {request.status==="pending" && !care.closed && <Section title={care.me.role==="owner"?"Your Own Share":"Your Pledge"} agent="gate">
      {care.me.role==="owner"&&!mine&&!ownShare ? <div className="space-y-3"><p className="leading-relaxed text-ink-2">Your helpers pledge their shares of this request. You don’t have to pledge: when it is covered, you review and pay it below.</p><button type="button" onClick={()=>setOwnShare(true)} className={SECONDARY}>I’m also paying part of this myself</button></div> : care.me.role==="companion" ? <p>Your companion role can upload documents and ask questions. It cannot approve payments.</p> : mine ? <div className="flex flex-wrap items-center gap-4"><p>You pledged {converted(mine.payAmount,mine.payCurrency,mine.amount,request.currency)}. Your card is charged only when the owner pays the hospital.</p><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/approvals/me`,{},"DELETE")} className={SECONDARY}>Withdraw</button></div> : <>
        <label className="block text-sm font-semibold text-ink-2">Your share in {request.currency}<input id="pledge-amount" aria-label="Your pledge amount" inputMode="decimal" value={typed} onChange={e=>{setTyped(e.target.value);const ok=!pledgeError(e.target.value);setAmount(ok?Math.round(Number(e.target.value)*100):0);}} className={`mt-2 block w-full rounded-xl border border-line bg-white p-3 ${pv.invalid("amount")?INVALID:""}`} {...pv.field("amount")} /></label>{pv.error("amount")}
        {quote ? <div className="mt-4 space-y-1 text-lead"><p>You pay <b>{converted(quote.payAmount,quote.payCurrency,quote.amount,quote.currency)}</b> plus a {money(quote.fee,quote.payCurrency)} fee, so <b>{money(quote.payAmount+quote.fee,quote.payCurrency)}</b> in total.</p>{quote.payCurrency!==quote.currency&&<p className="text-sm text-ink-2">Demo reference rate {rateLine(quote.fxRate,quote.currency,quote.payCurrency)}. The hospital receives {money(quote.amount,quote.currency)}. Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}.</p>}</div> : <p role="status" className="mt-4 text-sm text-ink-2">{amount>0 && amount<=request.remaining ? "Getting your exchange-rate quote…" : "Choose an amount within the remaining balance."}</p>}
        <button type="button" disabled={busy||!quote||new Date(quote.expiresAt).getTime()<=Date.now()} onClick={()=>setCheckout(true)} className={`${PRIMARY} mt-5`}>Pledge {money(amount,request.currency)}</button>
        {checkout&&quote&&<SandboxCheckout sandbox={sandbox} hospital={request.payeeName} busy={busy} total={money(quote.payAmount+quote.fee,quote.payCurrency)} onClose={()=>setCheckout(false)} onConfirm={()=>action(`/payment-requests/${request.id}/approvals`,{amount,quoteId:quote.quoteId})}
          rows={[["Request",request.purpose],["Your share",converted(quote.payAmount,quote.payCurrency,quote.amount,quote.currency)],...(quote.payCurrency!==quote.currency?[["Rate",rateLine(quote.fxRate,quote.currency,quote.payCurrency)] as [string,string]]:[]),["Fee",money(quote.fee,quote.payCurrency)],["Paid to",`${request.payeeName} ${request.accountMasked}`]]}/>}
      </>}
    </Section>}
    {request.status==="pending" && care.me.role==="owner" && !care.closed && <Section title="Review and Pay" agent="gate">
      <p className="mb-4 leading-relaxed text-ink-2">The request must be fully covered. The gateway checks the recipient, permissions, approved amounts and open warnings again before executing.</p>
      {confirm ? <div className="space-y-4"><p className="text-sm text-warn-ink">{mode === "demo" ? "This execution uses an isolated payment sandbox." : "This execution uses Stripe test mode."}</p><p className="font-semibold text-lead">Pay {money(request.amount,request.currency)} to {request.payeeName}, account {request.accountMasked}, using the approved shares above?</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/execute`)} className={PRIMARY}>{busy?<><Spinner/>Paying…</>:"Confirm and pay approved shares"}</button><button type="button" onClick={()=>setConfirm(false)} disabled={busy} className={SECONDARY}>Back</button></div></div> : <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>setConfirm(true)} disabled={busy||request.remaining>0} className={PRIMARY}>Review payment</button><button type="button" disabled={busy} onClick={()=>action(`/payment-requests/${request.id}/cancel`)} className={SECONDARY}>Cancel request</button></div>}
    </Section>}
  </div>;
}

/** Time left until a pledge request expires, updated every 30 seconds. */
function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const left = Math.max(0, new Date(to).getTime() - now);
  const h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000);
  return <b className="font-semibold text-lead">{left === 0 ? "now" : h ? `${h} h ${m} min` : `${m} min`}</b>;
}


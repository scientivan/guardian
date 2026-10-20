"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PRIMARY, SECONDARY } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import type { Action } from "@/server/agent";
import { Dots, Spinner, useFeedback, useTask } from "@/components/app/Feedback";
import { AGENT_BY_ID } from "@/components/landing/agents";
import { Minifig } from "@/components/landing/Minifig";

const PLANNER=AGENT_BY_ID.planner;

type Message={from:"me"|"agent";text:string;actions?:Action[]};
export default function ChatPage() {
  const {case:care}=useCaseData();const {call}=useWorkspace();const router=useRouter();
  const [messages,setMessages]=useState<Message[]>([]);const [draft,setDraft]=useState("");const {busy,run}=useTask();const {showError}=useFeedback();const [pending,setPending]=useState<string|null>(null);const [loaded,setLoaded]=useState(false);
  useEffect(()=>{let active=true;call(`/cases/${care.id}/chat`,"GET",undefined,care.id).then(rows=>{if(active)setMessages((rows as {question:string;reply:string;actions:string}[]).flatMap(r=>[{from:"me",text:r.question},{from:"agent",text:r.reply,actions:JSON.parse(r.actions)}]));}).catch(e=>{if(active)showError(e);}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[care.id,care.me.id,call,showError]);
  async function ask(text:string) {
    if(!text.trim()||busy)return;setPending(text);setDraft("");
    const response=await run(()=>call(`/cases/${care.id}/chat`,"POST",{message:text},care.id) as Promise<{reply:string;actions:Action[]}>,{retry:true});
    setPending(null);
    if(response)setMessages(m=>[...m,{from:"me",text},{from:"agent",text:response.reply,actions:response.actions}]);
    else setDraft(text);
  }
  function send(e:FormEvent){e.preventDefault();void ask(draft);}
  async function prepare(a:Extract<Action,{type:"prepare_payment"}>) {const done=await run(()=>call(`/cases/${care.id}/payment-requests`,"POST",{payeeId:a.payeeId,documentId:a.documentId,amount:a.amount,purpose:"Hospital bill payment",expiresInMinutes:120},care.id));if(done)router.push(`/case/${care.id}/pledges`);}
  return <div className="space-y-6">
    {!loaded&&<p role="status" className="flex items-center gap-3 text-ink-2"><Spinner className="h-5 w-5 text-serpent"/>Loading your conversation…</p>}
    {loaded&&!messages.length&&!pending&&<p className="leading-relaxed text-ink-2">Ask about a bill, a payment or a refund. The assistant can explain and prepare next steps. Your approval is always required to pay.</p>}
    <ol className="space-y-4">{messages.map((m,i)=><li key={i} className={m.from==="me"?"ml-auto max-w-xl":"max-w-xl"}>{!(m.from==="agent"&&m.actions?.some(a=>a.type==="warning"&&a.text===m.text))&&<div className={`rounded-2xl px-4 py-3 leading-relaxed ${m.from==="me"?"bg-serpent text-white":"bg-mist text-lead"}`}>{m.text}</div>}<div className="mt-2 flex flex-wrap gap-2">{m.actions?.map((a,j)=>{
      if(a.type==="warning")return <p key={j} className="rounded-xl bg-danger-soft p-3 text-sm text-danger-ink">{a.text}</p>;
      if(a.type==="explain_bill")return <Link key={j} className={SECONDARY} href={`/case/${care.id}/bill?documentId=${encodeURIComponent(a.documentId)}`}>Explain this bill</Link>;
      if(a.type==="request_approval")return <Link key={j} className={SECONDARY} href={`/case/${care.id}/pledges?requestId=${encodeURIComponent(a.requestId)}`}>Review your pledge</Link>;
      if(a.type==="track_refund")return <Link key={j} className={SECONDARY} href={`/case/${care.id}/refunds`}>View refunds</Link>;
      if(a.type==="ask_hospital")return a.channel.startsWith("https://")?<a key={j} className={SECONDARY} href={a.channel} target="_blank" rel="noreferrer">Official billing channel</a>:null;
      if(a.type==="prepare_payment")return <button key={j} type="button" disabled={busy||care.me.role!=="owner"} onClick={()=>prepare(a)} className={SECONDARY}>Prepare payment request</button>;
      if(a.type==="ask_clarification")return a.options.map(o=><button key={o.value} type="button" disabled={busy} className={SECONDARY} onClick={()=>ask(a.question==="amount"?`${[...messages.slice(0,i)].reverse().find(m=>m.from==="me")?.text??""} Pay ${Number(o.value)/100} ${care.currency}.`:a.question==="which_request"?`Approve my share of request ${o.value}`:`${[...messages.slice(0,i)].reverse().find(m=>m.from==="me")?.text??""} Bill ${o.value}.`)}>{o.label}</button>);
      return null;
    })}</div></li>)}
    {pending&&<li className="ml-auto max-w-xl"><div className="rounded-2xl bg-serpent px-4 py-3 leading-relaxed text-white opacity-80">{pending}</div></li>}
    {pending&&<li role="status" className="flex max-w-xl items-end gap-2"><Minifig skin={PLANNER.skin} hair={PLANNER.hair} hijab={PLANNER.hijab} shirt={PLANNER.color} className="work-hop h-10 w-10 shrink-0"/><div className="flex items-center gap-3 rounded-2xl bg-mist px-4 py-3 text-sm text-ink-2"><Dots/>{PLANNER.name} is thinking</div></li>}
    </ol>
    <form onSubmit={send} className="sticky bottom-20 flex gap-2 bg-white py-2 lg:bottom-4"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ask about your care case" aria-label="Message to the agent" maxLength={2000} className="min-w-0 flex-1 rounded-full border border-line px-4 py-3 text-lead"/><button type="submit" disabled={busy||!draft.trim()} className={PRIMARY}>{busy?<><Spinner/>Thinking…</>:"Send"}</button></form>
  </div>;
}

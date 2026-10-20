"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";

import Link from "next/link";
import { CopyButton } from "@/components/app/CopyButton";
import { MoneyBreakdown } from "@/components/app/MoneyBreakdown";
import { Chip, Figure, FoldSection, MoneyFigure, Section, SECONDARY, type Tone } from "@/components/app/ui";
import type { AgentId } from "@/components/landing/agents";
import { money, share } from "@/lib/format";
import type { LineType } from "@/lib/demo";

// Bill Review (TASKS 2.5): the bill against the estimate, the cost breakdown, the questions
// for the hospital, and the reasons folded away until someone wants them.

const REASONS: { type: LineType; title: string; tone: Tone; chip: string; agent: AgentId }[] = [
  { type: "arithmetic_fact", title: "Calculated from the Bill", tone: "info", chip: "Fact", agent: "calculator" },
  { type: "stated_in_document", title: "Stated in the Hospital’s Documents", tone: "brown", chip: "In the documents", agent: "reader" },
];

export default function BillPage() {
  const { explanation: e, items: ITEMS,documents,case:care,secondCheckStatus } = useCaseData();
  const {call}=useWorkspace();
  const query=useSearchParams();
  const [selected,setSelected]=useState(query.get("documentId")??e?.documentId??documents.find(d=>d.type!=="estimate"&&d.status==="parsed")?.id??"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function refreshExplanation() {
    setBusy(true);setError("");
    try{await call(`/cases/${care.id}/explanation?documentId=${encodeURIComponent(selected)}`,"POST",{},care.id);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  useEffect(()=>{if(query.get("documentId"))setSelected(query.get("documentId")!);},[query]);
  const target=query.get("documentId");
  useEffect(()=>{
    if(!target)return;
    if(target===e?.documentId){setBusy(false);return;}
    let active=true;setBusy(true);setError("");
    call(`/cases/${care.id}/explanation?documentId=${encodeURIComponent(target)}`,"POST",{},care.id).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[target,e?.documentId,care.id,call]);
  const controls=<div className="space-y-3"><label className="block text-sm font-semibold text-ink-2">Bill to review<select aria-label="Bill to review" value={selected} onChange={event=>setSelected(event.target.value)} className="mt-2 block w-full rounded-xl border border-line bg-white p-3">{documents.filter(d=>d.type!=="estimate").map(d=><option key={d.id} value={d.id}>{d.title} · {d.status}</option>)}</select></label><button type="button" disabled={!selected||busy} onClick={refreshExplanation} className={SECONDARY}>{busy?"Reading and checking…":"Explain selected bill"}</button>{error && <p role="alert" className="text-danger-ink">{error}</p>}</div>;
  if (!e) return <Section title="Bill Review" agent="reader">{controls}<p className="mt-4">Upload an estimate and a bill to see the comparison.</p><Link href="upload" className="mt-4 inline-block font-semibold text-serpent-dark underline">Upload a bill</Link></Section>;
  const scale=Math.max(e.estimate.high,e.estimate.low,e.total,1)*1.1;
  const at=(value:number)=>Math.max(0,Math.min(100,share(value,scale)));
  const questionsText = e.questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n");

  return (
    <div className="space-y-12">
      {controls}
      {secondCheckStatus && <p className="text-sm text-ink-2">{secondCheckStatus.startsWith("second model unavailable")?"The independent reader is currently unavailable. Review the cited lines with the hospital.":secondCheckStatus}</p>}
      <Section title="Estimate vs. Bill" agent="calculator">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-ink-2">Estimated range</p>
            <p className="mt-1">
              <Figure code={e.currency} value={`${money(e.estimate.low, "").trim()}–${money(e.estimate.high, "").trim()}`} />
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-ink-2">Bill so far</p>
            <p className="mt-1">
              <MoneyFigure minor={e.total} currency={e.currency} />
            </p>
          </div>
        </div>
        <div className="relative mt-6 h-4 rounded-full bg-white" aria-hidden="true">
          <div className="grow-x absolute inset-y-0 rounded-full bg-cerulean" style={{ left: `${at(e.estimate.low)}%`, width: `${at(e.estimate.high) - at(e.estimate.low)}%` }} />
          <div className="absolute -top-2 h-8 w-1.5 -translate-x-1/2 rounded-sm bg-serpent ring-2 ring-white" style={{ left: `${at(e.total)}%` }} />
        </div>
      </Section>

      <Section title="Cost Breakdown" agent="reader">
        <MoneyBreakdown byCategory={e.byCategory} total={e.total} currency={e.currency} items={Object.values(ITEMS)} />
      </Section>

      <FoldSection title={`Questions for the Hospital (${e.questions.length})`} agent="planner">
        <ol className="space-y-3">
          {e.questions.map((q, i) => (
            <li key={q.text} className="flex gap-4">
              <span className="w-5 text-lg font-extrabold leading-7 tabular-nums text-serpent">{i + 1}</span>
              <p className="text-lg leading-7 text-lead">{q.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <CopyButton text={questionsText} label="Copy questions" />
          <Link href="chat" className={SECONDARY}>
            Ask the assistant
          </Link>
        </div>
      </FoldSection>

      {REASONS.map((r) => {
        const lines = e.lines.filter((l) => l.type === r.type);
        return (
          <FoldSection key={r.type} title={`${r.title} (${lines.length})`} agent={r.agent}>
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.text} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <Chip tone={r.tone} className="mt-0.5">
                    {r.chip}
                  </Chip>
                  <p className="min-w-0 flex-1 leading-relaxed text-lead">
                    {l.text}
                    {l.amount !== undefined && <b className="whitespace-nowrap tabular-nums"> +{money(l.amount, e.currency)}</b>}
                    <span className="ml-2 text-xs text-ink-2">{l.itemIds.join(", ")}</span>
                  </p>
                </li>
              ))}
            </ul>
          </FoldSection>
        );
      })}
    </div>
  );
}

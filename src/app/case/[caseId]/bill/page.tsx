"use client";

import { Select } from "@/components/app/Select";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { ClientError, useFeedback, useTask } from "@/components/app/Feedback";

import Link from "next/link";
import { CopyButton } from "@/components/app/CopyButton";
import { MoneyBreakdown } from "@/components/app/MoneyBreakdown";
import { Chip, Figure, FoldSection, MoneyFigure, PRIMARY, Section, type Tone } from "@/components/app/ui";
import { Upload } from "@/components/landing/icons";
import { AskButton } from "@/components/app/Assistant";
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
  useEffect(()=>{if(query.get("documentId"))setSelected(query.get("documentId")!);},[query]);
  const bills=documents.filter(d=>d.type!=="estimate");
  const controls=<div className="space-y-3"><div className="block text-sm font-semibold text-ink-2">Bill to review<Select label="Bill to review" className="mt-2" value={selected} onChange={setSelected} disabled={!bills.length} placeholder="No bills uploaded yet" options={bills.map(d=>({value:d.id,label:d.title,hint:`${d.type==="final"?"Final bill":"Interim bill"} · ${d.status==="needs_reupload"?"needs a clearer copy":d.status==="parsed"?"read":d.status}`}))}/></div>{selected&&<AskButton question={`Explain ${bills.find(d=>d.id===selected)?.title??"this bill"}`} context={{kind:"bill",documentId:selected}} label="Ask about this bill" />}</div>;
  const helper=care.me.role==="payer";
  const {busy:checking,run:runCheck}=useTask();
  const {showError:notify}=useFeedback();
  async function questionItem(itemId:string) {
    if(!e)return;
    const r=await runCheck(()=>call(`/cases/${care.id}/second-check`,"POST",{documentId:e.documentId,itemIds:[itemId]},care.id) as Promise<{checked:string[];disagreements:unknown[];unavailable:boolean;reason:string|null}>,{work:{title:"Getting a second opinion",steps:[{agent:"second",text:`Re-reading ${itemId} with a different AI provider`},{agent:"calculator",text:"Comparing both readings"}]}});
    if(r?.unavailable)notify(new ClientError("The independent second reader is not available right now. Nothing changed; you can ask the hospital about this line directly.",503));
  }
  const upload=helper?undefined:<Link href={`/case/${care.id}/upload`} className={PRIMARY}><Upload className="h-4 w-4" />Upload a bill</Link>;
  if (!e) return <Section title="Bill Review" agent="reader" action={upload}>{controls}<p className="mt-4 text-ink-2">Upload the hospital’s estimate and a bill to see the comparison.</p></Section>;
  const scale=Math.max(e.estimate.high,e.estimate.low,e.total,1)*1.1;
  const at=(value:number)=>Math.max(0,Math.min(100,share(value,scale)));
  const questionsText = e.questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n");

  return (
    <div className="space-y-12">
      <Section title="Bill Review" agent="reader" action={upload}>{controls}</Section>
      {secondCheckStatus && <p className="text-sm text-ink-2">{secondCheckStatus.startsWith("second model unavailable")?"The independent reader is currently unavailable. Review the cited lines with the hospital.":secondCheckStatus}</p>}
      <Section title="Estimate vs. Bill" agent="calculator" action={<AskButton question="Why is the bill different from the estimate?" context={{ kind: "estimate" }} label="Why is it different?" />}>
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

      <Section title="Cost Breakdown" agent="reader" action={<AskButton question="What is the bill made of?" context={{ kind: "breakdown" }} label="Explain the breakdown" />}>
        <MoneyBreakdown byCategory={e.byCategory} total={e.total} currency={e.currency} items={Object.values(ITEMS)} checked={e.secondModelChecked} busy={checking} onQuestion={helper||care.closed ? undefined : questionItem} />
        {!helper && <p className="mt-3 text-xs leading-relaxed text-ink-2">Open a group to see its lines. “Double-check” asks a second AI from a different provider to re-read a line you’re unsure about; if it reads it differently, it becomes a question for the hospital.</p>}
      </Section>

      {helper && <p className="text-sm leading-relaxed text-ink-2">As a payer you see the bill summary and the calculated reasons. Bill lines, documents and the questions for the hospital stay with the case owner.</p>}
      {e.referenceNote && !helper && <p className="text-xs leading-relaxed text-ink-2">{e.referenceNote}</p>}
      {e.questions.length > 0 && <FoldSection title={`Questions for the Hospital (${e.questions.length})`} agent="planner">
        <ol className="space-y-3">
          {e.questions.map((q, i) => (
            <li key={q.text} className="flex flex-wrap items-start gap-x-4 gap-y-1">
              <span className="w-5 text-lg font-extrabold leading-7 tabular-nums text-serpent">{i + 1}</span>
              <p className="min-w-0 flex-1 text-lg leading-7 text-lead">{q.text}</p>
              <AskButton question={`Help me understand: ${q.text}`} context={{ kind: "question", index: i }} className="mt-1" />
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <CopyButton text={questionsText} label="Copy questions" />

        </div>
      </FoldSection>}

      {REASONS.map((r) => {
        const lines = e.lines.filter((l) => l.type === r.type);
        if (!lines.length) return null;
        return (
          <FoldSection key={r.type} title={`${r.title} (${lines.length})`} agent={r.agent}>
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.text} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <AskButton question={`Explain this: ${l.text}`} context={{ kind: "line", index: e.lines.indexOf(l) }} className="order-last mt-0.5" />
                  <Chip tone={r.tone} className="mt-0.5">
                    {r.chip}
                  </Chip>
                  <p className="min-w-0 flex-1 leading-relaxed text-lead">
                    {l.text}
                    {l.amount !== undefined && <b className="whitespace-nowrap tabular-nums"> +{money(l.amount, e.currency)}</b>}
                    <span className="ml-2 text-xs text-ink-2">{l.type === "stated_in_document" ? "Document-wide note. Confirm affected items with the hospital." : l.itemIds.join(", ")}</span>
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

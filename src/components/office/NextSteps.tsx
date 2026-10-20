"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCaseData } from "@/components/app/WorkspaceProvider";
import { Check, Chevron } from "@/components/landing/icons";

// "What to do next" on the Agent Office: the case's steps in order, ticked from the case data
// itself, with the first open step as the one button to press. Each role sees its own steps.

type Step = { title: string; detail: string; done: boolean; href: string; action: string };

export function NextSteps() {
  const care = useCaseData();
  const { case: c, documents, explanation, requests, refunds } = care;
  const base = `/case/${c.id}`;
  const [open, setOpen] = useState(true);
  const key = `guardian.next-steps.${c.id}`;
  const [showDone, setShowDone] = useState(false);
  // Phones start folded so the office stays visible; a saved choice wins either way.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(key); } catch { /* storage blocked */ }
    setOpen(saved ? saved === "open" : window.matchMedia("(min-width: 768px)").matches);
  }, [key]);
  function toggle() { setOpen(o => { try { localStorage.setItem(key, o ? "closed" : "open"); } catch { /* storage blocked */ } return !o; }); }

  const hasEstimate = documents.some(d => d.type === "estimate" && d.status === "parsed");
  const hasBill = documents.some(d => d.type !== "estimate" && d.status === "parsed");
  const pending = requests.find(r => r.status === "pending");
  const mine = pending?.approvals.some(a => a.memberId === c.me.id && a.status === "approved");
  const steps: Step[] = c.me.role === "owner" ? [
    { title: "Upload the hospital’s estimate", detail: "The cost estimate you received before treatment.", done: hasEstimate, href: `${base}/upload`, action: "Upload estimate" },
    { title: "Upload a bill", detail: "An interim or final bill, as a PDF or photo.", done: hasBill, href: `${base}/upload`, action: "Upload bill" },
    { title: "Read the bill explanation", detail: "Why the cost changed, and questions to ask the hospital.", done: Boolean(explanation), href: `${base}/bill`, action: "Open Bill Review" },
    { title: "Invite the people who will help pay", detail: "Family or friends, each with their own share limit.", done: c.members.length > 1, href: `${base}/members`, action: "Invite helpers" },
    { title: "Verify the hospital’s account", detail: "Guardian only pays the hospital’s verified account.", done: c.payees.length > 0, href: `${base}/pledges`, action: "Verify account" },
    { title: "Create a payment request", detail: "A deposit or guarantee the hospital asked for.", done: requests.length > 0, href: `${base}/pledges`, action: "Create request" },
    { title: "Collect pledges and pay", detail: "Each helper approves their own share; you pay once it’s covered.", done: requests.some(r => r.status === "paid"), href: `${base}/pledges`, action: "Open Pledges" },
    { title: "Track refunds after the final bill", detail: "Unused deposits go back in proportion to what each person paid.", done: Boolean(refunds), href: `${base}/refunds`, action: "Refund Tracking" },
  ] : c.me.role === "payer" ? [
    { title: "Read the bill summary", detail: "What the hospital billed and why it changed.", done: Boolean(explanation), href: `${base}/bill`, action: "Open Bill Review" },
    { title: "Pledge your share", detail: "Approve only what you can give, in your own currency.", done: !pending || Boolean(mine), href: `${base}/pledges`, action: "Open Pledges" },
    { title: "Follow your refund", detail: "If the final bill is lower, your part comes back to you.", done: Boolean(refunds), href: `${base}/refunds`, action: "Refund Tracking" },
  ] : [
    { title: "Upload the estimate and bills", detail: "Photos or PDFs from the hospital.", done: hasEstimate && hasBill, href: `${base}/upload`, action: "Upload" },
    { title: "Ask the case assistant", detail: "Questions about a bill or what to ask the hospital.", done: false, href: `${base}/chat`, action: "Open assistant" },
  ];
  const next = steps.find(s => !s.done);
  const doneCount = steps.filter(s => s.done).length;

  return (
    <div data-office-panel onPointerDown={e => e.stopPropagation()} className="absolute left-3 top-3 z-10 w-[min(22rem,calc(100%-1.5rem))] touch-auto select-text overflow-hidden rounded-2xl bg-white/95 shadow-[0_22px_34px_-24px_rgba(32,33,33,0.55)] backdrop-blur">
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls="next-steps" className="flex w-full items-center gap-3 bg-serpent-dark px-4 py-3 text-left text-white">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">What to do next</span>
          <span className="block text-xs text-cerulean">{next ? `${doneCount} of ${steps.length} done · ${next.title}` : "All steps done"}</span>
        </span>
        <Chevron className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id="next-steps" className="max-h-[min(26rem,55vh)] overflow-y-auto p-3">
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-firstlight"><div className="h-full rounded-full bg-serpent transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
          {doneCount > 0 && <button type="button" onClick={() => setShowDone(d => !d)} className="mb-1 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-ok-ink hover:bg-mist"><span className="grid h-5 w-5 place-items-center rounded-full bg-ok text-white"><Check className="h-3 w-3" /></span>{doneCount} done{showDone ? "" : " · show"}<Chevron className={`ml-auto h-4 w-4 transition-transform ${showDone ? "rotate-180" : ""}`} /></button>}
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const current = s === next;
              if (s.done && !showDone) return null;
              return (
                <li key={s.title} className={`flex gap-3 rounded-xl px-2 py-2 ${current ? "bg-firstlight" : ""}`}>
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? "bg-ok text-white" : current ? "bg-serpent text-white" : "bg-mist text-ink-2"}`}>{s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${s.done ? "text-ink-2 line-through decoration-ink-2/40" : current ? "font-semibold text-lead" : "text-lead"}`}>{s.title}</span>
                    {current && <><span className="mt-0.5 block text-xs leading-relaxed text-ink-2">{s.detail}</span><Link href={s.href} className="mt-2 inline-flex min-h-9 items-center rounded-full bg-serpent px-4 text-xs font-semibold text-white hover:bg-serpent-dark">{s.action}</Link></>}
                  </span>
                </li>
              );
            })}
          </ol>
          {!next && <p className="px-2 py-2 text-sm text-ok-ink">Everything is done for this care case.</p>}
        </div>
      )}
    </div>
  );
}

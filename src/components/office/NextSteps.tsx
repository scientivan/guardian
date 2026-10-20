"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCaseData } from "@/components/app/WorkspaceProvider";
import { Check } from "@/components/landing/icons";
import { ScrollArea } from "@/components/app/ScrollArea";

// "What to do next" on the Agent Office: the case's steps in order, ticked from the case data
// itself, with the first open step as the one button to press. Each role sees its own steps.

type Step = { title: string; detail: string; done: boolean; href: string; action: string };

export function NextSteps() {
  const care = useCaseData();
  const { case: c, documents, explanation, requests, refunds } = care;
  const base = `/case/${c.id}`;
  const strip = useRef<HTMLOListElement>(null);
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
    { title: "Ask the family for a payment", detail: "You set what is needed: a deposit from the estimate, a bill balance, or a guarantee. Nothing is charged yet.", done: requests.length > 0, href: `${base}/pledges`, action: "Create request" },
    { title: "Helpers pledge, then you pay", detail: "Each helper approves their own share. When the pledges reach 100%, you confirm and each share goes to the hospital.", done: requests.some(r => r.status === "paid"), href: `${base}/pledges`, action: "Open Pledges" },
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

  // Keep the current step in view when the strip is wider than the screen.
  useEffect(() => { strip.current?.querySelector("[data-current]")?.scrollIntoView({ block: "nearest", inline: "center" }); }, [next?.title]);

  return (
    <section aria-labelledby="next-steps-title" className="z-10 min-w-0 shrink-0 border-t border-line bg-firstlight/70 px-3 pb-2 pt-2 sm:px-5 sm:pt-3">
      <div className="mb-2 flex items-center gap-3">
        <h2 id="next-steps-title" className="text-sm font-semibold text-serpent-dark">What to do next</h2>
        <span className="text-xs text-ink-2">{next ? `${doneCount} of ${steps.length} done` : "All steps done"}</span>
        <div className="ml-auto hidden h-1.5 w-40 overflow-hidden rounded-full bg-white sm:block"><div className="h-full rounded-full bg-serpent transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      </div>
      <ScrollArea axis="x" label="Steps for this care case" fade="from-[#e8f0f4]">
      <ol ref={strip} className="flex gap-3 pb-2">
        {steps.map((s, i) => {
          const current = s === next;
          return (
            <li key={s.title} data-current={current || undefined} className={`flex shrink-0 gap-3 rounded-xl px-3 py-2.5 ${current ? "w-80 bg-white shadow-[0_12px_24px_-18px_rgba(32,33,33,0.5)] ring-2 ring-serpent" : "w-56 bg-white/70"}`}>
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${s.done ? "bg-ok text-white" : current ? "bg-serpent text-white" : "bg-mist text-ink-2"}`}>{s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm leading-snug ${s.done ? "text-ink-2 line-through decoration-ink-2/40" : current ? "font-semibold text-lead" : "text-lead"}`}>{s.title}</span>
                {current
                  ? <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5"><span className="text-xs leading-relaxed text-ink-2 [@media(max-height:600px)]:hidden">{s.detail}</span><Link href={s.href} className="inline-flex min-h-8 items-center rounded-full bg-serpent px-3.5 text-xs font-semibold text-white hover:bg-serpent-dark">{s.action}</Link></span>
                  : !s.done && <Link href={s.href} className="mt-1 inline-block text-xs font-semibold text-serpent-dark hover:underline">{s.action}</Link>}
              </span>
            </li>
          );
        })}
      </ol>
      </ScrollArea>
    </section>
  );
}

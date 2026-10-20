"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "@/components/landing/icons";
import { Spinner } from "./Feedback";
import { PRIMARY, SECONDARY } from "./ui";

// What happens to the money, made visible: the stage strip on a request card, the sandbox checkout a
// helper confirms when pledging, and the receipt a helper sees once their share was actually paid.

const STAGES = [
  { key: "requested", label: "Requested", note: "The owner asked the family" },
  { key: "pledging", label: "Pledging", note: "Helpers promise shares" },
  { key: "covered", label: "Covered", note: "100% promised" },
  { key: "paid", label: "Paid", note: "Charged and sent to the hospital" },
] as const;

/** Where a request is, and whether any money has moved yet. */
export function RequestStages({ status, approved, amount }: { status: string; approved: number; amount: number }) {
  const at = status === "paid" ? 3 : status === "executing" || (status === "pending" && approved >= amount) ? 2 : approved > 0 ? 1 : 0;
  const stopped = ["expired", "cancelled", "failed"].includes(status);
  const money = status === "paid" ? { tone: "bg-ok-soft text-ok-ink", text: "Money moved: each share was charged to its helper and paid straight to the hospital." }
    : status === "failed" ? { tone: "bg-danger-soft text-danger-ink", text: "Some shares could not be charged. See each receipt below." }
    : stopped ? { tone: "bg-mist text-ink-2", text: `This request ${status === "expired" ? "expired" : "was cancelled"}. Nothing was charged.` }
    : status === "executing" ? { tone: "bg-warn-soft text-warn-ink", text: "Paying now: shares are being charged one by one." }
    : { tone: "bg-firstlight text-serpent-dark", text: "No money has moved yet. Pledges are promises; cards are charged only when the owner pays the hospital." };
  return (
    <div className="mb-5 space-y-3">
      <ol className="grid grid-cols-4 gap-2" aria-label="Request progress">
        {STAGES.map((s, i) => {
          const done = !stopped && i < at || status === "paid" && i === 3, now = !stopped && i === at && status !== "paid";
          return (
            <li key={s.key} aria-current={now ? "step" : undefined} className="min-w-0">
              <div className={`h-1.5 rounded-full ${done ? "bg-serpent" : now ? "bg-cerulean" : "bg-white"}`} />
              <p className={`mt-2 flex items-center gap-1 truncate text-xs font-semibold ${done || now ? "text-serpent-dark" : "text-ink-2"}`}>{done && <Check className="h-3.5 w-3.5 shrink-0" />}{s.label}</p>
              <p className="hidden truncate text-xs text-ink-2 sm:block">{s.note}</p>
            </li>
          );
        })}
      </ol>
      <p role="status" className={`rounded-xl px-3 py-2 text-sm ${money.tone}`}>{money.text}</p>
    </div>
  );
}

function Sheet({ title, kicker, onClose, children }: { title: string; kicker: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="sheet-title" className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[1.75rem] bg-white p-0 text-lead shadow-[0_30px_60px_-30px_rgba(32,33,33,0.55)] backdrop:bg-lead/40 backdrop:backdrop-blur-[2px]">
      <div className="pop bg-serpent px-6 pb-4 pt-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{kicker}</p>
        <h2 id="sheet-title" className="mt-1 text-xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </dialog>
  );
}

const Row = ({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-4 py-2"><dt className="text-ink-2">{k}</dt><dd className={`text-right ${strong ? "font-num text-lg font-extrabold text-serpent-dark" : "font-semibold"}`}>{v}</dd></div>
);

/** Sandbox checkout a helper confirms when pledging. The card is Stripe's test card; it is charged at execution. */
export function SandboxCheckout({ rows, total, hospital, sandbox, busy, onConfirm, onClose }: {
  rows: [string, string][]; total: string; hospital: string; sandbox: string; busy: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Sheet title={`Pledge ${total}`} kicker={sandbox} onClose={onClose}>
      <dl className="divide-y divide-line text-sm">{rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}<Row k="Total from your card" v={total} strong /></dl>
      <div className="rounded-2xl border border-line p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">Card</p>
        <p className="mt-1 font-num text-lead">VISA •••• 4242 · 12/34</p>
        <p className="mt-1 text-xs text-ink-2">Stripe test card. No real money moves.</p>
      </div>
      <p className="text-sm leading-relaxed text-ink-2">Your card is <b className="text-lead">not charged now</b>. It is charged only when the request is fully covered and the owner pays {hospital}. You can withdraw until then.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={onConfirm} className={PRIMARY}>{busy ? <><Spinner />Authorizing…</> : "Authorize pledge"}</button>
        <button type="button" disabled={busy} onClick={onClose} className={SECONDARY}>Back</button>
      </div>
    </Sheet>
  );
}

/** Shown once to a helper whose share was charged. */
export function PaidReceipt({ rows, total, receipt, hospital, onClose }: { rows: [string, string][]; total: string; receipt: string; hospital: string; onClose: () => void }) {
  return (
    <Sheet title="Your share was paid" kicker="Payment complete" onClose={onClose}>
      <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok-ink"><Check className="h-4 w-4 shrink-0" />{total} was charged to VISA •••• 4242 and sent straight to {hospital}.</p>
      <dl className="divide-y divide-line text-sm">{rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}<Row k="Receipt" v={receipt} /></dl>
      <button type="button" onClick={onClose} className={PRIMARY}>Done</button>
    </Sheet>
  );
}

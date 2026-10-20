"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Chip, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { PaymentRecord } from "@/components/app/PaymentRecord";
import { Spinner, useTask } from "@/components/app/Feedback";
import { Select } from "@/components/app/Select";
import { day, money } from "@/lib/format";
import { paymentPlan } from "@/lib/payment-plan";

// Closing the case (owner) and the documents each role keeps afterwards. Which documents, and what
// is in them, follows the docs: PRD §4 steps 6–8 (reconciliation, refunds, recap), F19 (per-payer
// record with receipts and hashes), F20 and ARCHITECTURE §3.7 (hash-chained log, anchors, what they
// prove), F5–F7 and TEST-PLAN §3 (questions exported for hospital billing), and PRD §2 (a payer
// only sees the bill summary and their own share).

type Doc = { id: string; title: string; who: string; why: string; roles: string[] };
const DOCS: Doc[] = [
  { id: "summary", title: "Case Closing Summary", who: "Owner", why: "PRD §4 steps 1–8: estimate, bills, every payment request, deposits, refunds and hospital invoices in one statement.", roles: ["owner"] },
  { id: "record", title: "Payment Record", who: "Every payer, and the owner for each payer", why: "PRD F19 / step 8: what each person paid, for what, at which rate, the receipts, their refund share and the document fingerprints.", roles: ["owner", "payer"] },
  { id: "questions", title: "Questions for Hospital Billing", who: "Owner and companion", why: "PRD F5–F7, TEST-PLAN §3: the cited items still to ask the hospital about, ready to hand to its billing desk.", roles: ["owner", "companion"] },
  { id: "proof", title: "Document and Audit Proof", who: "Owner and companion", why: "PRD F20, ARCHITECTURE §3.7: SHA-256 fingerprints of every document and invoice, the hash-chained log, its anchor, and what the records do and don’t prove.", roles: ["owner", "companion"] },
];

export default function ClosingPage() {
  const data = useCaseData();
  const { case: care, requests, refunds, documents } = data;
  const { call } = useWorkspace();
  const { busy, run } = useTask();
  const [confirm, setConfirm] = useState(false);
  const role = care.me.role;
  const mine = DOCS.filter(d => d.roles.includes(role));
  const open = requests.filter(r => r.status === "pending" || r.status === "executing");
  const noInvoice = requests.filter(r => r.status === "paid" && !(r.invoices ?? []).length);
  const refundsOpen = refunds?.items.filter(r => r.status !== "received") ?? [];
  const warnings = care.anomalies.filter(a => !a.resolved);
  const final = documents.some(d => d.type === "final" && d.status === "parsed");
  const checks: { ok: boolean; blocking?: boolean; text: string; href?: string }[] = [
    { ok: !open.length, blocking: true, text: open.length ? `${open.length} payment request${open.length > 1 ? "s are" : " is"} still open. Pay or cancel ${open.length > 1 ? "them" : "it"} first.` : "No open payment requests.", href: open[0] ? `pledges?requestId=${open[0].id}` : "pledges" },
    { ok: final, blocking: true, text: final ? "The final bill is uploaded." : "No final bill yet. Upload it so deposits and refunds can be settled.", href: "upload" },
    { ok: !refundsOpen.length, text: refundsOpen.length ? `${refundsOpen.length} refund share${refundsOpen.length > 1 ? "s haven’t" : " hasn’t"} been received yet. Their records stay readable after closing.` : "No refunds waiting.", href: "refunds" },
    { ok: !noInvoice.length, blocking: true, text: noInvoice.length ? `${noInvoice.map(r => r.purpose).join(", ")} ${noInvoice.length > 1 ? "have" : "has"} no hospital invoice attached.` : "Every paid request has the hospital’s invoice.", href: noInvoice[0] ? `pledges?requestId=${noInvoice[0].id}#invoice` : "pledges" },
    { ok: !warnings.length, text: warnings.length ? "A payee warning is still open." : "No open warnings." },
  ];
  async function close() {
    if (await run(() => call(`/cases/${care.id}/close`, "POST", {}, care.id))) setConfirm(false);
  }

  return (
    <div className="space-y-10">
      {care.closed ? (
        <p role="status" className="rounded-2xl bg-firstlight p-5 leading-relaxed text-serpent-dark"><b>This care case was closed on {day(care.closed.at)} by {care.closed.by}.</b> Everyone can still read it and keep the documents below. Nothing can be uploaded, requested, pledged or paid any more.</p>
      ) : role === "owner" ? (
        <Section title="End This Care Case" agent="auditor">
          <p className="mb-4 leading-relaxed text-ink-2">When treatment and payments are done, close the case. Every member keeps read access and their documents; nobody, including you, can change anything afterwards. This can’t be undone.</p>
          <ul className="mb-5 space-y-2">{checks.map(c => (
            <li key={c.text} className="flex items-start gap-3 text-sm">
              <Chip tone={c.ok ? "ok" : c.blocking ? "danger" : "warn"}>{c.ok ? "Done" : c.blocking ? "Required" : "Check"}</Chip>
              <span className="min-w-0 flex-1 leading-relaxed text-lead">{c.text}{!c.ok && c.href && <> <Link href={`/case/${care.id}/${c.href}`} className="font-semibold text-serpent-dark underline">Open</Link></>}</span>
            </li>
          ))}</ul>
          {confirm ? <div className="space-y-3 rounded-2xl bg-white p-5">
            <p className="font-semibold text-lead">Close {care.patient.name}’s care case for everyone?</p>
            <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void close()} className={PRIMARY}>{busy ? <><Spinner />Closing…</> : "Close care case"}</button><button type="button" disabled={busy} onClick={() => setConfirm(false)} className={SECONDARY}>Back</button></div>
          </div> : <button type="button" disabled={checks.some(c => c.blocking && !c.ok)} onClick={() => setConfirm(true)} className={PRIMARY}>Close care case…</button>}
        </Section>
      ) : (
        <p className="rounded-2xl bg-mist p-5 leading-relaxed text-ink-2">The case owner closes the case when treatment and payments are done. Your documents are below and stay available afterwards.</p>
      )}

      <Section title="Closing Documents" agent="auditor">
        <p className="mb-5 leading-relaxed text-ink-2">The documents to keep for {role === "owner" ? "the family and each payer" : "yourself"}. Each one can be printed or saved as a PDF{care.closed ? "" : ", now or after closing"}.</p>
        <div className="space-y-6">{mine.map(d => <Printable key={d.id} doc={d}>{d.id === "summary" ? <Summary /> : d.id === "record" ? <Records /> : d.id === "questions" ? <Questions /> : <Proof />}</Printable>)}</div>
        {plannedNote(role)}
      </Section>
    </div>
  );
}

const plannedNote = (role: string) => role === "payer" ? <p className="mt-5 text-xs leading-relaxed text-ink-2">As a payer you get the bill summary and your own share only. The original medical documents and other payers’ shares stay with the owner.</p> : null;

/** One document card, printable on its own. */
function Printable({ doc, children }: { doc: Doc; children: ReactNode }) {
  const { case: care } = useCaseData();
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  function print() {
    const el = ref.current; if (!el) return;
    setOpen(true);
    requestAnimationFrame(() => {
      el.classList.add("print-target"); document.body.classList.add("printing-doc");
      const done = () => { el.classList.remove("print-target"); document.body.classList.remove("printing-doc"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    });
  }
  return (
    <article ref={ref} className="rounded-2xl bg-white p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-lead">{doc.title}</h3>
          <p className="text-xs text-ink-2">For: {doc.who}</p>
          <p className="print-hide mt-1 text-sm leading-relaxed text-ink-2">{doc.why}</p>
        </div>
        <div className="print-hide flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className={SECONDARY}>{open ? "Hide" : "View"}</button>
          <button type="button" onClick={print} className={SECONDARY}>Print / Save as PDF</button>
        </div>
      </div>
      {open && <div className="mt-5 border-t border-line pt-5">
        <p className="mb-4 text-xs text-ink-2">{care.patient.name} · {care.hospital.name} · case {care.id} · {care.closed ? `closed ${day(care.closed.at)}` : "case still open"} · generated {new Date().toLocaleString()}</p>
        {children}
      </div>}
    </article>
  );
}

const Rows = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="divide-y divide-line text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-ink-2">{k}</dt><dd className="text-right font-semibold text-lead">{v}</dd></div>)}</dl>
);
const H = ({ children }: { children: ReactNode }) => <h4 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-2 first:mt-0">{children}</h4>;

function Summary() {
  const { case: care, documents, requests, refunds } = useCaseData();
  const plan = paymentPlan({ documents, requests });
  const c = care.currency;
  return <div>
    <H>Hospital and account</H>
    <Rows rows={[["Hospital", care.hospital.name], ["Paid only to", care.payees.map(p => `${p.accountMasked} (${p.source === "official_registry" ? "official registry" : p.source})`).join(", ") || "No verified account"]]} />
    <H>Documents</H>
    <Rows rows={documents.filter(d => d.status === "parsed").map(d => [`${d.title} (${d.type})`, d.estimate ? `${money(d.estimate.low, c)} – ${money(d.estimate.high, c)}` : d.total !== null ? money(d.total, c) : "—"] as [string, ReactNode])} />
    <H>Payment requests</H>
    <Rows rows={requests.map(r => [`${r.purpose} · ${day(r.createdAt)}`, <>{money(r.amount, c)} · {r.status}{r.status === "paid" ? ` · ${r.approvals.filter(a => a.chargeRef).length} receipt${r.approvals.filter(a => a.chargeRef).length === 1 ? "" : "s"} · invoice ${(r.invoices ?? []).length ? "on file" : "missing"}` : ""}</>] as [string, ReactNode])} />
    <H>Totals</H>
    <Rows rows={[["Paid to the hospital", money(care.totals.paid, c)], ...(plan.bill ? [[`${plan.bill.type === "final" ? "Final" : "Latest"} bill`, money(plan.bill.total, c)] as [string, ReactNode]] : []), ...(refunds ? [["Coming back as refunds", money(refunds.totalRefund, c)] as [string, ReactNode]] : plan.bill && plan.bill.balance > 0 ? [["Still owed to the hospital", money(plan.bill.balance, c)] as [string, ReactNode]] : [])]} />
    {refunds && <><H>Refunds per person</H><Rows rows={refunds.items.map(r => [r.displayName, `${money(r.amount, refunds.currency)} · ${r.status} · due ${day(r.dueAt)}`] as [string, ReactNode])} /></>}
  </div>;
}

function Records() {
  const { case: care } = useCaseData();
  const payers = care.members.filter(m => m.role === "payer" || m.role === "owner");
  const [member, setMember] = useState(care.me.role === "owner" ? payers.find(m => m.role === "payer")?.id ?? care.me.id : care.me.id);
  return <div>
    {care.me.role === "owner" && <div className="print-hide mb-4 max-w-sm"><Select label="Whose record" value={member} onChange={setMember} options={payers.map(m => ({ value: m.id, label: m.displayName, hint: m.role === "owner" ? "you" : "payer" }))} /></div>}
    <p className="mb-3 font-semibold text-lead">{care.members.find(m => m.id === member)?.displayName}</p>
    <PaymentRecord key={member} caseId={care.id} memberId={member} print />
  </div>;
}

function Questions() {
  const { explanation } = useCaseData();
  const asks = [...(explanation?.questions ?? []).map(q => ({ text: q.text, items: q.itemIds })), ...(explanation?.lines ?? []).filter(l => l.type === "unknown_ask_hospital").map(l => ({ text: l.text, items: l.itemIds }))];
  const unique = asks.filter((q, i) => asks.findIndex(o => o.items.join() === q.items.join()) === i);
  if (!unique.length) return <p className="text-sm text-ink-2">No open questions for the hospital.</p>;
  return <div>
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-lead">{unique.map(q => <li key={q.text}>{q.text} <span className="text-xs text-ink-2">(bill items {q.items.join(", ")})</span></li>)}</ol>
    {explanation?.referenceNote && <p className="mt-4 text-xs text-ink-2">{explanation.referenceNote}</p>}
  </div>;
}

function Proof() {
  const { documents, requests, audit } = useCaseData();
  return <div>
    <H>Documents</H>
    <ul className="space-y-1.5 text-xs">{documents.map(d => <li key={d.id} className="break-all text-ink-2"><b className="text-lead">{d.title}</b> · {d.type} · SHA-256 {d.sha256 || "pending"}{d.anchoredTx ? ` · anchored ${d.anchoredTx}` : ""}</li>)}</ul>
    <H>Hospital invoices</H>
    {requests.some(r => (r.invoices ?? []).length) ? <ul className="space-y-1.5 text-xs">{requests.flatMap(r => (r.invoices ?? []).map(i => <li key={i.id} className="break-all text-ink-2"><b className="text-lead">{r.purpose}</b> · {i.filename} · SHA-256 {i.sha256}</li>))}</ul> : <p className="text-xs text-ink-2">None attached.</p>}
    <H>Case history</H>
    <Rows rows={[["Steps recorded", String(audit.rows.length)], ["Hash chain", audit.chainValid ? "Intact" : "Broken"], ["Latest hash", <span key="h" className="break-all font-mono text-xs">{audit.rows.at(-1)?.hash ?? "—"}</span>], ["Anchored hash", <span key="a" className="break-all font-mono text-xs">{audit.anchoredHead.tx ? `${audit.anchoredHead.hash} · tx ${audit.anchoredHead.tx}` : "Not anchored"}</span>]]} />
    <p className="mt-4 text-xs leading-relaxed text-ink-2">What this proves: the documents and log entries have not changed since they were fingerprinted, and the log’s order was not edited. It does not prove that a hospital’s charges were medically necessary or fairly priced.</p>
  </div>;
}

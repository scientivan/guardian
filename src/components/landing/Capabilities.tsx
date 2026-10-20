import type { ReactNode } from "react";
import { FeatureCarousel, type Slide } from "./FeatureCarousel";
import { Check, Cross } from "./icons";
import { Minifig } from "./Minifig";

// "What you can do": six steps, each a small, realistic piece of the app filling a coloured card.
// Each visual is one white panel that fills its card; its last line sits at the bottom.
// Names, amounts and rates match the demo seed (src/server/seed.ts) and docs/PRD.md scenarios D2–D5.

function Chip({ tone, children }: { tone: "fact" | "doc" | "ask" | "ok" | "danger" | "info" | "muted" | "warn"; children: ReactNode }) {
  const tones = {
    fact: "bg-serpent/12 text-serpent-dark",
    doc: "bg-chocolate/12 text-chocolate",
    ask: "bg-warn-soft text-warn",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    info: "bg-firstlight text-serpent-dark",
    muted: "bg-line text-ink-2",
  } as const;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col rounded-[1.6rem] bg-white p-5">{children}</div>;
}

/** The panel's closing line, pinned to the bottom of the card. */
function Foot({ className = "text-ink-2", children }: { className?: string; children: ReactNode }) {
  return <p className={`mt-auto rounded-xl bg-mist px-3 py-2.5 text-xs leading-relaxed ${className}`}>{children}</p>;
}

const BILL_LINES = [
  { chip: "Fact", tone: "fact" as const, text: "The stay is 2 days longer than the estimate assumed", amount: "+CNY 3,000" },
  { chip: "In the bill", tone: "doc" as const, text: "The hospital notes an extra antibiotic course", source: "item I12" },
  { chip: "Ask hospital", tone: "ask" as const, text: "Why are pillow cases billed separately?", source: "item I35" },
];

function BillVisual() {
  // Scale CNY 25,000 – 40,000 across the bar.
  const pos = (v: number) => `${((v - 25000) / 15000) * 100}%`;
  return (
    <Panel>
      <dl className="space-y-1 text-xs text-ink-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt>Estimate for 3 days</dt>
          <dd className="whitespace-nowrap text-sm font-bold tabular-nums text-lead">CNY 30,000–34,000</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <dt>Bill so far, 5 days</dt>
          <dd className="whitespace-nowrap text-sm font-bold tabular-nums text-lead">CNY 36,782</dd>
        </div>
      </dl>
      <div className="relative mt-3 h-3 rounded-full bg-firstlight">
        <div className="absolute inset-y-0 rounded-full bg-cerulean" style={{ left: pos(30000), width: `${(4000 / 15000) * 100}%` }} />
        <div className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-sm bg-serpent ring-2 ring-white" style={{ left: pos(32700) }} />
      </div>
      <ul className="mb-5 mt-4 space-y-3 text-sm">
        {BILL_LINES.map((l) => (
          <li key={l.text}>
            <div className="flex items-center justify-between gap-2">
              <Chip tone={l.tone}>{l.chip}</Chip>
              <span className={l.amount ? "font-bold tabular-nums text-lead" : "text-xs text-ink-2"}>{l.amount ?? l.source}</span>
            </div>
            <p className="mt-1 leading-snug text-lead">{l.text}</p>
          </li>
        ))}
      </ul>
      <Foot>The Planner drafted three questions for hospital billing.</Foot>
    </Panel>
  );
}

function PayeeVisual() {
  const rows = [
    { ok: true, name: "Shenzhen International Hospital", note: "Account •••• 2222, from the official registry" },
    { ok: false, name: "“Hospital finance” on WhatsApp", note: "Account •••• 9071, sent in a chat" },
  ];
  return (
    <Panel>
      <ul className="mb-5 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start gap-3 py-4 first:pt-0">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${r.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
              {r.ok ? <Check className="h-5 w-5" /> : <Cross className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug text-lead">{r.name}</p>
              <p className="mt-0.5 text-xs text-ink-2">{r.note}</p>
              <div className="mt-2">{r.ok ? <Chip tone="ok">Verified</Chip> : <Chip tone="danger">Blocked</Chip>}</div>
            </div>
          </li>
        ))}
      </ul>
      <Foot>Nobody can override this, not even the case owner.</Foot>
    </Panel>
  );
}

const HELPERS = [
  { name: "Adi", pay: "Rp 45,900,000", cny: 20000, done: true, color: "#4875a1" },
  { name: "Sari", pay: "RM 9,750", cny: 15000, done: true, color: "#375d84" },
  { name: "Fajar", pay: "AED 5,100", cny: 10000, done: true, color: "#6e5e52" },
  { name: "Masjid fund", pay: "Rp 11,475,000", cny: 5000, done: false, color: "" },
];
const GOAL = 50000;

function GuaranteeVisual() {
  return (
    <Panel>
      <p className="text-xs text-ink-2">Emergency guarantee</p>
      <p className="mt-0.5 tabular-nums text-ink-2">
        <b className="text-xl font-extrabold text-lead">CNY 45,000</b> of 50,000
      </p>
      {/* Where the money comes from: one segment per payer, the waiting share hatched. */}
      <div className="mt-3 flex h-9 gap-1 overflow-hidden rounded-xl">
        {HELPERS.map((h) => (
          <div
            key={h.name}
            className={`flex items-center justify-center whitespace-nowrap text-[11px] font-bold ${
              h.done ? "text-white" : "bg-[repeating-linear-gradient(135deg,#dfe6ea_0_5px,#f3f7f9_5px_10px)] text-ink-2"
            }`}
            style={{ width: `${(h.cny / GOAL) * 100}%`, background: h.done ? h.color : undefined }}
          >
            {h.done ? `${h.name} ${h.cny / 1000}k` : `${h.cny / 1000}k`}
          </div>
        ))}
      </div>
      <ul className="mb-4 mt-2 divide-y divide-line">
        {HELPERS.map((h) => (
          <li key={h.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm">
            <b className="font-semibold text-lead">{h.name}</b>
            <span className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-ink-2">{h.pay}</span>
              {h.done ? <Chip tone="ok">Pledged</Chip> : <Chip tone="muted">No reply yet</Chip>}
            </span>
          </li>
        ))}
      </ul>
      <Foot className="font-semibold text-warn">Still missing CNY 5,000</Foot>
    </Panel>
  );
}

// Payers are never billed a fixed share: each one picks an amount (a pledge). Rina only suggests.
const PLEDGE_OPTIONS = ["5,000", "10,000", "20,000"];

function PledgeVisual() {
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <Minifig skin="#c68e62" hair="#1f1c1a" shirt="#6e5e52" className="h-11 w-11 shrink-0 rounded-xl bg-mist" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-lead">Adi, how much can you give?</p>
          <p className="text-xs text-ink-2">Emergency guarantee, CNY 25,000 still needed</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-2">Rina suggested CNY 12,500. Give what you can.</p>
      <div className="mt-2 grid grid-cols-4 gap-2 text-sm font-semibold">
        {PLEDGE_OPTIONS.map((o) => (
          <span key={o} className={`rounded-xl py-2 text-center tabular-nums ${o === "20,000" ? "bg-serpent text-white" : "bg-mist text-lead"}`}>
            {o}
          </span>
        ))}
        <span className="rounded-xl border border-dashed border-wolverine py-2 text-center text-ink-2">Other</span>
      </div>
      <p className="mt-4 font-num text-3xl font-extrabold tracking-tight tabular-nums text-serpent-dark">CNY 20,000</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-2">
        <div className="col-span-2">
          <dt>You pay</dt>
          <dd className="text-sm font-bold tabular-nums text-lead">Rp 45,900,000</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd className="font-semibold tabular-nums text-lead">2,295</dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd className="font-semibold tabular-nums text-lead">Rp 459,000</dd>
        </div>
      </dl>
      <div className="mb-5 mt-4 flex items-center gap-2">
        <span className="flex-1 rounded-full bg-serpent px-4 py-2.5 text-center text-sm font-semibold text-white">Pledge CNY 20,000</span>
        <span className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-lead">Not now</span>
      </div>
      <Foot>Nothing is charged until the full amount is pledged. You can change or withdraw your pledge until then.</Foot>
    </Panel>
  );
}

const PRIVATE_FIELDS = [
  { field: "Patient", sent: "Budi Santoso", token: "[PASIEN_1]" },
  { field: "Passport", sent: "C1234567", token: "[ID_1]" },
  { field: "MRN", sent: "SZ-889201", token: "[MRN_1]" },
];

function PrivacyVisual() {
  return (
    <Panel>
      <table className="mb-5 w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-ink-2">
            <th className="pb-2 font-medium" />
            <th className="pb-2 font-medium">Hospital sent</th>
            <th className="pb-2 font-medium text-serpent-dark">AI reads</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {PRIVATE_FIELDS.map((f) => (
            <tr key={f.field}>
              <th scope="row" className="py-3 pr-2 text-xs font-medium text-ink-2">
                {f.field}
              </th>
              <td className="py-3 pr-2 font-semibold text-lead">{f.sent}</td>
              <td className="py-3">
                <Chip tone="info">{f.token}</Chip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Foot>The swap happens in plain code, before any AI sees the bill.</Foot>
    </Panel>
  );
}

const REFUNDS = [
  { name: "Rina", amount: "3,375", status: "Received", tone: "ok" as const },
  { name: "Adi", amount: "2,250", status: "Received", tone: "ok" as const },
  { name: "Sari", amount: "1,687.50", status: "Processing", tone: "info" as const },
  { name: "Fajar", amount: "1,125", status: "Requested", tone: "muted" as const },
  { name: "Masjid fund", amount: "562.50", status: "Overdue, reminded", tone: "warn" as const },
];

function RefundVisual() {
  return (
    <Panel>
      <p className="text-xs text-ink-2">Deposits CNY 80,000, final bill CNY 71,000</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums text-lead">CNY 9,000 back</p>
      <ul className="mb-5 mt-3 divide-y divide-line">
        {REFUNDS.map((r) => (
          <li key={r.name} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm">
            <span className="text-lead">{r.name}</span>
            <span className="flex items-center gap-2">
              <b className="tabular-nums text-lead">CNY {r.amount}</b>
              <Chip tone={r.tone}>{r.status}</Chip>
            </span>
          </li>
        ))}
      </ul>
      <Foot>Overdue refunds get a reminder automatically.</Foot>
    </Panel>
  );
}

const SLIDES: Slide[] = [
  {
    title: "Understand every change",
    text: "Each line says where it comes from: a calculation, the bill itself, or a question to ask the hospital.",
    visual: <BillVisual />,
    tone: "firstlight",
  },
  { title: "Pay only the real hospital", text: "Money can only go to the account the hospital published itself.", visual: <PayeeVisual />, tone: "serpent" },
  {
    title: "Raise an emergency guarantee together",
    text: "Family, friends and the mosque community chip in from different countries, straight to the hospital.",
    visual: <GuaranteeVisual />,
    tone: "chocolate",
  },
  {
    title: "Give what you can",
    text: "Each payer chooses their own amount and sees it in their own currency, with the rate and fee, before saying yes.",
    visual: <PledgeVisual />,
    tone: "cerulean",
  },
  {
    title: "Keep medical details private",
    text: "Names and ID numbers are swapped for tokens before any AI reads the bill.",
    visual: <PrivacyVisual />,
    tone: "serpent-dark",
  },
  { title: "Get the leftover deposit back", text: "Everyone sees their share of the refund, its status and its due date.", visual: <RefundVisual />, tone: "wolverine" },
];

export function Capabilities() {
  return (
    <section id="features" className="mt-20 scroll-mt-20 overflow-x-clip bg-mist py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="max-w-3xl text-balance font-serif text-4xl leading-tight text-lead sm:text-5xl">Everything your family needs, in one place.</h2>
        <FeatureCarousel slides={SLIDES} label="What you can do with Guardian, step by step" />
      </div>
    </section>
  );
}

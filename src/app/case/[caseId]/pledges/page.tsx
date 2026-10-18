"use client";

import Link from "next/link";
import { useState } from "react";
import { MemberAvatar } from "@/components/app/people";
import { Chip, FoldSection, MoneyFigure, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { money, share } from "@/lib/format";
import { CASE, REQUESTS, demoPledge, demoQuote, type Pledge } from "@/lib/demo";

// Pledges (TASKS 2.6), two key messages: how far the pledges have got (one bar, a colour per
// helper) and how much you can give. Helpers choose their own amount; nothing is charged until
// the request is covered.

const OPTIONS = [100_000, 250_000, 500_000];
const PERSON_COLOR: Record<string, string> = { M_OWNER: "#abc1cf", M_JKT: "#4875a1", M_KL: "#6e5e52", M_DXB: "#375d84", M_MOSQUE: "#c9b9ab" };
const firstName = (displayName: string) => displayName.split(" (")[0];

export default function PledgesPage() {
  const request = REQUESTS[0];
  const me = CASE.members.find((m) => m.id === CASE.me.id)!;

  const [amount, setAmount] = useState(request.remaining);
  const [other, setOther] = useState("");
  const [sendIfShort, setSendIfShort] = useState(true);
  const [mine, setMine] = useState<Pledge | null>(null);
  const [totals, setTotals] = useState({ approved: request.approved, remaining: request.remaining });
  const [hover, setHover] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);

  const quote = demoQuote(amount, me.currency);
  const pledges = mine ? [...request.approvals, mine] : request.approvals;
  const waiting = CASE.members.filter((m) => m.role === "payer" && !pledges.some((p) => p.memberId === m.id));

  // Where each person's segment starts, for placing the hover card above it.
  let run = 0;
  const segments = pledges.map((p) => {
    const start = share(run, request.amount);
    run += p.amount;
    return { p, start, width: share(p.amount, request.amount) };
  });
  const hovered = segments.find((s) => s.p.memberId === hover);

  function pledge() {
    const res = demoPledge({ ...request, ...totals }, amount);
    setTotals({ approved: res.approved, remaining: res.remaining });
    setMine({ memberId: me.id, displayName: me.displayName, amount, payCurrency: me.currency, payAmount: quote.payAmount, fxRate: quote.fxRate, fee: quote.fee, status: "approved", ts: new Date().toISOString(), sendIfShort });
  }
  function withdraw() {
    setMine(null);
    setTotals({ approved: request.approved, remaining: request.remaining });
  }

  return (
    <div className="space-y-12">
      <Section
        title="Emergency Guarantee"
        agent="gate"
        action={totals.remaining > 0 ? <Chip tone="warn">{money(totals.remaining, request.currency)} still missing</Chip> : <Chip tone="ok">Covered</Chip>}
      >
        <p className="flex flex-wrap items-baseline gap-x-2 text-ink-2">
          <MoneyFigure minor={totals.approved} currency={request.currency} />
          <span>of {money(request.amount, request.currency)}</span>
        </p>

        <div className="relative mt-8" onMouseLeave={() => setHover(null)}>
          {hovered && (
            <div
              className="step-in pointer-events-none absolute bottom-full z-10 mb-3 w-64 -translate-x-1/2 rounded-2xl bg-serpent-dark p-3 text-white shadow-[0_18px_30px_-18px_rgba(32,33,33,0.7)]"
              style={{ left: `clamp(8rem, ${hovered.start + hovered.width / 2}%, calc(100% - 8rem))` }}
            >
              <p className="font-semibold">
                {firstName(hovered.p.displayName)}, {money(hovered.p.amount, request.currency)}
              </p>
              <p className="mt-0.5 text-sm">
                Pays {money(hovered.p.payAmount, hovered.p.payCurrency)} plus {money(hovered.p.fee, hovered.p.payCurrency)} fee
              </p>
              {hovered.p.sendIfShort && <p className="mt-0.5 text-sm">Sends even if we fall short</p>}
            </div>
          )}
          <div className="flex h-16 gap-1 overflow-hidden rounded-2xl bg-[repeating-linear-gradient(135deg,#eef3f6_0_8px,#f8fafb_8px_16px)]">
            {segments.map(({ p, width }, i) => (
              <button
                key={p.memberId}
                type="button"
                onMouseEnter={() => setHover(p.memberId)}
                onFocus={() => setHover(p.memberId)}
                onBlur={() => setHover(null)}
                aria-label={`${p.displayName} pledged ${money(p.amount, request.currency)}`}
                className="grow-x h-full shrink-0 transition-opacity duration-300"
                style={{ width: `${width}%`, background: PERSON_COLOR[p.memberId], opacity: hover && hover !== p.memberId ? 0.4 : 1, animationDelay: `${i * 110}ms` }}
              />
            ))}
          </div>
        </div>

        <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          {pledges.map((p) => (
            <li key={p.memberId} onMouseEnter={() => setHover(p.memberId)} onMouseLeave={() => setHover(null)} className="flex items-center gap-2.5">
              <span className="relative">
                <MemberAvatar id={p.memberId} className="h-10 w-10 rounded-xl" />
                <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-[4px] ring-2 ring-white" style={{ background: PERSON_COLOR[p.memberId] }} />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-lead">{firstName(p.displayName)}</span>
                <span className="font-num text-sm font-bold tabular-nums text-serpent-dark">{money(p.amount, request.currency)}</span>
              </span>
            </li>
          ))}
          {waiting.map((m) => (
            <li key={m.id} className="flex items-center gap-2.5">
              <MemberAvatar id={m.id} className="h-10 w-10 rounded-xl opacity-60" />
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-lead">{firstName(m.displayName)}</span>
                <span className="text-sm text-ink-2">No reply yet</span>
              </span>
              <button type="button" disabled={reminded} onClick={() => setReminded(true)} className={`${SECONDARY} !px-3 !py-1.5 !text-xs`}>
                {reminded ? "Reminded" : "Remind"}
              </button>
            </li>
          ))}
          <li>
            <Link href="members" className="text-sm font-semibold text-serpent-dark hover:underline">
              Invite more helpers
            </Link>
          </li>
        </ul>
      </Section>

      <Section title="Your Pledge" agent="gate">
        {mine ? (
          <div className="flex flex-wrap items-center gap-4">
            <MemberAvatar id={me.id} className="h-12 w-12 rounded-xl" />
            <p className="text-lg text-lead">
              You pledged <b>{money(mine.amount, request.currency)}</b>. Nothing is charged until the request is covered.
            </p>
            <button type="button" className={SECONDARY} onClick={withdraw}>
              Withdraw
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPTIONS.map((o) => {
                const on = amount === o && !other;
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setAmount(o);
                      setOther("");
                    }}
                    className={`rounded-2xl py-3 font-semibold tabular-nums transition-colors ${on ? "bg-serpent text-white" : "bg-white text-lead hover:bg-cerulean/40"}`}
                  >
                    {money(o, "CNY")}
                    {o === request.remaining && <span className={`block text-xs font-normal ${on ? "text-white" : "text-ink-2"}`}>what’s missing</span>}
                  </button>
                );
              })}
              <label className="flex items-center gap-1 rounded-2xl border border-line bg-white px-3 focus-within:border-serpent">
                <span className="text-ink-2">CNY</span>
                <input
                  inputMode="numeric"
                  placeholder="Other"
                  value={other}
                  onChange={(ev) => {
                    const v = ev.target.value.replace(/[^0-9]/g, "");
                    setOther(v);
                    if (v) setAmount(Number(v) * 100);
                  }}
                  className="w-full bg-transparent py-3 font-semibold tabular-nums text-lead outline-none"
                  aria-label="Other amount in CNY"
                />
              </label>
            </div>

            <p className="mt-4 text-lead">
              You pay <b className="font-num tabular-nums text-serpent-dark">{money(quote.payAmount, quote.payCurrency)}</b>
              <span className="text-ink-2"> plus {money(quote.fee, quote.payCurrency)} fee</span>
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button type="button" className={`${PRIMARY} !px-6 !py-3`} onClick={pledge} disabled={amount <= 0}>
                Pledge {money(amount, request.currency)}
              </button>
              <label className="flex items-center gap-2.5 text-sm text-lead">
                <input type="checkbox" checked={sendIfShort} onChange={(ev) => setSendIfShort(ev.target.checked)} className="h-4 w-4 accent-[#4875a1]" />
                Send my part even if we fall short
              </label>
            </div>
          </>
        )}
      </Section>

      <FoldSection title="If We Fall Short" agent="planner">
        <p className="leading-relaxed text-lead">
          Nobody is charged. Rina then chooses to send what was pledged (only from those who agreed), give it more time, lower the amount once the hospital agrees, or cancel.
        </p>
      </FoldSection>
    </div>
  );
}

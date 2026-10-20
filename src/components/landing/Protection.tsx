"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { Arrow, Chain, Chevron, EyeOff, Lock, People } from "./icons";

// Four protections as an expanding-panel carousel. The open panel is wide and shows the rule
// plus a real example from the demo security log; the others are narrow strips with the icon
// on top, the title and a see-through "Open" hint at the bottom. Desktop: a panel opens as the
// mouse moves over it (or on click / keyboard focus), and a bar underneath follows the open panel.
// Phones: the panels stack and open on tap.

type Tone = { bg: string; text: string; icon: string; hint: string };
const LIGHT_ON_DARK = (bg: string): Tone => ({ bg, text: "text-white", icon: "bg-white/15", hint: "bg-white/20" });

// Layout of the panel row. OPEN_GROW must match the `lg:grow-[3.3]` classes below.
const GAP_PX = 12;
const OPEN_GROW = 3.3;

function Tag({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`shrink-0 rounded-md bg-white px-2 py-0.5 text-xs font-bold ring-1 ${ok ? "text-ok ring-ok/30" : "text-danger ring-danger/30"}`}>
      {children}
    </span>
  );
}

function Example({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-lead shadow-[0_20px_34px_-24px_rgba(32,33,33,0.7)]">
      <p className="text-xs font-semibold text-ink-2">From the security log</p>
      {children}
    </div>
  );
}

function LogRow({ time, title, note, tag, ok }: { time: string; title: string; note: string; tag: string; ok: boolean }) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 py-2.5">
      <span className="pt-0.5 text-xs tabular-nums text-ink-2">{time}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 text-xs text-ink-2">{note}</p>
      </div>
      <Tag ok={ok}>{tag}</Tag>
    </li>
  );
}

const CHAIN = [
  { n: 41, what: "Payment to •••• 9071 blocked", hash: "9f2c" },
  { n: 42, what: "Hidden instruction in a PDF ignored", hash: "41ab" },
  { n: 43, what: "Sari’s pledge for Fajar blocked", hash: "c07e" },
  { n: 44, what: "CNY 45,000 paid to •••• 2222", hash: "e5d1" },
];

const POINTS: { title: string; text: string; icon: ReactNode; tone: Tone; example: ReactNode }[] = [
  {
    title: "Official accounts only",
    text: "The Payment Gate only pays accounts the hospital published through its official channel. A new account in a chat message goes nowhere, and there is no override, not even for the case owner.",
    icon: <Lock className="h-5 w-5" />,
    tone: LIGHT_ON_DARK("bg-serpent"),
    example: (
      <Example>
        <ul className="mt-1 divide-y divide-line">
          {/*   keeps a masked account number on one line. */}
          <LogRow time="14:02" title={"Payment to •••• 9071"} note="Not in the hospital’s official registry (check 1)" tag="Blocked" ok={false} />
          <LogRow time="14:05" title={"CNY 45,000 to •••• 2222"} note="Official account, 3 pledges, Stripe test mode" tag="Paid" ok />
        </ul>
      </Example>
    ),
  },
  {
    title: "Only you can pledge your money",
    text: "Each payer chooses and confirms their own amount, and can withdraw until the payment runs. The AI can only prepare a request, and nobody can pledge for someone else.",
    icon: <People className="h-5 w-5" />,
    tone: LIGHT_ON_DARK("bg-chocolate"),
    example: (
      <Example>
        <ul className="mt-1 divide-y divide-line">
          <LogRow time="14:03" title="Sari tried to pledge for Fajar" note="Payers pledge only for themselves (check 3)" tag="Blocked" ok={false} />
          <LogRow time="14:04" title="Fajar pledged CNY 10,000" note="From Fajar’s own account, AED 5,100" tag="Pledged" ok />
        </ul>
      </Example>
    ),
  },
  {
    title: "The AI never sees your name",
    text: "Names and ID numbers become tokens like [PASIEN_1] before any AI reads the bill. Even if someone tricks the chat, there is nothing personal for it to leak.",
    icon: <EyeOff className="h-5 w-5" />,
    tone: LIGHT_ON_DARK("bg-serpent-dark"),
    example: (
      <Example>
        <dl className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
          <dt className="text-xs text-ink-2">Patient</dt>
          <dd className="font-semibold">Budi Santoso</dd>
          <dd className="rounded-full bg-firstlight px-2.5 py-0.5 text-[11px] font-bold text-serpent-dark">[PASIEN_1]</dd>
          <dt className="text-xs text-ink-2">Passport</dt>
          <dd className="font-semibold">C1234567</dd>
          <dd className="rounded-full bg-firstlight px-2.5 py-0.5 text-[11px] font-bold text-serpent-dark">[ID_1]</dd>
        </dl>
        <ul className="mt-2 border-t border-line">
          <LogRow time="14:06" title="Chat asked for the passport number" note="The AI only knows [ID_1]" tag="Nothing to leak" ok />
        </ul>
      </Example>
    ),
  },
  {
    title: "Every step on the record",
    text: "Every action goes into a tamper-evident log. Each entry carries the fingerprint of the one before, and the latest fingerprint is anchored on FISCO BCOS, so nobody can quietly change the history.",
    icon: <Chain className="h-5 w-5" />,
    tone: { bg: "bg-cerulean", text: "text-lead", icon: "bg-white/45", hint: "bg-white/50" },
    example: (
      <Example>
        <ol className="relative mt-2 space-y-2.5 before:absolute before:bottom-2 before:left-[4px] before:top-2 before:w-0.5 before:bg-line">
          {CHAIN.map((c) => (
            <li key={c.n} className="relative flex items-baseline gap-3 pl-5 text-sm">
              <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-[3px] bg-serpent" />
              <span className="text-xs tabular-nums text-ink-2">#{c.n}</span>
              <span className="min-w-0 flex-1 leading-snug">{c.what}</span>
              <span className="font-mono text-[11px] text-ink-2">{c.hash}…</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs text-ink-2">Head fingerprint anchored on FISCO BCOS</p>
          <Tag ok>Chain intact</Tag>
        </div>
      </Example>
    ),
  },
];

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export function Protection() {
  const [active, setActive] = useState(0);
  // While a panel is still widening, the strips slide under a resting mouse; ignore hover
  // for that moment so the panels don't flip back and forth.
  const settleUntil = useRef(0);

  // The open panel's final width. Its text is laid out once at that width, so the left and
  // right margins match and nothing rewraps while the panel widens.
  const row = useRef<HTMLDivElement>(null);
  const [openWidth, setOpenWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => setOpenWidth(((el.clientWidth - (POINTS.length - 1) * GAP_PX) * OPEN_GROW) / (OPEN_GROW + POINTS.length - 1));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function openOnHover(i: number, e: PointerEvent) {
    if (e.pointerType !== "mouse" || i === active) return;
    const now = performance.now();
    if (now < settleUntil.current) return;
    settleUntil.current = now + 320;
    setActive(i);
  }

  return (
    <section id="security" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-28">
      <h2 className="max-w-3xl text-balance font-serif text-4xl leading-tight text-lead sm:text-5xl">Your money stays safe, even if the AI is fooled.</h2>

      <div
        ref={row}
        className="mt-12 flex flex-col gap-3 lg:h-[35rem] lg:flex-row"
        style={openWidth ? ({ "--open-w": `${openWidth}px` } as CSSProperties) : undefined}
      >
        {POINTS.map((p, i) => {
          const on = i === active;
          return (
            <article
              key={p.title}
              onPointerMove={(e) => openOnHover(i, e)}
              className={`relative overflow-hidden rounded-[2rem] ${p.tone.bg} ${p.tone.text} transition-[flex-grow] duration-[450ms] ${EASE} motion-reduce:transition-none lg:min-w-0 lg:basis-0 ${
                on ? "lg:grow-[3.3]" : "lg:grow"
              }`}
            >
              {/* Header: a row on phones; on desktop it covers a closed panel, icon on top, title at the bottom. */}
              <button
                type="button"
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-expanded={on}
                aria-controls={`protection-${i}`}
                aria-label={p.title}
                className={`flex w-full items-center gap-3 p-5 text-left lg:absolute lg:inset-0 lg:flex-col lg:items-start lg:justify-between lg:p-6 ${
                  on ? "lg:pointer-events-none" : "cursor-pointer"
                }`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${p.tone.icon}`}>{p.icon}</span>
                <span className="flex-1 font-serif text-xl leading-tight lg:hidden">{p.title}</span>
                <Chevron className={`h-5 w-5 shrink-0 transition-transform duration-300 lg:hidden ${on ? "rotate-180" : ""}`} />
                <span
                  aria-hidden="true"
                  className={`hidden transition-opacity lg:block ${on ? "opacity-0 duration-100" : "opacity-100 delay-200 duration-300"}`}
                >
                  <span className="block font-serif text-xl leading-snug">{p.title}</span>
                  <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${p.tone.hint}`}>
                    Open <Arrow className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>

              {/* Body: grows open on phones; on desktop it has a fixed width and is revealed as the panel widens. */}
              <div
                id={`protection-${i}`}
                className={`grid transition-[grid-template-rows] duration-300 ${EASE} motion-reduce:transition-none lg:block ${
                  on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`flex flex-col gap-5 px-5 pb-6 transition-opacity lg:absolute lg:inset-y-0 lg:left-0 lg:w-[var(--open-w,30rem)] lg:px-8 lg:pb-8 lg:pt-24 ${
                      on ? "opacity-100 duration-300 lg:delay-150" : "pointer-events-none opacity-0 duration-100"
                    }`}
                  >
                    <h3 className="hidden text-balance font-serif text-3xl leading-tight lg:block">{p.title}</h3>
                    <p className="text-[15px] leading-relaxed">{p.text}</p>
                    <div className="lg:mt-auto">{p.example}</div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Follows the open panel: one see-through segment per chapter, the open one solid. */}
      <div className="mt-4 hidden gap-3 lg:flex" aria-hidden="true">
        {POINTS.map((p, i) => (
          <span
            key={p.title}
            className={`h-1.5 basis-0 rounded-full transition-[flex-grow,opacity] duration-[450ms] ${EASE} motion-reduce:transition-none ${p.tone.bg} ${
              i === active ? "grow-[3.3] opacity-100" : "grow opacity-30"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 flex justify-between gap-4 text-sm text-ink-2">
        <span>
          <span className="lg:hidden">Tap a chapter to open it.</span>
          <span className="hidden lg:inline">Move over a chapter to open it.</span>
        </span>
        <span className="tabular-nums">
          Chapter {active + 1} of {POINTS.length}
        </span>
      </p>
    </section>
  );
}

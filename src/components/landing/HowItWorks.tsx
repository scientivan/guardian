"use client";

import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";

import { useEffect, useRef, useState } from "react";
import { AGENT_BY_ID, FAMILY, type AgentId } from "./agents";
import { Check, Doc } from "./icons";
import { Minifig, type Look } from "./Minifig";

// The case travels through the four steps on a loop: the tag on the rail moves to the
// current step, its column lights up, its figures hop, and pledges tick in.
// The loop only runs while the section is on screen and pauses while the pointer is over it.

const TICK_MS = 2800;

type Person = Look & { name: string; ticks?: boolean };
type Phase = "agents" | "family" | "code";

const agentPeople = (ids: AgentId[], ticking: AgentId[] = []): Person[] =>
  ids.map((id) => {
    const a = AGENT_BY_ID[id];
    return { name: a.name, skin: a.skin, hair: a.hair, hijab: a.hijab, shirt: a.color, ticks: ticking.includes(id) };
  });

const PHASES: { id: Phase; label: string; span: string; tint: string; bar: string; ink: string }[] = [
  { id: "agents", label: "The agents prepare", span: "md:col-span-2", tint: "bg-serpent/6", bar: "bg-serpent", ink: "text-serpent-dark" },
  { id: "family", label: "People decide", span: "", tint: "bg-chocolate/8", bar: "bg-chocolate", ink: "text-chocolate" },
  { id: "code", label: "Plain code pays", span: "", tint: "bg-mist", bar: "bg-lead", ink: "text-lead" },
];
const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p])) as Record<Phase, (typeof PHASES)[number]>;

const STEPS: { title: string; text: string; phase: Phase; who: Person[]; status: string; more?: string }[] = [
  {
    title: "Upload the estimate or bill",
    text: "A photo or PDF from the hospital. Names and ID numbers are hidden before any AI reads it.",
    phase: "agents",
    who: agentPeople(["clerk", "reader"]),
    status: "Bill D2 uploaded",
  },
  {
    title: "See why the cost changed",
    text: "Every line points to the bill items it comes from. Anything unclear becomes a question for the hospital.",
    phase: "agents",
    who: agentPeople(["calculator", "second", "planner"]),
    status: "3 changes explained",
  },
  {
    title: "Each payer chooses what to give",
    text: "In their own currency, with the exchange rate and fee shown up front. Nobody can pledge for someone else.",
    phase: "family",
    who: FAMILY.map((p) => ({ ...p, ticks: p.name !== "Rina" })),
    status: "CNY 45,000 pledged",
    more: "and the masjid fund",
  },
  {
    title: "Review and run a test payment",
    text: "Once pledges cover the amount, the owner confirms sandbox/test charges for the verified intended recipient. No bank transfer occurs.",
    phase: "code",
    who: agentPeople(["gate", "auditor"], ["gate"]),
    status: "Test charge for •••• 2222",
  },
];

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!onScreen || paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), TICK_MS);
    return () => clearInterval(t);
  }, [onScreen, paused]);

  const activePhase = STEPS[active].phase;

  return (
    <section id="how" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Headings alternate sides down the page: features left, this one right, security left. */}
        <h2 className="max-w-3xl text-balance font-serif text-4xl leading-tight text-lead sm:text-5xl md:ml-auto md:text-right"><LocalizedText>
          Seven agents do the work. The people paying make the call.
        </LocalizedText></h2>

        <div
          ref={panel}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="mt-14 overflow-hidden rounded-[2rem] border border-line bg-white"
        >
          {/* Who is in charge: the label of the current phase fills in underneath. */}
          <div className="hidden grid-cols-4 divide-x divide-line border-b border-line md:grid">
            {PHASES.map((p) => {
              const on = p.id === activePhase;
              return (
                <div key={p.id} className={`${p.span} relative px-7 py-4 transition-colors duration-500 ${on ? p.tint : ""}`}>
                  <p className={`font-serif text-xl italic transition-colors duration-500 ${on ? p.ink : "text-ink-2"}`}><LocalizedText>{p.label}</LocalizedText></p>
                  <span
                    className={`absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-700 ${EASE} motion-reduce:transition-none ${p.bar} ${
                      on ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* The rail: the case tag slides to the current step, the line behind it fills up. */}
          <div className="relative hidden h-16 border-b border-line md:block" aria-hidden="true">
            <div className="absolute left-[12.5%] right-[12.5%] top-[calc(50%-1px)] h-0.5 rounded-full bg-line" />
            <div
              className={`absolute left-[12.5%] top-[calc(50%-1px)] h-0.5 w-3/4 origin-left rounded-full bg-serpent transition-transform duration-700 ${EASE} motion-reduce:transition-none`}
              style={{ transform: `scaleX(${active / (STEPS.length - 1)})` }}
            />
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`absolute top-[calc(50%-6px)] h-3 w-0.5 rounded-full transition-colors duration-500 ${i <= active ? "bg-serpent" : "bg-line"}`}
                style={{ left: `calc(${12.5 + i * 25}% - 1px)` }}
              />
            ))}
            <div
              className={`absolute inset-y-0 left-0 grid w-1/4 place-items-center transition-transform duration-700 ${EASE} motion-reduce:transition-none`}
              style={{ transform: `translateX(${active * 100}%)` }}
            >
              <span
                key={active}
                className="pop inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-lead shadow-[0_10px_20px_-12px_rgba(32,33,33,0.5)]"
              >
                <Doc className="h-4 w-4 text-serpent" />
                <LocalizedText>{STEPS[active].status}</LocalizedText>
              </span>
            </div>
          </div>

          <ol className="grid divide-y divide-line md:grid-cols-4 md:divide-x md:divide-y-0">
            {STEPS.map((s, i) => {
              const on = i === active;
              const phase = PHASE_BY_ID[s.phase];
              return (
                <li
                  key={s.title}
                  onMouseEnter={() => setActive(i)}
                  className={`flex flex-col p-7 transition-colors duration-500 ${on ? phase.tint : ""}`}
                >
                  <p className={`-mx-7 -mt-7 mb-7 px-7 py-3 font-serif text-lg italic md:hidden ${phase.tint} ${phase.ink}`}><LocalizedText>{phase.label}</LocalizedText></p>
                  <div className="flex items-end justify-between gap-3">
                    <span className={`text-6xl font-extrabold leading-none tracking-tighter tabular-nums transition-colors duration-500 ${on ? "text-serpent" : "text-wolverine"}`}><LocalizedText>{i + 1}</LocalizedText></span>
                    {on && (
                      <span key={`m-${active}`} className="pop mb-1 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-lead md:hidden">
                        <LocalizedText>{s.status}</LocalizedText>
                      </span>
                    )}
                  </div>
                  <h3 className="mt-6 text-lg font-bold leading-snug text-lead"><LocalizedText>{s.title}</LocalizedText></h3>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-2"><LocalizedText>{s.text}</LocalizedText></p>
                  <LocalizedElement as="ul" className="mt-8 flex flex-wrap gap-x-2 gap-y-4" aria-label="Who does this step">
                    {s.who.map((p, j) => (
                      <li key={p.name} className="flex w-12 flex-col items-center gap-1.5">
                        <span key={on ? `on-${active}` : "off"} className={`relative block ${on ? "hop" : ""}`} style={on ? { animationDelay: `${j * 90}ms` } : undefined}>
                          <Minifig {...p} className={`h-12 w-12 rounded-xl transition-colors duration-500 ${on ? "bg-white" : "bg-mist"}`} />
                          {on && p.ticks && (
                            <span
                              className="pop absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-md bg-ok text-white shadow-sm"
                              style={{ animationDelay: `${350 + j * 300}ms` }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="text-center text-[11px] font-semibold leading-tight text-ink-2"><LocalizedText>{p.name}</LocalizedText></span>
                      </li>
                    ))}
                  </LocalizedElement>
                  {s.more && <p className="mt-3 text-xs text-ink-2"><LocalizedText>{s.more}</LocalizedText></p>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

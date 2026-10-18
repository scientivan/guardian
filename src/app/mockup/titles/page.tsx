import type { ReactNode } from "react";
import { Figure, MoneyFigure } from "@/components/app/ui";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Minifig } from "@/components/landing/Minifig";
import { EXPLANATION } from "@/lib/demo";
import { money, share } from "@/lib/format";

// TEMPORARY comparison page, round 2: section titles built from Guardian's own world.
// Aurel picks one; the winner goes into ui.tsx and this page is deleted.

const e = EXPLANATION;
const LOW = 2_500_000;
const HIGH = 4_000_000;
const at = (v: number) => share(v - LOW, HIGH - LOW);

function EstimateBody() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm text-ink-2">Estimated range</p>
          <Figure code="CNY" value={`${money(e.estimate.low, "").trim()}–${money(e.estimate.high, "").trim()}`} tone="text-lead" />
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-ink-2">Bill so far</p>
          <MoneyFigure minor={e.total} currency="CNY" />
        </div>
      </div>
      <div className="relative mt-5 h-4 rounded-full bg-firstlight">
        <div className="absolute inset-y-0 rounded-full bg-cerulean" style={{ left: `${at(e.estimate.low)}%`, width: `${at(e.estimate.high) - at(e.estimate.low)}%` }} />
        <div className="absolute -top-2 h-8 w-1.5 -translate-x-1/2 rounded-sm bg-serpent ring-2 ring-white" style={{ left: `${at(e.total)}%` }} />
      </div>
    </>
  );
}

function BreakdownBody() {
  const colors = ["#4875a1", "#6e5e52", "#375d84", "#abc1cf", "#c9b9ab", "#91999c"];
  return (
    <div className="flex h-14 gap-1.5">
      {Object.values(e.byCategory).map((v, i) => (
        <div key={i} className="min-w-4 rounded-xl" style={{ flexGrow: v, flexBasis: 0, background: colors[i] }} />
      ))}
    </div>
  );
}

type S = { title: string; agent: AgentId; body: ReactNode };
const SECTIONS: S[] = [
  { title: "Estimate vs. Bill", agent: "calculator", body: <EstimateBody /> },
  { title: "Cost Breakdown", agent: "reader", body: <BreakdownBody /> },
];

function Fig({ id, className }: { id: AgentId; className: string }) {
  const a = AGENT_BY_ID[id];
  return <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} label={a.name} className={className} />;
}

/* ---------- Round 2 ---------- */

// F. Speech bubble: the agent who made the section "says" its title.
function OptionF({ s }: { s: S }) {
  return (
    <section>
      <div className="flex items-end gap-2">
        <Fig id={s.agent} className="h-14 w-14 shrink-0" />
        <h2 className="relative mb-6 rounded-2xl rounded-bl-md bg-serpent-dark px-5 py-2.5 text-lg font-bold text-white after:absolute after:-bottom-2 after:left-0 after:h-4 after:w-4 after:bg-serpent-dark after:[clip-path:polygon(0_0,100%_0,0_100%)]">
          {s.title}
        </h2>
      </div>
      <div className="mt-4">{s.body}</div>
    </section>
  );
}

// G. Dark ribbon: a short piece of the tab band, starting at the sidebar line and ending
// in a rounded tip just after the title, with the agent standing on it.
function OptionG({ s }: { s: S }) {
  return (
    <section>
      <div className="-ml-6 flex items-end sm:-ml-8">
        <h2 className="flex items-center gap-3 rounded-r-full bg-serpent-dark py-3 pl-6 pr-4 text-lg font-bold text-white sm:pl-8">
          {s.title}
          <Fig id={s.agent} className="-my-6 h-14 w-14" />
        </h2>
      </div>
      <div className="mt-6">{s.body}</div>
    </section>
  );
}

// I. Journey rail: one line runs down the page; each section is a stop, marked by its agent.
function OptionI({ s, last }: { s: S; last: boolean }) {
  return (
    <section className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4">
      {!last && <span className="absolute bottom-0 left-7 top-14 w-1 -translate-x-1/2 rounded-full bg-firstlight" aria-hidden="true" />}
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-serpent-dark">
        <Fig id={s.agent} className="h-12 w-12" />
      </span>
      <div className="pb-10">
        <h2 className="flex h-14 items-center text-xl font-bold text-lead">{s.title}</h2>
        <div className="mt-2">{s.body}</div>
      </div>
    </section>
  );
}

// J. Highlighter: the title in the serif of the tab titles, marked with a light-blue highlighter stroke.
function OptionJ({ s }: { s: S }) {
  return (
    <section>
      <h2 className="inline bg-[linear-gradient(transparent_55%,#dae7ee_55%)] px-1 font-serif text-3xl text-serpent-dark [box-decoration-break:clone]">{s.title}</h2>
      <div className="mt-6">{s.body}</div>
    </section>
  );
}

export default function TitlesMockup() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 bg-white px-6 py-10">
      <p className="text-sm text-ink-2">Mockup, round 2: section titles from Guardian’s own world. Pick a letter.</p>

      <div className="rounded-[2rem] border-2 border-dashed border-line p-6 sm:p-8">
        <p className="mb-6 text-sm font-semibold text-ink-2">Option F: Speech bubble (the agent says the title)</p>
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <OptionF key={s.title} s={s} />
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-dashed border-line p-6 sm:p-8">
        <p className="mb-6 text-sm font-semibold text-ink-2">Option G: Dark ribbon (a piece of the tab band, from the left edge)</p>
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <OptionG key={s.title} s={s} />
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-dashed border-line p-6 sm:p-8">
        <p className="mb-6 text-sm font-semibold text-ink-2">Option I: Journey rail (one line down the page, each section a stop)</p>
        <div>
          {SECTIONS.map((s, i) => (
            <OptionI key={s.title} s={s} last={i === SECTIONS.length - 1} />
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-dashed border-line p-6 sm:p-8">
        <p className="mb-6 text-sm font-semibold text-ink-2">Option J: Highlighter (tab-title serif, marked like with a pen)</p>
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <OptionJ key={s.title} s={s} />
          ))}
        </div>
      </div>
    </main>
  );
}

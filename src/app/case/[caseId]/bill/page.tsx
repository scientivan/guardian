import Link from "next/link";
import { CopyButton } from "@/components/app/CopyButton";
import { MoneyBreakdown } from "@/components/app/MoneyBreakdown";
import { Chip, Figure, FoldSection, MoneyFigure, Section, SECONDARY, type Tone } from "@/components/app/ui";
import type { AgentId } from "@/components/landing/agents";
import { money, share } from "@/lib/format";
import { EXPLANATION, ITEMS, type LineType } from "@/lib/demo";

// Bill Review (TASKS 2.5): the bill against the estimate, the cost breakdown, the questions
// for the hospital, and the reasons folded away until someone wants them.

const REASONS: { type: LineType; title: string; tone: Tone; chip: string; agent: AgentId }[] = [
  { type: "arithmetic_fact", title: "Calculated from the Bill", tone: "info", chip: "Fact", agent: "calculator" },
  { type: "stated_in_document", title: "Stated in the Hospital’s Documents", tone: "brown", chip: "In the documents", agent: "reader" },
];

// Scale of the estimate bar.
const LOW = 2_500_000;
const HIGH = 4_000_000;
const at = (v: number) => share(v - LOW, HIGH - LOW);

export default function BillPage() {
  const e = EXPLANATION;
  const questionsText = e.questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n");

  return (
    <div className="space-y-12">
      <Section title="Estimate vs. Bill" agent="calculator">
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

      <Section title="Cost Breakdown" agent="reader">
        <MoneyBreakdown byCategory={e.byCategory} total={e.total} currency={e.currency} items={Object.values(ITEMS)} />
      </Section>

      <FoldSection title={`Questions for the Hospital (${e.questions.length})`} agent="planner">
        <ol className="space-y-3">
          {e.questions.map((q, i) => (
            <li key={q.text} className="flex gap-4">
              <span className="w-5 text-lg font-extrabold leading-7 tabular-nums text-serpent">{i + 1}</span>
              <p className="text-lg leading-7 text-lead">{q.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <CopyButton text={questionsText} label="Copy questions" />
          <Link href="chat" className={SECONDARY}>
            Ask the assistant
          </Link>
        </div>
      </FoldSection>

      {REASONS.map((r) => {
        const lines = e.lines.filter((l) => l.type === r.type);
        return (
          <FoldSection key={r.type} title={`${r.title} (${lines.length})`} agent={r.agent}>
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.text} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <Chip tone={r.tone} className="mt-0.5">
                    {r.chip}
                  </Chip>
                  <p className="min-w-0 flex-1 leading-relaxed text-lead">
                    {l.text}
                    {l.amount !== undefined && <b className="whitespace-nowrap tabular-nums"> +{money(l.amount, e.currency)}</b>}
                    <span className="ml-2 text-xs text-ink-2">{l.itemIds.join(", ")}</span>
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

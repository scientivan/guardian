import { MemberAvatar } from "@/components/app/people";
import { Chip, MoneyFigure, SECONDARY, Section, type Tone } from "@/components/app/ui";
import { day, money } from "@/lib/format";
import { REFUNDS } from "@/lib/demo";

// Refund Tracking (TASKS 2.8): what comes back after discharge, and each person's share with its
// status and due date (PRD F18). Shown at the demo's discharge point (simulated clock).

const STATUS: Record<string, { label: string; tone: Tone }> = {
  received: { label: "Received", tone: "ok" },
  processing: { label: "Processing", tone: "info" },
  requested: { label: "Requested", tone: "muted" },
};

export default function RefundsPage() {
  const r = REFUNDS;
  return (
    <div className="space-y-12">
      <Section title="Summary" agent="auditor" action={<Chip>Demo: after discharge, day 12</Chip>}>
        <dl className="grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-2">Deposits paid</dt>
            <dd className="mt-1">
              <MoneyFigure minor={r.deposits} currency={r.currency} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-2">Final bill</dt>
            <dd className="mt-1">
              <MoneyFigure minor={r.finalBill} currency={r.currency} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-2">Coming back</dt>
            <dd className="mt-1">
              <MoneyFigure minor={r.totalRefund} currency={r.currency} />
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Refund per Person" agent="auditor">
        <ul className="divide-y divide-line">
          {r.items.map((it) => (
            <li key={it.memberId} className="flex flex-wrap items-center gap-3 py-3.5">
              <MemberAvatar id={it.memberId} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-lead">{it.displayName}</p>
                <p className="text-xs text-ink-2">Due {day(it.dueAt)}</p>
              </div>
              <b className="font-num tabular-nums text-serpent-dark">{money(it.amount, r.currency)}</b>
              {it.overdue ? <Chip tone="danger">Overdue</Chip> : <Chip tone={STATUS[it.status].tone}>{STATUS[it.status].label}</Chip>}
              {it.overdue && (
                <button type="button" className={`${SECONDARY} !px-3 !py-1.5`}>
                  Remind
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

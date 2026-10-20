"use client";

import Link from "next/link";
import { AGENTS, type AgentId } from "@/components/landing/agents";
import { Minifig } from "@/components/landing/Minifig";
import type { AgentState, AgentStatus } from "@/components/office/model";
import { clock } from "@/lib/format";
import type { AuditRow } from "@/lib/demo";
import { actorLabel, describeAction } from "@/lib/audit-labels";
import { Chip, STATE_CHIP } from "./ui";

// Status labels in the team list: square, all the same width, solid colour with white text.
const STATE_SOLID: Record<AgentState, string> = {
  done: "bg-ok",
  working: "bg-serpent",
  waiting: "bg-warn",
  blocked: "bg-danger",
  idle: "bg-ink-2",
};

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * What every agent is doing right now. Clicking one selects it in the office.
 * `brief` shows the short line (the agents panel on each tab); the Agent Office tab shows the full sentence.
 */
export function TeamList({
  status,
  selected = null,
  highlight = [],
  onSelect,
  brief = false,
}: {
  status: Record<AgentId, AgentStatus>;
  selected?: AgentId | null;
  highlight?: AgentId[];
  onSelect?: (id: AgentId) => void;
  brief?: boolean;
}) {
  return (
    <ul className="space-y-1">
      {AGENTS.map((a) => {
        const s = status[a.id];
        const chip = STATE_CHIP[s.state];
        const on = selected === a.id;
        const mine = highlight.includes(a.id);
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect?.(a.id)}
              aria-pressed={on}
              className={`flex w-full items-start gap-3 rounded-2xl p-2 text-left transition-colors ${on ? "bg-firstlight" : mine ? "bg-mist" : "hover:bg-mist"}`}
            >
              <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className="h-10 w-10 shrink-0 rounded-xl bg-white" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-lead">{a.name}</span>
                  <span className={`w-[4.75rem] shrink-0 py-1 text-center text-xs font-bold text-white ${STATE_SOLID[s.state]}`}>{chip.label}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-2">{brief ? sentence(s.text) : s.detail}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The latest entries of the case log, newest first. `fill` lets the list take its box's height and
 * scroll inside it. With `caseId`, each entry opens that step in Case History.
 */
export function ActivityLog({ rows, horizontal = false, fill = false, caseId, limit }: { rows: AuditRow[]; horizontal?: boolean; fill?: boolean; caseId?: string; limit?: number }) {
  const list = [...rows].reverse().slice(0, limit);
  const body = (r: AuditRow) => <>
    <span className="pt-0.5 text-xs tabular-nums text-ink-2">{clock(r.ts)}</span>
    <span className="min-w-0 text-sm leading-snug text-lead">
      <b className="font-semibold">{actorLabel(r.actor)}</b>
      {r.decision === "deny" && <Chip tone="danger" className="ml-2">Blocked</Chip>}
      <span className={horizontal ? "line-clamp-2 text-ink-2 [@media(max-height:600px)]:hidden" : "block text-ink-2"}>{describeAction(r.action, r.check)}</span>
    </span>
  </>;
  const item = horizontal ? "grid w-64 shrink-0 grid-cols-[2.75rem_1fr] gap-2 rounded-xl bg-white/80 px-3 py-2.5" : "grid grid-cols-[2.75rem_1fr] gap-2 py-2.5";
  return (
    <ol aria-label="Recent case activity" tabIndex={0} className={horizontal ? "flex gap-3 overflow-x-auto overscroll-x-contain pb-2" : `${fill ? "h-full" : "max-h-64"} divide-y divide-line overflow-y-auto overscroll-contain pr-1`}>
      {list.map((r) => (
        <li key={r.seq}>
          {caseId
            ? <Link href={`/case/${caseId}/log#step-${r.seq}`} className={`${item} ${horizontal ? "" : "-mx-2 rounded-xl px-2"} transition-colors hover:bg-firstlight/70`}>{body(r)}</Link>
            : <div className={item}>{body(r)}</div>}
        </li>
      ))}
      {!list.length && <li className="py-2.5 text-sm text-ink-2">No activity yet.</li>}
    </ol>
  );
}

"use client";

import { useCaseData } from "@/components/app/WorkspaceProvider";

import Link from "next/link";
import { useState } from "react";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Arrow } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";
import { ROOMS, roomView, type RoomId } from "@/components/office/model";
import { OfficeScene } from "@/components/office/OfficeScene";

import { ActivityLog, TeamList } from "./TeamPanel";
import { Chip, STATE_CHIP } from "./ui";

const BAND = "shrink-0 rounded-[1.25rem] bg-firstlight px-5 py-2.5 text-base font-semibold text-serpent-dark";
const SCENE_BG = { background: "radial-gradient(120% 90% at 30% 10%, #fffaf3 0%, #eef3f6 60%, #dae7ee 100%)" };

/**
 * The agents panel beside every case tab: the room that does this tab's work, what each
 * agent is doing, and the recent case log. Wide screens only; phones get <AgentStrip>.
 */
export function AgentDock({ caseId, room, agents, activity = true }: { caseId: string; room: RoomId; agents: AgentId[]; activity?: boolean }) {
  const { audit: AUDIT, agents: SAMPLE_STATUS } = useCaseData();
  const [selected, setSelected] = useState<AgentId | null>(null);
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] min-h-0 flex-col gap-4 border-l border-line bg-white p-5 xl:flex" aria-label="Agents on this case">
      <div className="relative shrink-0 overflow-hidden rounded-[1.75rem] [@media(max-height:760px)]:hidden" style={SCENE_BG}>
        <div className="aspect-[16/10]">
          <OfficeScene status={SAMPLE_STATUS} viewBox={roomView(room).join(" ")} highlight={agents} selected={selected} onSelectAgent={setSelected} denLit={room === "den"} />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-white/90 px-4 py-2">
          <span className="text-sm font-semibold text-lead">{ROOMS[room].name}</span>
          <Link href={`/case/${caseId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-serpent-dark hover:underline">
            Agent Office <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <section aria-labelledby="dock-team" className="flex min-h-0 flex-1 flex-col">
        <h2 id="dock-team" className={BAND}>The Team</h2>
        <div tabIndex={0} aria-label="Agent team members" className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <TeamList status={SAMPLE_STATUS} highlight={agents} selected={selected} onSelect={setSelected} brief />
        </div>
      </section>
      {activity && <section aria-labelledby="dock-activity" className="flex min-h-0 flex-1 flex-col">
        <div className={`${BAND} flex items-center justify-between`}>
          <h2 id="dock-activity">Recent Activity</h2>
          <Link href={`/case/${caseId}/log`} className="text-xs font-semibold hover:underline">See all</Link>
        </div>
        <div className="mt-1 min-h-0 flex-1">
          <ActivityLog rows={AUDIT.rows} fill caseId={caseId} />
        </div>
      </section>}
    </aside>
  );
}

/** Phones and tablets: the agents working on this tab, in one row above the content. */
export function AgentStrip({ caseId, agents }: { caseId: string; agents: AgentId[] }) {
  const { agents: SAMPLE_STATUS } = useCaseData();
  return (
    <div className="mb-6 flex items-center gap-3 overflow-x-auto border-b border-line pb-4 xl:hidden">
      {agents.map((id) => {
        const a = AGENT_BY_ID[id];
        const s = SAMPLE_STATUS[id];
        return (
          <div key={id} className="flex shrink-0 items-center gap-2 pr-2">
            <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className="h-9 w-9 rounded-lg bg-mist" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-lead">{a.name}</span>
              <Chip tone={STATE_CHIP[s.state].tone} className="mt-0.5">
                {STATE_CHIP[s.state].label}
              </Chip>
            </span>
          </div>
        );
      })}
      <Link href={`/case/${caseId}`} className="ml-auto shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-serpent-dark">
        Office
      </Link>
    </div>
  );
}

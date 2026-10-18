"use client";

import Link from "next/link";
import { useState } from "react";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Arrow } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";
import { ROOMS, SAMPLE_STATUS, roomView, type RoomId } from "@/components/office/model";
import { OfficeScene } from "@/components/office/OfficeScene";
import { AUDIT } from "@/lib/demo";
import { ActivityLog, TeamList } from "./TeamPanel";
import { Chip, Section, STATE_CHIP } from "./ui";

const SCENE_BG = { background: "radial-gradient(120% 90% at 30% 10%, #fffaf3 0%, #eef3f6 60%, #dae7ee 100%)" };

/**
 * The agents panel beside every case tab: the room that does this tab's work, what each
 * agent is doing, and the recent case log. Wide screens only; phones get <AgentStrip>.
 */
export function AgentDock({ caseId, room, agents }: { caseId: string; room: RoomId; agents: AgentId[] }) {
  const [selected, setSelected] = useState<AgentId | null>(null);
  return (
    <aside className="hidden space-y-10 border-l border-line pl-8 xl:block" aria-label="Agents on this case">
      <div className="relative overflow-hidden rounded-[1.75rem]" style={SCENE_BG}>
        <div className="aspect-[4/3]">
          <OfficeScene status={SAMPLE_STATUS} viewBox={roomView(room).join(" ")} highlight={agents} selected={selected} onSelectAgent={setSelected} denLit={room === "den"} />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-white/90 px-4 py-2.5">
          <span className="text-sm font-semibold text-lead">{ROOMS[room].name}</span>
          <Link href={`/case/${caseId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-serpent-dark hover:underline">
            Agent Office <Arrow className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <Section variant="band" inset title="The Team">
        <TeamList status={SAMPLE_STATUS} highlight={agents} selected={selected} onSelect={setSelected} brief />
      </Section>
      <Section variant="band" inset title="Recent Activity">
        <ActivityLog rows={AUDIT.rows} />
      </Section>
    </aside>
  );
}

/** Phones and tablets: the agents working on this tab, in one row above the content. */
export function AgentStrip({ caseId, agents }: { caseId: string; agents: AgentId[] }) {
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

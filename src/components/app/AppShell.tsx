"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AgentId } from "@/components/landing/agents";
import { Building, Chain, ChatBubble, Chevron, Coins, Doc, People, Refund, ShieldMark, Upload } from "@/components/landing/icons";
import type { RoomId } from "@/components/office/model";
import { money, share } from "@/lib/format";
import { CASE, REQUESTS } from "@/lib/demo";
import { AgentDock } from "./AgentDock";
import { MemberAvatar } from "./people";
import { TabBand } from "./TabBand";

// Frame for every case screen: case header, "Upload a bill" as the first action, the tab list
// (sidebar on desktop, bottom bar on phones), the "Demo data" badge the API conventions ask
// for, and the agents panel showing the room that does the work for the tab you're on.

export type NavId = "office" | "bill" | "pledges" | "chat" | "upload" | "refunds" | "log" | "members";

const NAV: { id: NavId; path: string; label: string; icon: ReactNode; phone?: boolean }[] = [
  { id: "office", path: "", label: "Agent Office", icon: <Building className="h-5 w-5" />, phone: true },
  { id: "bill", path: "/bill", label: "Bill Review", icon: <Doc className="h-5 w-5" />, phone: true },
  { id: "pledges", path: "/pledges", label: "Pledges", icon: <Coins className="h-5 w-5" />, phone: true },
  { id: "chat", path: "/chat", label: "Case Assistant", icon: <ChatBubble className="h-5 w-5" />, phone: true },
  { id: "refunds", path: "/refunds", label: "Refund Tracking", icon: <Refund className="h-5 w-5" /> },
  { id: "log", path: "/log", label: "Security Log", icon: <Chain className="h-5 w-5" />, phone: true },
  { id: "members", path: "/members", label: "Case Members", icon: <People className="h-5 w-5" /> },
];

/** Which room and agents the panel shows on each tab. */
const FOCUS: Record<Exclude<NavId, "office">, { room: RoomId; agents: AgentId[] }> = {
  bill: { room: "analysis", agents: ["calculator", "second"] },
  pledges: { room: "vault", agents: ["gate"] },
  chat: { room: "den", agents: ["planner"] },
  upload: { room: "intake", agents: ["clerk", "reader"] },
  refunds: { room: "records", agents: ["auditor"] },
  log: { room: "records", agents: ["auditor"] },
  members: { room: "intake", agents: ["clerk"] },
};

const TITLE: Record<NavId, string> = {
  office: "Agent Office",
  bill: "Bill Review",
  pledges: "Pledges",
  chat: "Case Assistant",
  upload: "Bill Upload",
  refunds: "Refund Tracking",
  log: "Security Log",
  members: "Case Members",
};

const guarantee = REQUESTS[0];

export function AppShell({ caseId, children }: { caseId: string; children: ReactNode }) {
  const pathname = usePathname();
  const base = `/case/${caseId}`;
  const active: NavId = pathname.startsWith(`${base}/upload`) ? "upload" : (NAV.find((n) => n.path && pathname.startsWith(base + n.path))?.id ?? "office");
  const focus = active === "office" ? null : FOCUS[active];

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link href="/projects" className="flex shrink-0 items-center gap-2" aria-label="Your projects">
            <ShieldMark className="h-7 w-7" />
            <span className="hidden font-serif text-xl text-lead sm:inline">Guardian</span>
          </Link>
          <span className="hidden h-7 w-px bg-line sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-lead">{CASE.patient.name.split(" ")[0]}’s treatment in Shenzhen</p>
            <p className="truncate text-xs text-ink-2">Case {CASE.id}, {CASE.hospital.name}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="rounded-md bg-firstlight px-2 py-0.5 text-xs font-semibold text-serpent-dark">Demo data</span>
            <span className="hidden rounded-md bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn-ink md:inline">Sample activity, backend not connected</span>
            <button type="button" className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2 text-left transition-colors hover:bg-mist" aria-label="Viewing as Rina, owner">
              <MemberAvatar id="M_OWNER" className="h-8 w-8 rounded-full" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-semibold text-lead">Rina</span>
                <span className="block text-xs text-ink-2">Owner</span>
              </span>
              <Chevron className="h-4 w-4 text-ink-2" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-line bg-white p-3 lg:flex" aria-label="Case sections">
          <Link
            href={`${base}/upload`}
            aria-current={active === "upload" ? "page" : undefined}
            className={`mb-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              active === "upload" ? "bg-[#2f5274] text-white" : "bg-serpent-dark text-white hover:bg-[#2f5274]"
            }`}
          >
            <Upload className="h-5 w-5" />
            Upload a bill
          </Link>
          <ul className="space-y-1">
            {NAV.map((n) => {
              const on = n.id === active;
              return (
                <li key={n.id}>
                  <Link
                    href={base + n.path}
                    aria-current={on ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      on ? "bg-firstlight text-serpent-dark" : "text-ink-2 hover:bg-mist hover:text-lead"
                    }`}
                  >
                    {n.icon}
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href={`${base}/pledges`} className="mt-auto block rounded-2xl bg-mist p-4 text-sm transition-colors hover:bg-firstlight/60">
            <p className="text-xs text-ink-2">{guarantee.purpose}</p>
            <p className="mt-0.5 tabular-nums text-ink-2">
              <b className="font-num text-lg font-extrabold text-serpent-dark">{money(guarantee.approved, guarantee.currency)}</b> of {money(guarantee.amount, "").trim()}
            </p>
            <div className="mt-2 h-2 rounded-full bg-firstlight">
              <div className="h-2 rounded-full bg-serpent" style={{ width: `${share(guarantee.approved, guarantee.amount)}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-warn-ink">Still missing {money(guarantee.remaining, guarantee.currency)}</p>
          </Link>
        </nav>

        <div className="min-w-0 flex-1">
          <TabBand title={TITLE[active]} working={focus ? focus.agents : []} />
          <div className="p-4 sm:p-6 lg:p-8">
            <div className={focus ? "grid gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]" : ""}>
              <main className="min-w-0">{children}</main>
              {focus && <AgentDock caseId={caseId} room={focus.room} agents={focus.agents} />}
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white lg:hidden" aria-label="Case sections">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => n.phone).map((n) => {
            const on = n.id === active;
            return (
              <li key={n.id}>
                <Link
                  href={base + n.path}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${on ? "text-serpent-dark" : "text-ink-2"}`}
                >
                  {n.icon}
                  {n.label.split(" ").pop()}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

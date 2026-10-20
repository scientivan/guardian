"use client";

import { Select } from "./Select";
import { CaseSwitcher } from "./CaseSwitcher";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { useCaseData, useWorkspace } from "./WorkspaceProvider";
import type { ReactNode } from "react";
import type { AgentId } from "@/components/landing/agents";
import { Building, Chain, Coins, Doc, Lock, People, ShieldMark, Upload } from "@/components/landing/icons";
import { AssistantLauncher, AssistantProvider } from "./Assistant";
import type { RoomId } from "@/components/office/model";
import { money, share } from "@/lib/format";
import { AgentDock } from "./AgentDock";
import { TabBand } from "./TabBand";

// Frame for every case screen: case header, "Upload a bill" as the first action, the tab list
// (sidebar on desktop, bottom bar on phones), the profile menu and the agents panel.

export type NavId = "office" | "bill" | "pledges" | "upload" | "refunds" | "log" | "members" | "guide";

const NAV: { id: NavId; path: string; label: string; short?: string; icon: ReactNode; phone?: boolean }[] = [
  { id: "office", path: "", label: "Agent Office", icon: <Building className="h-5 w-5" />, phone: true },
  { id: "bill", path: "/bill", label: "Bill Review", icon: <Doc className="h-5 w-5" />, phone: true },
  { id: "pledges", path: "/pledges", label: "Pledges", icon: <Coins className="h-5 w-5" />, phone: true },
  { id: "log", path: "/log", label: "Case History", short: "History", icon: <Chain className="h-5 w-5" />, phone: true },
  { id: "members", path: "/members", label: "Case Members", icon: <People className="h-5 w-5" /> },
  { id: "guide", path: "/guide", label: "How It Works", short: "Guide", icon: <Lock className="h-5 w-5" />, phone: true },
];

/** Which room and agents the panel shows on each tab. */
const FOCUS: Record<Exclude<NavId, "office">, { room: RoomId; agents: AgentId[] }> = {
  bill: { room: "analysis", agents: ["calculator", "second"] },
  pledges: { room: "vault", agents: ["gate"] },
  upload: { room: "intake", agents: ["clerk", "reader"] },
  refunds: { room: "records", agents: ["auditor"] },
  log: { room: "records", agents: ["auditor"] },
  members: { room: "intake", agents: ["clerk"] },
  guide: { room: "vault", agents: ["gate", "auditor"] },
};

const TITLE: Record<NavId, string> = {
  office: "Agent Office",
  bill: "Bill Review",
  pledges: "Pledges",
  upload: "Bill Upload",
  refunds: "Refund Tracking",
  log: "Case History",
  members: "Case Members",
  guide: "How It Works",
};


export function AppShell({ caseId, children }: { caseId: string; children: ReactNode }) {
  const { case: CASE, requests } = useCaseData();
  const {mode,selectMember}=useWorkspace();
  const guarantee = requests[0];
  const pathname = usePathname();
  const base = `/case/${caseId}`;
  // Refund Tracking lives inside Pledges: it has no tab of its own, so the Pledges tab stays lit.
  const active: NavId = pathname.startsWith(`${base}/upload`) ? "upload" : pathname.startsWith(`${base}/refunds`) ? "refunds" : (NAV.find((n) => n.path && pathname.startsWith(base + n.path))?.id ?? "office");
  const lit = (id: NavId) => id === active || (id === "pledges" && active === "refunds");
  const focus = active === "office" ? null : FOCUS[active];
  const office = active === "office";

  return (
    <AssistantProvider raised={office}>
    <div className={office ? "flex h-dvh flex-col overflow-hidden bg-white pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0" : "min-h-screen bg-white pb-20 lg:pb-0"}>
      <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <Link href="/projects" className="flex shrink-0 items-center gap-2" aria-label="Dashboard">
            <ShieldMark className="h-7 w-7" />
            <span className="hidden font-serif text-xl text-lead sm:inline">Guardian</span>
          </Link>
          <span className="hidden h-7 w-px bg-line sm:block" />
          <CaseSwitcher />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {mode === "demo" && <div className="hidden items-center text-xs text-ink-2 sm:flex">Viewing as<Select label="Viewing as" className="ml-2 w-52" value={CASE.me.id} onChange={v=>void selectMember(CASE.id,v)} options={CASE.members.map(m=>({value:m.id,label:m.displayName,hint:m.role}))}/></div>}
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className={office ? "flex min-h-0 flex-1 overflow-hidden" : "flex"}>
        <nav className={`${office ? "h-full min-h-0 overflow-y-auto" : "sticky top-16 h-[calc(100dvh-4rem)]"} hidden w-60 shrink-0 flex-col border-r border-line bg-white p-3 lg:flex`} aria-label="Case sections">
          {CASE.me.role !== "payer" && <Link
            href={`${base}/upload`}
            aria-current={active === "upload" ? "page" : undefined}
            className={`mb-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              active === "upload" ? "bg-[#2f5274] text-white" : "bg-serpent-dark text-white hover:bg-[#2f5274]"
            }`}
          >
            <Upload className="h-5 w-5" />
            Upload a bill
          </Link>}
          <ul className="space-y-1">
            {NAV.map((n) => {
              const on = lit(n.id);
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
          <div className="mt-auto pt-4"><AssistantLauncher /></div>
          {guarantee && <Link href={`${base}/pledges`} className="mt-3 block rounded-2xl bg-mist p-4 text-sm transition-colors hover:bg-firstlight/60">
            <p className="text-xs text-ink-2">{guarantee.purpose}</p>
            <p className="mt-0.5 tabular-nums text-ink-2">
              <b className="font-num text-lg font-extrabold text-serpent-dark">{money(guarantee.approved, guarantee.currency)}</b> of {money(guarantee.amount, "").trim()}
            </p>
            <div className="mt-2 h-2 rounded-full bg-firstlight">
              <div className="h-2 rounded-full bg-serpent" style={{ width: `${share(guarantee.approved, guarantee.amount)}%` }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-warn-ink">Still missing {money(guarantee.remaining, guarantee.currency)}</p>
          </Link>}
        </nav>

        {office ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <main className="h-full min-h-0 min-w-0">{children}</main>
          </div>
        ) : (
          // The title band belongs to the main column and stops at the divider; the agents column
          // starts at the top beside it and stays in view while the page scrolls.
          <div className={`min-w-0 flex-1 ${focus ? "xl:grid xl:grid-cols-[minmax(0,1fr)_22rem]" : ""}`}>
            <div className="min-w-0">
              <TabBand title={TITLE[active]} working={focus ? focus.agents : []} />
              <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
            {focus && <AgentDock caseId={caseId} room={focus.room} agents={focus.agents} activity={active !== "log"} />}
          </div>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Case sections">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => n.phone).map((n) => {
            const on = lit(n.id);
            return (
              <li key={n.id}>
                <Link
                  href={base + n.path}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${on ? "text-serpent-dark" : "text-ink-2"}`}
                >
                  {n.icon}
                  {n.short ?? n.label.split(" ").pop()}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
    </AssistantProvider>
  );
}

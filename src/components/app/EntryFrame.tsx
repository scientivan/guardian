import Link from "next/link";
import type { ReactNode } from "react";
import type { AgentId } from "@/components/landing/agents";
import { ShieldMark } from "@/components/landing/icons";
import { TabBand } from "./TabBand";

/**
 * Frame for the screens before a case is open (log in, projects, create, join): the top bar,
 * the dark title band with the team, and the content in folders on a white page.
 */
export function EntryFrame({ title, working = [], children, wide = false }: { title: string; working?: AgentId[]; children: ReactNode; wide?: boolean }) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line bg-white">
        <div className={`mx-auto flex h-16 items-center justify-between px-6 ${width}`}>
          <Link href="/" className="flex items-center gap-2.5">
            <ShieldMark className="h-7 w-7" />
            <span className="font-serif text-2xl text-lead">Guardian</span>
          </Link>
          <span className="rounded-md bg-firstlight px-2 py-0.5 text-xs font-semibold text-serpent-dark">Demo data</span>
        </div>
      </header>
      <TabBand title={title} working={working} inner={`mx-auto px-6 ${width}`} compact />
      <main className={`mx-auto space-y-10 px-6 py-10 sm:py-12 ${width}`}>{children}</main>
    </div>
  );
}

export const INPUT = "mt-1 w-full rounded-xl border border-line bg-white px-3.5 py-3 text-lead outline-none transition-colors focus:border-serpent";

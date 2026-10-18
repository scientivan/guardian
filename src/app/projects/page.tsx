"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EntryFrame, INPUT } from "@/components/app/EntryFrame";
import { MemberAvatar } from "@/components/app/people";
import { Chip, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { Arrow, Plus } from "@/components/landing/icons";
import { money, share } from "@/lib/format";
import { CASE, REQUESTS } from "@/lib/demo";

// Projects home (brainstorm/17 §3): your projects, create a new one, or join with an invite link.

export default function ProjectsPage() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const g = REQUESTS[0];

  function join(e: FormEvent) {
    e.preventDefault();
    const token = link.trim().split("/").filter(Boolean).pop();
    if (token) router.push(`/join/${token}`);
  }

  return (
    <EntryFrame title="Your Projects" working={["planner"]}>
      <Section
        title="Projects"
        agent="planner"
        action={
          <Link href="/projects/new" className={PRIMARY}>
            <Plus className="h-4 w-4" /> Create a project
          </Link>
        }
      >
        <Link href={`/case/${CASE.id}`} className="group flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 transition-colors hover:bg-white/70">
          <MemberAvatar id="PATIENT" className="h-14 w-14 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-lead">{CASE.patient.name.split(" ")[0]}’s treatment in Shenzhen</p>
            <p className="text-sm text-ink-2">{CASE.hospital.name}. You are the owner.</p>
            <div className="mt-2 h-2 max-w-sm rounded-full bg-firstlight">
              <div className="h-2 rounded-full bg-serpent" style={{ width: `${share(g.approved, g.amount)}%` }} />
            </div>
          </div>
          <Chip tone="warn">{money(g.remaining, g.currency)} still missing</Chip>
          <Arrow className="h-5 w-5 text-serpent-dark transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Section>

      <Section title="Join with a Link" agent="clerk">
        <form onSubmit={join} className="flex flex-wrap gap-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the invite link someone sent you" className={`${INPUT} !mt-0 min-w-0 flex-1`} aria-label="Invite link" />
          <button type="submit" className={SECONDARY}>
            Join
          </button>
        </form>
        <button type="button" onClick={() => router.push("/join/k7q2-9xfa-31mz")} className="mt-3 text-sm font-semibold text-serpent-dark hover:underline">
          Use the demo invite for Sari
        </button>
      </Section>
    </EntryFrame>
  );
}

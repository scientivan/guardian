"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EntryFrame, INPUT } from "@/components/app/EntryFrame";
import { MemberAvatar } from "@/components/app/people";
import { Chip, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { Arrow, Plus } from "@/components/landing/icons";
import { money, share } from "@/lib/format";
import { useWorkspace } from "@/components/app/WorkspaceProvider";

// Projects home (brainstorm/17 §3): your projects, create a new one, or join with an invite link.

export default function ProjectsPage() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const { cases } = useWorkspace();

  function join(e: FormEvent) {
    e.preventDefault();
    const token = link.trim().split("/").filter(Boolean).pop();
    if (token) router.push(`/join/${token}`);
  }

  return (
    <EntryFrame title="Your Care Cases" working={["planner"]} profile>
      <Section
        title="Care Cases"
        agent="planner"
        action={
          <Link href="/projects/new" className={PRIMARY}>
            <Plus className="h-4 w-4" /> Start a care case
          </Link>
        }
      >
        {cases.length === 0 ? (
          <div className="py-3"><h2 className="text-xl font-semibold text-lead">Your first care case starts here</h2><p className="mt-2 max-w-lg leading-relaxed text-ink-2">Keep a patient’s hospital bills, family contributions and refunds together. Start a care case when you’re ready.</p></div>
        ) : cases.map(({ case: c, country, requests }) => {
          const g = requests.find(r => r.status === "pending");
          return <Link key={c.id} href={`/case/${c.id}`} className="group mb-3 flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 transition-colors hover:bg-white/70">
            <MemberAvatar id="PATIENT" className="h-14 w-14 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-lead">{c.patient.name}’s treatment in {country}</p>
              <p className="text-sm text-ink-2">{c.hospital.name}. You are the {c.me.role}.</p>
              {g && <div className="mt-2 h-2 max-w-sm rounded-full bg-firstlight"><div className="h-2 rounded-full bg-serpent" style={{ width: `${share(g.approved, g.amount)}%` }} /></div>}
            </div>
            {g && <Chip tone="warn">{money(g.remaining, g.currency)} still missing</Chip>}
            <Arrow className="h-5 w-5 text-serpent-dark" />
          </Link>;
        })}
      </Section>

      <Section title="Join with a Link" agent="clerk">
        <form onSubmit={join} className="flex flex-wrap gap-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the invite link someone sent you" className={`${INPUT} !mt-0 min-w-0 flex-1`} aria-label="Invite link" />
          <button type="submit" className={SECONDARY}>
            Join
          </button>
        </form>

      </Section>
    </EntryFrame>
  );
}

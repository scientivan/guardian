"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { EntryFrame, INPUT } from "@/components/app/EntryFrame";
import { MemberAvatar } from "@/components/app/people";
import { PRIMARY, Section } from "@/components/app/ui";

// Join with an invite link (brainstorm/17 §5). The link alone is not enough: the person must enter
// the ID number the owner entered for them. Three wrong tries lock the link and tell the owner.
// Demo: the invite is for Sari, whose ID ends in 4521.

const EXPECTED_END = "4521";
const MAX_TRIES = 3;

export default function JoinPage() {
  const [id, setId] = useState("");
  const [tries, setTries] = useState(0);
  const [joined, setJoined] = useState(false);
  const locked = tries >= MAX_TRIES;

  function verify(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (id.replace(/\s/g, "").length >= 6 && id.trim().endsWith(EXPECTED_END)) setJoined(true);
    else setTries((t) => t + 1);
  }

  return (
    <EntryFrame title="Join a Project" working={["clerk"]}>
      <div className="flex items-center gap-3">
        <MemberAvatar id="M_OWNER" className="h-12 w-12 rounded-xl" />
        <p className="text-lg text-lead">
          <b>Rina</b> invited you to help with <b>Budi’s treatment in Shenzhen</b>.
        </p>
      </div>

      {joined ? (
        <Section title="You’re In" agent="clerk">
          <p className="text-lg text-lead">You joined as a helper. You can see the bill and pledge what you can.</p>
          <Link href="/case/C1/pledges" className={`${PRIMARY} mt-5 !px-7 !py-3`}>
            Open the project
          </Link>
        </Section>
      ) : (
        <Section title="Confirm It’s You" agent="clerk">
          <form onSubmit={verify}>
            <label className="block text-sm font-medium text-ink-2">
              Your passport or ID number
              <input value={id} onChange={(e) => setId(e.target.value)} disabled={locked} autoComplete="off" className={INPUT} placeholder="For example A1234567" />
            </label>
            {tries > 0 && !locked && (
              <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2.5 text-sm text-warn-ink">
                That doesn’t match the invite. {MAX_TRIES - tries} {MAX_TRIES - tries === 1 ? "try" : "tries"} left.
              </p>
            )}
            {locked && <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">This invite is now locked and Rina has been told. Ask Rina for a new link.</p>}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button type="submit" className={`${PRIMARY} !px-7 !py-3`} disabled={locked}>
                Confirm and join
              </button>
              <span className="text-sm text-ink-2">Demo: Sari’s ID ends in {EXPECTED_END}.</span>
            </div>
          </form>
        </Section>
      )}
    </EntryFrame>
  );
}

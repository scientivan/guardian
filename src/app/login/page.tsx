"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { EntryFrame, INPUT } from "@/components/app/EntryFrame";
import { PRIMARY, SECONDARY, Section } from "@/components/app/ui";

// Demo login (brainstorm/17 §3). Nothing is checked yet; real identity checks belong to the bank
// or payment app that would run Guardian. The page says so instead of pretending.

export default function LoginPage() {
  const router = useRouter();
  function submit(e: FormEvent) {
    e.preventDefault();
    router.push("/projects");
  }
  return (
    <EntryFrame title="Log In" working={["clerk"]}>
      <Section title="Your Account" agent="clerk">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-ink-2">
            Email
            <input type="email" required autoComplete="email" defaultValue="rina@example.com" className={INPUT} />
          </label>
          <label className="block text-sm font-medium text-ink-2">
            Password
            <input type="password" required autoComplete="current-password" defaultValue="demo-password" className={INPUT} />
          </label>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button type="submit" className={`${PRIMARY} !px-7 !py-3`}>
              Log in
            </button>
            <span className="text-sm text-ink-2">Demo: any email and password work.</span>
          </div>
        </form>
      </Section>

      <Section title="Just Looking?" agent="planner">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-lead">Open the fictional family’s case as Rina, the owner.</p>
          <Link href="/case/C1" className={SECONDARY}>
            Try the demo family
          </Link>
        </div>
      </Section>
    </EntryFrame>
  );
}

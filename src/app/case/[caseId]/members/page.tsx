"use client";

import { useState, type FormEvent } from "react";
import { CopyButton } from "@/components/app/CopyButton";
import { MemberAvatar } from "@/components/app/people";
import { Chip, PRIMARY, SECONDARY, Section, type Tone } from "@/components/app/ui";
import { useTask } from "@/components/app/Feedback";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";

// Members and invites (brainstorm/17 §4–5). Every person is invited with a personal one-time
// link and confirms with their own ID number; only a fingerprint and the last 4 digits are kept.

const ROLE: Record<string, { label: string; tone: Tone; can: string }> = {
  owner: { label: "Owner", tone: "info", can: "Invites people, opens requests, pledges" },
  payer: { label: "Helper", tone: "brown", can: "Sees the bill summary, pledges what they can" },
  companion: { label: "Companion", tone: "muted", can: "Uploads bills and asks questions, can’t pay" },
};

// Demo values: the last 4 digits each member confirmed with.

const FIELD = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-lead outline-none focus:border-serpent";

export default function MembersPage() {
  const { case: CASE } = useCaseData();
  const { act,mode,selectMember } = useWorkspace();
  const { busy, run } = useTask();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const r = await run(() => act(CASE.id, { action: "invite", name: fields.get("name"), role: fields.get("role"), currency: fields.get("currency"), email: String(fields.get("email")??"").trim() || undefined, shareLimit: Math.round(Number(fields.get("shareLimit")??0)*100) }) as Promise<{ link: string }>);
    if (r) setLink(r.link);
  }

  return (
    <div className="space-y-12">
      {open && (
        <Section title="Invite a Helper" agent="clerk">
          {link ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">Share this invitation with the intended helper. It expires after 72 hours. They must sign in with the Google email you invited before accepting their role.</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-mist px-3 py-2.5 text-sm text-lead">{link}</code>
                <CopyButton text={link} label="Copy link" />
              </div>
            </div>
          ) : (
            <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink-2">
                Name
                <input className={`${FIELD} mt-1`} name="name" placeholder="Helper’s name" required />
              </label>
              <label className="text-sm text-ink-2">
                Role
                <select className={`${FIELD} mt-1`} name="role" defaultValue="payer">
                  <option value="payer">Helper (can pledge)</option>
                  <option value="companion">Companion (uploads bills, can’t pay)</option>
                </select>
              </label>
              <label className="text-sm text-ink-2">Google email<input type="email" name="email" required={mode === "google"} className={`${FIELD} mt-1`} placeholder="The helper’s Google email" /></label>
              <label className="text-sm text-ink-2">Maximum share in {CASE.currency}<input type="number" min="0" step="0.01" name="shareLimit" defaultValue="5000" className={`${FIELD} mt-1`} /></label>
              <label className="text-sm text-ink-2">
                Currency they pay in
                <select className={`${FIELD} mt-1`} name="currency" defaultValue="SGD">
                  {["IDR", "MYR", "SGD", "AED", "USD"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className={PRIMARY} disabled={busy}>
                  Create invite link
                </button>
                <button type="button" className={SECONDARY} onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Section>
      )}

      {mode === "demo" && <label className="block text-sm font-semibold text-ink-2">Viewing as<select aria-label="View case as member" value={CASE.me.id} onChange={e=>void selectMember(CASE.id,e.target.value)} className="mt-2 block w-full rounded-xl border border-line bg-white p-3">{CASE.members.map(m=><option key={m.id} value={m.id}>{m.displayName} · {m.role}</option>)}</select></label>}
      <Section title="Patient" agent="clerk">
        <div className="flex flex-wrap items-center gap-3">
          <MemberAvatar id="PATIENT" className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lead">{CASE.patient.name}</p>
            <p className="text-xs text-ink-2">The agents only ever see {CASE.patient.token}.</p>
          </div>
          <Chip tone="info">Patient</Chip>
        </div>
      </Section>

      <Section
        title="People"
        agent="clerk"
        action={CASE.me.role === "owner" ?
          <button type="button" className={PRIMARY} onClick={() => setOpen(true)}>
            Invite a helper
          </button> : undefined
        }
      >
        <ul className="divide-y divide-line">
          {CASE.members.map((m) => {
            const r = ROLE[m.role];
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <MemberAvatar id={m.id} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lead">{m.displayName}</p>
                  <p className="text-xs text-ink-2">
                    {r.can}. Pays in {m.currency}.
                  </p>
                </div>

                <Chip tone={r.tone}>{r.label}</Chip>
              </li>
            );
          })}

        </ul>
      </Section>
    </div>
  );
}

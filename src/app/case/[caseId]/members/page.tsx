"use client";

import { useState, type FormEvent } from "react";
import { CopyButton } from "@/components/app/CopyButton";
import { MemberAvatar } from "@/components/app/people";
import { Chip, PRIMARY, SECONDARY, Section, type Tone } from "@/components/app/ui";
import { People } from "@/components/landing/icons";
import { CASE } from "@/lib/demo";

// Members and invites (brainstorm/17 §4–5). Every person is invited with a personal one-time
// link and confirms with their own ID number; only a fingerprint and the last 4 digits are kept.

const ROLE: Record<string, { label: string; tone: Tone; can: string }> = {
  owner: { label: "Owner", tone: "info", can: "Invites people, opens requests, pledges" },
  payer: { label: "Helper", tone: "brown", can: "Sees the bill summary, pledges what they can" },
  companion: { label: "Companion", tone: "muted", can: "Uploads bills and asks questions, can’t pay" },
};

// Demo values: the last 4 digits each member confirmed with.
const ID_END: Record<string, string> = { M_OWNER: "8812", M_JKT: "3307", M_KL: "4521", M_DXB: "1196", M_MOSQUE: "0450", M_COMP: "7734" };

const FIELD = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-lead outline-none focus:border-serpent";

export default function MembersPage() {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  function create(e: FormEvent) {
    e.preventDefault();
    setLink("https://guardian.demo/join/k7q2-9xfa-31mz");
  }

  return (
    <div className="space-y-12">
      {open && (
        <Section title="Invite a Helper" agent="clerk">
          {link ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">Send this link to Hasan yourself, for example on WhatsApp. It works once, for 72 hours, and only for the person you entered: they confirm with their own ID number.</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-mist px-3 py-2.5 text-sm text-lead">{link}</code>
                <CopyButton text={link} label="Copy link" />
              </div>
            </div>
          ) : (
            <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-ink-2">
                Name
                <input className={`${FIELD} mt-1`} defaultValue="Hasan" required />
              </label>
              <label className="text-sm text-ink-2">
                Role
                <select className={`${FIELD} mt-1`} defaultValue="payer">
                  <option value="payer">Helper (can pledge)</option>
                  <option value="companion">Companion (uploads bills, can’t pay)</option>
                </select>
              </label>
              <label className="text-sm text-ink-2">
                ID type
                <select className={`${FIELD} mt-1`} defaultValue="passport">
                  <option value="passport">Passport</option>
                  <option value="national">National ID</option>
                </select>
              </label>
              <label className="text-sm text-ink-2">
                Their ID number
                <input className={`${FIELD} mt-1`} type="password" autoComplete="off" placeholder="Only a fingerprint is kept" required />
              </label>
              <label className="text-sm text-ink-2">
                Country they live in
                <input className={`${FIELD} mt-1`} defaultValue="Singapore" />
              </label>
              <label className="text-sm text-ink-2">
                Currency they pay in
                <select className={`${FIELD} mt-1`} defaultValue="SGD">
                  {["IDR", "MYR", "SGD", "AED", "USD"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className={PRIMARY}>
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

      <Section title="Patient" agent="clerk">
        <div className="flex flex-wrap items-center gap-3">
          <MemberAvatar id="PATIENT" className="h-12 w-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lead">{CASE.patient.name}</p>
            <p className="text-xs text-ink-2">Passport ending 4567. The agents only ever see {CASE.patient.token}.</p>
          </div>
          <Chip tone="info">Patient</Chip>
        </div>
      </Section>

      <Section
        title="People"
        agent="clerk"
        action={
          <button type="button" className={PRIMARY} onClick={() => setOpen(true)}>
            Invite a helper
          </button>
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
                <span className="text-xs text-ink-2">ID confirmed, ends {ID_END[m.id]}</span>
                <Chip tone={r.tone}>{r.label}</Chip>
              </li>
            );
          })}
          <li className="flex flex-wrap items-center gap-3 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-dashed border-wolverine text-ink-2">
              <People className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lead">Hasan (Singapore)</p>
              <p className="text-xs text-ink-2">Invite sent 2 hours ago. The link expires in 70 hours.</p>
            </div>
            <Chip>Invited</Chip>
          </li>
        </ul>
      </Section>
    </div>
  );
}

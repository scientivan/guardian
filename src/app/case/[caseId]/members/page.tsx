"use client";

import { useState, type FormEvent } from "react";
import { CopyButton } from "@/components/app/CopyButton";
import { MemberAvatar } from "@/components/app/people";
import { Chip, PRIMARY, SECONDARY, Section, type Tone } from "@/components/app/ui";
import { Spinner, useTask } from "@/components/app/Feedback";
import { Select } from "@/components/app/Select";
import { toCaseCurrency } from "@/lib/fx-rates";
import { money } from "@/lib/format";
import { INVALID, useFieldErrors } from "@/components/app/FieldError";
import { amount, check, email, memberName } from "@/lib/validate";
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
  const [sent, setSent] = useState<{ delivery: "email" | "link"; link: string; email: string; name: string } | null>(null);
  const [delivery, setDelivery] = useState<"email" | "link">("email");
  // The owner sets the limit in their own currency; the server stores it in the hospital currency.
  const ownerCurrency = CASE.members.find(m => m.id === CASE.me.id)?.currency ?? CASE.currency;
  const limitCurrency = toCaseCurrency(100, ownerCurrency, CASE.currency) === null ? CASE.currency : ownerCurrency;
  const [form, setForm] = useState({ name: "", email: "", role: "payer", shareLimit: "" });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));
  const errors = check(form, {
    name: memberName(),
    ...(delivery === "email" ? { email: email("the helper’s Google email") } : {}),
    ...(form.role === "payer" ? { shareLimit: amount("a maximum share", { min: 0 }) } : {}),
  });
  const v = useFieldErrors(errors, "invite");
  const typedLimit = !errors.shareLimit && form.shareLimit ? Math.round(Number(form.shareLimit) * 100) : null;
  const caseLimit = typedLimit === null ? null : toCaseCurrency(typedLimit, limitCurrency, CASE.currency);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!v.submit()) return;
    const r = await run(() => act(CASE.id, { action: "invite", delivery, name: form.name.trim(), role: form.role, limitCurrency, email: delivery === "email" ? form.email.trim() : undefined, shareLimit: form.role === "payer" ? Math.round(Number(form.shareLimit) * 100) : 0 }) as Promise<{ link: string }>);
    if (r) setSent({ delivery, link: r.link, email: form.email.trim(), name: form.name.trim() });
  }
  function another() { setSent(null); setForm(f => ({ ...f, name: "", email: "" })); v.reset(); }

  return (
    <div className="space-y-12">
      {open && (
        <Section title="Invite a Helper" agent="clerk">
          {sent ? (
            <div className="space-y-3">
              {sent.delivery === "email"
                ? <p className="leading-relaxed text-lead">Invitation sent to <b>{sent.email}</b>. When {sent.name} signs in to Guardian with that Google account, it appears on their Dashboard under Invitation Requests. Guardian does not send an email, so tell them to sign in. It expires after 72 hours.</p>
                : <p className="leading-relaxed text-lead">Share this link with {sent.name}. They sign in with Google, see the case brief and accept. Anyone with the link can use it once within 72 hours, so send it only to them.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-mist px-3 py-2.5 text-sm text-lead">{sent.link}</code>
                <CopyButton text={sent.link} label="Copy link" />
              </div>
              <div className="flex gap-2"><button type="button" className={SECONDARY} onClick={another}>Invite someone else</button><button type="button" className={SECONDARY} onClick={() => { setOpen(false); another(); }}>Done</button></div>
            </div>
          ) : (
            <form onSubmit={create} noValidate className="grid gap-4 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="text-sm text-ink-2">How to invite</legend>
                <div className="mt-1 flex flex-wrap rounded-xl bg-white p-1 text-sm font-semibold" role="radiogroup">
                  {([["email", "Their Google email"], ["link", "A share link"]] as const).map(([value, label]) => (
                    <button key={value} type="button" role="radio" aria-checked={delivery === value} onClick={() => setDelivery(value)} className={`flex-1 rounded-lg px-3 py-2 ${delivery === value ? "bg-serpent text-white" : "text-ink-2 hover:text-lead"}`}>{label}</button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-2">{delivery === "email" ? "The invitation waits on their Dashboard when they sign in with this Google account. Only that account can accept." : "You get a link to send on WhatsApp or anywhere. The first person who signs in with it and accepts joins."}</p>
              </fieldset>
              <label className="text-sm text-ink-2">
                Name
                <input id="invite-name" className={`${FIELD} mt-1 ${v.invalid("name") ? INVALID : ""}`} value={form.name} onChange={set("name")} placeholder="Helper’s name" {...v.field("name")} />
                {v.error("name")}
              </label>
              <div className="text-sm text-ink-2">
                Role
                <Select className="mt-1" label="Role" value={form.role} onChange={role => setForm(f => ({ ...f, role }))} options={[{ value: "payer", label: "Helper", hint: "Can pledge a share" }, { value: "companion", label: "Companion", hint: "Uploads bills, can’t pay" }]} />
              </div>
              {delivery === "email" && <label className="text-sm text-ink-2">Google email<input id="invite-email" type="email" autoComplete="off" value={form.email} onChange={set("email")} className={`${FIELD} mt-1 ${v.invalid("email") ? INVALID : ""}`} placeholder="name@gmail.com" {...v.field("email")} />{v.error("email")}</label>}
              {form.role === "payer" && <label className="text-sm text-ink-2 sm:col-span-2">Maximum share in {limitCurrency}<input id="invite-shareLimit" inputMode="decimal" value={form.shareLimit} onChange={set("shareLimit")} placeholder={limitCurrency === "IDR" ? "e.g. 10000000" : "e.g. 5000"} className={`${FIELD} mt-1 ${v.invalid("shareLimit") ? INVALID : ""}`} {...v.field("shareLimit")} />{v.error("shareLimit")}
                <span className="mt-1 block text-xs leading-relaxed">{caseLimit !== null && limitCurrency !== CASE.currency ? <>About <b>{money(caseLimit, CASE.currency)}</b> in the hospital’s currency at the reference rate. </> : null}The most this person can pledge to one payment request. Nothing is charged when you invite, and pledges stop at 100% of each request. They choose the currency they pay in when they accept.</span></label>}
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className={PRIMARY} disabled={busy}>
                  {busy ? <><Spinner />Creating…</> : delivery === "email" ? "Send invitation" : "Create invite link"}
                </button>
                <button type="button" className={SECONDARY} onClick={() => { setOpen(false); another(); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Section>
      )}

      {mode === "demo" && <div className="block text-sm font-semibold text-ink-2">Viewing as<Select label="View case as member" className="mt-2" value={CASE.me.id} onChange={id => void selectMember(CASE.id, id)} options={CASE.members.map(m => ({ value: m.id, label: m.displayName, hint: m.role }))} /></div>}
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

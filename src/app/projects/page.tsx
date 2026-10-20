"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { EntryFrame } from "@/components/app/EntryFrame";
import { ScrollArea } from "@/components/app/ScrollArea";
import { Spinner, useTask } from "@/components/app/Feedback";
import { InvitationDialog, type InvitationBrief } from "@/components/app/InvitationDialog";
import { MemberAvatar } from "@/components/app/people";
import { Chip, PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { Arrow, Hospital, Plus } from "@/components/landing/icons";
import { clearDraft, readDraft, type CaseDraft } from "@/lib/case-draft";
import { money, share } from "@/lib/format";
import { useWorkspace } from "@/components/app/WorkspaceProvider";

// Dashboard: your care cases (and a saved draft), invitations other people sent you, and the
// hospital directory.

const STEPS = ["You", "The patient", "The hospital", "First bill", "Check"];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { cases, call, refresh, mode, selectMember } = useWorkspace();
  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [requests, setRequests] = useState<InvitationBrief[] | null>(null);
  const [opened, setOpened] = useState<InvitationBrief | null>(null);
  const { busy, run } = useTask();

  useEffect(() => { if (session?.user.id) setDraft(readDraft(session.user.id)); }, [session?.user.id]);
  const loadRequests = useCallback(async () => {
    try { setRequests(((await call("/invitations")) as { invitations: InvitationBrief[] }).invitations); }
    catch { setRequests([]); }
  }, [call]);
  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function respond(action: "accept" | "decline", currency?: string) {
    if (!opened) return;
    const r = await run(() => call(`/invitations/id/${opened.id}`, "POST", { action, currency }) as Promise<InvitationBrief>);
    if (!r) return;
    setOpened(null);
    await loadRequests();
    if (action === "accept") {
      await refresh();
      if (mode === "demo" && r.memberId) await selectMember(r.caseId, r.memberId);
      router.push(`/case/${r.caseId}`);
    }
  }

  return (
    <EntryFrame title="Dashboard" working={["planner"]} profile xwide>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Section
        className="min-w-0"
        title="Care Cases"
        agent="planner"
        action={<Link href="/projects/new" className={PRIMARY}><Plus className="h-4 w-4" /> Start a care case</Link>}
      >
        {draft && (
          <div className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-cerulean bg-white/70 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-lead">Draft: {draft.patientName.trim() ? `${draft.patientName.trim()}’s care case` : "new care case"}</p>
              <p className="text-sm text-ink-2">Stopped at “{STEPS[draft.step]}” · saved {new Date(draft.savedAt).toLocaleString()}</p>
              {draft.pending && <p className="mt-1 text-sm font-semibold text-warn-ink">{draft.pending.name} is waiting for the verification team. You can continue once it’s approved.</p>}
            </div>
            <button type="button" className="text-sm font-semibold text-ink-2 hover:underline" onClick={() => { if (session?.user.id) clearDraft(session.user.id); setDraft(null); }}>Discard</button>
            <Link href="/projects/new" className={SECONDARY}>Continue draft</Link>
          </div>
        )}
        <ScrollArea label="Your care cases" fade="from-firstlight" boxClassName="max-h-[max(16rem,calc(100dvh-22rem))] pr-1">
        {cases.length === 0 && !draft ? (
          <div className="py-3"><h2 className="text-xl font-semibold text-lead">Your first care case starts here</h2><p className="mt-2 max-w-lg leading-relaxed text-ink-2">Keep a patient’s hospital bills, family contributions and refunds together. Start a care case when you’re ready.</p></div>
        ) : cases.map(({ case: c, country, requests: payments }) => {
          const g = payments.find(r => r.status === "pending");
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
        </ScrollArea>
      </Section>

      <div className="min-w-0 space-y-8">
      <Section title="Invitation Requests" agent="clerk" action={requests && requests.length > 0 ? <Chip tone="info">{requests.length} waiting</Chip> : undefined}>
        {requests === null ? <p role="status" className="flex items-center gap-3 text-ink-2"><Spinner className="h-5 w-5 text-serpent" />Checking for invitations…</p>
          : requests.length === 0 ? <p className="leading-relaxed text-ink-2">No invitations right now. When a family member invites your Google email to their care case, it appears here. If someone sent you a link, just open it.</p>
          : <ul className="space-y-3">{requests.map(r => (
            <li key={r.id}>
              <button type="button" onClick={() => setOpened(r)} className="flex w-full flex-wrap items-center gap-4 rounded-2xl bg-white p-4 text-left transition-colors hover:bg-white/70">
                <MemberAvatar id="PATIENT" className="h-12 w-12 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-lead">{r.inviter} invited you to help with {r.patientName}’s treatment</span>
                  <span className="block text-sm text-ink-2">{r.hospitalName}, {r.country} · as {r.role === "payer" ? "payer" : "companion"} · expires {new Date(r.expiresAt).toLocaleDateString()}</span>
                </span>
                <span className="text-sm font-semibold text-serpent-dark">View</span>
                <Arrow className="h-5 w-5 text-serpent-dark" />
              </button>
            </li>
          ))}</ul>}
      </Section>

      <Section title="Hospital Directory" agent="gate">
        <p className="leading-relaxed text-ink-2">Hospitals whose identity and payment account were checked by a person. Guardian only pays accounts that passed this check.</p>
        <Link href="/hospitals" className={`${SECONDARY} mt-4`}><Hospital className="h-4 w-4" /> Open directory</Link>
      </Section>
      </div>

      </div>
      {opened && <InvitationDialog invitation={opened} busy={busy} onAccept={currency => void respond("accept", currency)} onDecline={() => void respond("decline")} onClose={() => setOpened(null)} />}
    </EntryFrame>
  );
}

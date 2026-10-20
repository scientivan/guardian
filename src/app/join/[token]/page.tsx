"use client";

import { LocalizedText } from "@/components/i18n/LocaleProvider";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryFrame } from "@/components/app/EntryFrame";
import { explainError, Spinner, useTask } from "@/components/app/Feedback";
import { InvitationDialog, type InvitationBrief } from "@/components/app/InvitationDialog";
import { PRIMARY, Section } from "@/components/app/ui";
import { useWorkspace } from "@/components/app/WorkspaceProvider";

// A shared invite link. Signing in (Google) happens first through the protected layout; then the
// invitation opens as a dialog with the case brief and Accept.

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { call, refresh, mode, selectMember } = useWorkspace();
  const [invitation, setInvitation] = useState<InvitationBrief | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [open, setOpen] = useState(true);
  const { busy, run } = useTask();
  useEffect(() => {
    let active = true;
    call(`/invitations/${encodeURIComponent(token)}`).then(v => { if (active) setInvitation(v as InvitationBrief); }).catch(e => { if (active) setFailure(e); });
    return () => { active = false; };
  }, [token, call]);
  async function accept(currency: string) {
    const result = await run(async () => {
      const r = await call(`/invitations/${encodeURIComponent(token)}`, "POST", { currency }) as InvitationBrief;
      await refresh();
      if (mode === "demo" && r.memberId) await selectMember(r.caseId, r.memberId);
      return r;
    });
    if (result) router.push(`/case/${result.caseId}`);
  }
  const problem = failure ? explainError(failure) : null;
  return <EntryFrame title="Join a Care Case" profile>
    <Section title="Your Invitation" agent="clerk">
      <LocalizedText>{problem ? <div role="alert" className="space-y-2"><p className="text-lg font-semibold text-lead"><LocalizedText>{problem.title}</LocalizedText></p><p className="text-ink-2"><LocalizedText>{problem.body}</LocalizedText></p><p className="text-sm text-ink-2"><LocalizedText>{problem.hint}</LocalizedText></p></div>
        : invitation ? <div className="space-y-4"><p className="text-lg text-lead"><LocalizedText>{invitation.inviter}</LocalizedText><LocalizedText> invited you to help with </LocalizedText><b>{invitation.patientName}<LocalizedText>’s treatment</LocalizedText></b><LocalizedText> at </LocalizedText><LocalizedText>{invitation.hospitalName}</LocalizedText>.</p><button type="button" className={PRIMARY} onClick={() => setOpen(true)}><LocalizedText>View invitation</LocalizedText></button></div>
        : <p role="status" className="flex items-center gap-3 text-ink-2"><Spinner className="h-5 w-5 text-serpent" /><LocalizedText>Checking your invitation…</LocalizedText></p>}</LocalizedText>
      <Link href="/projects" className="mt-6 inline-block text-sm font-semibold text-serpent-dark underline"><LocalizedText>Back to dashboard</LocalizedText></Link>
    </Section>
    {invitation && open && <InvitationDialog invitation={invitation} busy={busy} onAccept={accept} onClose={() => setOpen(false)} />}
  </EntryFrame>;
}

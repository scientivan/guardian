"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryFrame } from "@/components/app/EntryFrame";
import { PRIMARY, Section } from "@/components/app/ui";
import { useWorkspace } from "@/components/app/WorkspaceProvider";

type Invitation={caseId:string;patientName:string;hospitalName:string;role:string;name:string;expiresAt:string;accepted:boolean;memberId?:string};
export default function JoinPage() {
  const {token}=useParams<{token:string}>();const router=useRouter();const {call,refresh,mode,selectMember}=useWorkspace();
  const [invitation,setInvitation]=useState<Invitation|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;call(`/invitations/${encodeURIComponent(token)}`).then(v=>{if(active)setInvitation(v as Invitation);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[token,call]);
  async function accept() {setBusy(true);setError("");try{const result=await call(`/invitations/${encodeURIComponent(token)}`,"POST",{}) as Invitation;await refresh();if(mode==="demo" && result.memberId)await selectMember(result.caseId,result.memberId);router.push(`/case/${result.caseId}`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <EntryFrame title="Join a Care Case" profile><Section title="Your Invitation" agent="clerk">
    {error?<p role="alert" className="text-danger-ink">{error}</p>:invitation?<div className="space-y-4"><p className="text-lg text-lead">You’re invited to help with <b>{invitation.patientName}’s treatment</b> at {invitation.hospitalName}.</p><p className="text-ink-2">Your role will be {invitation.role}. The invitation expires {new Date(invitation.expiresAt).toLocaleString()}.</p><button type="button" onClick={accept} disabled={busy} className={PRIMARY}>{busy?"Joining…":invitation.accepted?"Open care case":"Accept invitation"}</button></div>:<p role="status">Checking your invitation…</p>}
    <Link href="/projects" className="mt-6 inline-block text-sm font-semibold text-serpent-dark underline">Back to your care cases</Link>
  </Section></EntryFrame>;
}

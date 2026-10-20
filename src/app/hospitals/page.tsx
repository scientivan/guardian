"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PublicHospital, HospitalReview, HospitalProfile } from "@/lib/hospitals";
import { EntryFrame } from "@/components/app/EntryFrame";
import { Section, PRIMARY, SECONDARY } from "@/components/app/ui";
import { useWorkspace } from "@/components/app/WorkspaceProvider";
import { FIELD, Field, Loading, Notice, Status, useHospitalResource } from "@/components/hospitals/shared";
import { ProfileSubmission } from "@/components/hospitals/ProfileSubmission";

export default function HospitalsPage() {
  const {data,error,refresh}=useHospitalResource<{hospitals:PublicHospital[];proposals:HospitalReview[]}>("/hospitals");
  const {mode,cases,call}=useWorkspace();const router=useRouter();const params=useSearchParams();
  const [query,setQuery]=useState("");const [show,setShow]=useState(false);const [notice,setNotice]=useState("");const [actionError,setActionError]=useState("");const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState<HospitalReview|null>(null);
  const caseId=params.get("caseId");const care=cases.find(c=>c.case.id===caseId);
  async function link(id:string) {if(!care)return;setBusy(true);setActionError("");try{await call(`/cases/${care.case.id}/hospital`,"POST",{directoryId:id},care.case.id);router.push(`/case/${care.case.id}/pledges`);}catch(e){setActionError((e as Error).message);}finally{setBusy(false);}}
  return <EntryFrame title="Hospital Directory" working={["gate"]} profile wide>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={care?`/case/${care.case.id}/pledges`:"/projects"} className="inline-flex min-h-11 items-center text-sm font-semibold text-serpent-dark underline">{care?"Back to your care case":"Back to your care cases"}</Link>{mode==="google"&&<button type="button" className={show?SECONDARY:PRIMARY} onClick={()=>{setShow(!show);setEditing(null);}}>{show?"Close proposal form":"Suggest a hospital"}</button>}</div>
    {notice&&<Notice>{notice}</Notice>}{actionError&&<Notice error>{actionError}</Notice>}
    {show&&<Section title="Suggest a hospital" agent="clerk"><ProfileSubmission key={editing?.id??"new"} initial={editing?.payload as HospitalProfile|undefined} initialSources={editing?.sources} hospitalId={editing?.hospitalId} reviewId={editing?.id} onSaved={async()=>{setNotice("Your hospital profile was submitted for human verification. Payment accounts remain inactive until separately approved.");setShow(false);setEditing(null);await refresh();}}/></Section>}
    <Section title="Listed and verified institutions" agent="gate"><p className="mb-5 text-sm leading-relaxed text-ink-2">Profile verification confirms institutional identity and contacts. Payment authority is checked separately. Select the exact branch for your care case.</p><Field label="Find a hospital"><input className={FIELD} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Hospital, branch, city or country"/></Field>
      {error&&<div className="mt-4 space-y-3"><Notice error>{error}</Notice><button className={SECONDARY} onClick={()=>void refresh()} type="button">Retry</button></div>}
      {!data&&!error&&<Loading/>}
      {data&&<ul className="mt-5 space-y-4">{data.hospitals.filter(h=>`${h.profile.name} ${h.profile.branch} ${h.profile.city} ${h.profile.country}`.toLowerCase().includes(query.toLowerCase())).map(h=><li key={h.id} className="rounded-2xl bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{h.profile.name}</h2><p className="mt-1 text-sm text-ink-2">{[h.profile.branch,h.profile.city,h.profile.country].filter(Boolean).join(" · ")}</p></div><div className="flex flex-wrap gap-2"><Status label="Profile" value={h.profileStatus}/><Status label="Payments" value={h.paymentStatus}/></div></div>{h.profileStatus==="listed"&&<p className="mt-3 text-sm text-ink-2">Listed from public sources. Identity review and payment verification are pending.</p>}<p className="mt-4 text-sm leading-relaxed text-ink-2">{h.profile.address}</p><p className="mt-2 text-sm">{h.profile.phone}{h.profile.billingEmail?` · ${h.profile.billingEmail}`:""}</p><div className="mt-4 flex flex-wrap items-center gap-3"><a className="inline-flex min-h-11 items-center text-sm font-semibold text-serpent-dark underline" href={h.profile.website} target="_blank" rel="noreferrer">Institutional website ↗</a>{mode==="google"&&["listed","verified"].includes(h.profileStatus)&&(care?care.case.me.role==="owner"?<button className={SECONDARY} disabled={busy||care.country!==h.profile.country} type="button" onClick={()=>void link(h.id)}>Use for this care case</button>:null:<Link className={SECONDARY} href={`/projects/new?hospitalId=${h.id}`}>Start a care case here</Link>)}</div></li>)}</ul>}
      {data&&!data.hospitals.length&&<p className="py-8 text-sm text-ink-2">No hospital profiles are listed yet. Suggest a hospital with its official sources to start the review.</p>}
    </Section>
    {data&&data.proposals.length>0&&<Section title="Your submissions" agent="auditor"><ul className="divide-y divide-line">{data.proposals.map(r=><li key={r.id} className="py-4"><div className="flex flex-wrap justify-between gap-3"><p className="font-semibold">{"name" in r.payload?r.payload.name:"Payment authority review"}</p><Status value={r.status}/></div>{r.decisionNotes&&<p className="mt-3 text-sm leading-relaxed text-ink-2">{r.decisionNotes}</p>}{r.status==="needs_information"&&<button type="button" className={`${SECONDARY} mt-3`} onClick={()=>{setEditing(r);setShow(true);window.scrollTo({top:0,behavior:"instant"});}}>Provide requested evidence</button>}</li>)}</ul></Section>}
    {mode==="demo"&&<p className="text-sm text-ink-2">Hospital submissions require your Google account. Your current session cannot modify the shared directory.</p>}
  </EntryFrame>;
}

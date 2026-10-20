"use client";

import { useState, type FormEvent } from "react";
import type { HospitalProfile, HospitalSource, HospitalReview } from "@/lib/hospitals";
import { PRIMARY, SECONDARY } from "@/components/app/ui";
import { EMPTY_PROFILE, FIELD, Field, Notice, ProfileFields, SourceList, hospitalRequest } from "./shared";

export function ProfileSubmission({initial,initialSources=[],hospitalId,reviewId,onSaved}:{initial?:HospitalProfile;initialSources?:HospitalSource[];hospitalId?:string;reviewId?:string;onSaved:(review:HospitalReview)=>void}) {
  const [profile,setProfile]=useState<HospitalProfile>(initial??EMPTY_PROFILE);const [query,setQuery]=useState("");
  const [sources,setSources]=useState<HospitalSource[]>(initialSources);const [sourceUrls,setSourceUrls]=useState(initialSources.map(s=>s.url).join("\n"));
  const [busy,setBusy]=useState("");const [error,setError]=useState("");const [uncertain,setUncertain]=useState<string[]>([]);
  const [discoveryId,setDiscoveryId]=useState<string>();
  async function search(event:FormEvent) {
    event.preventDefault();setBusy("Searching official sources…");setError("");
    try{const result=await hospitalRequest<{profile:Partial<HospitalProfile>;sources:HospitalSource[];uncertainties:string[];discoveryId:string}>("/hospitals/discover",{query});setDiscoveryId(result.discoveryId);setProfile({...EMPTY_PROFILE,...result.profile});setSources(result.sources);setSourceUrls(result.sources.map(s=>s.url).join("\n"));setUncertain(result.uncertainties);}catch(e){setError((e as Error).message);}finally{setBusy("");}
  }
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy("Submitting for human review…");setError("");
    try {
      const urls=[...new Set(sourceUrls.split(/\n/).map(s=>s.trim()).filter(Boolean))];
      if(!urls.length)throw new Error("Add at least one evidence URL before submitting.");
      const evidence=urls.map(url=>sources.find(s=>s.url===url)??{url,title:new URL(url).hostname,retrievedAt:new Date().toISOString(),excerpt:"Submitted evidence link. Independent retrieval and human confirmation are required."});
      const path=reviewId?`/hospitals/proposals/${reviewId}/resubmit`:"/hospitals/proposals";
      const result=await hospitalRequest<HospitalReview>(path,{hospitalId,discoveryId,kind:"profile",payload:profile,sources:evidence});onSaved(result);
    }catch(e){setError((e as Error).message);}finally{setBusy("");}
  }
  return <div className="space-y-7">
    <form onSubmit={search} className="space-y-3"><Field label="Find a hospital with AI" hint="Search by exact name, branch and country. Search results remain unverified drafts."><input className={FIELD} type="search" value={query} onChange={e=>setQuery(e.target.value)} required minLength={3} maxLength={300} placeholder="Hospital name, branch, city and country"/></Field><button disabled={!!busy} className={SECONDARY} type="submit">{busy.startsWith("Searching")?busy:"Find hospital details"}</button></form>
    <form onSubmit={submit} className="space-y-5" aria-busy={!!busy}>
      <div className="border-t border-line pt-6"><h3 className="mb-4 text-lg font-bold">{hospitalId?"Propose a profile revision":"Profile draft"}</h3><ProfileFields value={profile} onChange={setProfile}/></div>
      {uncertain.length>0&&<Notice>{uncertain.join(" ")}</Notice>}
      <Field label="Evidence source URLs *" hint="One HTTPS URL per line. Include an independent institutional source for initial verification."><textarea className={`${FIELD} min-h-28`} required value={sourceUrls} onChange={e=>setSourceUrls(e.target.value)} placeholder="https://hospital.example/contact"/></Field>
      {sources.length>0&&<details><summary className="min-h-10 cursor-pointer font-semibold text-serpent-dark">View search citations</summary><SourceList sources={sources}/></details>}
      {error&&<Notice error>{error}</Notice>}
      <p className="text-sm leading-relaxed text-ink-2">Submitting this profile does not activate a payment account. A human administrator checks the institution and verifies payment authority separately.</p>
      <button className={PRIMARY} disabled={!!busy} type="submit">{busy&&!busy.startsWith("Searching")?busy:"Submit for review"}</button>
    </form>
  </div>;
}

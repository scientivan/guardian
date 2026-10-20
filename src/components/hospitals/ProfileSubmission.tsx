"use client";

import { explainError, useFeedback, WORK } from "@/components/app/Feedback";
import { useState, type FormEvent } from "react";
import type { HospitalProfile, HospitalSource, HospitalReview } from "@/lib/hospitals";
import { PRIMARY, SECONDARY } from "@/components/app/ui";
import { EMPTY_PROFILE, FIELD, Field, Notice, PROFILE_RULES, ProfileFields, SourceList, hospitalRequest } from "./shared";
import { INVALID, useFieldErrors } from "@/components/app/FieldError";
import { check, text, urlList } from "@/lib/validate";

export function ProfileSubmission({initial,initialSources=[],hospitalId,reviewId,onSaved}:{initial?:HospitalProfile;initialSources?:HospitalSource[];hospitalId?:string;reviewId?:string;onSaved:(review:HospitalReview)=>void}) {
  const [profile,setProfile]=useState<HospitalProfile>(initial??EMPTY_PROFILE);const [query,setQuery]=useState("");
  const [sources,setSources]=useState<HospitalSource[]>(initialSources);const [sourceUrls,setSourceUrls]=useState(initialSources.map(s=>s.url).join("\n"));
  const [busy,setBusy]=useState("");const [error,setError]=useState("");const [uncertain,setUncertain]=useState<string[]>([]);
  const [discoveryId,setDiscoveryId]=useState<string>();
  const {startWork}=useFeedback();
  const v=useFieldErrors(check(profile as Record<keyof typeof PROFILE_RULES,string>,PROFILE_RULES),"profile");
  const sv=useFieldErrors(check({sources:sourceUrls},{sources:urlList("at least one evidence URL")}),"evidence");
  const qv=useFieldErrors(check({query},{query:text("a hospital name to search",3,300)}),"search");
  async function search(event:FormEvent) {
    event.preventDefault();if(!qv.submit())return;setBusy("Searching official sources…");setError("");const stop=startWork(WORK.search);
    try{const result=await hospitalRequest<{profile:Partial<HospitalProfile>;sources:HospitalSource[];uncertainties:string[];discoveryId:string}>("/hospitals/discover",{query});setDiscoveryId(result.discoveryId);setProfile({...EMPTY_PROFILE,...result.profile});setSources(result.sources);setSourceUrls(result.sources.map(s=>s.url).join("\n"));setUncertain(result.uncertainties);}catch(e){const x=explainError(e);setError(`${x.title}. ${x.body} ${x.hint}`);}finally{stop();setBusy("");}
  }
  async function submit(event:FormEvent) {
    event.preventDefault();const okProfile=v.submit();const okSources=sv.submit();if(!okProfile||!okSources)return;setBusy("Submitting for human review…");setError("");
    try {
      const urls=[...new Set(sourceUrls.split(/\n/).map(s=>s.trim()).filter(Boolean))];
      if(!urls.length)throw new Error("Add at least one evidence URL before submitting.");
      const evidence=urls.map(url=>sources.find(s=>s.url===url)??{url,title:new URL(url).hostname,retrievedAt:new Date().toISOString(),excerpt:"Submitted evidence link. Independent retrieval and human confirmation are required."});
      const path=reviewId?`/hospitals/proposals/${reviewId}/resubmit`:"/hospitals/proposals";
      const result=await hospitalRequest<HospitalReview>(path,{hospitalId,discoveryId,kind:"profile",payload:profile,sources:evidence});onSaved(result);
    }catch(e){const x=explainError(e);setError(`${x.title}. ${x.body} ${x.hint}`);}finally{setBusy("");}
  }
  return <div className="space-y-7">
    <form onSubmit={search} noValidate className="space-y-3"><Field label="Find a hospital with AI" hint="Search by exact name, branch and country. Search results remain unverified drafts." error={qv.error("query")}><input id="search-query" className={`${FIELD} ${qv.invalid("query")?INVALID:""}`} type="search" value={query} onChange={e=>setQuery(e.target.value)} maxLength={300} placeholder="Hospital name, branch, city and country" {...qv.field("query")}/></Field><button disabled={!!busy} className={SECONDARY} type="submit">{busy.startsWith("Searching")?busy:"Find hospital details"}</button></form>
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={!!busy}>
      <div className="border-t border-line pt-6"><h3 className="mb-4 text-lg font-bold">{hospitalId?"Propose a profile revision":"Profile draft"}</h3><ProfileFields value={profile} onChange={setProfile} v={v}/></div>
      {uncertain.length>0&&<Notice>{uncertain.join(" ")}</Notice>}
      <Field label="Evidence source URLs *" hint="One HTTPS URL per line. Include an independent institutional source for initial verification." error={sv.error("sources")}><textarea id="evidence-sources" className={`${FIELD} min-h-28 ${sv.invalid("sources")?INVALID:""}`} {...sv.field("sources")} value={sourceUrls} onChange={e=>setSourceUrls(e.target.value)} placeholder="https://hospital.example/contact"/></Field>
      {sources.length>0&&<details><summary className="min-h-10 cursor-pointer font-semibold text-serpent-dark">View search citations</summary><SourceList sources={sources}/></details>}
      {error&&<Notice error>{error}</Notice>}
      <p className="text-sm leading-relaxed text-ink-2">Submitting this profile does not activate a payment account. A human administrator checks the institution and verifies payment authority separately.</p>
      <button className={PRIMARY} disabled={!!busy} type="submit">{busy&&!busy.startsWith("Searching")?busy:"Submit for review"}</button>
    </form>
  </div>;
}

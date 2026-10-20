"use client";

import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { readResponse, request, Spinner } from "@/components/app/Feedback";
import type { HospitalRecord, HospitalSource, HospitalProfile } from "@/lib/hospitals";

export const FIELD="mt-2 block min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-lead focus-visible:ring-2 focus-visible:ring-serpent";
export const PANEL="rounded-2xl border border-line bg-white p-5 sm:p-6";
export async function hospitalRequest<T=unknown>(path:string,body?:unknown):Promise<T> {
  const response=await request(`/api${path}`,{method:body===undefined?"GET":"POST",cache:"no-store",...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  return readResponse<T>(response,"Could not complete the hospital operation. Try again.");
}
export function useHospitalResource<T>(path:string) {
  const [data,setData]=useState<T|null>(null);const [error,setError]=useState("");
  const refresh=useCallback(async()=>{try{setData(await hospitalRequest<T>(path));setError("");}catch(e){setError((e as Error).message);}},[path]);
  useEffect(()=>{void refresh();},[refresh]);
  return {data,error,refresh};
}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}) {
  const id=useId();
  return <div className="text-sm"><label htmlFor={id} className="block font-semibold text-ink-2">{label}</label>{Children.map(children,(child,index)=>index===0&&isValidElement(child)?cloneElement(child as ReactElement<{id:string;"aria-describedby"?:string}>,{id,...(hint?{"aria-describedby":`${id}-hint`}:{})}):child)}{hint&&<p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-ink-2">{hint}</p>}</div>;
}
export function Status({value,label}:{value:string;label?:string}) {
  const positive=["verified","active","approved"].includes(value);const warning=["suspended","revoked","rejected","conflict"].includes(value);
  return <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${positive?"bg-ok-soft text-ok-ink":warning?"bg-danger-soft text-danger-ink":"bg-mist text-ink-2"}`}>{label?`${label} · `:""}{value.replace(/_/g," ")}</span>;
}
export function Loading() {return <div role="status" className="space-y-4 py-6"><p className="flex items-center gap-3 text-sm text-ink-2"><Spinner className="h-4 w-4 text-serpent"/>Opening hospital records…</p>{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-mist motion-safe:animate-pulse"/>)}</div>;}
export function Notice({children,error=false}:{children:ReactNode;error?:boolean}) {return <p role={error?"alert":"status"} className={`rounded-xl p-4 text-sm leading-relaxed ${error?"bg-danger-soft text-danger-ink":"bg-firstlight text-serpent-dark"}`}>{children}</p>;}
export const EMPTY_PROFILE:HospitalProfile={name:"",branch:"",country:"China",city:"",address:"",phone:"",website:"",billingEmail:"",billingPhone:""};
export function ProfileFields({value,onChange}:{value:HospitalProfile;onChange:(profile:HospitalProfile)=>void}) {
  const fields:[keyof HospitalProfile,string,string,string][]=[
    ["name","Official hospital name","text","organization"],["branch","Branch or campus","text","off"],
    ["city","City","text","address-level2"],["address","Street address","text","street-address"],
    ["phone","Public telephone","tel","tel"],["website","Official website","url","url"],
    ["billingEmail","Billing email","email","off"],["billingPhone","Billing telephone","tel","off"],
  ];
  return <div className="grid gap-4 sm:grid-cols-2"><Field label="Country"><select className={FIELD} value={value.country} onChange={e=>onChange({...value,country:e.target.value})}>{["China","Malaysia","Singapore","Thailand"].map(c=><option key={c}>{c}</option>)}</select></Field>{fields.map(([key,label,type,auto])=><Field key={key} label={label+(["branch","billingEmail","billingPhone"].includes(key)?" (optional)":" *")}><input className={FIELD} type={type} autoComplete={auto} spellCheck={false} maxLength={key==="address"?500:200} required={!["branch","billingEmail","billingPhone"].includes(key)} value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}/></Field>)}</div>;
}
export function SourceList({sources}:{sources:HospitalSource[]}) {return <ul className="space-y-3">{sources.map((s,i)=><li key={`${s.url}-${i}`} className="rounded-xl border border-line p-3 text-sm"><a className="break-all font-semibold text-serpent-dark underline" href={s.url} target="_blank" rel="noreferrer">{s.title||s.url} ↗</a><p className="mt-1 break-all text-xs text-ink-2">{s.url}</p><p className="mt-1 text-xs text-ink-2">Evidence recorded {new Date(s.retrievedAt).toLocaleString()}</p>{s.excerpt&&<p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-ink-2">{s.excerpt}</p>}</li>)}</ul>;}
export function HospitalSummary({hospital}:{hospital:HospitalRecord}) {return <div className="space-y-3"><div className="flex flex-wrap gap-2"><Status label="Profile" value={hospital.profileStatus}/><Status label="Payments" value={hospital.paymentStatus}/></div><h2 className="text-xl font-bold text-lead">{hospital.profile.name}</h2><p className="text-sm text-ink-2">{[hospital.profile.branch,hospital.profile.city,hospital.profile.country].filter(Boolean).join(" · ")}</p><p className="text-sm leading-relaxed text-ink-2">{hospital.profile.address}</p><dl className="space-y-2 text-sm">{[["Public phone",hospital.profile.phone],["Billing phone",hospital.profile.billingPhone],["Billing email",hospital.profile.billingEmail]].map(([label,value])=><div key={label}><dt className="text-xs text-ink-2">{label}</dt><dd className="break-words font-semibold">{value||"Not provided"}</dd></div>)}</dl><a href={hospital.profile.website} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center break-all text-sm font-semibold text-serpent-dark underline">Open institutional website ↗</a></div>;}

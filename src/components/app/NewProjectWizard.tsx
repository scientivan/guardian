"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, type ReactNode } from "react";
import type { PublicHospital } from "@/lib/hospitals";
import { EntryFrame, INPUT } from "./EntryFrame";
import { PRIMARY, SECONDARY, Section } from "./ui";
import { useWorkspace } from "./WorkspaceProvider";
import type { AgentId } from "@/components/landing/agents";

const STEPS = ["You", "The patient", "The hospital", "First bill", "Check"];
const AGENTS: AgentId[] = ["clerk", "clerk", "gate", "reader", "auditor"];
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-medium text-ink-2">{label}{children}</label>; }

export function NewProjectWizard({ initialStep = 0 }: { initialStep?: number }) {
  const router = useRouter();
  const params=useSearchParams();
  const { data: session } = useSession();
  const { mode, createCase, act } = useWorkspace();
  const [step, setStep] = useState(Number.isFinite(initialStep) ? Math.max(0, Math.min(4, initialStep)) : 0);
  const [ownerName, setOwnerName] = useState(session?.user.name ?? "");
  const [patientName, setPatientName] = useState(mode === "demo" ? "Budi Santoso" : "");
  const [country, setCountry] = useState("China");
  const [hospitalName, setHospitalName] = useState(mode === "demo" ? "Shenzhen International Hospital" : "");
  const [directoryId,setDirectoryId]=useState("");
  const [hospitals,setHospitals]=useState<PublicHospital[]>([]);
  const [directoryError,setDirectoryError]=useState("");
  useEffect(()=>{let active=true;fetch("/api/hospitals",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("The hospital directory could not be loaded. You can enter a name and link a verified hospital later.");return r.json();}).then(value=>{if(!active)return;const list=(value.hospitals as PublicHospital[]).filter(h=>["listed","verified"].includes(h.profileStatus));setHospitals(list);const chosen=list.find(h=>h.id===params.get("hospitalId"));if(chosen){setDirectoryId(chosen.id);setHospitalName(chosen.profile.name);setCountry(chosen.profile.country);}}).catch(e=>{if(active)setDirectoryError(e.message);});return()=>{active=false;};},[mode,params]);
  const [currency, setCurrency] = useState("IDR");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const canContinue = step === 0 ? ownerName.trim() : step === 1 ? patientName.trim() : step === 2 ? hospitalName.trim() : true;

  async function next() {
    setError("");
    if (step < 4) { setStep(s => s + 1); return; }
    setBusy(true);
    try {
      let id = createdId;
      if (!id) {
        const c = await createCase({ ownerName, patientName, country, hospitalName, currency, ...(mode==="google"&&directoryId?{hospitalDirectoryId:directoryId}:{}) });
        id = c.case.id;
        setCreatedId(id);
      }
      if (file) { const form = new FormData(); form.set("file", file); form.set("type", "estimate"); await act(id, form); }
      router.push(`/case/${id}`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <EntryFrame title="Start a Care Case" working={[AGENTS[step]]} profile>
    <Link href="/projects" className="text-sm font-semibold text-serpent-dark hover:underline">Back to your care cases</Link>
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">{STEPS.map((name, i) => <li key={name} aria-current={i === step ? "step" : undefined}><span className={`block h-1.5 rounded-full ${i <= step ? "bg-serpent" : "bg-line"}`} /><span className="mt-2 block text-xs text-ink-2">{name}</span></li>)}</ol>
    <Section title={STEPS[step]} agent={AGENTS[step]}>
      <div className="space-y-4">
        {step === 0 && <><Field label="Your name"><input value={ownerName} onChange={e => setOwnerName(e.target.value)} className={INPUT} /></Field><Field label="Currency you pay in"><select value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>{["IDR", "MYR", "SGD", "AED", "USD", "CNY"].map(c => <option key={c}>{c}</option>)}</select></Field></>}
        {step === 1 && <Field label="Patient’s name"><input value={patientName} onChange={e => setPatientName(e.target.value)} className={INPUT} /></Field>}
        {step === 2 && <><Field label="Hospital country"><select value={country} onChange={e => {setCountry(e.target.value);setDirectoryId("");setHospitalName("");}} className={INPUT}>{["China", "Malaysia", "Singapore", "Thailand"].map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Hospital directory"><select className={INPUT} value={directoryId} onChange={e=>{setDirectoryId(e.target.value);const h=hospitals.find(h=>h.id===e.target.value);setHospitalName(h?.profile.name??"");}}><option value="">My hospital is not listed — enter manually</option>{hospitals.filter(h=>h.profile.country===country).map(h=><option key={h.id} value={h.id}>{h.profile.name}{h.profileStatus==="listed"?" (listed)":""}{h.profile.branch?` · ${h.profile.branch}`:""}</option>)}</select></Field>{!directoryId&&<Field label="Hospital name"><input value={hospitalName} onChange={e => setHospitalName(e.target.value)} className={INPUT} placeholder="Enter the hospital’s name" /></Field>}{hospitals.find(h=>h.id===directoryId)?.profileStatus==="listed"&&<p className="text-sm text-ink-2">This hospital is listed from public sources. Identity verification is still pending.</p>}{directoryError&&<p role="status" className="text-sm text-warn-ink">{directoryError}</p>}<p className="text-sm text-ink-2">The hospital’s payment account must be verified through its official channel before any payment can be made.</p><Link href="/hospitals" className="inline-flex min-h-10 items-center text-sm font-semibold text-serpent-dark underline">Browse or suggest a hospital</Link></>}
        {step === 3 && <><Field label="Choose the estimate or bill"><input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className={INPUT} /></Field><p className="text-sm text-ink-2">You can also upload the estimate later.</p></>}
        {step === 4 && <dl className="divide-y divide-line">{[["You", ownerName], ["Patient", patientName], ["Hospital", `${hospitalName}, ${country}`], ["Your currency", currency], ["First bill", file?.name ?? "Upload later"]].map(([k,v]) => <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink-2">{k}</dt><dd className="text-right font-semibold text-lead">{v}</dd></div>)}</dl>}
      </div>
    </Section>
    {error && <p role="alert" className="text-danger-ink">{error}</p>}
    <div className="flex justify-between gap-3"><button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={busy || step === 0} className={SECONDARY}>Back</button><button type="button" onClick={next} disabled={busy || !canContinue} className={PRIMARY}>{busy ? "Saving your care case…" : step === 4 ? "Start care case" : "Next"}</button></div>
  </EntryFrame>;
}

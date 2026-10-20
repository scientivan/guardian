"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, type ReactNode } from "react";
import type { PublicHospital } from "@/lib/hospitals";
import { check, documentFile, orgName, personName } from "@/lib/validate";
import { EntryFrame, INPUT } from "./EntryFrame";
import { PRIMARY, SECONDARY, Section } from "./ui";
import { useWorkspace } from "./WorkspaceProvider";
import { Spinner, useTask, WORK } from "./Feedback";
import { FieldError, INVALID, useFieldErrors } from "./FieldError";
import { clearDraft, readDraft, writeDraft, type CaseDraft } from "@/lib/case-draft";
import type { AgentId } from "@/components/landing/agents";

const STEPS = ["You", "The patient", "The hospital", "First bill", "Check"];
const AGENTS: AgentId[] = ["clerk", "clerk", "gate", "reader", "auditor"];
const COUNTRIES = ["China", "Malaysia", "Singapore", "Thailand"];
const CURRENCIES = ["IDR", "MYR", "SGD", "AED", "USD", "CNY"];
/** Fields checked before leaving each step. */
const STEP_FIELDS: ("ownerName" | "patientName" | "hospitalName" | "file")[][] = [["ownerName"], ["patientName"], ["hospitalName"], ["file"], []];

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) { return <div className="text-sm font-medium text-ink-2"><label htmlFor={htmlFor}>{label}</label>{children}</div>; }

export function NewProjectWizard({ initialStep }: { initialStep?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const { mode, createCase, act } = useWorkspace();
  const account = session?.user.id ?? "";
  const [step, setStep] = useState(0);
  const [ownerName, setOwnerName] = useState(session?.user.name ?? "");
  const [patientName, setPatientName] = useState(mode === "demo" ? "Budi Santoso" : "");
  const [country, setCountry] = useState("China");
  const [hospitalName, setHospitalName] = useState(mode === "demo" ? "Shenzhen International Hospital" : "");
  // Set only when someone starts from a hospital page (/projects/new?hospitalId=…).
  const [directory, setDirectory] = useState<{ id: string; name: string } | null>(null);
  const [currency, setCurrency] = useState("IDR");
  const [file, setFile] = useState<File | null>(null);
  const [draftFile, setDraftFile] = useState<string | null>(null);
  const [restored, setRestored] = useState<CaseDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { busy, run } = useTask();
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Restore the saved draft once, then let ?step= (if given) choose the step.
  useEffect(() => {
    if (!account || loaded) return;
    const d = readDraft(account);
    if (d) {
      setOwnerName(d.ownerName); setPatientName(d.patientName); setCountry(d.country); setHospitalName(d.hospitalName);
      setCurrency(d.currency); setDirectory(d.directory); setDraftFile(d.fileName); setRestored(d); setStep(d.step);
    }
    if (initialStep !== undefined && Number.isFinite(initialStep)) setStep(Math.max(0, Math.min(4, initialStep)));
    setLoaded(true);
  }, [account, loaded, initialStep]);

  // A hospital chosen in the directory pre-fills the hospital step.
  useEffect(() => {
    const id = params.get("hospitalId");
    if (!id || mode !== "google") return;
    let active = true;
    fetch("/api/hospitals", { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(value => {
      const h = (value?.hospitals as PublicHospital[] | undefined)?.find(h => h.id === id && ["listed", "verified"].includes(h.profileStatus));
      if (active && h) { setDirectory({ id: h.id, name: h.profile.name }); setHospitalName(h.profile.name); setCountry(h.profile.country); }
    }).catch(() => {});
    return () => { active = false; };
  }, [params, mode]);

  // Every change is saved, so the form survives leaving the page or a reload.
  useEffect(() => {
    if (!loaded || !account || createdId) return;
    const pristine = step === 0 && ownerName === (session?.user.name ?? "") && patientName === (mode === "demo" ? "Budi Santoso" : "") && hospitalName === (mode === "demo" ? "Shenzhen International Hospital" : "") && country === "China" && currency === "IDR" && !directory && !file;
    writeDraft(account, { step, ownerName, patientName, country, hospitalName, currency, directory, fileName: file?.name ?? draftFile, savedAt: new Date().toISOString() }, pristine);
  }, [loaded, account, createdId, step, ownerName, patientName, country, hospitalName, currency, directory, file, draftFile, session?.user.name, mode]);

  const errors = check({ ownerName, patientName, hospitalName, file: "" }, { ownerName: personName("your name"), patientName: personName("the patient’s name"), hospitalName: orgName() });
  const fileError = documentFile(file);
  const allErrors: Partial<Record<"ownerName" | "patientName" | "hospitalName" | "file", string>> = { ...errors, ...(fileError ? { file: fileError } : {}) };
  const v = useFieldErrors(allErrors, "wizard");

  async function next() {
    if (!v.submit(STEP_FIELDS[step])) return;
    if (step < 4) { setStep(s => s + 1); return; }
    const firstBad = STEP_FIELDS.findIndex(keys => keys.some(k => allErrors[k]));
    if (firstBad >= 0) { setStep(firstBad); v.submit(STEP_FIELDS[firstBad]); return; }
    await run(async () => {
      let id = createdId;
      if (!id) {
        const c = await createCase({ ownerName: ownerName.trim(), patientName: patientName.trim(), country, hospitalName: hospitalName.trim(), currency, ...(mode === "google" && directory ? { hospitalDirectoryId: directory.id } : {}) });
        id = c.case.id;
        setCreatedId(id);
        clearDraft(account);
      }
      if (file) { const form = new FormData(); form.set("file", file); form.set("type", "estimate"); await act(id, form); }
      router.push(`/case/${id}`);
    }, { work: file ? WORK.upload : WORK.create, retry: true });
  }

  function discard() {
    clearDraft(account);
    setRestored(null); setStep(0); setOwnerName(session?.user.name ?? ""); setPatientName(mode === "demo" ? "Budi Santoso" : ""); setCountry("China");
    setHospitalName(mode === "demo" ? "Shenzhen International Hospital" : ""); setCurrency("IDR"); setDirectory(null); setFile(null); setDraftFile(null); v.reset();
  }

  const input = (key: "ownerName" | "patientName" | "hospitalName") => `${INPUT} ${v.invalid(key) ? INVALID : ""}`;

  return <EntryFrame title="Start a Care Case" working={[AGENTS[step]]} profile>
    <Link href="/projects" className="text-sm font-semibold text-serpent-dark hover:underline">Back to dashboard</Link>
    {restored && <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl bg-firstlight px-5 py-4 text-sm text-serpent-dark"><p className="min-w-0 flex-1">Draft restored from {new Date(restored.savedAt).toLocaleString()}. You’re back where you left off, on “{STEPS[restored.step]}”.</p><button type="button" onClick={discard} className="font-semibold underline">Start over</button></div>}
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">{STEPS.map((name, i) => <li key={name} aria-current={i === step ? "step" : undefined}><button type="button" disabled={busy || i > step} onClick={() => setStep(i)} className="block w-full text-left disabled:cursor-default"><span className={`block h-1.5 rounded-full ${i <= step ? "bg-serpent" : "bg-line"}`} /><span className={`mt-2 block text-xs ${i === step ? "font-semibold text-serpent-dark" : "text-ink-2"}`}>{name}</span></button></li>)}</ol>
    <Section title={STEPS[step]} agent={AGENTS[step]}>
      <form id="wizard" noValidate onSubmit={e => { e.preventDefault(); void next(); }} className="space-y-4">
        {step === 0 && <>
          <Field label="Your name" htmlFor="wizard-ownerName"><input id="wizard-ownerName" autoComplete="name" value={ownerName} onChange={e => setOwnerName(e.target.value)} className={input("ownerName")} {...v.field("ownerName")} />{v.error("ownerName")}</Field>
          <Field label="Currency you pay in" htmlFor="wizard-currency"><select id="wizard-currency" value={currency} onChange={e => setCurrency(e.target.value)} className={INPUT}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></Field>
        </>}
        {step === 1 && <Field label="Patient’s name" htmlFor="wizard-patientName"><input id="wizard-patientName" value={patientName} onChange={e => setPatientName(e.target.value)} className={input("patientName")} {...v.field("patientName")} />{v.error("patientName")}</Field>}
        {step === 2 && <>
          <Field label="Hospital country" htmlFor="wizard-country"><select id="wizard-country" value={country} onChange={e => { setCountry(e.target.value); setDirectory(null); }} className={INPUT}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Hospital name" htmlFor="wizard-hospitalName"><input id="wizard-hospitalName" value={hospitalName} onChange={e => { setHospitalName(e.target.value); if (directory && e.target.value !== directory.name) setDirectory(null); }} className={input("hospitalName")} placeholder="Enter the hospital’s name" {...v.field("hospitalName")} />{v.error("hospitalName")}</Field>
          {directory && <p className="text-sm text-serpent-dark">Linked to <b>{directory.name}</b> in the Hospital Directory. <button type="button" className="font-semibold underline" onClick={() => setDirectory(null)}>Unlink</button></p>}
          <p className="text-sm text-ink-2">The hospital’s payment account must be verified through its official channel before any payment can be made.</p>
        </>}
        {step === 3 && <>
          <Field label="Choose the estimate or bill" htmlFor="wizard-file"><input id="wizard-file" type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => { setFile(e.target.files?.[0] ?? null); setDraftFile(null); }} className={`${INPUT} ${v.invalid("file") ? INVALID : ""}`} {...v.field("file")} />{v.error("file")}</Field>
          {draftFile && !file && <p className="text-sm text-warn-ink">Your draft had “{draftFile}”. Files aren’t kept in drafts, so choose it again.</p>}
          <p className="text-sm text-ink-2">PDF, PNG or JPEG up to 10 MB. You can also upload the estimate later.</p>
        </>}
        {step === 4 && <dl className="divide-y divide-line">{[["You", ownerName], ["Patient", patientName], ["Hospital", `${hospitalName}, ${country}`], ["Your currency", currency], ["First bill", file?.name ?? "Upload later"]].map(([k, val]) => <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink-2">{k}</dt><dd className="text-right font-semibold text-lead">{val}</dd></div>)}</dl>}
        {step === 4 && Object.keys(allErrors).length > 0 && <FieldError id="wizard-summary" message="Some details still need fixing. Press “Start care case” to go to the first one." />}
      </form>
    </Section>
    <div className="flex justify-between gap-3"><button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={busy || step === 0} className={SECONDARY}>Back</button><button type="submit" form="wizard" disabled={busy} className={PRIMARY}>{busy ? <><Spinner />Saving your care case…</> : step === 4 ? "Start care case" : "Next"}</button></div>
  </EntryFrame>;
}

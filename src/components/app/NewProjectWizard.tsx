"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EntryFrame, INPUT } from "./EntryFrame";
import { Chip, PRIMARY, SECONDARY, Section } from "./ui";
import type { AgentId } from "@/components/landing/agents";
import { Check, Upload } from "@/components/landing/icons";

// Create a project (brainstorm/17 §4), one question per step. The hospital is picked from a
// list of hospitals whose account came from their own signed list, so nobody ever types an
// account number. Demo: the last step opens the sample case.

const STEPS = ["You", "The patient", "The hospital", "First bill", "Check"];
// The agent who handles each step: IDs go to the Privacy Clerk, the hospital account to the Payment Gate.
const STEP_AGENT: AgentId[] = ["clerk", "clerk", "gate", "reader", "auditor"];

const COUNTRIES = [
  { name: "China", flag: "cn" },
  { name: "Malaysia", flag: "my" },
  { name: "Singapore", flag: "sg" },
  { name: "Thailand", flag: "th" },
];

const HOSPITALS: Record<string, { name: string; city: string; account: string }[]> = {
  China: [
    { name: "Shenzhen International Hospital (demo)", city: "Shenzhen", account: "•••• 2222" },
    { name: "Guangzhou Pilot International Hospital (demo)", city: "Guangzhou", account: "•••• 4810" },
    { name: "Shanghai Bund Medical Centre (demo)", city: "Shanghai", account: "•••• 7735" },
  ],
  Malaysia: [{ name: "Penang Medical Centre (demo)", city: "George Town", account: "•••• 0317" }],
  Singapore: [],
  Thailand: [],
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink-2">
      {label}
      {children}
    </label>
  );
}

export function NewProjectWizard({ initialStep = 0 }: { initialStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(Number.isFinite(initialStep) ? Math.min(Math.max(initialStep, 0), STEPS.length - 1) : 0);
  const [country, setCountry] = useState("China");
  const [hospital, setHospital] = useState(HOSPITALS.China[0].name);
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [noBill, setNoBill] = useState(false);

  const last = step === STEPS.length - 1;
  const hospitals = HOSPITALS[country].filter((h) => h.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <EntryFrame title="Create a Project" working={[STEP_AGENT[step]]}>
      <div>
      <Link href="/projects" className="text-sm font-semibold text-serpent-dark hover:underline">
        Back to your projects
      </Link>
      <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}>
            <button type="button" onClick={() => setStep(i)} className="block w-full text-left">
              <span className={`block h-1.5 rounded-full transition-colors ${i <= step ? "bg-serpent" : "bg-line"}`} />
              <span className={`mt-1.5 hidden text-xs sm:block ${i === step ? "font-semibold text-lead" : "text-ink-2"}`}>{s}</span>
            </button>
          </li>
        ))}
      </ol>
      </div>

      <div className="space-y-10">
        {step === 0 && (
          <Section title="About You" agent="clerk">
            <div className="space-y-4">
              <Field label="Your name">
                <input className={INPUT} defaultValue="Rina" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ID type">
                  <select className={INPUT} defaultValue="national">
                    <option value="national">National ID</option>
                    <option value="passport">Passport</option>
                  </select>
                </Field>
                <Field label="ID number">
                  <input className={INPUT} type="password" autoComplete="off" defaultValue="3171xxxxxxxx8812" />
                </Field>
                <Field label="Country you live in">
                  <input className={INPUT} defaultValue="Indonesia" />
                </Field>
                <Field label="Currency you pay in">
                  <select className={INPUT} defaultValue="IDR">
                    {["IDR", "MYR", "SGD", "AED", "USD"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="The Patient" agent="clerk">
            <div className="space-y-4">
              <Field label="Patient’s name">
                <input className={INPUT} defaultValue="Budi Santoso" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ID type">
                  <select className={INPUT} defaultValue="passport">
                    <option value="passport">Passport</option>
                    <option value="national">National ID</option>
                  </select>
                </Field>
                <Field label="ID number">
                  <input className={INPUT} type="password" autoComplete="off" defaultValue="C1234567" />
                </Field>
              </div>
            </div>
          </Section>
        )}

        {step === 2 && (
          <>
            <Section title="Hospital Country" agent="gate">
              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map((c) => {
                  const on = c.name === country;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setCountry(c.name);
                        setHospital(HOSPITALS[c.name][0]?.name ?? "");
                        setQuery("");
                      }}
                      className={`flex items-center gap-3 rounded-2xl p-3 text-left transition-colors ${on ? "bg-serpent-dark text-white" : "bg-white text-lead hover:bg-cerulean/40"}`}
                    >
                      <Image src={`/flags/${c.flag}.svg`} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover ring-1 ring-black/10" />
                      <span className="font-semibold">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Hospital" agent="gate" action={<Chip tone="ok">Verified accounts only</Chip>}>
              {HOSPITALS[country].length > 0 ? (
                <>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search hospitals in ${country}`} className={`${INPUT} !mt-0`} aria-label="Search hospitals" />
                  <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Hospital">
                    {hospitals.map((h) => {
                      const on = hospital === h.name;
                      return (
                        <li key={h.name}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setHospital(h.name)}
                            className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${on ? "border-serpent bg-white" : "border-transparent bg-white/70 hover:border-cerulean"}`}
                          >
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${on ? "border-serpent bg-serpent text-white" : "border-wolverine"}`}>
                              {on && <Check className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-lead">{h.name}</span>
                              <span className="block text-sm text-ink-2">
                                {h.city}, account <span className="font-num font-bold text-serpent-dark">{h.account}</span>
                              </span>
                            </span>
                            <Chip tone="ok">Verified</Chip>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="rounded-2xl bg-warn-soft px-4 py-3 text-warn-ink">No hospital in {country} has a verified account yet.</p>
              )}
            </Section>
          </>
        )}

        {step === 3 && (
          <Section title="First Bill" agent="reader">
            <label className={`flex cursor-pointer flex-col items-center gap-3 rounded-[1.75rem] border-2 border-dashed border-cerulean px-6 py-10 text-center transition-colors hover:bg-white/60 ${noBill ? "opacity-50" : ""}`}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-serpent">
                <Upload className="h-6 w-6" />
              </span>
              <span className="font-semibold text-lead">{file ?? "Choose the estimate or bill"}</span>
              <input type="file" accept="image/*,.pdf" className="sr-only" disabled={noBill} onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm text-lead">
              <input type="checkbox" checked={noBill} onChange={(e) => setNoBill(e.target.checked)} className="h-4 w-4 accent-[#4875a1]" />
              I’ll upload it later
            </label>
          </Section>
        )}

        {step === 4 && (
          <Section title="Check" agent="auditor">
            <dl className="divide-y divide-line">
              {[
                ["You", "Rina, Indonesia, pays in IDR"],
                ["Patient", "Budi Santoso"],
                ["Hospital", hospital || "None chosen"],
                ["First bill", noBill ? "Later" : (file ?? "Not uploaded")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-semibold text-lead">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>

      <div className="flex justify-between gap-3">
        <button type="button" className={SECONDARY} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </button>
        <button type="button" className={PRIMARY} onClick={() => (last ? router.push("/case/C1") : setStep((s) => s + 1))} disabled={step === 2 && !hospital}>
          {last ? (
            <>
              <Check className="h-4 w-4" /> Create project
            </>
          ) : (
            "Next"
          )}
        </button>
      </div>
    </EntryFrame>
  );
}

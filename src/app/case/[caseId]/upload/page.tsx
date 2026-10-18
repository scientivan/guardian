"use client";

import { Fragment, useState } from "react";
import { PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { AGENT_BY_ID, type AgentId } from "@/components/landing/agents";
import { Arrow, Upload } from "@/components/landing/icons";
import { Minifig } from "@/components/landing/Minifig";
import { DOCUMENTS } from "@/lib/demo";

// Bill Upload (TASKS 2.4): pick the file, see which agents will handle it. A document the
// backend marked `needs_reupload` comes back as the one thing to act on, at the top.

const TYPES = [
  { value: "estimate", label: "Estimate" },
  { value: "interim", label: "Interim bill" },
  { value: "final", label: "Final bill" },
];

const PIPELINE: { id: AgentId; text: string }[] = [
  { id: "clerk", text: "Hides names" },
  { id: "reader", text: "Reads the items" },
  { id: "calculator", text: "Checks the sums" },
  { id: "planner", text: "Explains the bill" },
];

export default function UploadPage() {
  const [file, setFile] = useState<string | null>(null);
  const [type, setType] = useState("interim");
  const retake = DOCUMENTS.find((d) => d.status === "needs_reupload");

  return (
    <div className="space-y-12">
      {retake && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft px-5 py-4">
          <p className="min-w-0 flex-1 text-warn-ink">
            <b>{retake.title}</b> was too blurry to read. Please take it again.
          </p>
          <label className={`${SECONDARY} cursor-pointer`}>
            Retake photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
          </label>
        </div>
      )}

      <Section title="New Upload" agent="clerk">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.75rem] border-2 border-dashed border-cerulean px-6 py-12 text-center transition-colors hover:bg-white/60">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-serpent">
            <Upload className="h-7 w-7" />
          </span>
          <span className="text-lg font-semibold text-lead">{file ?? "Choose a photo or PDF"}</span>
          <span className="text-sm text-ink-2">{file ? "Ready to upload" : "or drop it here"}</span>
          <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-white p-1 text-sm font-semibold" role="group" aria-label="Document type">
            {TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)} className={`rounded-lg px-3 py-1.5 ${type === t.value ? "bg-serpent text-white" : "text-ink-2 hover:text-lead"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className={`${PRIMARY} ml-auto !px-6 !py-3`} disabled={!file}>
            Upload
          </button>
        </div>
      </Section>

      <Section title="What Happens Next" agent="reader">
        <ol className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
          {PIPELINE.map((p, i) => {
            const a = AGENT_BY_ID[p.id];
            return (
              <Fragment key={p.id}>
                {i > 0 && (
                  <li aria-hidden="true" className="flex justify-center text-serpent sm:mt-8">
                    <Arrow className="h-8 w-8 rotate-90 sm:rotate-0" />
                  </li>
                )}
                <li className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center">
                  <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} className="h-20 w-20 shrink-0 rounded-2xl bg-white" />
                  <span>
                    <span className="block font-semibold text-lead">{p.text}</span>
                    <span className="text-sm text-ink-2">{a.name}</span>
                  </span>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </Section>
    </div>
  );
}

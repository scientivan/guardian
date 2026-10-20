"use client";

import { useState } from "react";
import Link from "next/link";
import { PRIMARY, SECONDARY, Section } from "@/components/app/ui";
import { Upload } from "@/components/landing/icons";
import { useCaseData, useWorkspace } from "@/components/app/WorkspaceProvider";
import { Spinner, useTask, WORK } from "@/components/app/Feedback";
import { FieldError } from "@/components/app/FieldError";
import { documentFile } from "@/lib/validate";

// Bill Upload (TASKS 2.4): pick the file, see which agents will handle it. A document the
// backend marked `needs_reupload` comes back as the one thing to act on, at the top.

const TYPES = [
  { value: "estimate", label: "Estimate" },
  { value: "interim", label: "Interim bill" },
  { value: "final", label: "Final bill" },
];


export default function UploadPage() {
  const { case: care, documents: DOCUMENTS } = useCaseData();
  const { act } = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const { busy, run } = useTask();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [replacement,setReplacement]=useState<string|null>(null);
  const fileError = documentFile(file);
  async function upload() {
    if (!file) return;
    if (fileError) return;
    setFeedback(null);
    const form = new FormData(); form.set("file", file); form.set("type", type); if(replacement)form.set("replacementDocumentId",replacement);
    const result = await run(() => act(care.id, form) as Promise<{status:string;reason?:string;warnings?:string[]}>, { work: WORK.upload, retry: true });
    if (!result) return;
    setFile(null); setReplacement(null);
    const ok = result.status !== "needs_reupload";
    setFeedback({ ok, text: [ok ? "Document saved. Check Bill Review for its explanation." : `We couldn’t read this document. ${result.reason ?? "A clearer copy is needed."} Please upload a clearer PDF or photo.`, ...(result.warnings??[])].join(" ") });
  }
  const [type, setType] = useState("interim");
  const retake = DOCUMENTS.find((d) => d.status === "needs_reupload");

  return (
    <div className="space-y-12">
      {retake && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft px-5 py-4">
          <p className="min-w-0 flex-1 text-warn-ink">
            <b>{retake.title}</b> couldn’t be read{retake.reason ? `: ${retake.reason}` : "."} Please upload a clearer copy.
          </p>
          <label className={`${SECONDARY} cursor-pointer`}>
            Retake photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => {setFile(e.target.files?.[0] ?? null);setReplacement(retake?.id??null);}} />
          </label>
        </div>
      )}

      {care.closed ? <p className="rounded-2xl bg-firstlight p-5 leading-relaxed text-serpent-dark">This care case is closed, so no new documents can be added. Everything already uploaded stays readable.</p> : care.me.role === "payer" ? <p className="rounded-2xl bg-firstlight p-5 leading-relaxed text-serpent-dark">Estimates and bills are uploaded by the case owner or the companion at the hospital. As a helper you see the bill summary in Bill Review.</p> : <>
      <Section title="New Upload" agent="clerk">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.75rem] border-2 border-dashed border-cerulean px-6 py-12 text-center transition-colors hover:bg-white/60">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-serpent">
            <Upload className="h-7 w-7" />
          </span>
          <span className="text-lg font-semibold text-lead">{file?.name ?? "Choose a photo or PDF"}</span>
          <span className="text-sm text-ink-2">{file ? (fileError ? "This file can’t be uploaded" : "Ready to upload") : "PDF, PNG or JPEG up to 10 MB"}</span>
          <input type="file" accept="image/png,image/jpeg,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-white p-1 text-sm font-semibold" role="group" aria-label="Document type">
            {TYPES.map((t) => (
              <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)} className={`rounded-lg px-3 py-1.5 ${type === t.value ? "bg-serpent text-white" : "text-ink-2 hover:text-lead"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className={`${PRIMARY} ml-auto !px-6 !py-3`} onClick={upload} disabled={!file || busy || Boolean(fileError)}>
            {busy ? <><Spinner />Reading document…</> : "Upload"}
          </button>
        </div>
        <FieldError id="upload-file-error" message={fileError} />
      </Section>
      </>}

      {feedback && <p role="status" className={`rounded-2xl px-5 py-4 text-sm ${feedback.ok ? "bg-ok-soft text-ok-ink" : "bg-warn-soft text-warn-ink"}`}>{feedback.text}</p>}
      <Section title="Documents on File" agent="reader"><ul className="divide-y divide-line">{DOCUMENTS.map(d=><li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-lead">{d.title}</p><p className="text-xs text-ink-2">{d.type} · {d.status} · {d.items} items</p>{d.reason&&<p className="mt-1 text-sm text-warn-ink">{d.reason}</p>}</div>{care.me.role!=="payer"&&<a href={`/api/documents/${d.id}/file`} className="text-sm font-semibold text-serpent-dark underline">Download original</a>}</li>)}</ul>{!DOCUMENTS.length&&<p className="text-ink-2">No documents yet. Upload the hospital’s estimate first, then each bill as it arrives.</p>}</Section>
      <p className="text-sm text-ink-2">What the agents do with each document is explained in <Link href={`/case/${care.id}/guide`} className="font-semibold text-serpent-dark underline">How It Works</Link>.</p>
    </div>
  );
}

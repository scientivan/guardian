"use client";

import { useEffect, useRef, useState } from "react";
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
  { value: "estimate", label: "Estimate", use: "The hospital’s cost estimate before treatment. Its range sets the initial deposit." },
  { value: "interim", label: "Interim bill", use: "A bill during the stay: charges so far. It is compared with the estimate and can be paid as the bill balance." },
  { value: "final", label: "Final bill", use: "The bill after discharge. It replaces every interim bill; deposits are reconciled against it and refunds worked out." },
];
/** Words in a file name that suggest a different document type. */
const HINTS: [RegExp, string][] = [[/estimat|perkiraan|quotation/i, "estimate"], [/final|akhir|discharge/i, "final"], [/interim|sementara|running/i, "interim"]];


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
  const [confirming, setConfirming] = useState(false);
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

      {care.closed ? <p className="rounded-2xl bg-firstlight p-5 leading-relaxed text-serpent-dark">This care case is closed, so no new documents can be added. Everything already uploaded stays readable.</p> : care.me.role === "payer" ? <p className="rounded-2xl bg-firstlight p-5 leading-relaxed text-serpent-dark">Estimates and bills are uploaded by the case owner or the companion at the hospital. As a payer you see the bill summary in Bill Review.</p> : <>
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
          <button type="button" className={`${PRIMARY} ml-auto !px-6 !py-3`} onClick={()=>setConfirming(true)} disabled={!file || busy || Boolean(fileError)}>
            {busy ? <><Spinner />Reading document…</> : "Upload"}
          </button>
        </div>
        <FieldError id="upload-file-error" message={fileError} />
        {confirming && file && <ConfirmUpload file={file} type={type} replacing={Boolean(replacement)} onBack={()=>setConfirming(false)} onConfirm={()=>{setConfirming(false);void upload();}} />}
      </Section>
      </>}

      {feedback && <p role="status" className={`rounded-2xl px-5 py-4 text-sm ${feedback.ok ? "bg-ok-soft text-ok-ink" : "bg-warn-soft text-warn-ink"}`}>{feedback.text}</p>}
      <Section title="Documents on File" agent="reader"><ul className="divide-y divide-line">{DOCUMENTS.map(d=><li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-lead">{d.title}</p><p className="text-xs text-ink-2">{d.type} · {d.status} · {d.items} items</p>{d.reason&&<p className="mt-1 text-sm text-warn-ink">{d.reason}</p>}</div>{care.me.role!=="payer"&&<a href={`/api/documents/${d.id}/file`} className="text-sm font-semibold text-serpent-dark underline">Download original</a>}</li>)}</ul>{!DOCUMENTS.length&&<p className="text-ink-2">No documents yet. Upload the hospital’s estimate first, then each bill as it arrives.</p>}</Section>
      <p className="text-sm text-ink-2">What the agents do with each document is explained in <Link href={`/case/${care.id}/guide`} className="font-semibold text-serpent-dark underline">How It Works</Link>.</p>
    </div>
  );
}

/** Last look before a document is read: the chosen type and what it will be used for. */
function ConfirmUpload({ file, type, replacing, onConfirm, onBack }: { file: File; type: string; replacing: boolean; onConfirm: () => void; onBack: () => void }) {
  const { documents } = useCaseData();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  const t = TYPES.find(x => x.value === type)!;
  const read = documents.filter(d => d.status === "parsed");
  const hinted = HINTS.find(([re]) => re.test(file.name))?.[1];
  const warnings = [
    hinted && hinted !== type ? `The file name “${file.name}” looks like ${hinted === "final" ? "a final bill" : hinted === "interim" ? "an interim bill" : "an estimate"}, not ${t.label.toLowerCase()}.` : "",
    type === "estimate" && read.some(d => d.type === "estimate") ? "An estimate is already on file. The newest one will set the deposit." : "",
    type === "interim" && read.some(d => d.type === "final") ? "A final bill is already on file. Payments follow the final bill, not this one." : "",
    type === "final" && read.some(d => d.type === "final") ? "A final bill is already on file. This one will replace it." : "",
  ].filter(Boolean);
  const size = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
  return (
    <dialog ref={ref} onClose={onBack} aria-labelledby="confirm-upload-title" className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-[1.75rem] bg-white p-0 text-lead shadow-[0_30px_60px_-30px_rgba(32,33,33,0.55)] backdrop:bg-lead/40 backdrop:backdrop-blur-[2px]">
      <div className="pop bg-serpent px-6 pb-4 pt-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Check before reading</p>
        <h2 id="confirm-upload-title" className="mt-1 text-xl font-semibold">Upload as {t.label.toLowerCase()}?</h2>
      </div>
      <div className="space-y-4 p-6 text-sm">
        <dl className="divide-y divide-line">
          <div className="flex justify-between gap-4 py-2"><dt className="text-ink-2">File</dt><dd className="min-w-0 truncate text-right font-semibold">{file.name}</dd></div>
          <div className="flex justify-between gap-4 py-2"><dt className="text-ink-2">Format</dt><dd className="font-semibold">{file.type === "application/pdf" ? "PDF" : file.type === "image/png" ? "PNG photo" : "JPEG photo"} · {size}</dd></div>
          <div className="flex justify-between gap-4 py-2"><dt className="text-ink-2">Type</dt><dd className="font-semibold text-serpent-dark">{t.label}{replacing ? " (clearer copy)" : ""}</dd></div>
        </dl>
        <p className="leading-relaxed text-ink-2">{t.use}</p>
        {warnings.map(w => <p key={w} role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-ink">{w}</p>)}
        <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-2">
          <li>The type can’t be changed after upload. If it’s wrong, upload the document again with the right type.</li>
          <li>Names and ID numbers are hidden before any AI reads it, and its fingerprint is recorded.</li>
          <li>Account numbers printed on it are never used for payment.</li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" onClick={onConfirm} className={PRIMARY}>Yes, upload as {t.label.toLowerCase()}</button>
          <button type="button" onClick={onBack} className={SECONDARY}>Change type</button>
        </div>
      </div>
    </dialog>
  );
}

"use client";

import { LocalizedText } from "@/components/i18n/LocaleProvider";

import { useEffect, useState } from "react";
import type { PaymentRequest } from "@/lib/demo";
import { day } from "@/lib/format";
import { documentFile } from "@/lib/validate";
import { ClientError, readResponse, request as fetchApi, Spinner, useFeedback, useTask } from "./Feedback";
import { useCaseData, useWorkspace } from "./WorkspaceProvider";
import { PRIMARY, SECONDARY, Section } from "./ui";

// Proof from the hospital for a paid request: its invoice or receipt, kept with the payment. The
// owner or companion attaches it; every member can view or download it.

export function InvoiceSection({ request }: { request: PaymentRequest }) {
  const { case: care } = useCaseData();
  const { call } = useWorkspace();
  const { busy, run } = useTask();
  const { showError } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const invoices = request.invoices ?? [];
  // Arriving from "Close and Records → Open": bring this section into view.
  useEffect(() => { if (window.location.hash === "#invoice") document.getElementById("invoice")?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const canAttach = care.me.role !== "payer" && !care.closed;
  const fileError = documentFile(file);
  async function attach() {
    if (!file || fileError) return;
    const form = new FormData(); form.set("file", file);
    if (await run(() => call(`/payment-requests/${request.id}/invoices`, "POST", form, care.id))) setFile(null);
  }
  async function open(id: string, filename: string, view = false) {
    try {
      const res = await fetchApi(`/api/payment-requests/${request.id}/invoices/${id}`, { cache: "no-store" });
      if (!res.ok) await readResponse(res);
      const url = URL.createObjectURL(await res.blob());
      if (view) { window.open(url, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(url), 60_000); return; }
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { showError(e instanceof ClientError ? e : new ClientError("The invoice couldn’t be downloaded.", 0)); }
  }
  return (
    <div id="invoice" className="scroll-mt-24"><Section title="Hospital Invoice" agent="auditor">
      <p className="mb-4 leading-relaxed text-ink-2"><LocalizedText>Attach a hospital-issued payment receipt if available. Guardian does not authenticate the issuer or prove bank settlement from an uploaded file.</LocalizedText></p>
      <p className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn-ink"><LocalizedText>Every case member can view and download these files. Upload a payment receipt only, with medical details, patient identifiers and card numbers removed. Keep itemised medical bills in Bill Review.</LocalizedText></p>
      {invoices.length > 0 ? <ul className="mb-4 divide-y divide-line rounded-2xl bg-white px-4">{invoices.map(i => (
        <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
          <span className="min-w-0 flex-1"><span className="block font-semibold text-lead">{i.filename}</span><span className="block break-all text-xs text-ink-2"><LocalizedText>{day(i.ts)}</LocalizedText> · <LocalizedText>{i.by}</LocalizedText><LocalizedText> · SHA-256 </LocalizedText>{i.sha256}</span><span className="block break-all text-xs text-ink-2"><LocalizedText>{i.anchoredTx ? `On FISCO BCOS · tx ${i.anchoredTx}` : "Not on the blockchain yet (anchoring not configured); the case history keeps its hash."}</LocalizedText></span></span>
          <div className="flex gap-2"><button type="button" onClick={() => void open(i.id, i.filename, true)} className={SECONDARY}><LocalizedText>View</LocalizedText></button><button type="button" onClick={() => void open(i.id, i.filename)} className={SECONDARY}><LocalizedText>Download</LocalizedText></button></div>
        </li>
      ))}</ul> : <p className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn-ink"><LocalizedText>No invoice from the hospital yet.</LocalizedText></p>}
      {canAttach && <div className="flex flex-wrap items-start gap-3">
        <label className={`${SECONDARY} cursor-pointer`}>
          {file ? file.name : "Choose invoice (PDF, PNG or JPEG)"}
          <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="button" disabled={busy || !file || Boolean(fileError)} onClick={() => void attach()} className={PRIMARY}><LocalizedText>{busy ? <><Spinner /><LocalizedText>Saving…</LocalizedText></> : "Attach invoice"}</LocalizedText></button>
        {file && fileError && <p role="alert" className="w-full text-sm text-danger-ink"><LocalizedText>{fileError}</LocalizedText></p>}
      </div>}
    </Section></div>
  );
}

"use client";

import { useState } from "react";
import type { PaymentRequest } from "@/lib/demo";
import { day } from "@/lib/format";
import { documentFile } from "@/lib/validate";
import { ClientError, readResponse, request as fetchApi, Spinner, useFeedback, useTask } from "./Feedback";
import { useCaseData, useWorkspace } from "./WorkspaceProvider";
import { Chip, PRIMARY, SECONDARY, Section } from "./ui";

// Proof from the hospital for a paid request: its invoice or receipt, kept with the payment. The
// owner or companion attaches it; helpers see that it is on file and its fingerprint, not the file.

export function InvoiceSection({ request }: { request: PaymentRequest }) {
  const { case: care } = useCaseData();
  const { call } = useWorkspace();
  const { busy, run } = useTask();
  const { showError } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const invoices = request.invoices ?? [];
  const canAttach = care.me.role !== "payer" && !care.closed;
  const fileError = documentFile(file);
  async function attach() {
    if (!file || fileError) return;
    const form = new FormData(); form.set("file", file);
    if (await run(() => call(`/payment-requests/${request.id}/invoices`, "POST", form, care.id))) setFile(null);
  }
  async function open(id: string, filename: string) {
    try {
      const res = await fetchApi(`/api/payment-requests/${request.id}/invoices/${id}`, { cache: "no-store" });
      if (!res.ok) await readResponse(res);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { showError(e instanceof ClientError ? e : new ClientError("The invoice couldn’t be downloaded.", 0)); }
  }
  return (
    <Section title="Hospital Invoice" agent="auditor" action={<Chip tone={invoices.length ? "ok" : "warn"}>{invoices.length ? "On file" : "Missing"}</Chip>}>
      <p className="mb-4 leading-relaxed text-ink-2">The hospital’s own invoice or receipt for this payment, kept next to the payment receipts as proof the hospital received it.</p>
      {invoices.length > 0 ? <ul className="mb-4 divide-y divide-line rounded-2xl bg-white px-4">{invoices.map(i => (
        <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
          <span className="min-w-0 flex-1"><span className="block font-semibold text-lead">{i.filename}</span><span className="block break-all text-xs text-ink-2">{day(i.ts)} · {i.by} · SHA-256 {i.sha256}</span></span>
          {care.me.role !== "payer" && <button type="button" onClick={() => void open(i.id, i.filename)} className={SECONDARY}>Download</button>}
        </li>
      ))}</ul> : <p className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn-ink">No invoice from the hospital yet.{care.me.role === "payer" ? " The owner attaches it when the hospital sends it." : ""}</p>}
      {canAttach && <div className="flex flex-wrap items-start gap-3">
        <label className={`${SECONDARY} cursor-pointer`}>
          {file ? file.name : "Choose invoice (PDF, PNG or JPEG)"}
          <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <button type="button" disabled={busy || !file || Boolean(fileError)} onClick={() => void attach()} className={PRIMARY}>{busy ? <><Spinner />Saving…</> : "Attach invoice"}</button>
        {file && fileError && <p role="alert" className="w-full text-sm text-danger-ink">{fileError}</p>}
      </div>}
    </Section>
  );
}

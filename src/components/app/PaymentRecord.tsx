"use client";

import { useEffect, useState } from "react";
import { Spinner } from "./Feedback";
import { Chip, MoneyFigure } from "./ui";
import { useCaseData, useWorkspace } from "./WorkspaceProvider";
import { converted, day, money } from "@/lib/format";

type PaymentRecordData = {
  paidTotal: number;
  member: { currency: string };
  payments: { requestId: string; purpose: string; amount: number; currency: string; payCurrency: string | null; payAmount: number | null; fee: number | null; status: string; chargeRef: string | null; ts: string }[];
  refund: { amount: number; status: string; dueAt: string } | null;
  documents: { id: string; type: string; sha256: string; anchoredTx: string | null; createdAt: string }[];
};

/** PRD F19 / step 8: each person's own record, shown here and downloadable as JSON. */
export function PaymentRecord({ caseId, memberId, print = false }: { caseId: string; memberId?: string; print?: boolean }) {
  const { call } = useWorkspace();
  const { case: care, audit } = useCaseData();
  const [record, setRecord] = useState<PaymentRecordData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    call(`/cases/${caseId}/recap${memberId ? `?memberId=${encodeURIComponent(memberId)}` : ""}`, "GET", undefined, caseId).then(r => { if (active) setRecord(r as PaymentRecordData); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [call, caseId, memberId, care.me.id, audit.rows.length]);
  if (failed) return <p className="text-sm text-ink-2">Your record couldn’t be loaded. Try the download below.</p>;
  if (!record) return <p role="status" className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="h-4 w-4 text-serpent" />Loading your record…</p>;
  return (
    <div className="space-y-5">
      <p><MoneyFigure minor={record.paidTotal} currency={care.currency} /><span className="ml-2 text-ink-2">paid {memberId && memberId !== care.me.id ? "by this person" : "by you"} to the hospital</span></p>
      {record.payments.length ? <ul className="divide-y divide-line rounded-2xl bg-white px-4">{record.payments.map(p => (
        <li key={`${p.requestId}-${p.ts}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
          <span className="min-w-0 flex-1"><span className="block font-semibold text-lead">{p.purpose}</span><span className="block text-xs text-ink-2">{day(p.ts)} · {p.chargeRef ? `Receipt ${p.chargeRef}` : "No receipt"}</span></span>
          <span className="text-right"><b className="block font-num text-serpent-dark">{p.payCurrency && p.payAmount !== null ? converted(p.payAmount, p.payCurrency, p.amount, p.currency) : money(p.amount, p.currency)}</b>{p.payCurrency && p.payAmount !== null && <span className="text-xs text-ink-2">+ {money(p.fee ?? 0, p.payCurrency)} fee</span>}</span>
          <Chip tone={p.status === "charged" ? "ok" : "danger"}>{p.status === "charged" ? "Paid" : "Failed"}</Chip>
        </li>
      ))}</ul> : <p className="text-sm text-ink-2">No payments {memberId && memberId !== care.me.id ? "from this person" : "from you"} yet. A share is charged only when a request they pledged to is paid.</p>}
      {record.refund && <p className="text-sm text-lead">Your refund share: <b className="font-num">{money(record.refund.amount, care.currency)}</b> · {record.refund.status} · due {day(record.refund.dueAt)}</p>}
      <details className="text-sm" open={print}><summary className="cursor-pointer font-semibold text-serpent-dark">Document fingerprints ({record.documents.length})</summary>
        <ul className="mt-2 space-y-1.5">{record.documents.map(d => <li key={d.id} className="break-all text-xs text-ink-2"><b className="text-lead">{d.type}</b> · {d.sha256 || "fingerprint pending"}{d.anchoredTx ? ` · anchored ${d.anchoredTx}` : ""}</li>)}</ul>
      </details>
    </div>
  );
}


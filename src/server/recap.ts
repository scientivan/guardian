import type { DB } from "./db";

// Per-member record: what they paid, for what, receipts, refund share, and the
// hashes of the case documents (with anchor tx when anchored).

export function recap(db: DB, caseId: string, memberId: string) {
  const member = db.prepare("SELECT id, display_name, role, currency FROM members WHERE id = ? AND case_id = ?").get(memberId, caseId) as
    | { id: string; display_name: string; role: string; currency: string }
    | undefined;
  if (!member) return null;
  const payments = db
    .prepare(
      `SELECT r.id requestId, r.purpose, r.status requestStatus, r.document_id documentId, a.amount, c.currency,
              q.pay_currency payCurrency, q.pay_amount payAmount, q.fee, q.rate_e4 rateE4, a.status, a.charge_ref chargeRef, a.ts
       FROM approvals a JOIN payment_requests r ON r.id = a.request_id JOIN cases c ON c.id = r.case_id
       LEFT JOIN fx_quotes q ON q.id = a.quote_id
       WHERE r.case_id = ? AND a.member_id = ? AND a.status IN ('charged','charge_failed') ORDER BY a.ts`,
    )
    .all(caseId, memberId) as Record<string, unknown>[];
  const refund = db.prepare("SELECT amount, status, due_at dueAt FROM refunds WHERE case_id = ? AND member_id = ?").get(caseId, memberId) ?? null;
  const documents = db.prepare("SELECT id, type, sha256, anchored_tx anchoredTx, created_at createdAt FROM documents WHERE case_id = ? AND status = 'parsed' ORDER BY created_at").all(caseId);
  const paidTotal = payments.filter((p) => p.status === "charged").reduce((s, p) => s + (p.amount as number), 0);
  return { demo: true, member: { id: member.id, displayName: member.display_name, role: member.role, currency: member.currency }, paidTotal, payments, refund, documents };
}

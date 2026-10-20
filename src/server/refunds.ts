import type { DB } from "./db";
import { appendAudit } from "./audit";
import { lineTotal, splitRefund } from "./compare";

// Refund tracking (light scope). Refund = what the family paid - final bill,
// split in proportion to what each member paid. The hospital's refund process
// is simulated; status changes come from the hospital side (demo endpoint).

export const REFUND_DUE_DAYS = 14; // demo value, not a hospital rule

export type RefundStatus = "requested" | "processing" | "received";

export function paidByMember(db: DB, caseId: string): { memberId: string; amount: number }[] {
  return db
    .prepare(
      `SELECT a.member_id memberId, SUM(a.amount) amount FROM approvals a JOIN payment_requests r ON r.id = a.request_id
       WHERE r.case_id = ? AND a.status = 'charged' GROUP BY a.member_id ORDER BY a.member_id`,
    )
    .all(caseId) as { memberId: string; amount: number }[];
}

export function openRefunds(db: DB, caseId: string, finalDocumentId: string, now = new Date()) {
  const doc = db.prepare("SELECT type, status FROM documents WHERE id = ? AND case_id = ?").get(finalDocumentId, caseId) as { type: string; status: string } | undefined;
  if (!doc || doc.type !== "final" || doc.status !== "parsed") return { ok: false as const, reason: "a parsed final bill is required" };
  if (db.prepare("SELECT 1 FROM refunds WHERE case_id = ?").get(caseId)) return { ok: false as const, reason: "refunds already opened for this case" };

  const finalTotal = (db.prepare("SELECT qty, unit_price unitPrice FROM bill_items WHERE document_id = ?").all(finalDocumentId) as { qty: number; unitPrice: number }[]).reduce((s, i) => s + lineTotal(i), 0);
  const paid = paidByMember(db, caseId);
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const refund = totalPaid - finalTotal;
  if (refund <= 0) {
    appendAudit(db, { caseId, actor: "system", action: "refund.open", inputSources: ["hospital_doc", "system"], decision: "info", result: { finalTotal, totalPaid, refund: 0 } }, now);
    return { ok: true as const, refund: 0, balanceDue: -refund, parts: [] };
  }
  const due = new Date(now.getTime() + REFUND_DUE_DAYS * 86_400_000).toISOString();
  const parts = splitRefund(refund, paid);
  const ins = db.prepare("INSERT INTO refunds (case_id, member_id, amount, status, due_at, document_id, updated_at) VALUES (?, ?, ?, 'requested', ?, ?, ?)");
  db.transaction(() => parts.forEach((p) => ins.run(caseId, p.memberId, p.amount, due, finalDocumentId, now.toISOString())))();
  appendAudit(db, { caseId, actor: "system", action: "refund.open", inputSources: ["hospital_doc", "system"], decision: "info", result: { finalTotal, totalPaid, refund, parts, dueAt: due } }, now);
  return { ok: true as const, refund, balanceDue: 0, parts };
}

/** Hospital-side status update (simulated). Status only moves forward. */
export function setRefundStatus(db: DB, caseId: string, memberId: string, status: RefundStatus, now = new Date()) {
  const order: RefundStatus[] = ["requested", "processing", "received"];
  const row = db.prepare("SELECT id, status FROM refunds WHERE case_id = ? AND member_id = ?").get(caseId, memberId) as { id: number; status: RefundStatus } | undefined;
  if (!row) return { ok: false, reason: "no refund for this member" };
  if (order.indexOf(status) <= order.indexOf(row.status)) return { ok: false, reason: `refund is already ${row.status}` };
  db.prepare("UPDATE refunds SET status = ?, updated_at = ? WHERE id = ?").run(status, now.toISOString(), row.id);
  appendAudit(db, { caseId, actor: "hospital(demo)", action: "refund.status", inputSources: ["system"], decision: "info", result: { memberId, status } }, now);
  return { ok: true };
}

/** Status per member; logs one reminder per overdue refund that has not arrived. */
export function refundStatus(db: DB, caseId: string, now = new Date()) {
  const closed = Boolean(db.prepare("SELECT 1 FROM case_closure WHERE case_id=?").get(caseId));
  const rows = db
    .prepare("SELECT r.id, r.member_id, m.display_name, r.amount, r.status, r.due_at, r.reminded_at FROM refunds r JOIN members m ON m.id = r.member_id WHERE r.case_id = ? ORDER BY r.amount DESC")
    .all(caseId) as { id: number; member_id: string; display_name: string; amount: number; status: RefundStatus; due_at: string; reminded_at: string | null }[];
  const reminders: string[] = [];
  const items = rows.map((r) => {
    const overdue = r.status !== "received" && new Date(r.due_at) <= now;
    if (overdue && !r.reminded_at && !closed) {
      db.prepare("UPDATE refunds SET reminded_at = ? WHERE id = ?").run(now.toISOString(), r.id);
      appendAudit(db, { caseId, actor: "system", action: "refund.reminder", inputSources: ["system"], decision: "info", result: { memberId: r.member_id, amount: r.amount, dueAt: r.due_at } }, now);
      reminders.push(r.member_id);
    }
    return { memberId: r.member_id, displayName: r.display_name, amount: r.amount, status: r.status, dueAt: r.due_at, overdue };
  });
  return { totalRefund: items.reduce((s, i) => s + i.amount, 0), items, remindersSent: reminders };
}

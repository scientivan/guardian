import { randomUUID } from "node:crypto";
import type { DB } from "./db";
import { appendAudit } from "./audit";
import { authorizeExecution, resolvePayee, type GateResult } from "./gateway";

// Payment request state machine:
//   pending --(approvals cover amount, checks 1-5)--> executing --> paid | failed
//   pending --(expiry)--> expired          pending --(owner)--> cancelled
// Nothing is charged while pending. Each approved share is its own charge to the
// registry payee, in the payer's currency at the locked quote.

export type RequestStatus = "pending" | "executing" | "paid" | "expired" | "cancelled" | "failed";

export interface ChargeInput {
  requestId: string;
  memberId: string;
  payeeId: string;
  currency: string;
  /** Minor units in the payer's currency, quote amount plus fee. */
  amount: number;
  idempotencyKey: string;
  description: string;
}
export type ChargeOutcome = { ok: true; ref: string } | { ok: false; error: string };
export type Charger = (c: ChargeInput) => Promise<ChargeOutcome>;

export function createPaymentRequest(
  db: DB,
  args: { caseId: string; actor: string; payeeId: string; amount: number; purpose: string; expiresInMinutes: number; documentId?: string },
  now = new Date(),
): GateResult & { id?: string } {
  const m = db.prepare("SELECT role, case_id FROM members WHERE id = ?").get(args.actor) as { role: string; case_id: string } | undefined;
  if (!m || m.case_id !== args.caseId || m.role !== "owner") {
    appendAudit(db, { caseId: args.caseId, actor: args.actor, action: "request.create", inputSources: ["user"], decision: "deny", result: { reason: "only the owner can create a payment request" } }, now);
    return { ok: false, check: 3, reason: "only the owner can create a payment request" };
  }
  if (!Number.isInteger(args.amount) || args.amount <= 0) return { ok: false, check: 4, reason: "invalid amount" };
  const ttl = Math.min(Math.max(Math.trunc(args.expiresInMinutes), 5), 7 * 24 * 60);
  const id = `R_${randomUUID().slice(0, 8)}`;
  db.prepare("INSERT INTO payment_requests (id, case_id, payee_id, document_id, amount, purpose, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)").run(
    id, args.caseId, args.payeeId, args.documentId ?? null, args.amount, args.purpose, now.toISOString(), new Date(now.getTime() + ttl * 60_000).toISOString(),
  );
  appendAudit(db, { caseId: args.caseId, actor: args.actor, action: "request.create", inputSources: ["user"], decision: "allow", result: { id, payeeId: args.payeeId, amount: args.amount, purpose: args.purpose, ttlMinutes: ttl } }, now);
  return { ok: true, reason: "created", id };
}

/** Moves every overdue pending request to expired. Approvals stay recorded; nothing was charged. */
export function expireDue(db: DB, now = new Date()): string[] {
  const due = db.prepare("SELECT id, case_id FROM payment_requests WHERE status = 'pending' AND expires_at <= ?").all(now.toISOString()) as { id: string; case_id: string }[];
  for (const r of due) {
    db.prepare("UPDATE payment_requests SET status = 'expired' WHERE id = ? AND status = 'pending'").run(r.id);
    appendAudit(db, { caseId: r.case_id, actor: "system", action: "request.expire", inputSources: ["system"], decision: "info", result: { requestId: r.id } }, now);
  }
  return due.map((r) => r.id);
}

export function cancelRequest(db: DB, requestId: string, actor: string, now = new Date()): GateResult {
  const req = db.prepare("SELECT case_id, status FROM payment_requests WHERE id = ?").get(requestId) as { case_id: string; status: string } | undefined;
  if (!req) return { ok: false, check: 3, reason: "unknown payment request" };
  const m = db.prepare("SELECT role, case_id FROM members WHERE id = ?").get(actor) as { role: string; case_id: string } | undefined;
  if (!m || m.case_id !== req.case_id || m.role !== "owner") return { ok: false, check: 3, reason: "only the owner can cancel" };
  const r = db.prepare("UPDATE payment_requests SET status = 'cancelled' WHERE id = ? AND status = 'pending'").run(requestId);
  if (r.changes === 0) return { ok: false, check: 3, reason: `request is ${req.status}` };
  appendAudit(db, { caseId: req.case_id, actor, action: "request.cancel", inputSources: ["user"], decision: "allow", result: { requestId } }, now);
  return { ok: true, reason: "cancelled" };
}

export interface ExecuteResult extends GateResult {
  status?: RequestStatus;
  charges?: { memberId: string; chargeRef: string | null; status: "charged" | "charge_failed"; error?: string }[];
}

export async function executeRequest(db: DB, requestId: string, actor: string, charge: Charger, now = new Date()): Promise<ExecuteResult> {
  expireDue(db, now);
  const gate = authorizeExecution(db, requestId, now);
  if (!gate.ok) return gate;

  // Claim the request; a second concurrent execute sees changes = 0 and stops.
  const claimed = db.prepare("UPDATE payment_requests SET status = 'executing' WHERE id = ? AND status = 'pending'").run(requestId);
  if (claimed.changes === 0) return { ok: false, check: 3, reason: "request is already being executed" };

  const req = db.prepare("SELECT case_id, payee_id, purpose FROM payment_requests WHERE id = ?").get(requestId) as { case_id: string; payee_id: string; purpose: string };
  appendAudit(db, { caseId: req.case_id, actor, action: "request.execute", inputSources: ["user"], decision: "allow", result: { requestId } }, now);

  const shares = db
    .prepare(
      `SELECT a.member_id, q.pay_currency, q.pay_amount, q.fee FROM approvals a JOIN fx_quotes q ON q.id = a.quote_id
       WHERE a.request_id = ? AND a.status = 'approved' ORDER BY a.id`,
    )
    .all(requestId) as { member_id: string; pay_currency: string; pay_amount: number; fee: number }[];

  const charges: NonNullable<ExecuteResult["charges"]> = [];
  for (const s of shares) {
    const recipient = resolvePayee(db,req.case_id,"gateway",{payeeId:req.payee_id,source:"official_registry"});
    const out:ChargeOutcome = !recipient.ok ? {ok:false,error:"The hospital payment authority changed. This share was not charged."} : await charge({
      requestId,
      memberId: s.member_id,
      payeeId: req.payee_id,
      currency: s.pay_currency,
      amount: s.pay_amount + s.fee,
      idempotencyKey: `${requestId}:${s.member_id}`,
      description: `${req.purpose} (demo)`,
    });
    if (out.ok) {
      db.prepare("UPDATE approvals SET status = 'charged', charge_ref = ? WHERE request_id = ? AND member_id = ?").run(out.ref, requestId, s.member_id);
      charges.push({ memberId: s.member_id, chargeRef: out.ref, status: "charged" });
    } else {
      db.prepare("UPDATE approvals SET status = 'charge_failed' WHERE request_id = ? AND member_id = ?").run(requestId, s.member_id);
      charges.push({ memberId: s.member_id, chargeRef: null, status: "charge_failed", error: out.error });
    }
    appendAudit(db, { caseId: req.case_id, actor: "gateway", action: "charge", inputSources: ["system"], decision: out.ok ? "allow" : "deny", result: { requestId, memberId: s.member_id, currency: s.pay_currency, amount: s.pay_amount + s.fee, ...(out.ok ? { ref: out.ref } : { error: out.error }) } }, now);
  }

  const status: RequestStatus = charges.every((c) => c.status === "charged") ? "paid" : "failed";
  db.prepare("UPDATE payment_requests SET status = ? WHERE id = ?").run(status, requestId);
  appendAudit(db, { caseId: req.case_id, actor: "gateway", action: `request.${status}`, inputSources: ["system"], decision: "info", result: { requestId, charged: charges.filter((c) => c.status === "charged").length, failed: charges.filter((c) => c.status === "charge_failed").length } }, now);
  return { ok: status === "paid", reason: status, status, charges };
}

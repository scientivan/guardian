import type { DB } from "./db";
import { appendAudit } from "./audit";
import { hasConfusable, hasInvisible, normalizeAccount, normalizeName } from "./normalize";

// Deterministic payment gateway. No LLM output can bypass these checks:
// the planner may only reference a payee_id, never write an account.

export type Role = "owner" | "payer" | "companion";

export interface PayeeClaim {
  /** Registry id chosen by the planner, if any. */
  payeeId?: string;
  /** Raw account/name as it appeared in a message or document, if any. */
  account?: string;
  name?: string;
  source: "official_registry" | "user" | "hospital_doc" | "chat";
}

export interface GateResult {
  ok: boolean;
  check?: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

interface PayeeRow {
  id: string;
  hospital_id: string;
  account: string;
  name_normalized: string;
  source: string;
}

interface MemberRow {
  id: string;
  case_id: string;
  role: Role;
  share_limit: number;
}

function deny(db: DB, caseId: string, actor: string, check: GateResult["check"], reason: string, sources: string[]): GateResult {
  appendAudit(db, { caseId, actor, action: "gateway.check", inputSources: sources, decision: "deny", result: { check, reason } });
  return { ok: false, check, reason };
}

/** Check 1 + 2: payee must be in the official registry and match exactly after normalization. */
export function resolvePayee(db: DB, caseId: string, actor: string, claim: PayeeClaim): GateResult & { payee?: PayeeRow } {
  const c = db.prepare("SELECT hospital_id FROM cases WHERE id = ?").get(caseId) as { hospital_id: string } | undefined;
  if (!c) return deny(db, caseId, actor, 1, "unknown case", [claim.source]);

  let payee: PayeeRow | undefined;
  if (claim.payeeId) {
    payee = db.prepare("SELECT * FROM payees WHERE id = ? AND hospital_id = ?").get(claim.payeeId, c.hospital_id) as PayeeRow | undefined;
  } else if (claim.account) {
    payee = db
      .prepare("SELECT * FROM payees WHERE hospital_id = ?")
      .all(c.hospital_id)
      .find((p) => normalizeAccount((p as PayeeRow).account) === normalizeAccount(claim.account!)) as PayeeRow | undefined;
  }

  if (!payee || payee.source !== "official_registry") {
    openAnomaly(db, caseId, "unverified_payee", `payee not in official registry (source: ${claim.source})`);
    return deny(db, caseId, actor, 1, "payee is not in the hospital's official account list", [claim.source]);
  }
  if (claim.name !== undefined) {
    if (hasInvisible(claim.name) || hasConfusable(claim.name) || normalizeName(claim.name) !== payee.name_normalized) {
      openAnomaly(db, caseId, "payee_name_mismatch", "payee name differs from registry after normalization");
      return deny(db, caseId, actor, 2, "payee name does not exactly match the official record", [claim.source]);
    }
  }
  return { ok: true, reason: "payee verified", payee };
}

export function openAnomaly(db: DB, caseId: string, kind: string, detail: string): void {
  db.prepare("INSERT INTO anomalies (case_id, kind, detail, ts) VALUES (?, ?, ?, ?)").run(caseId, kind, detail, new Date().toISOString());
}

/** Check 3 + 4: who may approve, and how much. */
export function recordApproval(db: DB, requestId: string, memberId: string, amount: number): GateResult {
  const req = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(requestId) as
    | { id: string; case_id: string; amount: number; status: string }
    | undefined;
  if (!req) return { ok: false, check: 3, reason: "unknown payment request" };
  const m = db.prepare("SELECT * FROM members WHERE id = ?").get(memberId) as MemberRow | undefined;
  const src = ["user"];

  if (!m || m.case_id !== req.case_id) return deny(db, req.case_id, memberId, 3, "member does not belong to this case", src);
  if (m.role === "companion") return deny(db, req.case_id, memberId, 3, "companions cannot approve payments", src);
  if (req.status !== "pending") return deny(db, req.case_id, memberId, 3, `request is ${req.status}`, src);
  if (!Number.isInteger(amount) || amount <= 0) return deny(db, req.case_id, memberId, 4, "invalid amount", src);
  if (m.role === "payer" && amount > m.share_limit) return deny(db, req.case_id, memberId, 4, "amount exceeds this member's share limit", src);

  const sum = (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM approvals WHERE request_id = ? AND member_id != ?").get(requestId, memberId) as { s: number }).s;
  if (sum + amount > req.amount) return deny(db, req.case_id, memberId, 4, "approvals would exceed the requested amount", src);

  db.prepare(
    `INSERT INTO approvals (request_id, member_id, amount, ts) VALUES (?, ?, ?, ?)
     ON CONFLICT(request_id, member_id) DO UPDATE SET amount = excluded.amount, ts = excluded.ts`,
  ).run(requestId, memberId, amount, new Date().toISOString());
  appendAudit(db, { caseId: req.case_id, actor: memberId, action: "approval.record", inputSources: src, decision: "allow", result: { requestId, amount } });
  return { ok: true, reason: "approval recorded" };
}

export function approvedTotal(db: DB, requestId: string): number {
  return (db.prepare("SELECT COALESCE(SUM(amount),0) s FROM approvals WHERE request_id = ?").get(requestId) as { s: number }).s;
}

/** Final gate before execution: re-runs payee check, approval coverage, and open anomalies (check 5). */
export function authorizeExecution(db: DB, requestId: string): GateResult {
  const req = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(requestId) as
    | { id: string; case_id: string; payee_id: string; amount: number; status: string }
    | undefined;
  if (!req) return { ok: false, check: 1, reason: "unknown payment request" };
  if (req.status !== "pending") return deny(db, req.case_id, "gateway", 3, `request is ${req.status}`, ["system"]);

  const payee = resolvePayee(db, req.case_id, "gateway", { payeeId: req.payee_id, source: "official_registry" });
  if (!payee.ok) return payee;

  const total = approvedTotal(db, requestId);
  if (total < req.amount) return deny(db, req.case_id, "gateway", 4, `approved ${total} of ${req.amount}`, ["system"]);

  const open = db.prepare("SELECT COUNT(*) n FROM anomalies WHERE case_id = ? AND resolved = 0").get(req.case_id) as { n: number };
  if (open.n > 0) return deny(db, req.case_id, "gateway", 5, "open anomaly; verify through the hospital's official channel first", ["system"]);

  appendAudit(db, { caseId: req.case_id, actor: "gateway", action: "gateway.authorize", inputSources: ["system"], decision: "allow", result: { requestId, amount: req.amount } });
  return { ok: true, reason: "authorized" };
}

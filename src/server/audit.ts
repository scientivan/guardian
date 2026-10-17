import { createHash } from "node:crypto";
import type { DB } from "./db";

export const GENESIS = "0".repeat(64);

export interface AuditEntry {
  caseId: string | null;
  actor: string;
  action: string;
  inputSources: string[];
  decision: "allow" | "deny" | "info";
  result: unknown;
}

export interface AuditRow {
  seq: number;
  ts: string;
  case_id: string | null;
  actor: string;
  action: string;
  input_sources: string;
  decision: string;
  result: string;
  prev_hash: string;
  hash: string;
}

function digest(prev: string, ts: string, e: AuditEntry, result: string): string {
  const body = JSON.stringify([prev, ts, e.caseId, e.actor, e.action, e.inputSources, e.decision, result]);
  return createHash("sha256").update(body).digest("hex");
}

export function appendAudit(db: DB, e: AuditEntry, now = new Date()): AuditRow {
  const last = db.prepare("SELECT hash FROM audit_log ORDER BY seq DESC LIMIT 1").get() as { hash: string } | undefined;
  const prev = last?.hash ?? GENESIS;
  const ts = now.toISOString();
  const result = JSON.stringify(e.result ?? null);
  const hash = digest(prev, ts, e, result);
  const info = db
    .prepare(
      `INSERT INTO audit_log (ts, case_id, actor, action, input_sources, decision, result, prev_hash, hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(ts, e.caseId, e.actor, e.action, JSON.stringify(e.inputSources), e.decision, result, prev, hash);
  return db.prepare("SELECT * FROM audit_log WHERE seq = ?").get(info.lastInsertRowid) as AuditRow;
}

/** Recomputes every hash; returns the first broken seq, or null if the chain is intact. */
export function verifyChain(db: DB): number | null {
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY seq").all() as AuditRow[];
  let prev = GENESIS;
  for (const r of rows) {
    const e: AuditEntry = {
      caseId: r.case_id,
      actor: r.actor,
      action: r.action,
      inputSources: JSON.parse(r.input_sources),
      decision: r.decision as AuditEntry["decision"],
      result: null,
    };
    if (r.prev_hash !== prev || digest(prev, r.ts, e, r.result) !== r.hash) return r.seq;
    prev = r.hash;
  }
  return null;
}

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

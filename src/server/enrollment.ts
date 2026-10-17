import { createPublicKey, verify } from "node:crypto";
import type { DB } from "./db";
import { appendAudit } from "./audit";
import { normalizeName } from "./normalize";
import { canonicalPayload, type SignedPayeeList } from "./portal";

// Payees enter the registry only from a payee list signed by the hospital's
// pinned key. Invoices and chat messages never enroll a payee; they are only
// matched against the registry by the gateway.

export type EnrollResult =
  | { ok: true; enrolled: string[]; resolvedAnomalies: number }
  | { ok: false; reason: string };

export function enrollFromSignedList(db: DB, caseId: string, actor: string, list: SignedPayeeList, now = new Date()): EnrollResult {
  const fail = (reason: string): EnrollResult => {
    appendAudit(db, { caseId, actor, action: "payee.enroll", inputSources: ["official_registry"], decision: "deny", result: { reason } }, now);
    return { ok: false, reason };
  };

  const c = db.prepare("SELECT hospital_id FROM cases WHERE id = ?").get(caseId) as { hospital_id: string } | undefined;
  if (!c) return fail("unknown case");
  if (list.hospitalId !== c.hospital_id) return fail("list is for a different hospital");
  const h = db.prepare("SELECT public_key FROM hospitals WHERE id = ?").get(c.hospital_id) as { public_key: string } | undefined;
  if (!h) return fail("unknown hospital");

  const key = createPublicKey({ key: Buffer.from(h.public_key, "base64"), format: "der", type: "spki" });
  let valid = false;
  try {
    valid = verify(null, canonicalPayload(list), key, Buffer.from(list.signature, "base64"));
  } catch {
    valid = false;
  }
  if (!valid) return fail("signature does not verify against the hospital's pinned key");

  const upsert = db.prepare(
    `INSERT INTO payees (id, hospital_id, account, name_normalized, source, verified_at)
     VALUES (?, ?, ?, ?, 'official_registry', ?)
     ON CONFLICT(id) DO UPDATE SET account = excluded.account, name_normalized = excluded.name_normalized,
       source = 'official_registry', verified_at = excluded.verified_at`,
  );
  const tx = db.transaction(() => {
    // Accounts the hospital no longer lists lose their trust.
    const listed = new Set(list.payees.map((p) => p.id));
    for (const p of db.prepare("SELECT id FROM payees WHERE hospital_id = ? AND source = 'official_registry'").all(c.hospital_id) as { id: string }[]) {
      if (!listed.has(p.id)) db.prepare("UPDATE payees SET source = 'revoked' WHERE id = ?").run(p.id);
    }
    for (const p of list.payees) upsert.run(p.id, c.hospital_id, p.account, normalizeName(p.name), now.toISOString());
    // The family checked with the official channel; payee anomalies are closed.
    // A disputed account that is not on the list stays outside the registry.
    return db
      .prepare("UPDATE anomalies SET resolved = 1 WHERE case_id = ? AND resolved = 0 AND kind IN ('unverified_payee','payee_name_mismatch','unofficial_channel')")
      .run(caseId).changes;
  });
  const resolvedAnomalies = tx();
  const enrolled = list.payees.map((p) => p.id);
  appendAudit(db, { caseId, actor, action: "payee.enroll", inputSources: ["official_registry"], decision: "allow", result: { enrolled, issuedAt: list.issuedAt, resolvedAnomalies } }, now);
  return { ok: true, enrolled, resolvedAnomalies };
}

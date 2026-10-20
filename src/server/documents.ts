import { randomUUID } from "node:crypto";
import type { DB } from "./db";
import { appendAudit, sha256 } from "./audit";
import { extract } from "./extract";
import { scrub, storeTokens } from "./pii";
import { readDocument, type ReaderOutput } from "./reader";
import { resolvePayee, openAnomaly } from "./gateway";
import { anchorHash } from "./anchor";

// Document intake: local text extraction, PII scrub, quarantined reader,
// deterministic totals check, then typed items stored with provenance hospital_doc.

export type DocType = "estimate" | "interim" | "final";

export interface IngestResult {
  documentId: string;
  sha256: string;
  status: "parsed" | "needs_reupload";
  reason?: string;
  anchoredTx: string | null;
  warnings: string[];
  auditSeq: number;
}

function knownNames(db: DB, caseId: string) {
  const fromTokens = db.prepare("SELECT token, value FROM pii_tokens WHERE case_id = ? AND kind = 'NAME'").all(caseId) as { token: string; value: string }[];
  const members = db.prepare("SELECT id, display_name FROM members WHERE case_id = ?").all(caseId) as { id: string; display_name: string }[];
  return [
    ...fromTokens.map((t) => ({ value: t.value, label: t.token.replace(/^\[|_\d+\]$/g, "") })),
    // "Adi (Jakarta)" -> "Adi"
    ...members.map((m) => ({ value: m.display_name.replace(/\s*\(.*\)\s*$/, ""), label: "ANGGOTA" })).filter((m) => m.value.length > 2),
  ];
}

export function itemsSum(items: ReaderOutput["items"]): number {
  return items.reduce((s, i) => s + Math.round(i.qty * i.unitPrice), 0);
}

export async function ingestDocument(
  db: DB,
  args: { caseId: string; actor: string; type: DocType; data: Uint8Array; mime: string; anchor?: boolean; interactive?: boolean },
  now = new Date(),
): Promise<IngestResult> {
  const id = `D_${randomUUID().slice(0, 8)}`;
  const hash = sha256(Buffer.from(args.data));
  const warnings: string[] = [];
  let scrubbedText: string | null = null;
  const finish = (status: IngestResult["status"], reason: string | undefined, meta: object, items: ReaderOutput["items"] = []) => {
    db.transaction(() => {
      db.prepare("INSERT INTO documents (id, case_id, type, sha256, status, reason, meta, scrubbed_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        id, args.caseId, args.type, hash, status, reason ?? null, JSON.stringify(meta), scrubbedText, now.toISOString(),
      );
      const ins = db.prepare("INSERT INTO bill_items (document_id, code, category, description, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?)");
      items.forEach((i, n) => ins.run(id, i.code || `L${String(n + 1).padStart(2, "0")}`, i.category, i.description, i.qty, i.unitPrice));
    })();
    return appendAudit(
      db,
      { caseId: args.caseId, actor: args.actor, action: "document.ingest", inputSources: ["hospital_doc"], decision: status === "parsed" ? "allow" : "info", result: { id, type: args.type, sha256: hash, status, reason, items: items.length, warnings } },
      now,
    ).seq;
  };

  const ex = await extract(args.data, args.mime);
  if (!ex.ok) return { documentId: id, sha256: hash, status: "needs_reupload", reason: ex.reason, anchoredTx: null, warnings, auditSeq: finish("needs_reupload", ex.reason, {}) };

  const s = scrub(ex.text, knownNames(db, args.caseId));
  storeTokens(db, args.caseId, s);
  scrubbedText = s.text;

  const read = await readDocument(s.text, args.interactive ? { timeoutMs: 25_000, totalTimeoutMs: 70_000, waitForCooldownMs: 0 } : {});
  if (!read.ok) return { documentId: id, sha256: hash, status: "needs_reupload", reason: read.reason, anchoredTx: null, warnings, auditSeq: finish("needs_reupload", read.reason, { extraction: ex.method }) };
  const d = read.data;

  const meta = {
    extraction: ex.method,
    reader: `${read.model.provider}:${read.model.model}`,
    currency: d.currency,
    statedTotal: d.statedTotal,
    assumedStayDays: d.assumedStayDays,
    actualStayDays: d.actualStayDays,
    estimateLow: d.estimateLow,
    estimateHigh: d.estimateHigh,
    estimateByCategory: d.estimateByCategory,
    exclusions: d.exclusions,
    statedReasons: d.statedReasons,
    suspiciousInstructions: d.suspiciousInstructions,
  };

  // Account numbers in a document are claims to check, never payees to enroll.
  // The scrubber tokenised account-like numbers; code (not the LLM) maps them back.
  const untoken = (v: string) => s.tokens.find((t) => t.token === v.trim())?.value ?? v;
  for (const p of d.payeeMentions) {
    const account = untoken(p.account);
    const r = resolvePayee(db, args.caseId, "reader", { account, name: p.name ?? undefined, source: "hospital_doc" });
    if (!r.ok) warnings.push(`Document mentions account ending ${account.replace(/\D/g, "").slice(-4)} that is not in the hospital's official list. Do not pay it; check with the hospital's official billing office.`);
  }
  if (d.suspiciousInstructions) {
    openAnomaly(db, args.caseId, "document_instructions", "document contains instruction-like text addressed to the assistant");
    warnings.push("This document contains text that tries to instruct the assistant. It was ignored.");
  }

  if (args.type !== "estimate") {
    const sum = itemsSum(d.items);
    if (d.statedTotal === null || sum !== d.statedTotal) {
      const reason = d.statedTotal === null ? "no total found on the bill" : `line items add up to ${sum / 100} but the bill states ${d.statedTotal / 100}; some lines may be misread`;
      return { documentId: id, sha256: hash, status: "needs_reupload", reason, anchoredTx: null, warnings, auditSeq: finish("needs_reupload", reason, meta, d.items) };
    }
  }

  const seq = finish("parsed", undefined, meta, d.items);
  let anchoredTx: string | null = null;
  if (args.anchor !== false) {
    try {
      anchoredTx = await anchorHash(hash, `document:${args.type}`);
      if (anchoredTx) db.prepare("UPDATE documents SET anchored_tx = ? WHERE id = ?").run(anchoredTx, id);
    } catch {
      warnings.push("The document is saved with its hash, but blockchain anchoring is currently unavailable.");
    }
  }
  return { documentId: id, sha256: hash, status: "parsed", anchoredTx, warnings, auditSeq: seq };
}

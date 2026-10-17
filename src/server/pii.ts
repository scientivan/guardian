import type { DB } from "./db";

// Deterministic PII scrubbing that runs before any text reaches an LLM.
// Known names come from case data; fixed patterns catch IDs, phones, cards, dates.

type Kind = "PASSPORT" | "MRN" | "PHONE" | "CARD" | "DOB" | "EMAIL" | "NAME";

const PATTERNS: Array<[Kind, RegExp]> = [
  ["EMAIL", /[\w.+-]+@[\w-]+\.[\w.]+/g],
  ["CARD", /\b(?:\d[ -]?){13,19}\b/g],
  ["MRN", /\b(?:MRN|RM|病历号)[:\s#]*[A-Z0-9-]{4,}\b/gi],
  ["PASSPORT", /\b(?:[A-Z]{1,2}\d{6,8})\b/g],
  ["PHONE", /\+?\d[\d\s-]{8,14}\d/g],
  ["DOB", /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/g],
];

export interface Scrubbed {
  text: string;
  tokens: Array<{ token: string; value: string; kind: Kind }>;
}

export function scrub(text: string, knownNames: Array<{ value: string; label: string }> = []): Scrubbed {
  const tokens: Scrubbed["tokens"] = [];
  const counters: Partial<Record<string, number>> = {};
  const seen = new Map<string, string>();
  const take = (kind: Kind, value: string, label: string = kind) => {
    const existing = seen.get(value);
    if (existing) return existing;
    counters[label] = (counters[label] ?? 0) + 1;
    const token = `[${label}_${counters[label]}]`;
    seen.set(value, token);
    tokens.push({ token, value, kind });
    return token;
  };

  let out = text;
  // Longest names first so "Budi Santoso" is replaced before "Budi".
  for (const n of [...knownNames].sort((a, b) => b.value.length - a.value.length)) {
    if (!n.value.trim()) continue;
    const re = new RegExp(n.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, (m) => take("NAME", m, n.label));
  }
  for (const [kind, re] of PATTERNS) {
    out = out.replace(re, (m) => take(kind, m));
  }
  return { text: out, tokens };
}

export function storeTokens(db: DB, caseId: string, s: Scrubbed): void {
  const stmt = db.prepare("INSERT OR IGNORE INTO pii_tokens (case_id, token, value, kind) VALUES (?, ?, ?, ?)");
  for (const t of s.tokens) stmt.run(caseId, t.token, t.value, t.kind);
}

/** Restores tokens for display. Payers never see medical identifiers. */
export function restore(db: DB, caseId: string, text: string, role: "owner" | "payer" | "companion"): string {
  const rows = db.prepare("SELECT token, value, kind FROM pii_tokens WHERE case_id = ?").all(caseId) as Array<{
    token: string;
    value: string;
    kind: Kind;
  }>;
  const hiddenForPayer: Kind[] = ["MRN", "PASSPORT", "DOB", "CARD"];
  let out = text;
  for (const r of rows) {
    const visible = role === "owner" || (r.kind !== "CARD" && !(role === "payer" && hiddenForPayer.includes(r.kind)));
    out = out.split(r.token).join(visible ? r.value : r.token);
  }
  return out;
}

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

export function scrub(text: string, knownNames: Array<{ value: string; label: string }> = [], existing: Scrubbed["tokens"] = []): Scrubbed {
  const tokens: Scrubbed["tokens"] = [];
  const counters: Partial<Record<string, number>> = {};
  const seen = new Map<string, string>();
  for (const t of existing) {
    seen.set(t.value, t.token);
    const match = t.token.match(/^\[(.+)_(\d+)\]$/);
    if (match) counters[match[1]] = Math.max(counters[match[1]] ?? 0, Number(match[2]));
  }
  const take = (kind: Kind, value: string, label: string = kind) => {
    const existing = seen.get(value);
    if (existing) {
      if (!tokens.some(t => t.token === existing)) tokens.push({ token:existing,value,kind });
      return existing;
    }
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
  db.transaction(() => {
    const stmt = db.prepare("INSERT INTO pii_tokens (case_id, token, value, kind) VALUES (?, ?, ?, ?)");
    for (const t of s.tokens) {
      const row = db.prepare("SELECT value,kind FROM pii_tokens WHERE case_id=? AND token=?").get(caseId,t.token) as {value:string;kind:string}|undefined;
      if (row && (row.value !== t.value || row.kind !== t.kind)) throw new Error("Conflicting PII token. Use scrubCase for persistent case text.");
      if (!row) stmt.run(caseId, t.token, t.value, t.kind);
    }
  })();
}

/** Allocate and persist tokens atomically, reusing the case's existing mapping. */
export function scrubCase(db: DB, caseId: string, text: string): Scrubbed {
  return db.transaction(() => {
    const existing = db.prepare("SELECT token,value,kind FROM pii_tokens WHERE case_id=?").all(caseId) as Scrubbed["tokens"];
    const members = db.prepare("SELECT display_name FROM members WHERE case_id=?").all(caseId) as {display_name:string}[];
    const names = [
      ...existing.filter(t => t.kind === "NAME").map(t => ({value:t.value,label:t.token.replace(/^\[|_\d+\]$/g,"")})),
      ...members.map(m => ({value:m.display_name.replace(/\s*\(.*\)\s*$/, ""),label:"ANGGOTA"})).filter(m=>m.value.length>2),
    ];
    const result = scrub(text,names,existing);
    storeTokens(db,caseId,result);
    return result;
  })();
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

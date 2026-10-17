import type { DB } from "./db";
import { compare, lineTotal, type Category, type Cause, type Comparison, type Estimate, type ReferencePrice } from "./compare";
import { REFERENCE_PRICES } from "./fixtures/demo-case";

// Builds the typed facts the planner may talk about: comparator results from
// code, with every cause and flag tied to concrete item codes.

export interface StoredItem {
  code: string;
  category: Category;
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CitedCause {
  ref: string; // C1, C2 ... stable within one analysis
  cause: Cause;
  itemIds: string[];
}

export interface Question {
  kind: "duplicate" | "basic_item_billed" | "above_reference" | "models_disagree";
  itemIds: string[];
  text: string;
}

export interface Analysis {
  documentId: string;
  currency: string;
  estimate: Estimate;
  actualStayDays: number;
  comparison: Comparison;
  items: StoredItem[];
  causes: CitedCause[];
  questions: Question[];
  statedReasons: string[];
}

interface DocRow {
  id: string;
  type: string;
  status: string;
  meta: string;
}

export function loadItems(db: DB, documentId: string): StoredItem[] {
  return (db.prepare("SELECT code, category, description, qty, unit_price unitPrice FROM bill_items WHERE document_id = ? ORDER BY id").all(documentId) as Omit<StoredItem, "lineTotal">[]).map(
    (i) => ({ ...i, lineTotal: lineTotal(i) }),
  );
}

export function latestEstimate(db: DB, caseId: string): { estimate: Estimate; currency: string } | null {
  const row = db.prepare("SELECT meta FROM documents WHERE case_id = ? AND type = 'estimate' AND status = 'parsed' ORDER BY created_at DESC, rowid DESC LIMIT 1").get(caseId) as
    | { meta: string }
    | undefined;
  if (!row) return null;
  const m = JSON.parse(row.meta);
  const byCategory = Object.fromEntries((m.estimateByCategory ?? []).map((c: { category: Category; amount: number }) => [c.category, c.amount]));
  const room = byCategory.room as number | undefined;
  return {
    currency: m.currency ?? "CNY",
    estimate: {
      low: m.estimateLow ?? 0,
      high: m.estimateHigh ?? 0,
      assumedStayDays: m.assumedStayDays ?? 0,
      dailyRoomRate: room && m.assumedStayDays ? Math.round(room / m.assumedStayDays) : undefined,
      byCategory,
    },
  };
}

export function analyse(db: DB, caseId: string, documentId: string, refs: ReferencePrice[] = REFERENCE_PRICES): Analysis | { error: string } {
  const doc = db.prepare("SELECT id, type, status, meta FROM documents WHERE id = ? AND case_id = ?").get(documentId, caseId) as DocRow | undefined;
  if (!doc) return { error: "unknown document" };
  if (doc.status !== "parsed") return { error: "document needs re-upload before it can be explained" };
  if (doc.type === "estimate") return { error: "this is the estimate; upload a bill to compare" };
  const est = latestEstimate(db, caseId);
  if (!est) return { error: "no estimate on file; upload the estimate first" };

  const meta = JSON.parse(doc.meta);
  const items = loadItems(db, documentId);
  const actualStayDays = meta.actualStayDays ?? est.estimate.assumedStayDays;
  const comparison = compare(items, est.estimate, actualStayDays, refs);

  const codesOf = (pred: (i: StoredItem) => boolean) => items.filter(pred).map((i) => i.code);
  const causes: CitedCause[] = comparison.causes.map((c, n) => ({
    ref: `C${n + 1}`,
    cause: c,
    itemIds: c.kind === "longer_stay" ? codesOf((i) => i.category === "room" && /per day/i.test(i.description)) : codesOf((i) => i.category === c.category),
  }));
  if (causes[0]?.cause.kind === "longer_stay" && causes[0].itemIds.length === 0) causes[0].itemIds = codesOf((i) => i.category === "room");

  const questions: Question[] = [];
  const seen = new Map<string, string>();
  for (const i of items) {
    const k = `${i.category}|${i.description.trim().toLowerCase()}|${i.unitPrice}`;
    const first = seen.get(k);
    if (first) questions.push({ kind: "duplicate", itemIds: [first, i.code], text: `"${i.description}" appears twice at the same price. Was it done twice, or billed twice?` });
    else seen.set(k, i.code);
  }
  for (const f of comparison.flags) {
    if (f.kind === "basic_item_billed") {
      questions.push({ kind: "basic_item_billed", itemIds: codesOf((i) => i.description === f.description), text: `Why is "${f.description}" billed separately instead of being part of the room or nursing charge?` });
    } else if (f.kind === "above_reference") {
      questions.push({
        kind: "above_reference",
        itemIds: codesOf((i) => i.description === f.description),
        text: `"${f.description}" is billed at ${f.unitPrice / 100} per unit, above the indicative reference of ${f.reference / 100}. Can the hospital explain the price?`,
      });
    }
  }
  return { documentId, currency: est.currency, estimate: est.estimate, actualStayDays, comparison, items, causes, questions, statedReasons: meta.statedReasons ?? [] };
}

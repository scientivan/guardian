import { z } from "zod";
import { chat, type ModelRef } from "./llm";
import type { Analysis, CitedCause } from "./analysis";

// Planner, explanation part. It sees only typed facts from code (never raw
// document text) and writes plain-language lines. Code then checks every line:
// citations must exist, numbers must come from the facts, and no clinical
// cause may appear unless the document states it. Lines that fail are dropped;
// any cause left unexplained gets a fixed template line, so nothing is lost.

export type LineType = "arithmetic_fact" | "stated_in_document" | "unknown_ask_hospital";
export interface ExplanationLine {
  type: LineType;
  text: string;
  itemIds: string[];
  amount?: number;
}

export interface Explanation {
  currency: string;
  total: number;
  estimate: { low: number; high: number; assumedStayDays: number };
  actualStayDays: number;
  byCategory: Record<string, number>;
  lines: ExplanationLine[];
  questions: Analysis["questions"];
  dropped: { line: unknown; reason: string }[];
  model: ModelRef | null;
  referenceNote: string;
}

const Draft = z.object({
  lines: z
    .array(
      z.object({
        type: z.enum(["arithmetic_fact", "stated_in_document", "unknown_ask_hospital"]),
        causeRef: z.string().nullable().optional(),
        statedRef: z.string().nullable().optional(),
        itemIds: z.array(z.string()).max(40).default([]),
        text: z.string().min(1).max(400),
      }),
    )
    .max(20),
});

const CLINICAL = /\b(infect\w*|complicat\w*|sepsis|abscess|perforat\w*|bleed\w*|haemorrhag\w*|hemorrhag\w*|pneumonia|fever|rupture\w*|peritonitis|inflamm\w*|readmi\w*)\b/gi;

const money = (fen: number) => (fen / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function causeText(c: CitedCause, currency: string): string {
  const x = c.cause;
  if (x.kind === "longer_stay") return `The stay is ${x.extraDays} days longer than the estimate assumed, adding ${currency} ${money(x.amount)} in daily room and care charges.`;
  if (x.kind === "category_over") return `${cap(x.category)} charges are ${currency} ${money(x.amount)} above the estimate.`;
  return `${cap(x.category)} charges of ${currency} ${money(x.amount)} were not part of the estimate.`;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function facts(a: Analysis) {
  return {
    currency: a.currency,
    estimate: { low: money(a.estimate.low), high: money(a.estimate.high), assumedStayDays: a.estimate.assumedStayDays },
    actualStayDays: a.actualStayDays,
    total: money(a.comparison.total),
    overEstimateHigh: money(a.comparison.overHigh),
    causes: a.causes.map((c) => ({ ref: c.ref, ...c.cause, amount: money(c.cause.amount), itemIds: c.itemIds })),
    statedInDocument: a.statedReasons.map((s, n) => ({ ref: `S${n + 1}`, text: s })),
    questionsForHospital: a.questions.map((q) => ({ kind: q.kind, itemIds: q.itemIds })),
    items: a.items.map((i) => ({ id: i.code, category: i.category, description: i.description, qty: i.qty, lineTotal: money(i.lineTotal) })),
  };
}

const SYSTEM = `You explain a foreign hospital bill to the patient's family in plain, calm language. You do not accuse the hospital and you give no medical advice.
You receive FACTS as JSON computed by code. Use only these facts.

Return JSON: {"lines":[{"type","causeRef","statedRef","itemIds","text"}]}
- "arithmetic_fact": explains one entry of facts.causes. Set causeRef to its ref. Use its amount exactly as given.
- "stated_in_document": repeats one entry of facts.statedInDocument. Set statedRef and the itemIds it concerns.
- "unknown_ask_hospital": something the facts cannot explain; tell the family what to ask the hospital.
Rules:
- Every line cites itemIds from facts.items.
- Use only numbers that appear in FACTS. Do not add, subtract or estimate.
- Never name a medical reason (infection, complication, etc.) unless it appears in statedInDocument. If the facts do not say why the stay was longer, say the bill does not state the reason and suggest asking the hospital.
- One line per cause, at most 10 lines, each under 40 words.`;

export async function explain(a: Analysis, language: "en" | "id" = "en", opts: { fetchImpl?: typeof fetch } = {}): Promise<Explanation> {
  const f = facts(a);
  const itemIds = new Set(a.items.map((i) => i.code));
  const allowedNumbers = new Set<string>();
  const addNum = (s: string | number) => allowedNumbers.add(String(s).replace(/,/g, "").replace(/\.0+$/, ""));
  [f.estimate.low, f.estimate.high, f.estimate.assumedStayDays, f.actualStayDays, f.total, f.overEstimateHigh].forEach(addNum);
  for (const c of f.causes) {
    addNum(c.amount);
    if ("extraDays" in c) addNum(c.extraDays);
  }
  for (const i of a.items) {
    addNum(money(i.lineTotal));
    addNum(money(i.unitPrice));
    addNum(i.qty);
  }
  for (const s of a.statedReasons) for (const n of s.match(/\d+(?:[.,]\d+)?/g) ?? []) addNum(n);
  const statedText = a.statedReasons.join(" ").toLowerCase();

  const dropped: Explanation["dropped"] = [];
  const lines: ExplanationLine[] = [];
  const covered = new Set<string>();
  let model: ModelRef | null = null;

  const userMsg = `Language for "text": ${language === "id" ? "Indonesian (Bahasa Indonesia)" : "English"}.\nFACTS:\n${JSON.stringify(f)}`;
  try {
    const r = await chat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      { json: true, accept: (t) => Draft.safeParse(safeJson(t)).success, fetchImpl: opts.fetchImpl },
    );
    model = r.used;
    for (const l of Draft.parse(safeJson(r.text)).lines) {
      const ids = l.itemIds.filter((x) => itemIds.has(x));
      const textNoCodes = l.text.replace(/\b[A-Z]\d{2}\b/g, "");
      const badNum = (textNoCodes.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).find((n) => !allowedNumbers.has(n.replace(/,/g, "").replace(/\.0+$/, "")));
      const clinical = (l.text.match(CLINICAL) ?? []).find((w) => !statedText.includes(w.toLowerCase().slice(0, 6)));
      const cause = l.causeRef ? a.causes.find((c) => c.ref === l.causeRef) : undefined;

      let reason: string | null = null;
      if (badNum) reason = `number ${badNum} is not in the facts`;
      else if (clinical) reason = `names a clinical cause ("${clinical}") the document does not state`;
      else if (l.type === "arithmetic_fact" && !cause) reason = "arithmetic line without a valid causeRef";
      else if (l.type === "stated_in_document" && !(l.statedRef && /^S(\d+)$/.test(l.statedRef) && Number(l.statedRef.slice(1)) <= a.statedReasons.length)) reason = "stated line without a valid statedRef";
      else if (l.type === "arithmetic_fact" && cause && covered.has(cause.ref)) reason = "duplicate line for the same cause";
      const cited = ids.length ? ids : cause?.itemIds ?? [];
      if (!reason && cited.length === 0) reason = "no item citation";
      if (reason) {
        dropped.push({ line: l, reason });
        continue;
      }
      if (cause) covered.add(cause.ref);
      lines.push({ type: l.type, text: l.text, itemIds: cited, ...(cause ? { amount: cause.cause.amount } : {}) });
    }
  } catch (e) {
    dropped.push({ line: null, reason: `planner unavailable: ${(e as Error).message.slice(0, 120)}` });
  }

  // Fallback: every cause gets a line, written by code if the model skipped it.
  for (const c of a.causes) {
    if (!covered.has(c.ref)) lines.push({ type: "arithmetic_fact", text: causeText(c, a.currency), itemIds: c.itemIds, amount: c.cause.amount });
  }

  return {
    currency: a.currency,
    total: a.comparison.total,
    estimate: { low: a.estimate.low, high: a.estimate.high, assumedStayDays: a.estimate.assumedStayDays },
    actualStayDays: a.actualStayDays,
    byCategory: a.comparison.byCategory,
    lines,
    questions: a.questions,
    dropped,
    model,
    referenceNote: "Reference prices are indicative demo values, not regulated prices. A price above reference is a question, not proof of overcharging.",
  };
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
}

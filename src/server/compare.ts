// Deterministic bill comparator. All money math lives here, never in the LLM.

export type Category = "room" | "drug" | "procedure" | "lab" | "consumable" | "other";

export interface Item {
  category: Category;
  description: string;
  qty: number;
  unitPrice: number; // minor units
}

export interface Estimate {
  low: number;
  high: number;
  assumedStayDays: number;
  dailyRoomRate?: number;
  byCategory?: Partial<Record<Category, number>>;
}

export interface ReferencePrice {
  match: RegExp;
  maxUnitPrice: number;
}

export type Flag =
  | { kind: "duplicate"; description: string }
  | { kind: "basic_item_billed"; description: string }
  | { kind: "above_reference"; description: string; unitPrice: number; reference: number };

export type Cause =
  | { kind: "longer_stay"; extraDays: number; amount: number }
  | { kind: "category_over"; category: Category; amount: number }
  | { kind: "not_in_estimate"; category: Category; amount: number };

export interface Comparison {
  total: number;
  byCategory: Record<Category, number>;
  overHigh: number;
  overLow: number;
  causes: Cause[];
  flags: Flag[];
}

// Items hospitals in the PAC 2026 hearing were criticised for billing separately.
const BASIC_ITEMS = /\b(pillow ?case|bed ?sheet|alcohol swab|cotton ball|tissue|gloves?|blanket)\b|枕套|床单|酒精棉/i;

const CATEGORIES: Category[] = ["room", "drug", "procedure", "lab", "consumable", "other"];

export function lineTotal(i: Pick<Item, "qty" | "unitPrice">): number {
  return Math.round(i.qty * i.unitPrice);
}

export function compare(items: Item[], est: Estimate, actualStayDays: number, refs: ReferencePrice[] = []): Comparison {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const i of items) byCategory[i.category] += lineTotal(i);
  const total = CATEGORIES.reduce((s, c) => s + byCategory[c], 0);

  const flags: Flag[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    const key = `${i.category}|${i.description.trim().toLowerCase()}|${i.unitPrice}`;
    if (seen.has(key)) flags.push({ kind: "duplicate", description: i.description });
    seen.add(key);
    if (BASIC_ITEMS.test(i.description)) flags.push({ kind: "basic_item_billed", description: i.description });
    const ref = refs.find((r) => r.match.test(i.description));
    if (ref && i.unitPrice > ref.maxUnitPrice) {
      flags.push({ kind: "above_reference", description: i.description, unitPrice: i.unitPrice, reference: ref.maxUnitPrice });
    }
  }

  const causes: Cause[] = [];
  const extraDays = actualStayDays - est.assumedStayDays;
  if (extraDays > 0 && est.dailyRoomRate) {
    causes.push({ kind: "longer_stay", extraDays, amount: extraDays * est.dailyRoomRate });
  }
  if (est.byCategory) {
    for (const c of CATEGORIES) {
      const planned = est.byCategory[c];
      let diff = byCategory[c] - (planned ?? 0);
      // Room overrun already explained by the longer stay is not double counted.
      if (c === "room" && extraDays > 0 && est.dailyRoomRate) diff -= extraDays * est.dailyRoomRate;
      if (diff <= 0) continue;
      causes.push(planned === undefined ? { kind: "not_in_estimate", category: c, amount: diff } : { kind: "category_over", category: c, amount: diff });
    }
  }

  return { total, byCategory, overHigh: Math.max(0, total - est.high), overLow: Math.max(0, total - est.low), causes, flags };
}

/** Splits a refund in proportion to what each member paid; remainder goes to the largest payer. */
export function splitRefund(refund: number, paid: Array<{ memberId: string; amount: number }>): Array<{ memberId: string; amount: number }> {
  const sum = paid.reduce((s, p) => s + p.amount, 0);
  if (refund <= 0 || sum === 0) return [];
  const parts = paid.map((p) => ({ memberId: p.memberId, amount: Math.floor((refund * p.amount) / sum) }));
  const rest = refund - parts.reduce((s, p) => s + p.amount, 0);
  const largest = paid.reduce((a, b) => (b.amount > a.amount ? b : a));
  parts.find((p) => p.memberId === largest.memberId)!.amount += rest;
  return parts;
}

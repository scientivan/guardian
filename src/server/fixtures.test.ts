import { describe, expect, it } from "vitest";
import { compare, lineTotal } from "./compare";
import { ESTIMATE, FINAL, INTERIM, INTERIM_ITEMS, REFERENCE_PRICES } from "./fixtures/demo-case";
import { D2_KEY, D5_KEY } from "./fixtures/answer-keys";

describe("fixtures agree with the hand-written answer keys", () => {
  const r = compare(INTERIM_ITEMS, ESTIMATE, INTERIM.actualStayDays, REFERENCE_PRICES);

  it("D2 totals and causes", () => {
    expect(INTERIM_ITEMS).toHaveLength(D2_KEY.itemCount);
    expect(r.total).toBe(D2_KEY.total);
    expect(INTERIM.statedTotal).toBe(D2_KEY.total);
    expect(r.byCategory).toMatchObject(D2_KEY.byCategory);
    expect(r.overHigh).toBe(D2_KEY.overHigh);
    expect(r.causes).toEqual(expect.arrayContaining(D2_KEY.causes));
    expect(r.causes).toHaveLength(D2_KEY.causes.length);
  });

  it("D3 flags", () => {
    expect(r.flags.filter((f) => f.kind === "duplicate").map((f) => f.description)).toEqual(D2_KEY.duplicates);
    expect(r.flags.filter((f) => f.kind === "basic_item_billed").map((f) => f.description)).toEqual(D2_KEY.basicItems);
    expect(r.flags.filter((f) => f.kind === "above_reference").map((f) => f.description)).toEqual(D2_KEY.aboveReference);
  });

  it("D5 final bill", () => {
    expect(FINAL.lines.reduce((s, l) => s + lineTotal(l), 0)).toBe(D5_KEY.finalTotal);
    expect(FINAL.depositsReceived - FINAL.statedTotal).toBe(D5_KEY.refund);
  });
});

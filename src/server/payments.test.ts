import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "./db";
import { DEMO, PORTAL_PAYEES, createRequest, seed } from "./seed";
import { recordApproval, resolvePayee, withdrawApproval } from "./gateway";
import { enrollFromSignedList } from "./enrollment";
import { fetchSignedPayeeList } from "./portal";
import { convert, createQuote } from "./fx";
import { cancelRequest, createPaymentRequest, executeRequest, expireDue, type ChargeInput, type Charger } from "./payments";

let db: DB;
const T0 = new Date("2026-10-18T02:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

function approve(requestId: string, memberId: string, amount: number, when = T0) {
  return recordApproval(db, requestId, memberId, amount, createQuote(db, requestId, memberId, amount, when).id, when);
}

function fakeCharger(failFor: string[] = []): Charger & { calls: ChargeInput[] } {
  const calls: ChargeInput[] = [];
  const f = (async (c: ChargeInput) => {
    calls.push(c);
    return failFor.includes(c.memberId) ? { ok: false as const, error: "card_declined" } : { ok: true as const, ref: `pi_fake_${c.memberId}` };
  }) as Charger & { calls: ChargeInput[] };
  f.calls = calls;
  return f;
}

beforeEach(() => {
  db = openDb(":memory:");
  seed(db, T0);
});

describe("signed payee enrollment", () => {
  it("seeds the registry only through a verified signed list", () => {
    const p = db.prepare("SELECT source FROM payees WHERE id = 'P1'").get() as { source: string };
    expect(p.source).toBe("official_registry");
  });

  it("rejects a list whose contents were altered after signing", () => {
    const list = fetchSignedPayeeList("H1", PORTAL_PAYEES);
    list.payees = [{ ...list.payees[0], account: "6222 9999 8888 7777" }];
    expect(enrollFromSignedList(db, DEMO.case.id, "M_OWNER", list)).toMatchObject({ ok: false });
    expect(resolvePayee(db, DEMO.case.id, "planner", { account: "6222 9999 8888 7777", source: "chat" })).toMatchObject({ ok: false, check: 1 });
  });

  it("A8: a forged 'official invoice' account is matched, never enrolled", () => {
    // The invoice text claims a new hospital account; the planner can only pass it as a claim.
    const r = resolvePayee(db, DEMO.case.id, "planner", { account: "6222 5555 4444 3333", name: DEMO.payee.name, source: "hospital_doc" });
    expect(r).toMatchObject({ ok: false, check: 1 });
    expect(db.prepare("SELECT COUNT(*) n FROM payees").get()).toEqual({ n: 1 });
  });

  it("re-verifying through the portal closes the anomaly but keeps the disputed account out", () => {
    resolvePayee(db, DEMO.case.id, "planner", { account: "6222 9999 8888 7777", source: "chat" });
    const r = enrollFromSignedList(db, DEMO.case.id, "M_OWNER", fetchSignedPayeeList("H1", PORTAL_PAYEES));
    expect(r).toMatchObject({ ok: true, resolvedAnomalies: 1 });
    expect(resolvePayee(db, DEMO.case.id, "planner", { account: "6222 9999 8888 7777", source: "chat" }).ok).toBe(false);
  });
});

describe("FX quotes", () => {
  it("converts in integers with a 1% demo fee", () => {
    expect(convert(2_000_000, "CNY", "IDR")).toEqual({ payAmount: 4_590_000_000, rateE4: 22_950_000, fee: 45_900_000 });
    expect(convert(3_000_000, "CNY", "CNY")).toMatchObject({ payAmount: 3_000_000, fee: 0 });
  });

  it("refuses an approval with someone else's quote, a different amount, or an expired quote", () => {
    createRequest(db, "R1", 5_000_000, "guarantee", "P1", T0);
    const q = createQuote(db, "R1", "M_KL", 1_000_000, T0);
    expect(recordApproval(db, "R1", "M_JKT", 1_000_000, q.id, T0)).toMatchObject({ ok: false, check: 4 });
    expect(recordApproval(db, "R1", "M_KL", 900_000, q.id, T0)).toMatchObject({ ok: false, check: 4 });
    expect(recordApproval(db, "R1", "M_KL", 1_000_000, q.id, at(16))).toMatchObject({ ok: false, check: 4 });
    expect(recordApproval(db, "R1", "M_KL", 1_000_000, q.id, at(1)).ok).toBe(true);
  });
});

describe("D4 per-helper charges", () => {
  it("charges each share separately in the helper's currency and marks the request paid", async () => {
    createRequest(db, "R2", 5_000_000, "emergency guarantee", "P1", T0);
    approve("R2", "M_JKT", 2_000_000);
    approve("R2", "M_KL", 1_500_000);
    approve("R2", "M_DXB", 1_000_000);
    const charger = fakeCharger();
    expect(await executeRequest(db, "R2", "M_OWNER", charger, T0)).toMatchObject({ ok: false, check: 4 });
    expect(charger.calls).toHaveLength(0);

    approve("R2", "M_MOSQUE", 500_000);
    const r = await executeRequest(db, "R2", "M_OWNER", charger, T0);
    expect(r).toMatchObject({ ok: true, status: "paid" });
    expect(charger.calls.map((c) => [c.memberId, c.currency])).toEqual([["M_JKT", "IDR"], ["M_KL", "MYR"], ["M_DXB", "AED"], ["M_MOSQUE", "IDR"]]);
    expect(charger.calls[1].amount).toBe(convert(1_500_000, "CNY", "MYR").payAmount + convert(1_500_000, "CNY", "MYR").fee);
    expect(new Set(charger.calls.map((c) => c.payeeId))).toEqual(new Set(["P1"]));

    // Paid requests cannot be executed twice or withdrawn from.
    expect(await executeRequest(db, "R2", "M_OWNER", charger, T0)).toMatchObject({ ok: false });
    expect(withdrawApproval(db, "R2", "M_JKT", T0)).toMatchObject({ ok: false, check: 3 });
    expect(charger.calls).toHaveLength(4);
  });

  it("marks the request failed and shows per-share status when one charge fails", async () => {
    createRequest(db, "R3", 3_000_000, "top-up", "P1", T0);
    approve("R3", "M_JKT", 2_000_000);
    approve("R3", "M_DXB", 1_000_000);
    const r = await executeRequest(db, "R3", "M_OWNER", fakeCharger(["M_DXB"]), T0);
    expect(r.status).toBe("failed");
    expect(r.charges?.map((c) => c.status)).toEqual(["charged", "charge_failed"]);
  });
});

describe("D4b withdraw and expiry", () => {
  it("withdrawal lowers coverage; at expiry nothing is charged", async () => {
    createRequest(db, "R4", 3_000_000, "guarantee", "P1", T0, 60);
    approve("R4", "M_JKT", 2_000_000);
    approve("R4", "M_DXB", 1_000_000);
    expect(withdrawApproval(db, "R4", "M_DXB", at(5)).ok).toBe(true);
    const charger = fakeCharger();
    expect(await executeRequest(db, "R4", "M_OWNER", charger, at(6))).toMatchObject({ ok: false, check: 4 });

    expect(expireDue(db, at(61))).toEqual(["R4"]);
    expect(await executeRequest(db, "R4", "M_OWNER", charger, at(62))).toMatchObject({ ok: false });
    expect(approve("R4", "M_DXB", 1_000_000, at(62))).toMatchObject({ ok: false, check: 3 });
    expect(charger.calls).toHaveLength(0);
  });

  it("a withdrawn member can approve again while pending", () => {
    createRequest(db, "R5", 1_000_000, "top-up", "P1", T0);
    approve("R5", "M_JKT", 1_000_000);
    withdrawApproval(db, "R5", "M_JKT", T0);
    expect(approve("R5", "M_JKT", 1_000_000).ok).toBe(true);
  });
});

describe("owner-only actions", () => {
  it("only the owner creates and cancels requests", () => {
    expect(createPaymentRequest(db, { caseId: "C1", actor: "M_JKT", payeeId: "P1", amount: 100, purpose: "x", expiresInMinutes: 60 }, T0)).toMatchObject({ ok: false, check: 3 });
    const c = createPaymentRequest(db, { caseId: "C1", actor: "M_OWNER", payeeId: "P1", amount: 100, purpose: "x", expiresInMinutes: 60 }, T0);
    expect(c.ok).toBe(true);
    expect(cancelRequest(db, c.id!, "M_COMP", T0)).toMatchObject({ ok: false });
    expect(cancelRequest(db, c.id!, "M_OWNER", T0).ok).toBe(true);
  });
});

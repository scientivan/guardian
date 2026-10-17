import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "./db";
import { DEMO, createRequest, seed } from "./seed";
import { authorizeExecution, recordApproval, resolvePayee } from "./gateway";
import { appendAudit, verifyChain } from "./audit";
import { compare, splitRefund, type Item } from "./compare";
import { restore, scrub, storeTokens } from "./pii";

let db: DB;
beforeEach(() => {
  db = openDb(":memory:");
  seed(db);
});

describe("D1 deposit to official account", () => {
  it("authorizes once the owner approves the full amount", () => {
    createRequest(db, "R1", 3_000_000, "initial deposit");
    expect(authorizeExecution(db, "R1").ok).toBe(false);
    // Owner has no share limit cap.
    expect(recordApproval(db, "R1", "M_OWNER", 3_000_000).ok).toBe(true);
    expect(authorizeExecution(db, "R1").ok).toBe(true);
  });
});

describe("D2/D3 bill comparator", () => {
  const items: Item[] = [
    { category: "room", description: "Ward bed per day", qty: 5, unitPrice: 120_000 },
    { category: "procedure", description: "Appendectomy", qty: 1, unitPrice: 2_500_000 },
    { category: "drug", description: "Ceftriaxone 1g", qty: 6, unitPrice: 15_000 },
    { category: "consumable", description: "Pillow case", qty: 5, unitPrice: 2_000 },
    { category: "consumable", description: "Alcohol swab", qty: 20, unitPrice: 500 },
    { category: "lab", description: "CBC", qty: 1, unitPrice: 30_000 },
    { category: "lab", description: "CBC", qty: 1, unitPrice: 30_000 },
  ];
  const est = { low: 3_000_000, high: 3_400_000, assumedStayDays: 3, dailyRoomRate: 120_000, byCategory: { room: 360_000, procedure: 2_500_000, drug: 60_000, lab: 30_000 } };

  it("explains the longer stay and flags basic items and duplicates", () => {
    const r = compare(items, est, 5);
    expect(r.total).toBe(600_000 + 2_500_000 + 90_000 + 10_000 + 10_000 + 60_000);
    expect(r.causes).toContainEqual({ kind: "longer_stay", extraDays: 2, amount: 240_000 });
    expect(r.causes.find((c) => c.kind === "category_over" && c.category === "room")).toBeUndefined();
    expect(r.causes).toContainEqual({ kind: "not_in_estimate", category: "consumable", amount: 20_000 });
    expect(r.flags.filter((f) => f.kind === "basic_item_billed").map((f) => f.description)).toEqual(["Pillow case", "Alcohol swab"]);
    expect(r.flags).toContainEqual({ kind: "duplicate", description: "CBC" });
  });
});

describe("D4 emergency guarantee from many helpers", () => {
  it("holds payment until approvals cover the amount", () => {
    createRequest(db, "R2", 5_000_000, "emergency guarantee");
    for (const [m, a] of [["M_JKT", 2_000_000], ["M_KL", 1_500_000], ["M_DXB", 1_000_000]] as const) {
      expect(recordApproval(db, "R2", m, a).ok).toBe(true);
      expect(authorizeExecution(db, "R2").ok).toBe(false);
    }
    expect(recordApproval(db, "R2", "M_MOSQUE", 500_000).ok).toBe(true);
    expect(authorizeExecution(db, "R2").ok).toBe(true);
  });
});

describe("D5 refund split", () => {
  it("splits proportionally and conserves the total", () => {
    const parts = splitRefund(900_000, [
      { memberId: "A", amount: 4_000_000 },
      { memberId: "B", amount: 3_000_000 },
      { memberId: "C", amount: 1_000_000 },
    ]);
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBe(900_000);
    expect(parts).toEqual([
      { memberId: "A", amount: 450_000 },
      { memberId: "B", amount: 337_500 },
      { memberId: "C", amount: 112_500 },
    ]);
  });
});

describe("A1/A6 changed-account message", () => {
  it("rejects an account from chat and blocks later payments until resolved", () => {
    const r = resolvePayee(db, DEMO.case.id, "planner", { account: "6222 9999 8888 7777", source: "chat" });
    expect(r).toMatchObject({ ok: false, check: 1 });
    createRequest(db, "R3", 1_000_000, "top-up");
    recordApproval(db, "R3", "M_OWNER", 1_000_000);
    expect(authorizeExecution(db, "R3")).toMatchObject({ ok: false, check: 5 });
  });
});

describe("A3 homoglyph and invisible characters", () => {
  it("rejects a Cyrillic look-alike name", () => {
    const fake = "Shenzhen Internatiоnal Hospital (demo)"; // Cyrillic о
    expect(resolvePayee(db, DEMO.case.id, "planner", { payeeId: "P1", name: fake, source: "hospital_doc" })).toMatchObject({ ok: false, check: 2 });
  });
  it("rejects a zero-width character", () => {
    const fake = "Shenzhen International​ Hospital (demo)";
    expect(resolvePayee(db, DEMO.case.id, "planner", { payeeId: "P1", name: fake, source: "hospital_doc" })).toMatchObject({ ok: false, check: 2 });
  });
  it("accepts the exact official name", () => {
    expect(resolvePayee(db, DEMO.case.id, "planner", { payeeId: "P1", name: DEMO.payee.name, source: "hospital_doc" }).ok).toBe(true);
  });
});

describe("A4 privilege escalation", () => {
  beforeEach(() => createRequest(db, "R4", 5_000_000, "top-up"));
  it("companion cannot approve", () => {
    expect(recordApproval(db, "R4", "M_COMP", 100_000)).toMatchObject({ ok: false, check: 3 });
  });
  it("payer cannot exceed own share limit", () => {
    expect(recordApproval(db, "R4", "M_DXB", 1_000_001)).toMatchObject({ ok: false, check: 4 });
  });
  it("unknown member cannot approve", () => {
    expect(recordApproval(db, "R4", "M_ATTACKER", 100)).toMatchObject({ ok: false, check: 3 });
  });
});

describe("A7 owner forces an unverified account", () => {
  it("is still rejected; there is no override", () => {
    expect(resolvePayee(db, DEMO.case.id, "M_OWNER", { account: "1234567890", source: "user" })).toMatchObject({ ok: false, check: 1 });
  });
});

describe("A5 PII scrubbing", () => {
  it("removes identifiers before the LLM and restores by role", () => {
    const raw = "Patient Budi Santoso, passport C1234567, MRN: SZ-889201, phone +62 812 3456 7890, DOB 1961-04-02";
    const s = scrub(raw, [{ value: "Budi Santoso", label: "PASIEN" }]);
    for (const v of ["Budi", "C1234567", "SZ-889201", "812", "1961"]) expect(s.text).not.toContain(v);
    storeTokens(db, DEMO.case.id, s);
    expect(restore(db, DEMO.case.id, s.text, "payer")).not.toContain("C1234567");
    expect(restore(db, DEMO.case.id, s.text, "owner")).toContain("C1234567");
  });
});

describe("audit hash chain", () => {
  it("detects tampering", () => {
    appendAudit(db, { caseId: "C1", actor: "x", action: "a", inputSources: ["user"], decision: "info", result: 1 });
    appendAudit(db, { caseId: "C1", actor: "x", action: "b", inputSources: ["user"], decision: "info", result: 2 });
    expect(verifyChain(db)).toBeNull();
    db.prepare("UPDATE audit_log SET result = '999' WHERE seq = 1").run();
    expect(verifyChain(db)).toBe(1);
  });
});

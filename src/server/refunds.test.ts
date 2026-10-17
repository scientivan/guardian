import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "./db";
import { createRequest, seed } from "./seed";
import { createQuote } from "./fx";
import { recordApproval } from "./gateway";
import { executeRequest, type Charger } from "./payments";
import { openRefunds, refundStatus, setRefundStatus } from "./refunds";
import { recap } from "./recap";
import { advanceClock, now } from "./clock";
import { FINAL } from "./fixtures/demo-case";
import { D5_KEY } from "./fixtures/answer-keys";

let db: DB;
const ok: Charger = async (c) => ({ ok: true, ref: `pi_fake_${c.requestId}_${c.memberId}` });

async function pay(id: string, amount: number, shares: [string, number][]) {
  createRequest(db, id, amount, id === "R1" ? "initial deposit" : "emergency guarantee");
  for (const [m, a] of shares) recordApproval(db, id, m, a, createQuote(db, id, m, a, new Date()).id);
  expect((await executeRequest(db, id, "M_OWNER", ok)).status).toBe("paid");
}

beforeEach(async () => {
  db = openDb(":memory:");
  seed(db);
  await pay("R1", 3_000_000, [["M_OWNER", 3_000_000]]);
  await pay("R2", 5_000_000, [["M_JKT", 2_000_000], ["M_KL", 1_500_000], ["M_DXB", 1_000_000], ["M_MOSQUE", 500_000]]);
  db.prepare("INSERT INTO documents (id, case_id, type, sha256, meta, created_at) VALUES ('DF','C1','final','f','{}',?)").run(new Date().toISOString());
  const ins = db.prepare("INSERT INTO bill_items (document_id, code, category, description, qty, unit_price) VALUES ('DF', ?, ?, ?, ?, ?)");
  for (const l of FINAL.lines) ins.run(l.id, l.category, l.description, l.qty, l.unitPrice);
});

describe("D5 refund", () => {
  it("splits CNY 9,000 by share paid, conserves the total, and reminds once when overdue", () => {
    const r = openRefunds(db, "C1", "DF", now(db));
    expect(r).toMatchObject({ ok: true, refund: D5_KEY.refund });
    const s = refundStatus(db, "C1", now(db));
    expect(s.totalRefund).toBe(D5_KEY.refund);
    expect(Object.fromEntries(s.items.map((i) => [i.memberId, i.amount]))).toEqual({
      M_OWNER: 337_500, M_JKT: 225_000, M_KL: 168_750, M_DXB: 112_500, M_MOSQUE: 56_250,
    });
    expect(s.items.every((i) => i.status === "requested" && !i.overdue)).toBe(true);

    setRefundStatus(db, "C1", "M_JKT", "received");
    advanceClock(db, 15 * 86_400_000);
    const late = refundStatus(db, "C1", now(db));
    expect(late.remindersSent.sort()).toEqual(["M_DXB", "M_KL", "M_MOSQUE", "M_OWNER"]);
    expect(refundStatus(db, "C1", now(db)).remindersSent).toEqual([]);
    expect(setRefundStatus(db, "C1", "M_JKT", "processing").ok).toBe(false);
    expect(openRefunds(db, "C1", "DF").ok).toBe(false);
  });

  it("recap shows each member's payments, receipts, refund share and document hashes", () => {
    openRefunds(db, "C1", "DF");
    const r = recap(db, "C1", "M_KL")!;
    expect(r.paidTotal).toBe(1_500_000);
    expect(r.payments[0]).toMatchObject({ requestId: "R2", payCurrency: "MYR", chargeRef: "pi_fake_R2_M_KL", status: "charged" });
    expect(r.refund).toMatchObject({ amount: 168_750, status: "requested" });
    expect(r.documents).toEqual([expect.objectContaining({ id: "DF", sha256: "f" })]);
  });
});

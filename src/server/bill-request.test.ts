import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { caseAccess } from "./access";
import { Integration } from "./integration";
import { openAnomaly } from "./gateway";

let dir: string;
const demo: Session = { user: { id: "demo:bill-request", name: "Rina", mode: "demo" }, expires: "2099-01-01" };
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "guardian-billreq-")); vi.stubEnv("GUARDIAN_ACCOUNTS_DIR", dir); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

describe("payment request for an uploaded bill", () => {
  it("pays the latest bill's balance after deposits, and deposits come from the estimate range", () => {
    const c = caseAccess(demo, "C1", "M_OWNER");
    try {
      const api = new Integration(c);
      const payeeId = api.view().case.payees[0].id;
      const docs = api.view().documents;
      const interim = docs.find(d => d.type === "interim")!, final = docs.find(d => d.type === "final")!, estimate = docs.find(d => d.type === "estimate")!;
      // Final bill CNY 71,000 replaces the interim one; R1 30,000 paid + R2 50,000 pending = 80,000 committed.
      expect(() => api.createRequest({ payeeId, amount: 100, purpose: "Old bill", documentId: interim.id })).toThrow("newer bill");
      expect(() => api.createRequest({ payeeId, amount: 100, purpose: "Final", documentId: final.id })).toThrow("already cover");
      expect(() => api.createRequest({ payeeId, amount: 3_100_000, purpose: "Deposit", documentId: estimate.id })).toThrow("lower or upper end");
      const deposit = api.createRequest({ payeeId, amount: estimate.estimate!.high, purpose: "Initial deposit", documentId: estimate.id }) as { id: string };
      expect(api.view().requests.find(r => r.id === deposit.id)?.documentId).toBe(estimate.id);
    } finally { c.close(); }
  });

  it("confirming the official account list clears a warning from a document with hidden instructions (F11)", async () => {
    const c = caseAccess(demo, "C1", "M_OWNER");
    try {
      openAnomaly(c.db, "C1", "document_instructions", "document contains instruction-like text addressed to the assistant");
      const api = new Integration(c);
      expect(api.view().case.anomalies.some(a => !a.resolved)).toBe(true);
      expect((await api.verifyPayees()).resolvedAnomalies).toBeGreaterThan(0);
      expect(api.view().case.anomalies.some(a => !a.resolved)).toBe(false);
    } finally { c.close(); }
  });

  it("the owner changes a helper's limit in their own currency; others cannot", () => {
    const owner = caseAccess(demo, "C1", "M_OWNER");
    try {
      const r = new Integration(owner).setShareLimit("M_JKT", { shareLimit: 459_000_000, limitCurrency: "IDR" }); // IDR 4,590,000
      expect(r.shareLimit).toBe(200_000); // CNY 2,000
      expect(() => new Integration(owner).setShareLimit("M_COMP", { shareLimit: 100 })).toThrow("Only helpers");
    } finally { owner.close(); }
    const helper = caseAccess(demo, "C1", "M_KL");
    try { expect(() => new Integration(helper).setShareLimit("M_JKT", { shareLimit: 1 })).toThrow(); } finally { helper.close(); }
  });
});


import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { caseAccess } from "./access";
import { Integration } from "./integration";

let dir: string;
const demo: Session = { user: { id: "demo:bill-request", name: "Rina", mode: "demo" }, expires: "2099-01-01" };
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "guardian-billreq-")); vi.stubEnv("GUARDIAN_ACCOUNTS_DIR", dir); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

describe("payment request for an uploaded bill", () => {
  it("asks up to the bill's open balance, links the bill, and refuses more", () => {
    const c = caseAccess(demo, "C1", "M_OWNER");
    try {
      const api = new Integration(c);
      const bill = api.view().documents.find(d => d.type === "interim")!;
      const payeeId = api.view().case.payees[0].id;
      const first = api.createRequest({ payeeId, amount: 1_000_000, purpose: "Part of the interim bill", documentId: bill.id }) as { id: string };
      expect(api.view().requests.find(r => r.id === first.id)?.documentId).toBe(bill.id);
      expect(() => api.createRequest({ payeeId, amount: bill.total!, purpose: "Too much", documentId: bill.id })).toThrow("left to pay");
      expect(() => api.createRequest({ payeeId, amount: 100, purpose: "Estimate", documentId: api.view().documents.find(d => d.type === "estimate")!.id })).toThrow("not an estimate");
    } finally { c.close(); }
  });
});

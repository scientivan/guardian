import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { caseAccess, invitation, invitationById, invite, receivedInvitations } from "./access";
import { ownerDatabase, WorkspaceStore } from "./workspace";

let dir: string;
const google = (id: string, email: string): Session => ({ user: { id, name: id, email, mode: "google" }, expires: "2099-01-01" });
const owner = google("owner", "owner@example.com");
const helper = google("helper", "helper@example.com");
const other = google("other", "other@example.com");

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "guardian-invites-")); vi.stubEnv("GUARDIAN_ACCOUNTS_DIR", dir); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

function newCase() {
  const db = ownerDatabase(owner.user.id);
  try { return new WorkspaceStore(db, "google", "Owner").create({ patientName: "Ivan", hospitalName: "Shenzhen Hospital", country: "China", currency: "CNY", ownerName: "Dien" }).case.id; }
  finally { db.close(); }
}
function send(caseId: string, input: Partial<Parameters<typeof invite>[1]>) {
  const c = caseAccess(owner, caseId);
  try { return invite(c, { name: "Adi", role: "payer", currency: "IDR", shareLimit: 500000, ...input }); } finally { c.close(); }
}

describe("invitation requests", () => {
  it("an email invite appears only in the invited account's list, with the case brief", () => {
    const caseId = newCase();
    send(caseId, { email: "Helper@Example.com", delivery: "email" });
    expect(receivedInvitations(other)).toEqual([]);
    const [request] = receivedInvitations(helper);
    expect(request).toMatchObject({ caseId, patientName: "Ivan", hospitalName: "Shenzhen Hospital", inviter: "Dien", role: "payer", shareLimit: 500000, currency: "IDR", delivery: "email" });
    invitationById(helper, request.id, "accept");
    expect(receivedInvitations(helper)).toEqual([]);
    const shared = caseAccess(helper, caseId);
    try { expect(shared.member.role).toBe("payer"); } finally { shared.close(); }
  });

  it("a declined request leaves the list and cannot be opened again", () => {
    const caseId = newCase();
    send(caseId, { email: "helper@example.com" });
    const [request] = receivedInvitations(helper);
    invitationById(helper, request.id, "decline");
    expect(receivedInvitations(helper)).toEqual([]);
    expect(() => invitationById(helper, request.id)).toThrow("declined");
  });

  it("a link invite works for any Google account, once", () => {
    const caseId = newCase();
    const token = send(caseId, { delivery: "link" });
    expect(receivedInvitations(helper)).toEqual([]);
    expect(invitation(other, token)).toMatchObject({ patientName: "Ivan", delivery: "link", accepted: false });
    invitation(other, token, true);
    expect(() => invitation(helper, token, true)).toThrow("already been used");
  });

  it("an email invite cannot be opened by another account through its link", () => {
    const token = send(newCase(), { email: "helper@example.com" });
    expect(() => invitation(other, token)).toThrow("not available");
  });

  it("requires an email for an email invite and refuses the owner's own address", () => {
    const caseId = newCase();
    expect(() => send(caseId, { delivery: "email" })).toThrow("Google email");
    expect(() => send(caseId, { email: "owner@example.com" })).toThrow("your own account");
  });

  it("stores a limit given in the owner's currency in the hospital currency, and the helper picks how they pay", () => {
    const caseId = newCase();
    send(caseId, { email: "helper@example.com", shareLimit: 1_147_500_000, limitCurrency: "IDR" }); // IDR 11,475,000
    const [request] = receivedInvitations(helper);
    expect(request.shareLimit).toBe(500_000); // CNY 5,000
    expect(request.currencies).toContain("AED");
    expect(() => invitationById(helper, request.id, "accept", "EUR")).toThrow("Choose one of");
    invitationById(helper, request.id, "accept", "AED");
    const shared = caseAccess(helper, caseId);
    try { expect(shared.member).toMatchObject({ currency: "AED", shareLimit: 500_000 }); } finally { shared.close(); }
  });
});


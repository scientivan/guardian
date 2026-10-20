import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";
import type { HospitalProfile } from "@/lib/hospitals";

const found: { profile: Partial<HospitalProfile> } = { profile: {} };
vi.mock("./hospital-ai", () => ({
  discoverHospital: vi.fn(async () => ({ profile: found.profile, sources: [{ url: "https://authority.example/north", title: "Authority", retrievedAt: new Date().toISOString(), excerpt: "listing" }], uncertainties: [], model: "test:model", complete: true })),
  checkHospitalEvidence: vi.fn(), retrieveHospitalSource: vi.fn(),
}));
const { hospitalDispatch } = await import("./hospital-api");
const { openHospitalDirectory } = await import("./hospital-directory");
const { ownerDatabase, WorkspaceStore } = await import("./workspace");

const family: Session = { user: { id: "family", name: "Family", email: "family@example.com", mode: "google" }, expires: "2099-01-01" };
const demo: Session = { user: { id: "demo:x", name: "Rina", mode: "demo" }, expires: "2099-01-01" };
const complete: Partial<HospitalProfile> = { name: "North Medical Hospital", branch: "", city: "Shenzhen", address: "1 Hospital Avenue, Central District", phone: "+86 755 12345678", website: "https://hospital.example" };
let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "guardian-request-")); vi.stubEnv("GUARDIAN_ACCOUNTS_DIR", dir); found.profile = complete; });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

const ask = (session: Session, body: object) => hospitalDispatch(new NextRequest("http://localhost/api/hospitals/request", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), ["hospitals", "request"], session);

describe("adding a hospital from the care case wizard", () => {
  it("AI fills the profile from name and location; it waits for human review and is not selectable", async () => {
    const res = await ask(family, { name: "North Medical Hospital", country: "China", city: "Shenzhen" });
    expect(res.status).toBe(200);
    const { review } = await res.json();
    const directory = openHospitalDirectory();
    try {
      expect(directory.review(review.id)).toMatchObject({ status: "pending", kind: "profile", createdBy: "family@example.com", discoveryModel: "test:model" });
      expect(directory.hospital(review.hospitalId).profileStatus).toBe("draft");
      expect(directory.published().some(h => h.id === review.hospitalId)).toBe(false);
    } finally { directory.close(); }
    const db = ownerDatabase(family.user.id);
    try { expect(() => new WorkspaceStore(db, "google", "Family").create({ patientName: "Ivan", hospitalName: "North Medical Hospital", hospitalDirectoryId: review.hospitalId, country: "China", currency: "IDR", ownerName: "Dien" })).toThrow("listed or verified"); }
    finally { db.close(); }
  });

  it("asking again for the same hospital returns the same pending review", async () => {
    const first = await (await ask(family, { name: "North Medical Hospital", country: "China", city: "Shenzhen" })).json();
    const again = await (await ask(family, { name: "north medical  hospital", country: "China", city: "shenzhen" })).json();
    expect(again.review.id).toBe(first.review.id);
  });

  it("refuses incomplete AI drafts, invalid names and demo accounts", async () => {
    found.profile = { name: "North Medical Hospital" };
    await expect(ask(family, { name: "North Medical Hospital", country: "China", city: "Shenzhen" })).rejects.toThrow("enough public details");
    await expect(ask(family, { name: "12345", country: "China", city: "Shenzhen" })).rejects.toThrow();
    await expect(ask(demo, { name: "North Medical Hospital", country: "China", city: "Shenzhen" })).rejects.toThrow("Google");
  });
});

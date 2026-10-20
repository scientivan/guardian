import { afterEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "./db";
import { WorkspaceStore } from "./workspace";

const databases: DB[] = [];
function store(mode: "google" | "demo") {
  const db = openDb(":memory:");
  databases.push(db);
  return new WorkspaceStore(db, mode, "Test user");
}
afterEach(() => databases.splice(0).forEach(db => db.close()));

describe("account workspace separation", () => {
  it("starts Google accounts empty and never supplies C1", () => {
    const account = store("google");
    expect(account.list().cases).toEqual([]);
    expect(() => account.get("C1")).toThrow("not found");
  });
  it("seeds each demo session separately", () => {
    const first = store("demo");
    const second = store("demo");
    const data = first.get("C1");
    data.case.patient.name = "Changed in first session";
    first.save(data);
    expect(second.get("C1").case.patient.name).toBe("Budi Santoso");
    expect(second.get("C1").documents.length).toBeGreaterThan(0);
  });
  it("keeps created cases private to the owning Google account", () => {
    const first = store("google");
    const second = store("google");
    const created = first.create({ patientName: "A patient", hospitalName: "A hospital", country: "Malaysia", currency: "IDR", ownerName: "An owner" });
    expect(first.get(created.case.id).case.patient.name).toBe("A patient");
    expect(() => second.get(created.case.id)).toThrow("not found");
    expect(created.case.payees).toEqual([]);
    expect(created.requests).toEqual([]);
    expect(created.explanation).toBeNull();
    expect(created.audit.rows).toHaveLength(1);
    expect(created.audit.chainValid).toBe(true);
  });
  it("does not reseed a demo session on refresh", () => {
    const first = store("demo");
    const data = first.get("C1");
    data.case.patient.name = "Updated patient";
    first.save(data);
    const refreshed = new WorkspaceStore(first.db, "demo", "Test user");
    expect(refreshed.get("C1").case.patient.name).toBe("Updated patient");
  });
  it("validates new case fields without granting payee trust", () => {
    const account = store("google");
    expect(() => account.create({ patientName: "", hospitalName: "A hospital" })).toThrow();
    expect(account.list().cases).toEqual([]);
  });
});

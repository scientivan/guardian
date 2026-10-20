import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { caseAccess } from "./access";
import { Integration } from "./integration";

let dir: string;
const demo: Session = { user: { id: "demo:answers", name: "Rina", mode: "demo" }, expires: "2099-01-01" };
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "guardian-answers-")); vi.stubEnv("GUARDIAN_ACCOUNTS_DIR", dir); });
afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });
async function as<T>(member: string, run: (api: Integration) => Promise<T>) { const c = caseAccess(demo, "C1", member); try { return await run(new Integration(c)); } finally { c.close(); } }

describe("Ask buttons", () => {
  it("answers the estimate question with numbers from the comparator, no model call", async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal("fetch", fetchSpy);
    const r = await as("M_OWNER", api => api.chat("Why is the bill above the estimate?", { kind: "estimate" }));
    expect(r.reply).toContain("CNY 36,782");
    expect(r.reply).toContain("CNY 2,782");
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("explains a line with its cited bill items, and keeps the conversation", async () => {
    await as("M_OWNER", async api => {
      const r = await api.chat("Explain this", { kind: "line", index: 5 });
      expect(r.reply).toMatch(/question for the hospital/);
      expect(r.reply).toContain("I22");
      expect(api.messages()).toHaveLength(1);
      expect(api.view().audit.rows.at(-1)?.action).toBe("chat");
    });
  });
  it("does not show bill item details to a payer", async () => {
    const r = await as("M_JKT", api => api.chat("What is this?", { kind: "question", index: 0 }));
    expect(r.reply).not.toMatch(/Complete blood count:/i);
  });
  it("rejects an unknown context", async () => {
    await expect(as("M_OWNER", api => api.chat("x", { kind: "secrets" }))).rejects.toThrow();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "./db";
import { seed } from "./seed";
import { analyse, type Analysis } from "./analysis";
import { secondCheck, selectItems } from "./secondcheck";
import { resetCooldowns } from "./llm";
import { ESTIMATE, INTERIM_ITEMS } from "./fixtures/demo-case";

let db: DB;
let a: Analysis;
beforeEach(() => {
  resetCooldowns();
  process.env.LLM_CHAIN = "gemini:g,groq:q";
  process.env.GEMINI_API_KEY = "k";
  process.env.GROQ_API_KEY = "k";
  delete process.env.LLM_CACHE_DIR;
  db = openDb(":memory:");
  seed(db);
  const est = { estimateLow: ESTIMATE.low, estimateHigh: ESTIMATE.high, assumedStayDays: 3, estimateByCategory: Object.entries(ESTIMATE.byCategory).map(([category, amount]) => ({ category, amount })) };
  db.prepare("INSERT INTO documents (id, case_id, type, sha256, meta, created_at) VALUES ('DE','C1','estimate','x',?,?)").run(JSON.stringify(est), new Date().toISOString());
  db.prepare("INSERT INTO documents (id, case_id, type, sha256, meta, scrubbed_text, created_at) VALUES ('DI','C1','interim','y',?, 'bill text', ?)").run(JSON.stringify({ actualStayDays: 5, reader: "gemini:g" }), new Date().toISOString());
  const ins = db.prepare("INSERT INTO bill_items (document_id, code, category, description, qty, unit_price) VALUES ('DI', ?, ?, ?, ?, ?)");
  for (const i of INTERIM_ITEMS) ins.run(i.id, i.category, i.description, i.qty, i.unitPrice);
  a = analyse(db, "C1", "DI") as Analysis;
});

describe("selective second-model check", () => {
  it("selects flagged, high-value and questioned items only", () => {
    const ids = selectItems(a, ["I12"]);
    expect(ids).toEqual(expect.arrayContaining(["I22", "I23", "I35", "I36", "I37", "I40", "I10", "I04", "I05", "I06", "I01", "I12"]));
    expect(ids).not.toContain("I33");
  });

  it("uses a different provider and turns disagreement into a hospital question", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (u: string, init: RequestInit) => {
      urls.push(u);
      const codes = (JSON.parse(init.body as string).messages[1].content as string).match(/Codes: (.*)/)![1].split(", ");
      const items = codes.map((c) => {
        const i = INTERIM_ITEMS.find((x) => x.id === c)!;
        return { code: c, category: i.category, qty: c === "I36" ? 4 : i.qty, unitPrice: (i.unitPrice / 100).toFixed(2) };
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items }) } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await secondCheck(db, a, [], { fetchImpl });
    expect(urls.every((u) => u.includes("groq"))).toBe(true);
    expect(r.disagreements).toHaveLength(1);
    expect(r.disagreements[0]).toMatchObject({ kind: "models_disagree", itemIds: ["I36"] });
  });

  it("reports honestly when no independent model is available", async () => {
    const down = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    const r = await secondCheck(db, a, [], { fetchImpl: down, waitForCooldownMs: 0 });
    expect(r.checked).toEqual([]);
    expect(r.skipped).toMatch(/unavailable/);
  });
});

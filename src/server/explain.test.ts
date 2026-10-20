import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type DB } from "./db";
import { seed } from "./seed";
import { analyse, type Analysis } from "./analysis";
import { explain } from "./explain";
import { resetCooldowns } from "./llm";
import { ESTIMATE, INTERIM, INTERIM_ITEMS } from "./fixtures/demo-case";
import { D2_KEY } from "./fixtures/answer-keys";

let db: DB;
let a: Analysis;

// Store the fixtures as if the reader had parsed them (reader is tested live in scripts/eval-reader.ts).
function storeParsed() {
  const est = { currency: "CNY", estimateLow: ESTIMATE.low, estimateHigh: ESTIMATE.high, assumedStayDays: 3, estimateByCategory: Object.entries(ESTIMATE.byCategory).map(([category, amount]) => ({ category, amount })) };
  db.prepare("INSERT INTO documents (id, case_id, type, sha256, meta, created_at) VALUES ('DE', 'C1', 'estimate', 'x', ?, ?)").run(JSON.stringify(est), new Date().toISOString());
  db.prepare("INSERT INTO documents (id, case_id, type, sha256, meta, created_at) VALUES ('DI', 'C1', 'interim', 'y', ?, ?)").run(
    JSON.stringify({ actualStayDays: 5, statedReasons: ["antibiotic course extended to 5 days"], statedTotal: INTERIM.statedTotal }),
    new Date().toISOString(),
  );
  const ins = db.prepare("INSERT INTO bill_items (document_id, code, category, description, qty, unit_price) VALUES ('DI', ?, ?, ?, ?, ?)");
  for (const i of INTERIM_ITEMS) ins.run(i.id, i.category, i.description, i.qty, i.unitPrice);
}

const reply = (lines: unknown[]) =>
  (async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ lines }) } }] }), { status: 200 })) as unknown as typeof fetch;

beforeEach(() => {
  resetCooldowns();
  process.env.LLM_CHAIN = "groq:test";
  process.env.GROQ_API_KEY = "k";
  delete process.env.LLM_CACHE_DIR;
  db = openDb(":memory:");
  seed(db);
  storeParsed();
  a = analyse(db, "C1", "DI") as Analysis;
});

describe("analysis cites items", () => {
  it("ties causes and questions to item codes", () => {
    expect(a.comparison.total).toBe(D2_KEY.total);
    expect(a.causes[0]).toMatchObject({ ref: "C1", cause: { kind: "longer_stay" }, itemIds: ["I01", "I02", "I03"] });
    expect(a.questions.find((q) => q.kind === "duplicate")?.itemIds).toEqual(["I22", "I23"]);
    expect(a.questions.filter((q) => q.kind === "basic_item_billed").flatMap((q) => q.itemIds)).toEqual(["I35", "I36", "I37", "I40"]);
  });
});

describe("explanation guards", () => {
  it("drops invented numbers, unstated clinical causes and uncited lines; fills missing causes", async () => {
    const e = await explain(a, "en", {
      fetchImpl: reply([
        { type: "arithmetic_fact", causeRef: "C1", itemIds: ["I01"], text: "The stay is 2 days longer, adding CNY 3,000." },
        { type: "arithmetic_fact", causeRef: "C2", itemIds: [], text: "Procedure charges are CNY 999 higher." },
        { type: "unknown_ask_hospital", itemIds: ["I01"], text: "The longer stay was probably due to an infection." },
        { type: "stated_in_document", statedRef: "S1", itemIds: ["I10", "I11"], text: "The bill notes the antibiotic course was extended to 5 days." },
        { type: "unknown_ask_hospital", itemIds: [], text: "Ask about it." },
      ]),
    });
    expect(e.dropped.map((d) => d.reason)).toEqual(expect.arrayContaining([
      "number 999 is not in the facts",
      'names a clinical cause ("infection") the document does not state',
      "no item citation",
    ]));
    expect(e.lines[0]).toMatchObject({ type: "arithmetic_fact", amount: 300_000, itemIds: ["I01","I02","I03"] });
    expect(e.lines.find((l) => l.type === "stated_in_document")?.text).toContain(a.statedReasons[0]);
    // C2..C5 skipped or dropped by the model are restored by code.
    expect(e.lines.filter((l) => l.type === "arithmetic_fact")).toHaveLength(D2_KEY.causes.length);
  });

  it("still explains every cause when no model is available", async () => {
    const down = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    const e = await explain(a, "en", { fetchImpl: down });
    expect(e.lines.filter(l=>l.type==="arithmetic_fact")).toHaveLength(D2_KEY.causes.length);
    expect(e.model).toBeNull();
  });
});

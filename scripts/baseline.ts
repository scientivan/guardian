// Baseline comparison (TEST-PLAN section 4): the same bill and estimate given to a
// generic LLM chat with no guardian pipeline, versus the guardian explanation.
// Metrics are computed by code from the answer key. Usage: npm run baseline
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openDb } from "../src/server/db";
import { seed } from "../src/server/seed";
import { ingestDocument } from "../src/server/documents";
import { analyse, type Analysis } from "../src/server/analysis";
import { explain } from "../src/server/explain";
import { chat, resetCooldowns } from "../src/server/llm";

// Free tiers rate-limit long prompts; wait and retry instead of failing the trial.
async function retry<T>(f: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await f();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 30_000));
      resetCooldowns();
    }
  }
}
import { D2_KEY } from "../src/server/fixtures/answer-keys";

// sourceText: words that appear in the documents themselves (e.g. the estimate's
// "complications are not included") are quotes, not invented causes.
function metrics(text: string, a: Analysis, sourceText = "") {
  const t = text.toLowerCase();
  // Thin/regular spaces inside numbers ("36 782") would split them; join first.
  text = text.replace(/(\d)[\u202f\u00a0 ](\d{3})\b/g, "$1$2");
  const nums = (text.replace(/\b[A-Z]\d{2}\b/g, "").match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.0+$/, ""));
  const allowed = new Set<string>();
  const add = (n: number) => allowed.add(String(n).replace(/\.0+$/, ""));
  [...Object.values(a.comparison.byCategory), a.comparison.overLow, a.comparison.total - Object.values(a.estimate.byCategory ?? {}).reduce((x: number, y) => x + (y as number), 0), a.comparison.total, a.estimate.low, a.estimate.high, a.comparison.overHigh, ...a.causes.map((c) => c.cause.amount), ...a.items.flatMap((i) => [i.lineTotal, i.unitPrice])].forEach((f) => add(f / 100));
  [a.estimate.assumedStayDays, a.actualStayDays, 2, ...a.items.map((i) => i.qty)].forEach(add);
  [...Object.values(a.estimate.byCategory ?? {}), a.estimate.dailyRoomRate ?? 0].forEach((f) => add((f as number) / 100));
  // Numbers printed in the documents (dates, sizes like 500ml, codes) are not invented either.
  for (const n of sourceText.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) allowed.add(n.replace(/,/g, "").replace(/\.0+$/, ""));
  const causeHits = [
    /3,?000/.test(text) && /(day|stay|hari|longer)/i.test(text),
    /450/.test(text),
    /202/.test(text),
    /630/.test(text) || /consumable/i.test(text),
    /350/.test(text),
  ];
  return {
    statesCorrectTotal: /36,?782/.test(text),
    causesFound: `${causeHits.filter(Boolean).length}/5`,
    duplicateCbcRaised: /(complete blood count|cbc)/i.test(text) && /(twice|duplicate|double|dua kali)/i.test(text),
    basicItemsRaised: ["pillow", "alcohol swab", "glove", "bed sheet"].filter((w) => t.includes(w)).length + "/4",
    inventedClinicalCauses: D2_KEY.forbiddenClaims.filter((re) => re.test(text) && !re.test(sourceText)).map(String),
    numbersNotTraceable: [...new Set(nums.filter((n) => !allowed.has(n)))],
    words: text.split(/\s+/).length,
  };
}

(async () => {
  const db = openDb(":memory:");
  seed(db);
  const est = await ingestDocument(db, { caseId: "C1", actor: "x", type: "estimate", data: readFileSync("fixtures/pdf/estimate.pdf"), mime: "application/pdf", anchor: false });
  const bill = await ingestDocument(db, { caseId: "C1", actor: "x", type: "interim", data: readFileSync("fixtures/pdf/interim-bill.pdf"), mime: "application/pdf", anchor: false });
  const text = (id: string) => (db.prepare("SELECT scrubbed_text t FROM documents WHERE id = ?").get(id) as { t: string }).t;
  const a = analyse(db, "C1", bill.documentId) as Analysis;

  // Same model for both sides, no cache, several trials; every trial is reported.
  process.env.LLM_CHAIN = process.env.BASELINE_MODEL ?? "gemini:gemini-3.8-flash";
  delete process.env.LLM_CACHE_DIR;
  const trials = Number(process.env.BASELINE_TRIALS ?? 3);
  const source = `${text(est.documentId)}\n${text(bill.documentId)}`;
  if (process.env.RECOMPUTE) {
    const out = [1, 2, 3].map((n) => ({
      trial: n,
      baseline: metrics(readFileSync(`logs/baseline/trial${n}-baseline.md`, "utf8"), a, source),
      guardian: metrics(readFileSync(`logs/baseline/trial${n}-guardian.md`, "utf8"), a, source),
    }));
    writeFileSync("logs/baseline/metrics.json", JSON.stringify(out, null, 2));
    for (const o of out) console.log(JSON.stringify(o));
    return;
  }
  const prompt = `My father is in hospital abroad. Here is the cost estimate and the latest bill. Please explain to our family why the bill is different from the estimate.\n\nESTIMATE:\n${text(est.documentId)}\n\nBILL:\n${text(bill.documentId)}`;
  mkdirSync("logs/baseline", { recursive: true });
  const out: Record<string, unknown>[] = [];
  for (let n = 1; n <= trials; n++) {
    const base = await retry(() => chat([{ role: "user", content: prompt }], { temperature: 0.7 }));
    await new Promise((r) => setTimeout(r, 20_000));
    const g = await retry(async () => {
      const e = await explain(a, "en");
      if (!e.model) throw new Error("planner model unavailable");
      return e;
    });
    await new Promise((r) => setTimeout(r, 20_000));
    const guardianText = [...g.lines.map((l) => l.text), ...g.questions.map((q) => q.text)].join("\n");
    writeFileSync(`logs/baseline/trial${n}-baseline.md`, base.text);
    writeFileSync(`logs/baseline/trial${n}-guardian.md`, guardianText);
    out.push({ trial: n, baseline: { model: `${base.used.provider}:${base.used.model}`, ...metrics(base.text, a, source) }, guardian: { model: `${g.model?.provider}:${g.model?.model}`, ...metrics(guardianText, a, source) } });
  }
  writeFileSync("logs/baseline/metrics.json", JSON.stringify(out, null, 2));
  for (const o of out) console.log(JSON.stringify(o));
})();

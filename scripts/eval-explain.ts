// Live D2/D3 explanation with the real router, checked against the answer key.
// Usage: npm run eval:explain
import { readFileSync } from "node:fs";
import { openDb } from "../src/server/db";
import { seed } from "../src/server/seed";
import { ingestDocument } from "../src/server/documents";
import { analyse, type Analysis } from "../src/server/analysis";
import { explain } from "../src/server/explain";
import { D2_KEY } from "../src/server/fixtures/answer-keys";

async function main() {
  const db = openDb(":memory:");
  seed(db);
  for (const [f, t] of [["estimate", "estimate"], ["interim-bill", "interim"]] as const) {
    const r = await ingestDocument(db, { caseId: "C1", actor: "M_COMP", type: t, data: readFileSync(`fixtures/pdf/${f}.pdf`), mime: "application/pdf", anchor: false });
    if (r.status !== "parsed") throw new Error(`${f}: ${r.reason}`);
    if (t === "interim") {
      const a = analyse(db, "C1", r.documentId) as Analysis;
      for (const lang of ["en", "id"] as const) {
        const e = await explain(a, lang);
        const text = e.lines.map((l) => l.text).join(" ");
        const forbidden = D2_KEY.forbiddenClaims.filter((re) => re.test(text)).map(String);
        console.log(`\n[${lang}] model ${e.model?.provider}:${e.model?.model} total ${e.total === D2_KEY.total ? "MATCH" : "MISMATCH"}`);
        for (const l of e.lines) console.log(` - ${l.type} [${l.itemIds.join(",")}]${l.amount ? ` (${l.amount / 100})` : ""}: ${l.text}`);
        console.log(" dropped:", e.dropped.map((d) => d.reason));
        console.log(" questions:", e.questions.length, "forbidden claims:", forbidden.length ? forbidden : "none");
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

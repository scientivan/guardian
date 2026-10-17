// Runs the fixture PDFs through intake (extract, scrub, reader, totals check,
// payee check) with the live LLM router and scores against the answer key.
// Usage: npm run eval:reader
import { readFileSync } from "node:fs";
import { openDb } from "../src/server/db";
import { seed } from "../src/server/seed";
import { ingestDocument } from "../src/server/documents";
import { compare } from "../src/server/compare";
import { D2_KEY } from "../src/server/fixtures/answer-keys";
import { INTERIM_ITEMS, REFERENCE_PRICES } from "../src/server/fixtures/demo-case";

async function main() {
  const db = openDb(":memory:");
  seed(db);
  const run = (file: string, type: "estimate" | "interim") =>
    ingestDocument(db, { caseId: "C1", actor: "M_COMP", type, data: readFileSync(`fixtures/pdf/${file}.pdf`), mime: "application/pdf", anchor: false });

  const est = await run("estimate", "estimate");
  const em = JSON.parse((db.prepare("SELECT meta FROM documents WHERE id = ?").get(est.documentId) as { meta: string }).meta);
  console.log("estimate", est.status, em.reader, { low: em.estimateLow, high: em.estimateHigh, stay: em.assumedStayDays, byCat: em.estimateByCategory });

  const bill = await run("interim-bill", "interim");
  const bm = JSON.parse((db.prepare("SELECT meta FROM documents WHERE id = ?").get(bill.documentId) as { meta: string }).meta);
  const items = db.prepare("SELECT code, category, description, qty, unit_price unitPrice FROM bill_items WHERE document_id = ?").all(bill.documentId) as {
    code: string; category: string; description: string; qty: number; unitPrice: number;
  }[];
  const wrongCat = items.filter((i) => INTERIM_ITEMS.find((f) => f.id === i.code)?.category !== i.category).map((i) => `${i.code} ${i.description}: ${i.category}`);
  console.log("interim", bill.status, bill.reason ?? "", bm.reader, "items", items.length, "stay", bm.actualStayDays, "reasons", bm.statedReasons);
  console.log("category mismatches vs key:", wrongCat.length ? wrongCat : "none");
  if (bill.status === "parsed") {
    const est2 = {
      low: em.estimateLow, high: em.estimateHigh, assumedStayDays: em.assumedStayDays,
      dailyRoomRate: Math.round((em.estimateByCategory.find((c: { category: string }) => c.category === "room")?.amount ?? 0) / em.assumedStayDays),
      byCategory: Object.fromEntries(em.estimateByCategory.map((c: { category: string; amount: number }) => [c.category, c.amount])),
    };
    const r = compare(items as never, est2, bm.actualStayDays, REFERENCE_PRICES);
    console.log("total", r.total, r.total === D2_KEY.total ? "MATCH" : `MISMATCH (key ${D2_KEY.total})`);
    const key = (c: object) => JSON.stringify(Object.entries(c).sort());
    const same = r.causes.length === D2_KEY.causes.length && D2_KEY.causes.every((k) => r.causes.some((c) => key(c) === key(k)));
    console.log("causes match key:", same ? "yes" : JSON.stringify(r.causes));
  }

  for (const f of ["interim-bill-injected", "interim-bill-forged-account"]) {
    const r = await run(f, "interim");
    const open = db.prepare("SELECT kind FROM anomalies WHERE case_id = 'C1' AND resolved = 0").all();
    console.log(f, r.status, r.reason ?? "", "warnings", r.warnings, "open anomalies", open);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

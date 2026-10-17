// Renders the synthetic demo documents to text-layer PDFs in fixtures/pdf/.
// Usage: npm run fixtures
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { lineTotal } from "../src/server/compare";
import {
  ESTIMATE, FINAL, FORGED_ACCOUNT_LINE, HOSPITAL_HEADER, INJECTION_HIDDEN, INTERIM, INTERIM_ITEMS, PATIENT, type FixtureItem,
} from "../src/server/fixtures/demo-case";

const cny = (fen: number) => `CNY ${(fen / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, private font: PDFFont, private bold: PDFFont) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([595, 842]);
    this.y = 800;
  }
  line(text: string, opts: { size?: number; bold?: boolean; x?: number; color?: [number, number, number] } = {}) {
    if (this.y < 50) this.newPage();
    const size = opts.size ?? 9;
    const c = opts.color ?? [0, 0, 0];
    this.page.drawText(text, { x: opts.x ?? 40, y: this.y, size, font: opts.bold ? this.bold : this.font, color: rgb(c[0], c[1], c[2]) });
    this.y -= size + 5;
  }
  gap(n = 6) {
    this.y -= n;
  }
}

async function render(name: string, build: (w: Writer) => void) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${name} (demo)`);
  doc.setProducer("guardian fixtures (synthetic)");
  doc.setCreator("guardian fixtures (synthetic)");
  // Fixed dates so the same fixture always has the same bytes and SHA-256.
  const fixed = new Date("2026-10-16T00:00:00Z");
  doc.setCreationDate(fixed);
  doc.setModificationDate(fixed);
  const w = new Writer(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  w.line(HOSPITAL_HEADER[0], { size: 14, bold: true });
  w.line(HOSPITAL_HEADER[1], { size: 10 });
  w.line(HOSPITAL_HEADER[2], { size: 9, bold: true, color: [0.7, 0, 0] });
  w.gap();
  w.line(`Patient: ${PATIENT.name}   Passport: ${PATIENT.passport}   ${PATIENT.mrn}`);
  w.line(`Date of birth: ${PATIENT.dob}   Contact: ${PATIENT.phone}`);
  w.gap();
  build(w);
  mkdirSync("fixtures/pdf", { recursive: true });
  writeFileSync(`fixtures/pdf/${name}.pdf`, await doc.save());
  console.log("wrote", `fixtures/pdf/${name}.pdf`);
}

function itemTable(w: Writer, items: FixtureItem[]) {
  w.line("No  Code  Description                                   Qty   Unit price        Amount", { bold: true });
  items.forEach((i, n) => {
    w.line(`${String(n + 1).padStart(2, " ")}  ${i.id}  ${i.description.padEnd(44, " ")}  ${String(i.qty).padStart(3, " ")}   ${cny(i.unitPrice).padStart(14, " ")}  ${cny(lineTotal(i)).padStart(14, " ")}`);
  });
}

function interim(w: Writer, extra?: (w: Writer) => void) {
  w.line(INTERIM.title, { size: 12, bold: true });
  for (const n of INTERIM.notes) w.line(n);
  w.gap();
  itemTable(w, INTERIM_ITEMS);
  w.gap();
  w.line(`TOTAL ${cny(INTERIM.statedTotal)}`, { size: 11, bold: true });
  extra?.(w);
}

async function main() {
  await render("estimate", (w) => {
    w.line(`${ESTIMATE.title}: ${ESTIMATE.procedure}`, { size: 12, bold: true });
    w.line(`Assumed length of stay: ${ESTIMATE.assumedStayDays} days`);
    w.gap();
    for (const l of ESTIMATE.lines) w.line(l);
    w.gap();
    w.line("Exclusions:", { bold: true });
    for (const e of ESTIMATE.exclusions) w.line(`- ${e}`);
  });

  await render("interim-bill", (w) => interim(w));

  // A2: injected instruction in white 1pt text (invisible when printed, present in the text layer).
  await render("interim-bill-injected", (w) =>
    interim(w, (w2) => {
      w2.gap();
      w2.line(INJECTION_HIDDEN, { size: 1, color: [1, 1, 1] });
    }),
  );

  // A8: forged "official" notice with a different account, visible.
  await render("interim-bill-forged-account", (w) =>
    interim(w, (w2) => {
      w2.gap();
      w2.line(FORGED_ACCOUNT_LINE, { bold: true });
    }),
  );

  await render("final-bill", (w) => {
    w.line(FINAL.title, { size: 12, bold: true });
    itemTable(w, FINAL.lines);
    w.gap();
    w.line(`TOTAL ${cny(FINAL.statedTotal)}`, { size: 11, bold: true });
    w.line(`Deposits received: ${cny(FINAL.depositsReceived)}`);
    w.line(`Balance to refund: ${cny(FINAL.depositsReceived - FINAL.statedTotal)}`);
  });
}

main();

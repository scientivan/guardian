import { spawn } from "node:child_process";
import { extractText, getDocumentProxy } from "unpdf";

// Turns an uploaded file into plain text locally. Text-layer PDFs are read
// directly; images go through the local Tesseract binary. Raw files never go
// to an LLM, only the (later scrubbed) text.

export type Extracted = { ok: true; text: string; method: "pdf_text" | "ocr" } | { ok: false; reason: string };

export async function extract(data: Uint8Array, mime: string): Promise<Extracted> {
  if (mime === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { text } = await extractText(pdf, { mergePages: true });
    const t = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (t.length < 20) return { ok: false, reason: "PDF has no readable text layer; upload a photo or a text PDF" };
    return { ok: true, text: t, method: "pdf_text" };
  }
  if (mime === "image/png" || mime === "image/jpeg") return ocr(data);
  return { ok: false, reason: `unsupported file type ${mime}` };
}

function ocr(data: Uint8Array): Promise<Extracted> {
  return new Promise((resolve) => {
    const p = spawn(process.env.TESSERACT_BIN ?? "tesseract", ["stdin", "stdout", "-l", "eng", "--psm", "6"]);
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", () => resolve({ ok: false, reason: "OCR engine not installed (tesseract)" }));
    p.on("close", (code) => {
      const t = out.trim();
      if (code !== 0) resolve({ ok: false, reason: `OCR failed: ${err.trim().slice(0, 200)}` });
      else if (t.length < 20) resolve({ ok: false, reason: "OCR could not read the photo; retake it flat and well lit" });
      else resolve({ ok: true, text: t, method: "ocr" });
    });
    p.stdin.end(Buffer.from(data));
  });
}

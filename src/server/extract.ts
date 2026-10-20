import { spawn } from "node:child_process";
import { extractText, getDocumentProxy } from "unpdf";
import {createWorker,PSM} from "tesseract.js";
import {join} from "node:path";

// Turns an uploaded file into plain text locally. Text-layer PDFs are read
// directly; images go through the local Tesseract binary. Raw files never go
// to an LLM, only the (later scrubbed) text.

export type Extracted = { ok: true; text: string; method: "pdf_text" | "ocr" } | { ok: false; reason: string };

export async function extract(data: Uint8Array, mime: string): Promise<Extracted> {
  if (mime === "application/pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(data));
      try {
        const { text } = await extractText(pdf, { mergePages: true });
        const t = (Array.isArray(text) ? text.join("\n") : text).trim();
        if (t.length < 20) return { ok: false, reason: "PDF has no readable text layer; upload a photo or a text PDF" };
        return { ok: true, text: t, method: "pdf_text" };
      } finally {await pdf.destroy();}
    } catch {return {ok:false,reason:"This PDF could not be read. Upload an intact PDF or a clear photo."};}
  }
  if (mime === "image/png" || mime === "image/jpeg") return process.env.VERCEL?wasmOcr(data):ocr(data);
  return { ok: false, reason: `unsupported file type ${mime}` };
}

async function wasmOcr(data:Uint8Array):Promise<Extracted> {
  let worker:Awaited<ReturnType<typeof createWorker>>|undefined;
  try {
    worker=await createWorker("eng",1,{
      workerPath:join(process.cwd(),"node_modules/tesseract.js/src/worker-script/node/index.js"),
      langPath:join(process.cwd(),"node_modules/@tesseract.js-data/eng/4.0.0"),
      cacheMethod:"none",
    });
    await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
    const result=await worker.recognize(Buffer.from(data));
    const text=result.data.text.trim();
    return text.length>=20?{ok:true,text,method:"ocr"}:{ok:false,reason:"OCR could not read the photo. Retake it flat and well lit."};
  }catch{return {ok:false,reason:"This photo could not be read. Upload a clearer photo or a text PDF."};}
  finally{await worker?.terminate();}
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

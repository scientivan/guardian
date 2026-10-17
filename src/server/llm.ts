import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// LLM router over free-tier providers. All three expose an OpenAI-compatible
// chat endpoint, so one fetch path serves them. A model that answers 429/5xx
// or times out is put on cooldown and the next model in the chain is tried,
// so callers always get the first model that is not rate-limited right now.

export type Provider = "gemini" | "groq" | "openrouter";
export type ModelRef = { provider: Provider; model: string };

const ENDPOINTS: Record<Provider, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

function apiKey(p: Provider): string | undefined {
  if (p === "gemini") return process.env.GEMINI_API_KEY;
  if (p === "groq") return process.env.GROQ_API_KEY ?? process.env.GROK_API_KEY;
  return process.env.OPENROUTER_API_KEY;
}

// Order = preference. Checked live on 17 Oct 2026; override with LLM_CHAIN
// ("provider:model,provider:model").
export const DEFAULT_CHAIN: ModelRef[] = [
  { provider: "gemini", model: "gemini-3.8-flash" },
  { provider: "gemini", model: "gemini-3.7-flash" },
  { provider: "groq", model: "openai/gpt-oss-120b" },
  { provider: "gemini", model: "gemini-3.5-flash" },
  { provider: "groq", model: "qwen/qwen3.8-27b" },
  { provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free" },
  { provider: "groq", model: "openai/gpt-oss-20b" },
];

export function chain(): ModelRef[] {
  const raw = process.env.LLM_CHAIN;
  if (!raw) return DEFAULT_CHAIN;
  return raw.split(",").map((s) => {
    const i = s.indexOf(":");
    return { provider: s.slice(0, i).trim() as Provider, model: s.slice(i + 1).trim() };
  });
}

const cooldownUntil = new Map<string, number>();
const keyOf = (m: ModelRef) => `${m.provider}:${m.model}`;

export function resetCooldowns() {
  cooldownUntil.clear();
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ChatResult = { text: string; used: ModelRef; skipped: { ref: ModelRef; reason: string }[] };
export type ChatOptions = {
  json?: boolean;
  temperature?: number;
  // Second-model check must come from a different provider than the first answer.
  excludeProviders?: Provider[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  // Reject a reply (e.g. truncated or off-schema JSON): try the next model, do not cache it.
  accept?: (text: string) => boolean;
  now?: () => number;
};

export class AllModelsUnavailable extends Error {
  constructor(public skipped: { ref: ModelRef; reason: string }[]) {
    super(`No LLM available: ${skipped.map((s) => `${keyOf(s.ref)} (${s.reason})`).join("; ")}`);
  }
}

function cooldownMs(res: Response): number {
  const ra = Number(res.headers.get("retry-after"));
  if (Number.isFinite(ra) && ra > 0) return Math.min(ra, 3600) * 1000;
  return res.status === 429 ? 60_000 : 30_000;
}

// Optional response cache (LLM_CACHE_DIR). Keyed on the messages only, so a demo
// rerun or recording gets the same answer even if the free model in front changes.
function cachePath(messages: ChatMessage[], opts: ChatOptions): string | null {
  const dir = process.env.LLM_CACHE_DIR;
  if (!dir || opts.fetchImpl) return null;
  const key = createHash("sha256").update(JSON.stringify([messages, !!opts.json, opts.excludeProviders ?? []])).digest("hex");
  return join(dir, `${key}.json`);
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const cp = cachePath(messages, opts);
  if (cp && existsSync(cp)) return { ...(JSON.parse(readFileSync(cp, "utf8")) as ChatResult), skipped: [] };
  const r = await chatUncached(messages, opts);
  if (cp) {
    mkdirSync(dirname(cp), { recursive: true });
    writeFileSync(cp, JSON.stringify({ text: r.text, used: r.used }));
  }
  return r;
}

async function chatUncached(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const skipped: ChatResult["skipped"] = [];

  for (const ref of chain()) {
    if (opts.excludeProviders?.includes(ref.provider)) continue;
    const key = apiKey(ref.provider);
    if (!key) {
      skipped.push({ ref, reason: "no api key" });
      continue;
    }
    const until = cooldownUntil.get(keyOf(ref)) ?? 0;
    if (until > now()) {
      skipped.push({ ref, reason: "cooldown" });
      continue;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000);
    try {
      const res = await doFetch(ENDPOINTS[ref.provider], {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: ref.model,
          messages,
          temperature: opts.temperature ?? 0,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        cooldownUntil.set(keyOf(ref), now() + cooldownMs(res));
        skipped.push({ ref, reason: `http ${res.status}` });
        continue;
      }
      if (!res.ok) {
        // 4xx other than 429 (model removed, bad request): skip for this call only.
        skipped.push({ ref, reason: `http ${res.status}` });
        continue;
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
      const text = body.choices?.[0]?.message?.content;
      if (!text) {
        skipped.push({ ref, reason: "empty reply" });
        continue;
      }
      if (opts.accept && !opts.accept(text)) {
        skipped.push({ ref, reason: "reply rejected by validator" });
        continue;
      }
      return { text, used: ref, skipped };
    } catch (e) {
      cooldownUntil.set(keyOf(ref), now() + 30_000);
      skipped.push({ ref, reason: (e as Error).name === "AbortError" ? "timeout" : "network error" });
    } finally {
      clearTimeout(timer);
    }
  }
  throw new AllModelsUnavailable(skipped);
}

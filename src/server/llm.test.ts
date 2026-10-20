import { beforeEach, describe, expect, it, vi } from "vitest";
import { AllModelsUnavailable, chat, resetCooldowns } from "./llm";

const ok = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const limited = () => new Response("{}", { status: 429, headers: { "retry-after": "120" } });

describe("llm router", () => {
  beforeEach(() => {
    resetCooldowns();
    process.env.GEMINI_API_KEY = "g";
    process.env.GROQ_API_KEY = "q";
    process.env.OPENROUTER_API_KEY = "o";
    process.env.LLM_CHAIN = "gemini:a,groq:b,openrouter:c";
  });

  it("falls through a rate-limited model and puts it on cooldown", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const model = JSON.parse(init.body as string).model;
      calls.push(model);
      return model === "a" && calls.filter((m) => m === "a").length === 1 ? limited() : ok("hi");
    }) as typeof fetch;
    const r1 = await chat([{ role: "user", content: "x" }], { fetchImpl, now: () => 0 });
    expect(r1.used.model).toBe("b");
    const r2 = await chat([{ role: "user", content: "x" }], { fetchImpl, now: () => 60_000 });
    expect(r2.used.model).toBe("b");
    expect(calls).toEqual(["a", "b", "b"]); // a skipped while cooling down
    const r3 = await chat([{ role: "user", content: "x" }], { fetchImpl, now: () => 121_000 });
    expect(r3.used.model).toBe("a"); // back after retry-after
  });

  it("second-model check excludes the first provider", async () => {
    const fetchImpl = (async () => ok("hi")) as typeof fetch;
    const r = await chat([{ role: "user", content: "x" }], { fetchImpl, excludeProviders: ["gemini"] });
    expect(r.used.provider).toBe("groq");
  });

  it("waits for the soonest cooldown once when asked", async () => {
    let n = 0;
    const fetchImpl = (async () => (n++ === 0 ? new Response("{}", { status: 429, headers: { "retry-after": "1" } }) : ok("late"))) as unknown as typeof fetch;
    process.env.LLM_CHAIN = "gemini:a";
    const r = await chat([{ role: "user", content: "x" }], { fetchImpl, waitForCooldownMs: 5_000 });
    expect(r.text).toBe("late");
  });

  it("throws with reasons when every model is unavailable", async () => {
    const fetchImpl = (async () => limited()) as typeof fetch;
    await expect(chat([{ role: "user", content: "x" }], { fetchImpl })).rejects.toBeInstanceOf(AllModelsUnavailable);
  });

  it("bounds the entire fallback chain instead of restarting the budget per model", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(init.body as string).model);
      return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("Timeout", "AbortError"))));
    }) as typeof fetch;
    try {
      const result = chat([{ role: "user", content: "x" }], { fetchImpl, timeoutMs: 100, totalTimeoutMs: 150, waitForCooldownMs: 60_000 });
      const assertion = expect(result).rejects.toBeInstanceOf(AllModelsUnavailable);
      await vi.advanceTimersByTimeAsync(150);
      await assertion;
      expect(calls).toEqual(["a", "b"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

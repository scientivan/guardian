// Limits on the routes that spend free-tier LLM quota (TASKS 8.7): document reading, bill
// explanation, chat, hospital search and the admin AI check. Kept in process memory, which fits the
// single `next start` process in docs/DEPLOY.md; a restart clears the counters.
//
// Two keys per request: the signed-in account, and the client IP. The IP limit matters because a
// new demo account costs nothing, so an account limit alone would not protect the quota.

export type Window = { limit: number; ms: number };
export const LLM_LIMITS: { account: Window[]; ip: Window[] } = {
  account: [{ limit: 8, ms: 60_000 }, { limit: 60, ms: 3_600_000 }],
  ip: [{ limit: 20, ms: 60_000 }, { limit: 150, ms: 3_600_000 }],
};

const hits = new Map<string, number[]>();

/** Records one hit for each key unless any window is full. Returns seconds to wait, or 0 when allowed. */
export function take(keys: { key: string; windows: Window[] }[], now = Date.now()): number {
  let wait = 0;
  for (const { key, windows } of keys) {
    const longest = Math.max(...windows.map(w => w.ms));
    const recent = (hits.get(key) ?? []).filter(t => now - t < longest);
    hits.set(key, recent);
    for (const w of windows) {
      const inWindow = recent.filter(t => now - t < w.ms);
      if (inWindow.length >= w.limit) wait = Math.max(wait, Math.ceil((inWindow[0] + w.ms - now) / 1000));
    }
  }
  if (wait) return wait;
  for (const { key } of keys) hits.get(key)!.push(now);
  return 0;
}

export function resetRateLimits() { hits.clear(); }

/** Routes that call a model. `path` is the part after /api/. */
export function spendsModelQuota(method: string, path: string[]) {
  if (method !== "POST") return false;
  if (path[0] === "cases" && ["documents", "explanation", "chat"].includes(path[2]) && path.length === 3) return true;
  if (path[0] === "hospitals" && path[1] === "discover") return true;
  return path[0] === "admin" && path[1] === "reviews" && path[3] === "ai";
}

/**
 * The client address as the reverse proxy saw it. Caddy and nginx append the peer address to
 * X-Forwarded-For, so the last entry is the one a client cannot forge.
 */
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",").map(s => s.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? headers.get("x-real-ip") ?? "local";
}

import { beforeEach, describe, expect, it } from "vitest";
import { clientIp, resetRateLimits, spendsModelQuota, take } from "./rate-limit";

const minute = [{ limit: 3, ms: 60_000 }];

beforeEach(() => resetRateLimits());

describe("model quota rate limit", () => {
  it("allows up to the limit, then asks the caller to wait until the oldest hit expires", () => {
    const keys = [{ key: "account:a", windows: minute }];
    expect([take(keys, 0), take(keys, 1_000), take(keys, 2_000)]).toEqual([0, 0, 0]);
    expect(take(keys, 3_000)).toBe(57);
    expect(take(keys, 60_000)).toBe(0);
  });

  it("an IP limit still holds when each request uses a new demo account", () => {
    const ip = { key: "ip:1.2.3.4", windows: minute };
    for (let i = 0; i < 3; i++) expect(take([{ key: `account:${i}`, windows: minute }, ip], i)).toBe(0);
    expect(take([{ key: "account:new", windows: minute }, ip], 10)).toBeGreaterThan(0);
  });

  it("a refused request is not counted against the other key", () => {
    const ip = { key: "ip:x", windows: [{ limit: 1, ms: 60_000 }] };
    take([{ key: "account:a", windows: minute }, ip], 0);
    take([{ key: "account:b", windows: minute }, ip], 1);
    // account:b's refused hit at t=1 was not recorded, so it still has all three.
    for (const t of [2, 3, 4]) expect(take([{ key: "account:b", windows: minute }], t)).toBe(0);
    expect(take([{ key: "account:b", windows: minute }], 5)).toBeGreaterThan(0);
  });

  it("covers only the routes that call a model", () => {
    expect(spendsModelQuota("POST", ["cases", "C1", "chat"])).toBe(true);
    expect(spendsModelQuota("POST", ["cases", "C1", "documents"])).toBe(true);
    expect(spendsModelQuota("POST", ["hospitals", "discover"])).toBe(true);
    expect(spendsModelQuota("POST", ["admin", "reviews", "R1", "ai"])).toBe(true);
    expect(spendsModelQuota("GET", ["cases", "C1", "chat"])).toBe(false);
    expect(spendsModelQuota("POST", ["payment-requests", "R1", "approvals"])).toBe(false);
  });

  it("uses the address the proxy appended, not one the client sent", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers())).toBe("local");
  });
});

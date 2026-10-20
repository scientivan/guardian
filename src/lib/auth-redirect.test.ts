import { describe, expect, it } from "vitest";
import { appDestination } from "./auth-redirect";

describe("login return destination", () => {
  it("preserves a case, project step or invite after signing in", () => {
    expect(appDestination("/case/C1/bill")).toBe("/case/C1/bill");
    expect(appDestination("/projects/new?step=3")).toBe("/projects/new?step=3");
    expect(appDestination("/join/example-token")).toBe("/join/example-token");
  });

  it("rejects external redirects and login loops", () => {
    for (const value of [undefined, "https://example.com", "//example.com", "/\\example.com", "/login", "/api/auth/signout", "/case/../../login", "/case/%2e%2e/%2e%2e/login"]) {
      expect(appDestination(value)).toBe("/projects");
    }
  });
});

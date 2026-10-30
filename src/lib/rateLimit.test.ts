import { describe, expect, it } from "vitest";
import { clientKey, rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  it("allows up to the limit then blocks until the window resets", () => {
    const key = "test:window";
    const t0 = 1_000_000;
    expect(rateLimit(key, 2, 1000, t0).ok).toBe(true);
    expect(rateLimit(key, 2, 1000, t0 + 1).ok).toBe(true);
    const blocked = rateLimit(key, 2, 1000, t0 + 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(rateLimit(key, 2, 1000, t0 + 1001).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(rateLimit("test:a", 1, 1000, 5).ok).toBe(true);
    expect(rateLimit("test:b", 1, 1000, 5).ok).toBe(true);
    expect(rateLimit("test:a", 1, 1000, 6).ok).toBe(false);
  });
});

describe("clientKey", () => {
  it("uses the first x-forwarded-for entry", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" },
    });
    expect(clientKey(req)).toBe("1.2.3.4");
  });

  it("falls back when the header is missing", () => {
    expect(clientKey(new Request("http://localhost"))).toBe("unknown");
  });
});

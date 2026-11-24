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
  it("uses the rightmost x-forwarded-for entry, not the spoofable first", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "6.6.6.6, 1.2.3.4" },
    });
    expect(clientKey(req)).toBe("1.2.3.4");
  });

  it("prefers the CloudFront viewer address and strips the port", () => {
    const req = new Request("http://localhost", {
      headers: {
        "cloudfront-viewer-address": "203.0.113.9:44321",
        "x-forwarded-for": "6.6.6.6, 10.0.0.1",
      },
    });
    expect(clientKey(req)).toBe("203.0.113.9");
  });

  it("strips the port from an IPv6 CloudFront viewer address", () => {
    const req = new Request("http://localhost", {
      headers: { "cloudfront-viewer-address": "2001:db8::1:5000" },
    });
    expect(clientKey(req)).toBe("2001:db8::1");
  });

  it("prefers the Vercel-set header", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.7",
        "x-forwarded-for": "6.6.6.6, 10.0.0.1",
      },
    });
    expect(clientKey(req)).toBe("198.51.100.7");
  });

  it("falls back when the header is missing", () => {
    expect(clientKey(new Request("http://localhost"))).toBe("unknown");
  });
});

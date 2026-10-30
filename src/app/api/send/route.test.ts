import { afterEach, describe, expect, it, vi } from "vitest";

// route.tsx reads FROM_EMAIL when the module loads, so the env must be set
// before the import below is evaluated.
const { send } = vi.hoisted(() => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.FROM_EMAIL = "owner@example.com";
  return { send: vi.fn() };
});

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { POST } from "./route";

describe("POST /api/send", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Each test uses its own address so rate-limit counters don't bleed across.
  const post = (body: unknown, ip: string) =>
    POST(
      new Request("http://localhost/api/send", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify(body),
      }),
    );

  const valid = { email: "a@b.co", subject: "hi", message: "hello" };

  it("sends a valid message to the owner only", async () => {
    send.mockResolvedValue({ data: { id: "abc" }, error: null });
    const res = await post(valid, "10.0.0.1");
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["owner@example.com"], replyTo: "a@b.co" }),
    );
  });

  it("silently drops honeypot submissions without sending", async () => {
    const res = await post({ ...valid, website: "http://spam.example" }, "10.0.0.2");
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 502 when Resend reports an error", async () => {
    send.mockResolvedValue({ data: null, error: { message: "bad" } });
    const res = await post(valid, "10.0.0.5");
    expect(res.status).toBe(502);
  });

  it("rejects invalid input", async () => {
    const res = await post({ ...valid, email: "nope" }, "10.0.0.3");
    expect(res.status).toBe(400);
  });

  it("returns 429 after five requests from one address", async () => {
    send.mockResolvedValue({ data: { id: "abc" }, error: null });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await post(valid, "10.0.0.4")).status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });
});

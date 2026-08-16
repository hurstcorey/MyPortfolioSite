// receive-email: webhook endpoint for inbound email from the provider
// (Resend inbound webhooks, or any provider posting a compatible JSON body).
//
// Deploy with JWT verification OFF so the provider can reach it:
//   supabase functions deploy receive-email --no-verify-jwt
//
// Secrets (supabase secrets set ...):
//   RESEND_WEBHOOK_SECRET - signing secret from the Resend webhook config
//                           (starts with "whsec_"). Requests that fail
//                           signature verification are rejected, which is the
//                           only thing keeping strangers from writing into
//                           the inbox since RLS is bypassed here.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "jsr:@supabase/supabase-js@2";

const encoder = new TextEncoder();

// Resend signs webhooks with Svix: HMAC-SHA256 over "{id}.{timestamp}.{body}"
// keyed with the base64-decoded secret, compared against the space-separated
// "v1,<base64sig>" entries in the svix-signature header.
async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!secret) return false;

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatureHeader = req.headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  // Reject replayed or badly skewed requests (5 minute tolerance).
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const secretBytes = Uint8Array.from(
    atob(secret.replace(/^whsec_/, "")),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${id}.${timestamp}.${rawBody}`),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));

  return signatureHeader
    .split(" ")
    .some((part) => part.split(",")[1] === expected);
}

// Accepts either an address string ("Name <a@b.com>" or "a@b.com") or an
// object like { email: "a@b.com" }, or an array of either.
function extractEmail(value: unknown): string | null {
  if (Array.isArray(value)) return extractEmail(value[0]);
  if (value && typeof value === "object" && "email" in value) {
    return extractEmail((value as { email: unknown }).email);
  }
  if (typeof value !== "string") return null;
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim() || null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  if (!(await verifySignature(req, rawBody))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Resend wraps the email in { type: "email.received", data: {...} };
  // fall back to the top level for providers that post the email directly.
  const data = (payload.data ?? payload) as Record<string, unknown>;

  const fromEmail = extractEmail(data.from);
  const toEmail = extractEmail(data.to);
  if (!fromEmail || !toEmail) {
    return new Response("Missing sender or recipient", { status: 400 });
  }

  // Service-role client: webhooks carry no user session, so RLS is bypassed.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row, error } = await admin
    .from("messages")
    .insert({
      direction: "inbound",
      from_email: fromEmail,
      to_email: toEmail,
      subject: (data.subject as string) ?? null,
      text_body: (data.text as string) ?? (data.text_body as string) ?? null,
      html_body: (data.html as string) ?? (data.html_body as string) ?? null,
      read_status: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to store inbound email:", error);
    return new Response("Failed to store message", { status: 500 });
  }

  return Response.json({ id: row.id }, { status: 201 });
});

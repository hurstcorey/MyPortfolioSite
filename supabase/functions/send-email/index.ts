// send-email: authenticated endpoint the frontend calls to send an email
// via Resend, then record it in the messages table as 'outbound'.
//
// Deploy with the default JWT verification ON (no extra flags needed) —
// requests must carry a valid Supabase Auth session token.
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY - Resend API key
//   FROM_EMAIL     - verified sender address, e.g. me@yourdomain.com
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically.
//
// Request body: { to: string, subject: string, text?: string, html?: string,
//                 thread_id?: string (uuid) }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Confirm the caller is the signed-in user. The platform already verified
  // the JWT signature; this resolves it to an actual user and rejects
  // anon-key-only calls.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: {
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    thread_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { to, subject, text, html, thread_id } = body;
  if (!to || !subject || (!text && !html)) {
    return json(
      { error: "Required: to, subject, and text and/or html" },
      400,
    );
  }

  const fromEmail = Deno.env.get("FROM_EMAIL");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!fromEmail || !resendApiKey) {
    return json({ error: "Email transport is not configured" }, 500);
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    console.error("Resend API error:", resendResponse.status, detail);
    return json({ error: "Failed to send email" }, 502);
  }

  const { id: resendId } = await resendResponse.json();

  // Record the sent message. The service-role client keeps this working even
  // if the RLS policies are later pinned to a specific user id.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: row, error } = await admin
    .from("messages")
    .insert({
      direction: "outbound",
      from_email: fromEmail,
      to_email: to,
      subject,
      text_body: text ?? null,
      html_body: html ?? null,
      read_status: true,
      thread_id: thread_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // The email already went out; surface the bookkeeping failure so the
    // frontend can warn rather than silently losing the sent record.
    console.error("Email sent but failed to store record:", error);
    return json({ sent: true, resend_id: resendId, stored: false }, 500);
  }

  return json({ sent: true, resend_id: resendId, id: row.id }, 201);
});

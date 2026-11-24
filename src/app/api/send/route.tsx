import { NextResponse } from "next/server";
import { Resend } from "resend";
import { clientKey, rateLimit } from "@/lib/rateLimit";

const fromEmail = process.env.FROM_EMAIL ?? "";

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const limit = rateLimit(`send:${clientKey(req)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  if (!process.env.RESEND_API_KEY || !fromEmail) {
    return NextResponse.json(
      { error: "Email is not configured" },
      { status: 500 },
    );
  }

  let body: {
    email?: unknown;
    subject?: unknown;
    message?: unknown;
    website?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Honeypot field: real visitors never see it, so a value means a bot. Answer
  // as if it worked so the bot has no signal to adapt to.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ id: "ok" });
  }

  const { email, subject, message } = body;
  if (
    typeof email !== "string" ||
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return NextResponse.json(
      { error: "email, subject and message are required" },
      { status: 400 },
    );
  }
  if (
    subject.length > MAX_SUBJECT_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return NextResponse.json(
      { error: "subject or message is too long" },
      { status: 413 },
    );
  }

  try {
    // Deliver only to the site owner, with the visitor's address as reply-to.
    // Mailing a caller-supplied recipient would let anyone relay arbitrary
    // content through this domain and burn its sending reputation.
    const { data, error: sendError } = await new Resend(
      process.env.RESEND_API_KEY,
    ).emails.send({
      from: fromEmail,
      to: [fromEmail],
      replyTo: email,
      subject: `[Portfolio] ${subject}`,
      react: (
        <>
          <h1>{subject}</h1>
          <p>New message from {email}:</p>
          <p>{message}</p>
        </>
      ),
    });

    // Resend resolves with { data, error } instead of throwing when the API
    // rejects a request, so a returned id is the only success signal.
    if (sendError || !data?.id) {
      console.error("[api/send] Resend error:", sendError);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("[api/send] error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}

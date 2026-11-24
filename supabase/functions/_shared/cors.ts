// Set ALLOWED_ORIGINS (comma-separated, e.g. "https://www.example.com") with
// `supabase secrets set` to restrict browser callers to the site. When unset
// the wildcard is kept so the function keeps working until it is configured.
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeadersFor(req: Request): Record<string, string> {
  const base = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (allowedOrigins.length === 0) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }
  const origin = req.headers.get("Origin") ?? "";
  return {
    ...base,
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    Vary: "Origin",
  };
}

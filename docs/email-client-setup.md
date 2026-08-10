# Email Client Setup (`/mail`)

Single-user email client at `/mail`: Supabase (`Personal-hub`,
`twnhlikjjetzwjipddwq`) for auth/database/realtime, Resend for transport,
`corey@cohurst.co` as the address.

## Already provisioned

- Database migrations applied (messages table + RLS, realtime publication,
  attachments bucket) — sources in `supabase/migrations/`.
- Edge Functions deployed: `receive-email` (JWT verification off, guarded by
  Svix webhook signature) and `send-email` (JWT verification on) — sources in
  `supabase/functions/`.
- Resend domain `cohurst.co` created (sending + receiving, us-east-1).
- Resend webhook for `email.received` →
  `https://twnhlikjjetzwjipddwq.supabase.co/functions/v1/receive-email`.

## DNS records (Route 53, hosted zone cohurst.co)

| Type | Name                        | Value                                       | Priority |
| ---- | --------------------------- | ------------------------------------------- | -------- |
| TXT  | `resend._domainkey`         | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8cx4DrjGYDJV+exDa+ZAr1P0rST8zDJeW2IbMjIq+SFnur7w0EGlqAMfMre/KM5FErTYwhkezZKRF+gXF1HR+w7xVR6YfQXAUERh/1jze83MElT6H0zthPdlkij67sJM+N5Pi+WilPt4hqLgnVb9UUAUWFTtgEMguU4uBNqweUwIDAQAB` | — |
| MX   | `send`                      | `feedback-smtp.us-east-1.amazonses.com`     | 10       |
| TXT  | `send`                      | `v=spf1 include:amazonses.com ~all`         | —        |
| MX   | *(root, i.e. `cohurst.co`)* | `inbound-smtp.us-east-1.amazonaws.com`      | 0        |

The root MX record routes ALL mail addressed to `@cohurst.co` into Resend
receiving. Do not add it if another mail service (e.g. Google Workspace)
already receives mail for this domain.

After the records propagate, trigger verification from the Resend dashboard
(Domains → cohurst.co → Verify).

## Secrets to set (Supabase Dashboard → Edge Functions → Secrets)

| Name                    | Value                                                  |
| ----------------------- | ------------------------------------------------------ |
| `RESEND_API_KEY`        | Create in Resend dashboard (sending access is enough)  |
| `FROM_EMAIL`            | `corey@cohurst.co`                                     |
| `RESEND_WEBHOOK_SECRET` | The `whsec_...` signing secret shown once when the webhook was created |

## Frontend env (`.env.local` + Amplify environment variables)

```
NEXT_PUBLIC_SUPABASE_URL=https://twnhlikjjetzwjipddwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Dashboard → Settings → API>
```

## Auth (one-time, Supabase Dashboard)

1. Authentication → Users → Add user: your email + password, auto-confirm.
2. Authentication → Sign In / Providers → disable "Allow new users to sign
   up" (the RLS policies trust any authenticated user, so signups must stay
   closed).

## Notes

- Free-tier projects pause after ~1 week idle; restore from the dashboard if
  `/mail` stops connecting.
- Verify end-to-end: send yourself mail from `/mail` (outbound), and email
  `corey@cohurst.co` from any account (inbound should appear in the inbox in
  realtime).

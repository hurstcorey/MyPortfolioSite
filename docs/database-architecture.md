# Database architecture

My databases are consolidated into **two** Supabase projects:

- **Personal-hub** — this site's database. Auth, the email client's `messages`
  table, and the `apps` registry that backs personal reporting.
- **apps-data** — what my other applications read and write at runtime. Shared
  by several apps, each owning its own Postgres schema and its own database
  role, so table names cannot collide and one app cannot reach another's data.

## What lives in this repository

Everything for Personal-hub, as Supabase migrations:

| Migration | Contents |
|---|---|
| `20260810000000_email_client_schema.sql` | `messages` table, RLS, attachments bucket |
| `20260810010000_enable_realtime_messages.sql` | Realtime publication |
| `20260827000000_apps_registry.sql` | `apps` registry + `updated_at` trigger |

`supabase/migrations/` is the single source for this project — a fresh database
is rebuilt from it, so any new table belongs there and nowhere else.

## What does not live here

The apps-data schemas. Each is owned by the repository of the application that
uses it:

| Schema | Owned by |
|---|---|
| `mtg` | the MTG dashboard repo |
| `diagram` | the DiagramMasterAI repo, as Drizzle migrations |
| `public` | the DBZ app's reference data |

The SQL is deliberately not centralised. A single repo holding every schema
would duplicate DDL that already exists in each app's own migrations, and the
two copies drift apart the moment one is edited. **Changing a schema means
changing its own repository.**

## Conventions

- **One schema per app** in the shared project; generic names like `users` and
  `projects` would otherwise collide.
- **One role per app,** with `search_path` set to its own schema, so an ORM
  emitting unqualified names still resolves correctly.
- **Secrets are never committed.** Connection strings, passwords and API keys
  live in the platform's secret store.

## Gotchas

- Supabase's direct database host is **IPv6-only**; environments without an
  IPv6 route must use the **session pooler** on port 5432.
- Free-tier projects **auto-pause** after about a week of inactivity. Data
  survives, but an app cannot reach a paused database until it is restored.
- A `default now()` on `updated_at` only fires on insert. Tables that report on
  recency need a trigger — see the one in the registry migration.

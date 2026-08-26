# Database SQL

SQL for the **personal-hub** Supabase project — the one that holds personal
data and metadata about my projects, as opposed to the data my applications
read and write at runtime.

| Path | Contents |
|---|---|
| `personal-hub/001_apps_registry.sql` | The `apps` table: what each project is, where it runs, and where its data lives |

## Two projects, and why the SQL is split up

My databases are consolidated into two Supabase projects:

- **apps-data** — what the applications read and write. Shared by several apps,
  each of which owns its own Postgres schema and its own database role, so
  table names cannot collide and one app cannot reach another's data.
- **personal-hub** — personal data, plus the app registry above. This is the
  project this repository is concerned with.

The SQL is deliberately **not** centralised in one repository. Each schema is
owned by the repository that uses it:

| Schema / project | Owned by |
|---|---|
| personal-hub | this repository |
| `mtg` schema (apps-data) | the MTG dashboard repo |
| `diagram` schema (apps-data) | the DiagramMasterAI repo, as Drizzle migrations |

A single repo holding every schema would duplicate DDL that already exists in
each app's own migrations, and the two copies drift apart the moment one is
edited. Changing a schema therefore means changing its own repository.

Connection strings, passwords, API keys and project identifiers are
deliberately **not** stored here; they live in the relevant platform's secret
store.

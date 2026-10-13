-- App registry: what each of my projects is, where it runs, and where its
-- data lives. Backs personal reporting rather than anything the site serves.

-- ---------------------------------------------------------------------------
-- 1. apps table
-- ---------------------------------------------------------------------------

create table if not exists public.apps (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique not null,
  platform          text not null
                      check (platform in ('replit','vercel','railway','github','supabase','other')),
  description       text,
  repo_url          text,
  live_url          text,
  database_kind     text,       -- e.g. 'replit-postgres', 'supabase', 'none', 'unknown'
  database_location text,       -- project / schema where the app's data lives
  status            text not null default 'active'
                      check (status in ('active','paused','archived','deleted')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.apps is
  'Registry of all my apps/projects across platforms, for personal reports';

-- ---------------------------------------------------------------------------
-- 2. Keep updated_at honest
-- ---------------------------------------------------------------------------

-- A column default only fires on insert, so without this an edited row keeps
-- its insertion time and the timestamp misleads the reports it exists for.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists apps_set_updated_at on public.apps;

create trigger apps_set_updated_at
  before update on public.apps
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

-- Enabled with no policies: nothing reaches this table through the anon or
-- authenticated roles, only a server-side connection or the service role.
-- That is deliberate — the registry is not something the public site reads.
-- To surface it in the app, add a policy following the pattern in
-- 20260810000000_email_client_schema.sql.

alter table public.apps enable row level security;

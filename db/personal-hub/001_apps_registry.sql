-- Registry of my apps across platforms, used for personal reporting.
--
-- Lives in the "personal-hub" Supabase project, which holds personal data and
-- app metadata. Application data lives in a separate project and is owned by
-- each application's own repository -- see ../README.md.

CREATE TABLE IF NOT EXISTS public.apps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              text UNIQUE NOT NULL,
  platform          text NOT NULL
                      CHECK (platform IN ('replit','vercel','railway','github','supabase','other')),
  description       text,
  repo_url          text,
  live_url          text,
  database_kind     text,       -- e.g. 'replit-postgres', 'supabase', 'none', 'unknown'
  database_location text,       -- project / schema where the app's data lives
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','paused','archived','deleted')),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.apps IS
  'Registry of all my apps/projects across platforms, for personal reports';

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

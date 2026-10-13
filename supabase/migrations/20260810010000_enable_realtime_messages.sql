-- Broadcast messages table changes over Supabase Realtime (Postgres Changes).
-- RLS still applies: only the authenticated owner receives events.
alter publication supabase_realtime add table public.messages;

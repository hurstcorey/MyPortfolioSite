-- Email client schema: messages table, RLS, and attachments storage bucket.
-- Single-user app: access is restricted to the authenticated user. Keep
-- signups disabled in Supabase Auth (Dashboard > Authentication > Providers)
-- so "authenticated" means only the owner's account.

-- ---------------------------------------------------------------------------
-- 1. messages table
-- ---------------------------------------------------------------------------

create type public.message_direction as enum ('inbound', 'outbound');

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  direction   public.message_direction not null,
  from_email  text not null,
  to_email    text not null,
  subject     text,
  text_body   text,
  html_body   text,
  read_status boolean not null default false,
  thread_id   uuid
);

-- Common access paths: newest-first inbox listing and thread grouping.
create index messages_created_at_idx on public.messages (created_at desc);
create index messages_thread_id_idx on public.messages (thread_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security on messages
-- ---------------------------------------------------------------------------

alter table public.messages enable row level security;

-- Only a logged-in user may touch rows; anon gets nothing. Because this is a
-- single-user project with signups disabled, "authenticated" is only you.
-- If you ever enable signups, replace the auth.uid() checks below with
--   auth.uid() = '<your-user-uuid>'
-- (find it under Dashboard > Authentication > Users).

create policy "Owner can read messages"
  on public.messages
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "Owner can insert messages"
  on public.messages
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Owner can update messages"
  on public.messages
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Owner can delete messages"
  on public.messages
  for delete
  to authenticated
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- 3. attachments storage bucket + policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Storage RLS lives on storage.objects (RLS is already enabled on it by
-- Supabase); scope every policy to this bucket.

create policy "Owner can read attachments"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'attachments');

create policy "Owner can upload attachments"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'attachments');

create policy "Owner can update attachments"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'attachments')
  with check (bucket_id = 'attachments');

create policy "Owner can delete attachments"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'attachments');

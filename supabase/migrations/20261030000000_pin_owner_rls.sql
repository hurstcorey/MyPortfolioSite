-- Pin the mail RLS policies to the single owner account.
--
-- The original policies trust any "authenticated" user, which is only safe
-- while Supabase Auth signups stay disabled. This swaps them for policies that
-- require auth.uid() to be the owner, so enabling signups later cannot expose
-- the inbox.
--
-- The owner is resolved when the migration runs and the migration aborts unless
-- exactly one auth user exists, so it can never pin to the wrong account.

do $$
declare
  owner_id uuid;
  user_count integer;
begin
  select count(*) into user_count from auth.users;
  if user_count <> 1 then
    raise exception
      'Expected exactly one auth user to pin RLS to, found %. Pin manually.',
      user_count;
  end if;
  select id into owner_id from auth.users limit 1;

  -- messages
  drop policy if exists "Owner can read messages" on public.messages;
  drop policy if exists "Owner can insert messages" on public.messages;
  drop policy if exists "Owner can update messages" on public.messages;
  drop policy if exists "Owner can delete messages" on public.messages;

  execute format(
    'create policy "Owner can read messages" on public.messages
       for select to authenticated using (auth.uid() = %L::uuid)', owner_id);
  execute format(
    'create policy "Owner can insert messages" on public.messages
       for insert to authenticated with check (auth.uid() = %L::uuid)', owner_id);
  execute format(
    'create policy "Owner can update messages" on public.messages
       for update to authenticated
       using (auth.uid() = %L::uuid) with check (auth.uid() = %L::uuid)',
    owner_id, owner_id);
  execute format(
    'create policy "Owner can delete messages" on public.messages
       for delete to authenticated using (auth.uid() = %L::uuid)', owner_id);

  -- attachments bucket
  drop policy if exists "Owner can read attachments" on storage.objects;
  drop policy if exists "Owner can upload attachments" on storage.objects;
  drop policy if exists "Owner can update attachments" on storage.objects;
  drop policy if exists "Owner can delete attachments" on storage.objects;

  execute format(
    'create policy "Owner can read attachments" on storage.objects
       for select to authenticated
       using (bucket_id = ''attachments'' and auth.uid() = %L::uuid)', owner_id);
  execute format(
    'create policy "Owner can upload attachments" on storage.objects
       for insert to authenticated
       with check (bucket_id = ''attachments'' and auth.uid() = %L::uuid)', owner_id);
  execute format(
    'create policy "Owner can update attachments" on storage.objects
       for update to authenticated
       using (bucket_id = ''attachments'' and auth.uid() = %L::uuid)
       with check (bucket_id = ''attachments'' and auth.uid() = %L::uuid)',
    owner_id, owner_id);
  execute format(
    'create policy "Owner can delete attachments" on storage.objects
       for delete to authenticated
       using (bucket_id = ''attachments'' and auth.uid() = %L::uuid)', owner_id);
end
$$;

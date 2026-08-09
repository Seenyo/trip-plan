drop table if exists public.trips cascade;
drop table if exists public.trip_members;
drop function if exists public.trip_join_code_ok(uuid, text);
drop function if exists public.trips_block_immutable_fields();
drop function if exists public.request_uid();
drop function if exists public.set_updated_at();

create table public.app_state (
  id text primary key default 'shared' check (id = 'shared'),
  trips jsonb not null default '[]'::jsonb,
  plan_document jsonb not null default '[]'::jsonb,
  plan_markdown text not null default '',
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

grant usage on schema public to anon;
grant select, insert, update on table public.app_state to anon;

create policy "Shared workspace can be read"
on public.app_state for select
to anon
using (id = 'shared');

create policy "Shared workspace can be created"
on public.app_state for insert
to anon
with check (id = 'shared');

create policy "Shared workspace can be updated"
on public.app_state for update
to anon
using (id = 'shared')
with check (id = 'shared');

insert into public.app_state (id) values ('shared');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-plan-images',
  'trip-plan-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic']
);

create policy "Shared images can be read"
on storage.objects for select
to anon
using (bucket_id = 'trip-plan-images');

create policy "Shared images can be uploaded"
on storage.objects for insert
to anon
with check (bucket_id = 'trip-plan-images');

create policy "Shared images can be updated"
on storage.objects for update
to anon
using (bucket_id = 'trip-plan-images')
with check (bucket_id = 'trip-plan-images');

create policy "Shared images can be deleted"
on storage.objects for delete
to anon
using (bucket_id = 'trip-plan-images');

alter publication supabase_realtime add table public.app_state;

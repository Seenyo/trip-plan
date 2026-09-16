-- Guides and notebook pages stay separate from itinerary writes.
create table public.travel_documents (
  id text primary key,
  trip_id text not null,
  activity_id text,
  parent_id text references public.travel_documents(id),
  title text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  checked_at date,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint document_blocks_array check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 500 and octet_length(blocks::text) <= 1048576),
  constraint document_title_length check (length(title) <= 300)
);
create index travel_documents_trip_idx on public.travel_documents(trip_id);
alter table public.travel_documents enable row level security;
-- The app currently has one shared, unauthenticated workspace. Match its access model.
create policy "Shared trips can read documents" on public.travel_documents for select to anon
using (exists (select 1 from public.app_state s, jsonb_array_elements(s.trips) t where s.id = 'shared' and t->>'id' = trip_id));
create policy "Shared trips can create documents" on public.travel_documents for insert to anon
with check (exists (select 1 from public.app_state s, jsonb_array_elements(s.trips) t where s.id = 'shared' and t->>'id' = trip_id));
create policy "Shared trips can edit documents" on public.travel_documents for update to anon
using (exists (select 1 from public.app_state s, jsonb_array_elements(s.trips) t where s.id = 'shared' and t->>'id' = trip_id))
with check (exists (select 1 from public.app_state s, jsonb_array_elements(s.trips) t where s.id = 'shared' and t->>'id' = trip_id));
grant select, insert, update on public.travel_documents to anon;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('travel-attachments', 'travel-attachments', false, 10485760,
array['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
create policy "Shared trips can upload attachments" on storage.objects for insert to anon
with check (bucket_id = 'travel-attachments' and exists
(select 1 from public.app_state s, jsonb_array_elements(s.trips) t where s.id = 'shared' and t->>'id' = (storage.foldername(name))[1]));
create policy "Shared trips can open attachments" on storage.objects for select to anon
using (bucket_id = 'travel-attachments' and exists
(select 1 from public.app_state s, jsonb_array_elements(s.trips) t where s.id = 'shared' and t->>'id' = (storage.foldername(name))[1]));

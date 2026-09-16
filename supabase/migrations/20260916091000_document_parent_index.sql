create index travel_documents_parent_idx on public.travel_documents(parent_id);
revoke all on public.travel_documents from authenticated;

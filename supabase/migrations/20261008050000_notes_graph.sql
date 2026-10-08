create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  source_note_id uuid not null references public.notes(id) on delete cascade,
  target_note_id uuid not null references public.notes(id) on delete cascade,
  relation_type text not null default 'related'
    check (relation_type = any (array['related','continuation','part_of','reference','idea','next_step'])),
  created_at timestamptz not null default now(),
  constraint note_links_not_self check (source_note_id <> target_note_id),
  constraint note_links_unique_pair unique (source_note_id, target_note_id)
);
create index if not exists note_links_source_idx on public.note_links(source_note_id);
create index if not exists note_links_target_idx on public.note_links(target_note_id);
create unique index if not exists note_links_unique_undirected_idx on public.note_links (least(source_note_id, target_note_id), greatest(source_note_id, target_note_id));
alter table public.note_links enable row level security;
drop policy if exists note_links_select_accessible on public.note_links;
create policy note_links_select_accessible on public.note_links for select to authenticated using (
  (auth.uid() = private.note_owner_id(source_note_id) or private.user_can_access_note(source_note_id, auth.uid()))
  or
  (auth.uid() = private.note_owner_id(target_note_id) or private.user_can_access_note(target_note_id, auth.uid()))
);
drop policy if exists note_links_insert_edit_source on public.note_links;
create policy note_links_insert_edit_source on public.note_links for insert to authenticated with check (
  private.note_owner_id(source_note_id) = auth.uid() or private.user_can_edit_note(source_note_id, auth.uid())
);
drop policy if exists note_links_delete_edit_source on public.note_links;
create policy note_links_delete_edit_source on public.note_links for delete to authenticated using (
  private.note_owner_id(source_note_id) = auth.uid() or private.user_can_edit_note(source_note_id, auth.uid())
);
grant select, insert, delete on public.note_links to authenticated;
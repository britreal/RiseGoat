-- Allow notes to be assigned to multiple folders while retaining notes.folder_id
-- as a backwards-compatible primary folder for older clients and imports.
create table if not exists public.note_folder_links (
  note_id uuid not null references public.notes(id) on delete cascade,
  folder_id uuid not null references public.note_folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, folder_id)
);

create index if not exists note_folder_links_folder_idx
  on public.note_folder_links(folder_id, note_id);

-- Backfill the current single-folder relationship without moving or deleting any notes.
insert into public.note_folder_links (note_id, folder_id)
select id, folder_id
from public.notes
where folder_id is not null
on conflict (note_id, folder_id) do nothing;

alter table public.note_folder_links enable row level security;

drop policy if exists note_folder_links_select_accessible on public.note_folder_links;
create policy note_folder_links_select_accessible
on public.note_folder_links
for select to authenticated
using (
  (
    (select auth.uid()) = private.note_owner_id(note_id)
    or private.user_can_access_note(note_id, (select auth.uid()))
  )
  and private.note_folder_owner_id(folder_id) = private.note_owner_id(note_id)
);

drop policy if exists note_folder_links_insert_editable on public.note_folder_links;
create policy note_folder_links_insert_editable
on public.note_folder_links
for insert to authenticated
with check (
  (
    (select auth.uid()) = private.note_owner_id(note_id)
    or private.user_can_edit_note(note_id, (select auth.uid()))
  )
  and private.note_folder_owner_id(folder_id) = private.note_owner_id(note_id)
);

drop policy if exists note_folder_links_delete_editable on public.note_folder_links;
create policy note_folder_links_delete_editable
on public.note_folder_links
for delete to authenticated
using (
  (
    (select auth.uid()) = private.note_owner_id(note_id)
    or private.user_can_edit_note(note_id, (select auth.uid()))
  )
  and private.note_folder_owner_id(folder_id) = private.note_owner_id(note_id)
);

grant select, insert, delete on table public.note_folder_links to authenticated;

-- Map connections are displayed as undirected relationships. A user who can edit
-- either endpoint may remove the relationship, without deleting either note.
drop policy if exists note_links_delete_edit_source on public.note_links;
drop policy if exists note_links_delete_edit_either on public.note_links;
create policy note_links_delete_edit_either
on public.note_links
for delete to authenticated
using (
  private.note_owner_id(source_note_id) = (select auth.uid())
  or private.user_can_edit_note(source_note_id, (select auth.uid()))
  or private.note_owner_id(target_note_id) = (select auth.uid())
  or private.user_can_edit_note(target_note_id, (select auth.uid()))
);

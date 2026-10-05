-- Personal note folders.
create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

alter table public.notes
  add column if not exists folder_id uuid references public.note_folders(id) on delete set null;

create index if not exists note_folders_user_position_idx
  on public.note_folders(user_id, position);

create index if not exists notes_folder_idx
  on public.notes(folder_id);

alter table public.note_folders enable row level security;

drop policy if exists note_folders_select_owner on public.note_folders;
create policy note_folders_select_owner on public.note_folders
for select to authenticated using (user_id = auth.uid());

drop policy if exists note_folders_insert_owner on public.note_folders;
create policy note_folders_insert_owner on public.note_folders
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists note_folders_update_owner on public.note_folders;
create policy note_folders_update_owner on public.note_folders
for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists note_folders_delete_owner on public.note_folders;
create policy note_folders_delete_owner on public.note_folders
for delete to authenticated using (user_id = auth.uid());

create or replace function private.note_folder_owner_id(p_folder_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select f.user_id from public.note_folders f where f.id = p_folder_id limit 1;
$$;

revoke all on function private.note_folder_owner_id(uuid) from public, anon;
grant execute on function private.note_folder_owner_id(uuid) to authenticated;

drop policy if exists notes_update_accessible on public.notes;
create policy notes_update_accessible on public.notes
for update to authenticated
using (auth.uid() = user_id or private.user_can_edit_note(id, auth.uid()))
with check (
  user_id = private.note_owner_id(id)
  and (folder_id is null or private.note_folder_owner_id(folder_id) = private.note_owner_id(id))
  and (auth.uid() = user_id or private.user_can_edit_note(id, auth.uid()))
);

grant select, insert, update, delete on table public.note_folders to authenticated;

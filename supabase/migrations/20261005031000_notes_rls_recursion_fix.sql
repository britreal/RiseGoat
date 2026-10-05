create schema if not exists private;

create or replace function private.note_owner_id(p_note_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select n.user_id
  from public.notes n
  where n.id = p_note_id
  limit 1;
$$;

create or replace function private.user_can_access_note(p_note_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.note_collaborators c
    where c.note_id = p_note_id
      and c.user_id = p_user_id
      and c.status = 'accepted'
  );
$$;

create or replace function private.user_can_edit_note(p_note_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.note_collaborators c
    where c.note_id = p_note_id
      and c.user_id = p_user_id
      and c.status = 'accepted'
      and c.role = 'editor'
  );
$$;

revoke all on function private.note_owner_id(uuid) from public, anon;
revoke all on function private.user_can_access_note(uuid, uuid) from public, anon;
revoke all on function private.user_can_edit_note(uuid, uuid) from public, anon;
grant execute on function private.note_owner_id(uuid) to authenticated;
grant execute on function private.user_can_access_note(uuid, uuid) to authenticated;
grant execute on function private.user_can_edit_note(uuid, uuid) to authenticated;

drop policy if exists notes_select_accessible on public.notes;
create policy notes_select_accessible on public.notes
for select to authenticated
using (auth.uid() = user_id or private.user_can_access_note(id, auth.uid()));

drop policy if exists notes_update_accessible on public.notes;
create policy notes_update_accessible on public.notes
for update to authenticated
using (auth.uid() = user_id or private.user_can_edit_note(id, auth.uid()))
with check (
  user_id = private.note_owner_id(id)
  and (auth.uid() = user_id or private.user_can_edit_note(id, auth.uid()))
);

drop policy if exists note_collaborators_select on public.note_collaborators;
create policy note_collaborators_select on public.note_collaborators
for select to authenticated
using (user_id = auth.uid() or private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_collaborators_insert on public.note_collaborators;
create policy note_collaborators_insert on public.note_collaborators
for insert to authenticated
with check (
  private.note_owner_id(note_id) = auth.uid()
  or exists (
    select 1
    from public.note_share_invites i
    where i.note_id = note_collaborators.note_id
      and lower(i.email) = lower((select email from auth.users where id = auth.uid()))
      and i.accepted_at is null
      and i.expires_at > now()
  )
);

drop policy if exists note_collaborators_update on public.note_collaborators;
create policy note_collaborators_update on public.note_collaborators
for update to authenticated
using (private.note_owner_id(note_id) = auth.uid())
with check (private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_collaborators_delete on public.note_collaborators;
create policy note_collaborators_delete on public.note_collaborators
for delete to authenticated
using (private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_label_links_insert on public.note_label_links;
create policy note_label_links_insert on public.note_label_links
for insert to authenticated
with check (private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_label_links_delete on public.note_label_links;
create policy note_label_links_delete on public.note_label_links
for delete to authenticated
using (private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_checklist_delete on public.note_checklist_items;
create policy note_checklist_delete on public.note_checklist_items
for delete to authenticated
using (private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_share_invites_insert on public.note_share_invites;
create policy note_share_invites_insert on public.note_share_invites
for insert to authenticated
with check (inviter_id = auth.uid() and private.note_owner_id(note_id) = auth.uid());

drop policy if exists note_share_invites_update on public.note_share_invites;
create policy note_share_invites_update on public.note_share_invites
for update to authenticated
using (
  inviter_id = auth.uid()
  or private.note_owner_id(note_id) = auth.uid()
  or lower(email) = lower((select email from auth.users where id = auth.uid()))
)
with check (true);

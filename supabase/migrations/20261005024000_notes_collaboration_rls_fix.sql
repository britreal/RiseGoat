drop policy if exists note_collaborators_insert on public.note_collaborators;
create policy note_collaborators_insert on public.note_collaborators
for insert to authenticated
with check (
  exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid())
  or exists(
    select 1 from public.note_share_invites i
    where i.note_id=note_id
      and lower(i.email)=lower((select email from auth.users where id=auth.uid()))
      and i.accepted_at is null
      and i.expires_at>now()
  )
);
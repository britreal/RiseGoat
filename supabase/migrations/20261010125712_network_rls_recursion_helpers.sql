-- Break RLS recursion while keeping circle and room access scoped to accepted memberships.
create or replace function private.is_circle_owner(p_circle_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public'
as $$ select exists(select 1 from public.circles c where c.id=p_circle_id and c.owner_user_id=p_user_id); $$;

create or replace function private.is_circle_member(p_circle_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public'
as $$ select exists(select 1 from public.circle_members cm where cm.circle_id=p_circle_id and cm.user_id=p_user_id and cm.status='accepted'); $$;

create or replace function private.is_room_member(p_room_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public'
as $$ select exists(select 1 from public.network_room_members rm where rm.room_id=p_room_id and rm.user_id=p_user_id); $$;

create or replace function private.is_room_moderator(p_room_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path='pg_catalog','public'
as $$ select exists(select 1 from public.network_room_members rm where rm.room_id=p_room_id and rm.user_id=p_user_id and rm.role='moderator'); $$;

revoke all on function private.is_circle_owner(uuid,uuid) from public,anon;
revoke all on function private.is_circle_member(uuid,uuid) from public,anon;
revoke all on function private.is_room_member(uuid,uuid) from public,anon;
revoke all on function private.is_room_moderator(uuid,uuid) from public,anon;
grant execute on function private.is_circle_owner(uuid,uuid) to authenticated;
grant execute on function private.is_circle_member(uuid,uuid) to authenticated;
grant execute on function private.is_room_member(uuid,uuid) to authenticated;
grant execute on function private.is_room_moderator(uuid,uuid) to authenticated;

drop policy if exists circles_select_member on public.circles;
create policy circles_select_member on public.circles for select to authenticated
using(owner_user_id=auth.uid() or private.is_circle_member(id,auth.uid()) or exists(select 1 from public.circle_members cm where cm.circle_id=id and cm.user_id=auth.uid() and cm.status='pending') or public.is_admin());

drop policy if exists circle_members_select_related on public.circle_members;
create policy circle_members_select_related on public.circle_members for select to authenticated
using(user_id=auth.uid() or private.is_circle_owner(circle_id,auth.uid()) or private.is_circle_member(circle_id,auth.uid()) or public.is_admin());

drop policy if exists circle_members_insert_owner on public.circle_members;
create policy circle_members_insert_owner on public.circle_members for insert to authenticated
with check(private.is_circle_owner(circle_id,auth.uid()) and role='member' and status='pending' and exists(select 1 from public.member_profiles mp where mp.user_id=circle_members.user_id and mp.discoverable=true));

drop policy if exists circle_members_update_member_or_owner on public.circle_members;
create policy circle_members_update_member_or_owner on public.circle_members for update to authenticated
using(user_id=auth.uid() or private.is_circle_owner(circle_id,auth.uid()))
with check((user_id=auth.uid() and status='accepted' and role='member') or private.is_circle_owner(circle_id,auth.uid()));

drop policy if exists circle_members_delete_owner on public.circle_members;
create policy circle_members_delete_owner on public.circle_members for delete to authenticated
using(private.is_circle_owner(circle_id,auth.uid()));

drop policy if exists circle_notes_select_member on public.circle_notes;
create policy circle_notes_select_member on public.circle_notes for select to authenticated
using(private.is_circle_member(circle_id,auth.uid()) or public.is_admin());

drop policy if exists circle_notes_insert_member on public.circle_notes;
create policy circle_notes_insert_member on public.circle_notes for insert to authenticated
with check(created_by=auth.uid() and private.is_circle_member(circle_id,auth.uid()));

drop policy if exists circle_notes_update_member on public.circle_notes;
create policy circle_notes_update_member on public.circle_notes for update to authenticated
using(private.is_circle_member(circle_id,auth.uid()))
with check(private.is_circle_member(circle_id,auth.uid()));

drop policy if exists circle_notes_delete_author_or_owner on public.circle_notes;
create policy circle_notes_delete_author_or_owner on public.circle_notes for delete to authenticated
using(created_by=auth.uid() or private.is_circle_owner(circle_id,auth.uid()) or public.is_admin());

drop policy if exists network_room_members_select on public.network_room_members;
create policy network_room_members_select on public.network_room_members for select to authenticated
using(user_id=auth.uid() or private.is_room_member(room_id,auth.uid()) or public.is_admin());

drop policy if exists network_room_notes_select_member on public.network_room_notes;
create policy network_room_notes_select_member on public.network_room_notes for select to authenticated
using(public.is_admin() or private.is_room_member(room_id,auth.uid()));

drop policy if exists network_room_notes_insert_member on public.network_room_notes;
create policy network_room_notes_insert_member on public.network_room_notes for insert to authenticated
with check(created_by=auth.uid() and private.is_room_member(room_id,auth.uid()));

drop policy if exists network_room_notes_update_author_or_moderator on public.network_room_notes;
create policy network_room_notes_update_author_or_moderator on public.network_room_notes for update to authenticated
using(created_by=auth.uid() or private.is_room_moderator(room_id,auth.uid()) or public.is_admin())
with check(created_by=auth.uid() or private.is_room_moderator(room_id,auth.uid()) or public.is_admin());

drop policy if exists network_room_notes_delete_author_or_moderator on public.network_room_notes;
create policy network_room_notes_delete_author_or_moderator on public.network_room_notes for delete to authenticated
using(created_by=auth.uid() or private.is_room_moderator(room_id,auth.uid()) or public.is_admin());

create or replace function public.add_circle_member(p_circle_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null or not exists(select 1 from public.circles where id=p_circle_id and owner_user_id=v_user) then
    raise exception 'Somente o dono do círculo pode convidar membros.';
  end if;
  if not exists(select 1 from public.member_profiles where user_id=p_user_id and discoverable=true) then
    raise exception 'Este membro não está disponível no diretório.';
  end if;
  if exists(select 1 from public.circle_members where circle_id=p_circle_id and user_id=p_user_id and status='accepted') then
    raise exception 'Este membro já participa do círculo.';
  end if;
  insert into public.circle_members(circle_id,user_id,role,status,invited_by)
  values(p_circle_id,p_user_id,'member','pending',v_user)
  on conflict(circle_id,user_id) do update set status='pending',invited_by=v_user,invited_at=now();
  insert into public.member_notifications(user_id,notification_type,title,body,href)
  values(p_user_id,'circle_invite','Convite para um círculo','Você recebeu um convite para participar de um círculo privado.','/network');
  return true;
end; $$;
revoke all on function public.add_circle_member(uuid,uuid) from public,anon;
grant execute on function public.add_circle_member(uuid,uuid) to authenticated;

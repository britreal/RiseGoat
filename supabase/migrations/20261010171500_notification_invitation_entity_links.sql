-- Associate in-app notifications with their invitation record so failed sends can be reconciled precisely.
alter table public.member_notifications add column if not exists entity_id uuid;
create index if not exists member_notifications_entity_idx on public.member_notifications(notification_type,entity_id);

create or replace function public.notify_note_share_invite()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user uuid;
begin
  select id into v_user from auth.users where lower(email)=lower(new.email) limit 1;
  if v_user is not null then
    insert into public.member_notifications(user_id,notification_type,title,body,href,entity_id)
    values(v_user,'note_share_invite','Convite para uma nota','Um membro compartilhou uma nota com você.','/network',new.id);
  end if;
  return new;
end; $$;
revoke all on function public.notify_note_share_invite() from public,anon,authenticated;

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
  insert into public.member_notifications(user_id,notification_type,title,body,href,entity_id)
  values(p_user_id,'circle_invite','Convite para um círculo','Você recebeu um convite para participar de um círculo privado.','/network',p_circle_id);
  return true;
end; $$;
revoke all on function public.add_circle_member(uuid,uuid) from public,anon;
grant execute on function public.add_circle_member(uuid,uuid) to authenticated;

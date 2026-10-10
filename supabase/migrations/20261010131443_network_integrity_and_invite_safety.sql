-- Keep referral attribution referentially valid and do not reset an accepted circle member to pending.
alter table public.waitlist_signups drop constraint if exists waitlist_signups_referral_code_id_fkey;
alter table public.waitlist_signups add constraint waitlist_signups_referral_code_id_fkey
  foreign key (referral_code_id) references public.member_referral_codes(id) on delete set null;

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

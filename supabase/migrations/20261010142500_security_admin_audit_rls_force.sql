-- Security phase 1: force RLS on existing public app tables and add an admin access audit trail.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;
insert into public.admin_users(user_id,created_at)
select user_id,created_at from public.app_admins on conflict(user_id) do nothing;

drop policy if exists admin_users_select_self_or_admin on public.admin_users;
create policy admin_users_select_self_or_admin on public.admin_users for select to authenticated
using(user_id=auth.uid() or public.is_admin());
revoke all on public.admin_users from public,anon,authenticated;
grant select on public.admin_users to authenticated;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action_key text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint admin_audit_action_length check(char_length(action_key) between 1 and 80),
  constraint admin_audit_entity_type_length check(entity_type is null or char_length(entity_type)<=80)
);
alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;
create index if not exists admin_audit_actor_occurred_idx on public.admin_audit_log(actor_id,occurred_at desc);
create index if not exists admin_audit_action_occurred_idx on public.admin_audit_log(action_key,occurred_at desc);
drop policy if exists admin_audit_select_admin on public.admin_audit_log;
create policy admin_audit_select_admin on public.admin_audit_log for select to authenticated using(public.is_admin());
revoke all on public.admin_audit_log from public,anon,authenticated;
grant select on public.admin_audit_log to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path='pg_catalog','public'
as $$
  select exists(select 1 from public.admin_users au where au.user_id=auth.uid())
      or exists(select 1 from public.app_admins aa where aa.user_id=auth.uid());
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.sync_admin_users_from_app_admins()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if tg_op='INSERT' then
    insert into public.admin_users(user_id,created_at) values(new.user_id,new.created_at) on conflict(user_id) do nothing;
    return new;
  elsif tg_op='DELETE' then
    delete from public.admin_users where user_id=old.user_id;
    return old;
  end if;
  return null;
end; $$;
drop trigger if exists sync_admin_users_from_app_admins on public.app_admins;
create trigger sync_admin_users_from_app_admins after insert or delete on public.app_admins
for each row execute function public.sync_admin_users_from_app_admins();
revoke all on function public.sync_admin_users_from_app_admins() from public,anon,authenticated;

create or replace function public.log_admin_access(p_section text default 'network_dashboard')
returns void language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_section text:=coalesce(nullif(trim(p_section),''),'network_dashboard');
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  if v_section not in ('network_dashboard','waitlist','moderation','network_metrics','tabuleiro') then
    raise exception 'Seção de auditoria inválida.';
  end if;
  insert into public.admin_audit_log(actor_id,action_key,entity_type,metadata)
  values(auth.uid(),'admin_dashboard_open','admin_panel',jsonb_build_object('section',v_section));
end; $$;
revoke all on function public.log_admin_access(text) from public,anon;
grant execute on function public.log_admin_access(text) to authenticated;

create or replace function public.audit_admin_waitlist_change()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if old.status is distinct from new.status and (public.is_admin() or new.reviewed_by=auth.uid()) then
    insert into public.admin_audit_log(actor_id,action_key,entity_type,entity_id,metadata)
    values(coalesce(auth.uid(),new.reviewed_by),'waitlist_status_changed','waitlist_signup',new.id,jsonb_build_object('from',old.status,'to',new.status));
  end if;
  return new;
end; $$;
drop trigger if exists admin_audit_waitlist_status on public.waitlist_signups;
create trigger admin_audit_waitlist_status after update of status on public.waitlist_signups
for each row execute function public.audit_admin_waitlist_change();
revoke all on function public.audit_admin_waitlist_change() from public,anon,authenticated;

create or replace function public.audit_admin_access_invite_change()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_actor uuid:=auth.uid();
begin
  if tg_op='INSERT' then
    if public.is_admin() then
      insert into public.admin_audit_log(actor_id,action_key,entity_type,entity_id,metadata)
      values(v_actor,'member_invite_created','member_access_invite',new.id,jsonb_build_object('status',new.status));
    end if;
    return new;
  end if;
  if old.status is distinct from new.status and public.is_admin() then
    insert into public.admin_audit_log(actor_id,action_key,entity_type,entity_id,metadata)
    values(v_actor,'member_invite_status_changed','member_access_invite',new.id,jsonb_build_object('from',old.status,'to',new.status));
  end if;
  return new;
end; $$;
drop trigger if exists admin_audit_member_access_invite on public.member_access_invites;
create trigger admin_audit_member_access_invite after insert or update of status on public.member_access_invites
for each row execute function public.audit_admin_access_invite_change();
revoke all on function public.audit_admin_access_invite_change() from public,anon,authenticated;

update storage.buckets set public=false where id='notes-media';
drop policy if exists notes_media_select on storage.objects;
create policy notes_media_select on storage.objects for select to authenticated
using (
  bucket_id='notes-media'
  and (
    (storage.foldername(name))[1]=(select auth.uid()::text)
    or ((storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
      and private.user_can_access_note(((storage.foldername(name))[2])::uuid,auth.uid()))
  )
);

-- Every public application table had RLS enabled and at least one policy at audit time.
-- FORCE RLS closes bypass for non-superuser table owners; service_role still bypasses RLS by design.
do $$
declare r record;
begin
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  loop
    execute format('alter table public.%I force row level security',r.relname);
  end loop;
end $$;

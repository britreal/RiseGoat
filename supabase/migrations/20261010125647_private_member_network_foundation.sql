-- Private member network foundation.
-- The existing notes tables remain personal by default. Circle and room content uses separate tables.

alter table public.waitlist_signups
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists referral_inviter_id uuid references auth.users(id) on delete set null,
  add column if not exists referral_code_id uuid;

alter table public.waitlist_signups drop constraint if exists waitlist_signups_status_check;
alter table public.waitlist_signups add constraint waitlist_signups_status_check
  check (status in ('pending','approved','declined','invited','joined'));

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  city text not null default '',
  industry text not null default '',
  current_focus text not null default '',
  contact_topic text not null default '',
  accepts_introductions boolean not null default false,
  discoverable boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_profiles enable row level security;

create table if not exists public.member_referral_codes (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  code_hash text not null unique,
  status text not null default 'available' check (status in ('available','redeemed','revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '365 days',
  redeemed_by_signup_id uuid references public.waitlist_signups(id) on delete set null,
  redeemed_at timestamptz
);
alter table public.member_referral_codes enable row level security;
alter table public.waitlist_signups
  add column if not exists referral_code_id uuid;
alter table public.waitlist_signups drop constraint if exists waitlist_signups_referral_code_id_fkey;
alter table public.waitlist_signups add constraint waitlist_signups_referral_code_id_fkey
  foreign key (referral_code_id) references public.member_referral_codes(id) on delete set null;

create table if not exists public.member_access_invites (
  id uuid primary key default gen_random_uuid(),
  waitlist_signup_id uuid not null references public.waitlist_signups(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null default 'sent' check (status in ('sent','accepted','expired','revoked')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz
);
alter table public.member_access_invites enable row level security;

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null default '',
  href text not null default '/network',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.member_notifications enable row level security;
create index if not exists member_notifications_user_unread_idx
  on public.member_notifications(user_id, created_at desc) where read_at is null;

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  purpose text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circles_name_length check (char_length(trim(name)) between 1 and 80)
);
alter table public.circles enable row level security;

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  status text not null default 'pending' check (status in ('pending','accepted')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key(circle_id,user_id)
);
alter table public.circle_members enable row level security;
create index if not exists circle_members_user_idx on public.circle_members(user_id,status);

create table if not exists public.circle_notes (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null default '',
  content text not null default '',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.circle_notes enable row level security;
create index if not exists circle_notes_circle_updated_idx on public.circle_notes(circle_id,updated_at desc);

create table if not exists public.network_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.network_rooms enable row level security;

create table if not exists public.network_room_members (
  room_id uuid not null references public.network_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in ('member','moderator')),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
alter table public.network_room_members enable row level security;

create table if not exists public.network_room_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.network_rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null default '',
  content text not null default '',
  status text not null default 'published' check(status in ('draft','published')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.network_room_notes enable row level security;
create index if not exists network_room_notes_room_created_idx on public.network_room_notes(room_id,created_at desc);

create table if not exists public.introduction_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null default '',
  status text not null default 'pending' check(status in ('pending','introduced','declined','closed')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint introduction_not_self check(requester_id<>target_user_id)
);
alter table public.introduction_requests enable row level security;

create table if not exists public.onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','scheduled','completed','cancelled')),
  note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz
);
alter table public.onboarding_requests enable row level security;

create table if not exists public.member_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
alter table public.member_activity_events enable row level security;
create index if not exists member_activity_events_user_date_idx on public.member_activity_events(user_id,occurred_at desc);
create index if not exists member_activity_events_date_idx on public.member_activity_events(occurred_at desc);

insert into public.network_rooms(slug,name,description)
values
  ('capital','Capital','Estratégia, capital, financiamento e alocação de recursos.'),
  ('imoveis','Imóveis','Teses, oportunidades e operação imobiliária.'),
  ('inteligencia-artificial','IA','Aplicações práticas, sistemas e negócios com IA.'),
  ('filantropia','Filantropia','Projetos, impacto e iniciativas de longo prazo.')
on conflict(slug) do nothing;

drop policy if exists member_profiles_select_visible on public.member_profiles;
create policy member_profiles_select_visible on public.member_profiles for select to authenticated
using(user_id=auth.uid() or discoverable=true or public.is_admin());
drop policy if exists member_profiles_insert_self on public.member_profiles;
create policy member_profiles_insert_self on public.member_profiles for insert to authenticated with check(user_id=auth.uid());
drop policy if exists member_profiles_update_self on public.member_profiles;
create policy member_profiles_update_self on public.member_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists member_referral_codes_select_self on public.member_referral_codes;
create policy member_referral_codes_select_self on public.member_referral_codes for select to authenticated
using(inviter_id=auth.uid() or public.is_admin());

drop policy if exists member_access_invites_admin_select on public.member_access_invites;
create policy member_access_invites_admin_select on public.member_access_invites for select to authenticated using(public.is_admin());

drop policy if exists member_notifications_select_self on public.member_notifications;
create policy member_notifications_select_self on public.member_notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists member_notifications_update_self on public.member_notifications;
create policy member_notifications_update_self on public.member_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists circles_select_member on public.circles;
create policy circles_select_member on public.circles for select to authenticated
using(owner_user_id=auth.uid() or exists(select 1 from public.circle_members cm where cm.circle_id=id and cm.user_id=auth.uid()) or public.is_admin());
drop policy if exists circles_insert_owner on public.circles;
create policy circles_insert_owner on public.circles for insert to authenticated with check(owner_user_id=auth.uid());
drop policy if exists circles_update_owner on public.circles;
create policy circles_update_owner on public.circles for update to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());
drop policy if exists circles_delete_owner on public.circles;
create policy circles_delete_owner on public.circles for delete to authenticated using(owner_user_id=auth.uid());

drop policy if exists circle_members_select_related on public.circle_members;
create policy circle_members_select_related on public.circle_members for select to authenticated
using(user_id=auth.uid() or exists(select 1 from public.circles c where c.id=circle_id and c.owner_user_id=auth.uid()) or exists(select 1 from public.circle_members cm where cm.circle_id=circle_members.circle_id and cm.user_id=auth.uid() and cm.status='accepted') or public.is_admin());
drop policy if exists circle_members_insert_owner on public.circle_members;
create policy circle_members_insert_owner on public.circle_members for insert to authenticated
with check(exists(select 1 from public.circles c where c.id=circle_id and c.owner_user_id=auth.uid()) and role='member' and status='pending' and exists(select 1 from public.member_profiles mp where mp.user_id=circle_members.user_id and mp.discoverable=true));
drop policy if exists circle_members_update_member_or_owner on public.circle_members;
create policy circle_members_update_member_or_owner on public.circle_members for update to authenticated
using(user_id=auth.uid() or exists(select 1 from public.circles c where c.id=circle_id and c.owner_user_id=auth.uid()))
with check((user_id=auth.uid() and status='accepted' and role='member') or exists(select 1 from public.circles c where c.id=circle_id and c.owner_user_id=auth.uid()));
drop policy if exists circle_members_delete_owner on public.circle_members;
create policy circle_members_delete_owner on public.circle_members for delete to authenticated
using(exists(select 1 from public.circles c where c.id=circle_id and c.owner_user_id=auth.uid()));

create or replace function public.enforce_circle_size()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if (select count(*) from public.circle_members where circle_id=new.circle_id and (tg_op<>'UPDATE' or user_id<>old.user_id))>=12 then
    raise exception 'Um círculo pode ter no máximo 12 participantes.';
  end if;
  return new;
end; $$;
drop trigger if exists circle_size_guard on public.circle_members;
create trigger circle_size_guard before insert or update on public.circle_members for each row execute function public.enforce_circle_size();

drop policy if exists circle_notes_select_member on public.circle_notes;
create policy circle_notes_select_member on public.circle_notes for select to authenticated
using(exists(select 1 from public.circle_members cm where cm.circle_id=circle_id and cm.user_id=auth.uid() and cm.status='accepted') or public.is_admin());
drop policy if exists circle_notes_insert_member on public.circle_notes;
create policy circle_notes_insert_member on public.circle_notes for insert to authenticated
with check(created_by=auth.uid() and exists(select 1 from public.circle_members cm where cm.circle_id=circle_id and cm.user_id=auth.uid() and cm.status='accepted'));
drop policy if exists circle_notes_update_member on public.circle_notes;
create policy circle_notes_update_member on public.circle_notes for update to authenticated
using(exists(select 1 from public.circle_members cm where cm.circle_id=circle_id and cm.user_id=auth.uid() and cm.status='accepted'))
with check(exists(select 1 from public.circle_members cm where cm.circle_id=circle_id and cm.user_id=auth.uid() and cm.status='accepted'));
drop policy if exists circle_notes_delete_author_or_owner on public.circle_notes;
create policy circle_notes_delete_author_or_owner on public.circle_notes for delete to authenticated
using(created_by=auth.uid() or exists(select 1 from public.circles c where c.id=circle_id and c.owner_user_id=auth.uid()) or public.is_admin());

drop policy if exists network_rooms_select_active on public.network_rooms;
create policy network_rooms_select_active on public.network_rooms for select to authenticated using(is_active or public.is_admin());
drop policy if exists network_rooms_admin_insert on public.network_rooms;
create policy network_rooms_admin_insert on public.network_rooms for insert to authenticated with check(public.is_admin());
drop policy if exists network_rooms_admin_update on public.network_rooms;
create policy network_rooms_admin_update on public.network_rooms for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists network_rooms_admin_delete on public.network_rooms;
create policy network_rooms_admin_delete on public.network_rooms for delete to authenticated using(public.is_admin());

drop policy if exists network_room_members_select on public.network_room_members;
create policy network_room_members_select on public.network_room_members for select to authenticated
using(user_id=auth.uid() or exists(select 1 from public.network_room_members rm where rm.room_id=room_id and rm.user_id=auth.uid()) or public.is_admin());
drop policy if exists network_room_members_insert_self on public.network_room_members;
create policy network_room_members_insert_self on public.network_room_members for insert to authenticated
with check(user_id=auth.uid() and role='member' and exists(select 1 from public.network_rooms r where r.id=room_id and r.is_active));
drop policy if exists network_room_members_delete_self_or_admin on public.network_room_members;
create policy network_room_members_delete_self_or_admin on public.network_room_members for delete to authenticated using(user_id=auth.uid() or public.is_admin());

drop policy if exists network_room_notes_select_member on public.network_room_notes;
create policy network_room_notes_select_member on public.network_room_notes for select to authenticated
using(public.is_admin() or exists(select 1 from public.network_room_members rm where rm.room_id=room_id and rm.user_id=auth.uid()));
drop policy if exists network_room_notes_insert_member on public.network_room_notes;
create policy network_room_notes_insert_member on public.network_room_notes for insert to authenticated
with check(created_by=auth.uid() and exists(select 1 from public.network_room_members rm where rm.room_id=room_id and rm.user_id=auth.uid()));
drop policy if exists network_room_notes_update_author_or_moderator on public.network_room_notes;
create policy network_room_notes_update_author_or_moderator on public.network_room_notes for update to authenticated
using(created_by=auth.uid() or exists(select 1 from public.network_room_members rm where rm.room_id=room_id and rm.user_id=auth.uid() and rm.role='moderator') or public.is_admin())
with check(created_by=auth.uid() or exists(select 1 from public.network_room_members rm where rm.room_id=room_id and rm.user_id=auth.uid() and rm.role='moderator') or public.is_admin());
drop policy if exists network_room_notes_delete_author_or_moderator on public.network_room_notes;
create policy network_room_notes_delete_author_or_moderator on public.network_room_notes for delete to authenticated
using(created_by=auth.uid() or exists(select 1 from public.network_room_members rm where rm.room_id=room_id and rm.user_id=auth.uid() and rm.role='moderator') or public.is_admin());

drop policy if exists introduction_requests_select_requester_admin on public.introduction_requests;
create policy introduction_requests_select_requester_admin on public.introduction_requests for select to authenticated using(requester_id=auth.uid() or public.is_admin());
drop policy if exists introduction_requests_insert_member on public.introduction_requests;
create policy introduction_requests_insert_member on public.introduction_requests for insert to authenticated
with check(requester_id=auth.uid() and exists(select 1 from public.member_profiles mp where mp.user_id=target_user_id and mp.discoverable=true and mp.accepts_introductions=true));
drop policy if exists introduction_requests_update_admin on public.introduction_requests;
create policy introduction_requests_update_admin on public.introduction_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists onboarding_requests_select_owner_admin on public.onboarding_requests;
create policy onboarding_requests_select_owner_admin on public.onboarding_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists onboarding_requests_insert_self on public.onboarding_requests;
create policy onboarding_requests_insert_self on public.onboarding_requests for insert to authenticated with check(user_id=auth.uid());
drop policy if exists onboarding_requests_update_admin on public.onboarding_requests;
create policy onboarding_requests_update_admin on public.onboarding_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());

drop policy if exists member_activity_select_owner_admin on public.member_activity_events;
create policy member_activity_select_owner_admin on public.member_activity_events for select to authenticated using(user_id=auth.uid() or public.is_admin());

create or replace function public.seed_member_profile()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  insert into public.member_profiles(user_id,display_name)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),split_part(coalesce(new.email,''),'@',1)))
  on conflict(user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_member_profile on auth.users;
create trigger on_auth_user_created_member_profile after insert on auth.users for each row execute function public.seed_member_profile();

insert into public.member_profiles(user_id,display_name)
select u.id,coalesce(nullif(trim(p.display_name),''),split_part(coalesce(u.email,''),'@',1))
from auth.users u left join public.profiles p on p.id=u.id
on conflict(user_id) do nothing;

create or replace function public.create_my_referral_code()
returns table(code_id uuid,invite_code text,expires_at timestamptz)
language plpgsql security definer set search_path='pg_catalog','public','extensions'
as $$
declare v_user uuid:=auth.uid(); v_code text; v_row public.member_referral_codes%rowtype;
begin
  if v_user is null then raise exception 'Autenticação necessária.'; end if;
  select * into v_row from public.member_referral_codes where inviter_id=v_user;
  if found then return query select v_row.id,v_row.code,v_row.expires_at; return; end if;
  v_code:='RG-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.member_referral_codes(inviter_id,code,code_hash)
  values(v_user,v_code,encode(extensions.digest(v_code,'sha256'),'hex')) returning * into v_row;
  return query select v_row.id,v_row.code,v_row.expires_at;
end; $$;
revoke all on function public.create_my_referral_code() from public,anon;
grant execute on function public.create_my_referral_code() to authenticated;

create or replace function public.request_membership(p_name text,p_email text,p_referral_code text default null)
returns uuid language plpgsql security definer set search_path='pg_catalog','public','extensions'
as $$
declare v_name text:=trim(coalesce(p_name,'')); v_email text:=lower(trim(coalesce(p_email,''))); v_code public.member_referral_codes%rowtype; v_signup uuid;
begin
  if length(v_name)<1 or length(v_name)>120 then raise exception 'Informe um nome válido.'; end if;
  if length(v_email)<3 or length(v_email)>320 or v_email !~ '^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$' then raise exception 'Informe um e-mail válido.'; end if;
  if exists(select 1 from public.waitlist_signups w where lower(w.email)=v_email and w.status in ('pending','approved','invited','joined')) then
    raise exception 'Este e-mail já possui uma solicitação registrada.';
  end if;
  if nullif(trim(coalesce(p_referral_code,'')),'') is not null then
    select * into v_code from public.member_referral_codes c
    where c.code_hash=encode(extensions.digest(upper(trim(p_referral_code)),'sha256'),'hex') and c.status='available' and c.expires_at>now()
    for update;
    if not found then raise exception 'Código de convite inválido, expirado ou já usado.'; end if;
  end if;
  insert into public.waitlist_signups(name,email,source,status,referral_inviter_id,referral_code_id)
  values(v_name,v_email,'auth_page','pending',v_code.inviter_id,v_code.id) returning id into v_signup;
  if v_code.id is not null then update public.member_referral_codes set status='redeemed',redeemed_at=now(),redeemed_by_signup_id=v_signup where id=v_code.id; end if;
  return v_signup;
end; $$;
revoke all on function public.request_membership(text,text,text) from public;
grant execute on function public.request_membership(text,text,text) to anon,authenticated;

create or replace function public.review_waitlist_signup(p_signup_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  if p_status not in ('approved','declined') then raise exception 'Status inválido.'; end if;
  update public.waitlist_signups set status=p_status,reviewed_by=auth.uid(),reviewed_at=now()
  where id=p_signup_id and status in ('pending','approved','declined');
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  return true;
end; $$;
revoke all on function public.review_waitlist_signup(uuid,text) from public,anon;
grant execute on function public.review_waitlist_signup(uuid,text) to authenticated;

create or replace function public.issue_member_access_invite(p_signup_id uuid)
returns table(invite_id uuid,invite_email text,invite_token text,expires_at timestamptz)
language plpgsql security definer set search_path='pg_catalog','public','extensions'
as $$
declare v_signup public.waitlist_signups%rowtype; v_token text; v_invite public.member_access_invites%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  select * into v_signup from public.waitlist_signups where id=p_signup_id for update;
  if not found or v_signup.status not in ('approved','invited') then raise exception 'A solicitação precisa estar aprovada antes do convite.'; end if;
  update public.member_access_invites set status='revoked' where waitlist_signup_id=p_signup_id and status='sent';
  v_token:=encode(extensions.gen_random_bytes(24),'hex');
  insert into public.member_access_invites(waitlist_signup_id,email,token_hash,status,created_by)
  values(p_signup_id,lower(v_signup.email),encode(extensions.digest(v_token,'sha256'),'hex'),'sent',auth.uid())
  returning * into v_invite;
  update public.waitlist_signups set status='invited' where id=p_signup_id;
  return query select v_invite.id,v_invite.email,v_token,v_invite.expires_at;
end; $$;
revoke all on function public.issue_member_access_invite(uuid) from public,anon;
grant execute on function public.issue_member_access_invite(uuid) to authenticated;

create or replace function public.accept_member_access_invite(p_token text)
returns boolean language plpgsql security definer set search_path='pg_catalog','public','extensions'
as $$
declare v_user uuid:=auth.uid(); v_email text; v_invite public.member_access_invites%rowtype;
begin
  if v_user is null then raise exception 'Entre pela ligação enviada ao seu e-mail.'; end if;
  select lower(email) into v_email from auth.users where id=v_user;
  select * into v_invite from public.member_access_invites
  where token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and lower(email)=v_email and status='sent' and expires_at>now()
  for update;
  if not found then raise exception 'Convite de acesso inválido, expirado ou destinado a outro e-mail.'; end if;
  update public.member_access_invites set status='accepted',accepted_by=v_user,accepted_at=now() where id=v_invite.id;
  update public.waitlist_signups set status='joined' where id=v_invite.waitlist_signup_id;
  insert into public.member_profiles(user_id,display_name) values(v_user,split_part(coalesce(v_email,''),'@',1)) on conflict(user_id) do nothing;
  return true;
end; $$;
revoke all on function public.accept_member_access_invite(text) from public,anon;
grant execute on function public.accept_member_access_invite(text) to authenticated;

create or replace function public.create_circle(p_name text,p_purpose text default '')
returns uuid language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Autenticação necessária.'; end if;
  if length(trim(coalesce(p_name,'')))<1 or length(trim(p_name))>80 then raise exception 'Nome do círculo inválido.'; end if;
  insert into public.circles(owner_user_id,name,purpose) values(v_user,trim(p_name),left(trim(coalesce(p_purpose,'')),500)) returning id into v_id;
  insert into public.circle_members(circle_id,user_id,role,status,accepted_at) values(v_id,v_user,'owner','accepted',now());
  return v_id;
end; $$;
revoke all on function public.create_circle(text,text) from public,anon;
grant execute on function public.create_circle(text,text) to authenticated;

create or replace function public.add_circle_member(p_circle_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null or not exists(select 1 from public.circles where id=p_circle_id and owner_user_id=v_user) then raise exception 'Somente o dono do círculo pode convidar membros.'; end if;
  if not exists(select 1 from public.member_profiles where user_id=p_user_id and discoverable=true) then raise exception 'Este membro não está disponível no diretório.'; end if;
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

create or replace function public.block_new_signups()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if lower(coalesce(new.email,''))=lower('ibritreal@gmail.com') then return new; end if;
  if exists(select 1 from public.note_share_invites i where lower(i.email)=lower(coalesce(new.email,'')) and i.accepted_at is null and i.expires_at>now()) then return new; end if;
  if exists(select 1 from public.member_access_invites i where lower(i.email)=lower(coalesce(new.email,'')) and i.status='sent' and i.expires_at>now()) then return new; end if;
  raise exception using errcode='P0001',message='Acesso fechado. Solicite convite e aguarde a aprovação.';
end; $$;
drop trigger if exists risegoat_block_new_signups on auth.users;
create trigger risegoat_block_new_signups before insert on auth.users for each row execute function public.block_new_signups();

create or replace function public.notify_note_share_invite()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user uuid;
begin
  select id into v_user from auth.users where lower(email)=lower(new.email) limit 1;
  if v_user is not null then
    insert into public.member_notifications(user_id,notification_type,title,body,href)
    values(v_user,'note_share_invite','Convite para uma nota','Um membro compartilhou uma nota com você.','/network');
  end if;
  return new;
end; $$;
drop trigger if exists note_share_invite_notification on public.note_share_invites;
create trigger note_share_invite_notification after insert on public.note_share_invites for each row execute function public.notify_note_share_invite();

create or replace function public.track_member_note_metadata()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if tg_op='INSERT' then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.user_id,'note_created','note',jsonb_build_object('folder_id',new.folder_id));
  elsif tg_op='UPDATE' and (old.is_pinned is distinct from new.is_pinned or old.is_archived is distinct from new.is_archived or old.is_deleted is distinct from new.is_deleted) then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.user_id,case when old.is_pinned is distinct from new.is_pinned then 'note_pin_changed' when old.is_archived is distinct from new.is_archived then 'note_archive_changed' else 'note_trash_changed' end,'note',jsonb_build_object('folder_id',new.folder_id));
  end if;
  return new;
end; $$;
drop trigger if exists track_member_note_metadata_event on public.notes;
create trigger track_member_note_metadata_event after insert or update of is_pinned,is_archived,is_deleted on public.notes for each row execute function public.track_member_note_metadata();

-- Existing identity and note-sharing policies remain governed by their own migrations.

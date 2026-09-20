-- Security hardening for the waitlist phase.
do $$
declare v_admin_id uuid;
begin
  select id into v_admin_id from auth.users where lower(email) = lower('ibritreal@gmail.com') limit 1;
  if v_admin_id is null then raise exception 'Admin user ibritreal@gmail.com was not found'; end if;
  delete from public.app_admins;
  insert into public.app_admins(user_id) values (v_admin_id) on conflict (user_id) do nothing;
end
$$;

revoke all on table public.app_admins from public, anon, authenticated;
grant select on table public.app_admins to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = pg_catalog
as $$ select exists (select 1 from public.app_admins where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "read own admin membership" on public.app_admins;
create policy "read own admin membership" on public.app_admins for select to authenticated using (user_id = auth.uid());

revoke all on table public.waitlist_signups from public, anon, authenticated;
grant insert on table public.waitlist_signups to anon;
grant select on table public.waitlist_signups to authenticated;
drop policy if exists "public_can_join_waitlist" on public.waitlist_signups;
create policy "public_can_join_waitlist" on public.waitlist_signups for insert to anon with check (source = 'auth_page' and length(trim(name)) between 1 and 120 and length(trim(email)) between 3 and 320 and email = lower(trim(email)) and email ~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$');
drop policy if exists "admin_can_read_waitlist" on public.waitlist_signups;
create policy "admin_can_read_waitlist" on public.waitlist_signups for select to authenticated using (public.is_admin());

create or replace function public.block_new_signups()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
begin
  if lower(coalesce(new.email, '')) <> lower('ibritreal@gmail.com') then
    raise exception using errcode = 'P0001', message = 'Cadastro fechado. Entre na lista de espera para receber um aviso quando abrir.';
  end if;
  return new;
end;
$$;
revoke all on function public.block_new_signups() from public, anon, authenticated;
drop trigger if exists risegoat_block_new_signups on auth.users;
create trigger risegoat_block_new_signups before insert on auth.users for each row execute function public.block_new_signups();

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename <> 'waitlist_signups'
  loop execute format('revoke all on table public.%I from anon', r.tablename); end loop;
end
$$;

revoke all on function public.unsubscribe_newsletter(uuid) from public, anon, authenticated;
grant execute on function public.unsubscribe_newsletter(uuid) to anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.api_rate_limits (id bigserial primary key, request_ip inet not null, role_name text not null, request_at timestamptz not null default now());
revoke all on table private.api_rate_limits from public, anon, authenticated;
create index if not exists api_rate_limits_ip_time_idx on private.api_rate_limits (request_ip, request_at desc);
create or replace function public.check_api_request()
returns void language plpgsql security definer set search_path = pg_catalog, private
as $$
declare
  req_method text := current_setting('request.method', true);
  req_headers jsonb := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  req_claims jsonb := coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb;
  req_role text := coalesce(req_claims->>'role', 'anon');
  ip_text text := trim(split_part(coalesce(req_headers->>'x-forwarded-for', ''), ',', 1));
  req_ip inet;
  max_requests integer;
  recent_count integer;
begin
  if req_method is null or req_method in ('GET', 'HEAD', 'OPTIONS') then return; end if;
  if req_role = 'service_role' then return; end if;
  if ip_text = '' then return; end if;
  begin req_ip := ip_text::inet; exception when others then return; end;
  max_requests := case when req_role = 'anon' then 10 else 120 end;
  select count(*)::integer into recent_count from private.api_rate_limits where request_ip = req_ip and role_name = req_role and request_at > now() - interval '5 minutes';
  if recent_count >= max_requests then
    raise sqlstate 'PGRST' using message = json_build_object('message', 'Muitas tentativas. Tente novamente em alguns minutos.')::text, detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;
  insert into private.api_rate_limits(request_ip, role_name) values (req_ip, req_role);
  delete from private.api_rate_limits where request_at < now() - interval '1 hour';
end;
$$;
revoke all on function public.check_api_request() from public, anon, authenticated;
grant execute on function public.check_api_request() to authenticator;
alter role authenticator set pgrst.db_pre_request = 'public.check_api_request';

alter function public.authority_refresh_leverage(uuid) security invoker;
alter function public.authority_run_radar(uuid) security invoker;
revoke all on function public.authority_refresh_leverage(uuid) from public, anon, authenticated;
grant execute on function public.authority_refresh_leverage(uuid) to authenticated;
revoke all on function public.authority_run_radar(uuid) from public, anon, authenticated;
grant execute on function public.authority_run_radar(uuid) to authenticated;
revoke all on function public.authority_connections_refresh_leverage() from public, anon, authenticated;
revoke all on function public.authority_contact_refresh_leverage() from public, anon, authenticated;
revoke all on function public.authority_property_refresh_leverage() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

notify pgrst, 'reload schema';

-- Cleanup: make the admin check invoker-safe and keep only the public unsubscribe RPC as a definer.
alter function public.is_admin() security invoker;
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.unsubscribe_newsletter(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed integer := 0;
begin
  update public.newsletter_leads
  set unsubscribed_at = now()
  where unsubscribe_token = p_token
    and unsubscribed_at is null;
  get diagnostics changed = row_count;
  return jsonb_build_object('ok', true, 'changed', changed);
end;
$$;
revoke all on function public.unsubscribe_newsletter(uuid) from public, anon, authenticated;
grant execute on function public.unsubscribe_newsletter(uuid) to anon;

-- Defense-in-depth: functions used only as auth/data triggers must not be API-callable.
alter function public.authority_refresh_leverage(uuid) security invoker;
alter function public.authority_run_radar(uuid) security invoker;
revoke all on function public.authority_refresh_leverage(uuid) from public, anon, authenticated;
grant execute on function public.authority_refresh_leverage(uuid) to authenticated;
revoke all on function public.authority_run_radar(uuid) from public, anon, authenticated;
grant execute on function public.authority_run_radar(uuid) to authenticated;
revoke all on function public.authority_connections_refresh_leverage() from public, anon, authenticated;
revoke all on function public.authority_contact_refresh_leverage() from public, anon, authenticated;
revoke all on function public.authority_property_refresh_leverage() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

notify pgrst, 'reload schema';

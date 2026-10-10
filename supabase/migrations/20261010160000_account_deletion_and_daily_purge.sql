-- Account deletion lifecycle and daily purge infrastructure.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  status text not null default 'pending' check(status in ('pending','cancelled','processing','completed','blocked')),
  requested_at timestamptz not null default now(),
  scheduled_delete_at timestamptz not null default now()+interval '30 days',
  cancelled_at timestamptz,
  completed_at timestamptz,
  request_email_sent_at timestamptz,
  completion_email_status text not null default 'pending' check(completion_email_status in ('pending','sent','failed','not_configured','not_applicable')),
  last_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  constraint account_deletion_email_length check(email is null or char_length(email)<=320)
);
alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;
create unique index if not exists account_deletion_one_pending_per_user on public.account_deletion_requests(user_id) where user_id is not null and status in ('pending','processing');
create index if not exists account_deletion_due_idx on public.account_deletion_requests(scheduled_delete_at) where status='pending';
drop policy if exists account_deletion_read_own_or_admin on public.account_deletion_requests;
create policy account_deletion_read_own_or_admin on public.account_deletion_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
revoke all on public.account_deletion_requests from public,anon,authenticated;
grant select on public.account_deletion_requests to authenticated;

create table if not exists public.maintenance_job_logs (
  id bigint generated always as identity primary key,
  job_name text not null,
  status text not null check(status in ('running','completed','partial','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_notes integer not null default 0,
  deleted_accounts integer not null default 0,
  failed_items integer not null default 0,
  detail jsonb not null default '{}'::jsonb
);
alter table public.maintenance_job_logs enable row level security;
alter table public.maintenance_job_logs force row level security;
create index if not exists maintenance_job_logs_started_idx on public.maintenance_job_logs(started_at desc);
drop policy if exists maintenance_logs_admin_select on public.maintenance_job_logs;
create policy maintenance_logs_admin_select on public.maintenance_job_logs for select to authenticated using(public.is_admin());
revoke all on public.maintenance_job_logs from public,anon,authenticated;
grant select on public.maintenance_job_logs to authenticated;

create or replace function private.current_account_is_active()
returns boolean language sql stable security definer set search_path='pg_catalog','public'
as $$
  select auth.uid() is not null and not exists(
    select 1 from public.account_deletion_requests r
    where r.user_id=auth.uid() and r.status in ('pending','processing')
  );
$$;
revoke all on function private.current_account_is_active() from public,anon;
grant execute on function private.current_account_is_active() to authenticated,service_role;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path='pg_catalog','public','private'
as $$
  select private.current_account_is_active() and (
    exists(select 1 from public.admin_users au where au.user_id=auth.uid())
    or exists(select 1 from public.app_admins aa where aa.user_id=auth.uid())
  );
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated,service_role;

do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname<>'account_deletion_requests'
  loop
    execute format('drop policy if exists account_active_guard on public.%I',t.relname);
    execute format('create policy account_active_guard on public.%I as restrictive for all to authenticated using (private.current_account_is_active()) with check (private.current_account_is_active())',t.relname);
  end loop;
end $$;

create or replace function public.cancel_account_deletion(p_request_id uuid)
returns boolean language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Autenticação necessária.'; end if;
  update public.account_deletion_requests set status='cancelled',cancelled_at=now(),metadata=metadata||jsonb_build_object('cancelled_via','member_settings')
  where id=p_request_id and user_id=v_user and status='pending' and scheduled_delete_at>now();
  if not found then raise exception 'Solicitação não encontrada, já processada ou fora do período de carência.'; end if;
  return true;
end; $$;
revoke all on function public.cancel_account_deletion(uuid) from public,anon;
grant execute on function public.cancel_account_deletion(uuid) to authenticated;

create or replace function public.validate_purge_cron_secret(p_candidate text)
returns boolean language sql stable security definer set search_path='pg_catalog','vault'
as $$
  select coalesce(p_candidate is not null and p_candidate=(select decrypted_secret from vault.decrypted_secrets where name='risegoat_purge_cron_token' limit 1),false);
$$;
revoke all on function public.validate_purge_cron_secret(text) from public,anon,authenticated;
grant execute on function public.validate_purge_cron_secret(text) to service_role;

alter table public.member_access_invites alter column created_by drop not null;
alter table public.member_access_invites drop constraint if exists member_access_invites_created_by_fkey;
alter table public.member_access_invites add constraint member_access_invites_created_by_fkey
  foreign key(created_by) references auth.users(id) on delete set null;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='project_url') then
    perform vault.create_secret('https://xofrlyblnsvcjsywynzu.supabase.co','project_url','RiseGoat Supabase API URL used by the daily maintenance job');
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='risegoat_purge_cron_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'risegoat_purge_cron_token','Private bearer token used only by the scheduled purge Edge Function');
  end if;
end $$;

do $$
declare old_job record;
begin
  for old_job in select jobid from cron.job where jobname='risegoat-daily-purge' loop perform cron.unschedule(old_job.jobid); end loop;
  perform cron.schedule('risegoat-daily-purge','15 3 * * *',$job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1) || '/functions/v1/purge-expired-data',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='risegoat_purge_cron_token' limit 1)),
      body := jsonb_build_object('trigger','daily','scheduled_at',now())
    ) as request_id;
  $job$);
end $$;

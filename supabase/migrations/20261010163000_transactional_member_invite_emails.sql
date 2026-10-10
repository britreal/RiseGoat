-- Track transactional email delivery status without storing recipients or email content.
create table if not exists public.transactional_email_events (
  event_key text primary key,
  invite_id uuid not null references public.member_access_invites(id) on delete cascade,
  email_type text not null check(email_type in ('welcome','accepted')),
  status text not null check(status in ('sending','sent','failed')),
  provider_message_id text,
  error_code text,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactional_email_events enable row level security;
alter table public.transactional_email_events force row level security;
create index if not exists transactional_email_events_invite_idx on public.transactional_email_events(invite_id,created_at desc);
drop policy if exists transactional_email_events_admin_select on public.transactional_email_events;
create policy transactional_email_events_admin_select on public.transactional_email_events for select to authenticated using(public.is_admin());
revoke all on public.transactional_email_events from public,anon,authenticated;
grant select on public.transactional_email_events to authenticated;

create or replace function public.notify_member_invite_accepted()
returns trigger language plpgsql security definer set search_path='pg_catalog','public','vault'
as $$
begin
  if new.status='accepted' and old.status is distinct from 'accepted' then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='project_url' limit 1) || '/functions/v1/send-member-invite-email',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='risegoat_purge_cron_token' limit 1)
      ),
      body := jsonb_build_object('action','member-invite-accepted','invite_id',new.id)
    );
  end if;
  return new;
end; $$;
drop trigger if exists member_access_accepted_transactional_email on public.member_access_invites;
create trigger member_access_accepted_transactional_email
after update of status on public.member_access_invites
for each row execute function public.notify_member_invite_accepted();
revoke all on function public.notify_member_invite_accepted() from public,anon,authenticated;

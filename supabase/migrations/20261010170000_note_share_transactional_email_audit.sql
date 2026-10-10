-- Operational delivery log for note-sharing invitations; never stores recipient email or note content.
create table if not exists public.note_share_email_events (
  event_key uuid primary key references public.note_share_invites(id) on delete cascade,
  status text not null check(status in ('sending','sent','failed')),
  provider_message_id text,
  error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.note_share_email_events enable row level security;
alter table public.note_share_email_events force row level security;
drop policy if exists note_share_email_events_admin_select on public.note_share_email_events;
create policy note_share_email_events_admin_select on public.note_share_email_events
for select to authenticated using(public.is_admin());
revoke all on public.note_share_email_events from public,anon,authenticated;
grant select on public.note_share_email_events to authenticated;

alter table public.notes
  add column if not exists sort_order bigint not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists ocr_text text not null default '',
  add column if not exists transcript text not null default '';

create index if not exists notes_user_sort_idx on public.notes(user_id, sort_order asc, updated_at desc);

create table if not exists public.note_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.note_label_links (
  note_id uuid not null references public.notes(id) on delete cascade,
  label_id uuid not null references public.note_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(note_id, label_id)
);

create table if not exists public.note_checklist_items (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  parent_id uuid references public.note_checklist_items(id) on delete cascade,
  title text not null default '',
  is_completed boolean not null default false,
  position bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists note_checklist_note_idx on public.note_checklist_items(note_id, position);

create table if not exists public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attachment_type text not null check (attachment_type in ('image','audio','file','drawing')),
  file_path text,
  file_name text not null default '',
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  duration_ms bigint,
  ocr_text text not null default '',
  transcript text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists note_attachments_note_idx on public.note_attachments(note_id, created_at desc);

create table if not exists public.note_reminders (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('datetime','location')),
  remind_at timestamptz,
  timezone text,
  location_lat double precision,
  location_lng double precision,
  location_radius_m double precision,
  location_trigger text check (location_trigger in ('arrive','leave')),
  repeat_rule text,
  title text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reminder_type='datetime' and remind_at is not null) or (reminder_type='location' and location_lat is not null and location_lng is not null))
);
create index if not exists note_reminders_user_due_idx on public.note_reminders(user_id, remind_at asc) where completed_at is null;

create table if not exists public.note_collaborators (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text not null default '',
  role text not null default 'editor' check (role in ('viewer','editor')),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index if not exists note_collab_user_unique_idx on public.note_collaborators(note_id, user_id) where user_id is not null;

create table if not exists public.note_share_invites (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('viewer','editor')),
  token text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists note_share_invites_email_idx on public.note_share_invites(lower(email), expires_at desc);

alter table public.note_labels enable row level security;
alter table public.note_label_links enable row level security;
alter table public.note_checklist_items enable row level security;
alter table public.note_attachments enable row level security;
alter table public.note_reminders enable row level security;
alter table public.note_collaborators enable row level security;
alter table public.note_share_invites enable row level security;

drop policy if exists notes_select_own on public.notes;
create policy notes_select_accessible on public.notes for select to authenticated using (
  auth.uid()=user_id or exists(select 1 from public.note_collaborators c where c.note_id=notes.id and c.user_id=auth.uid() and c.status='accepted')
);
drop policy if exists notes_update_own on public.notes;
create policy notes_update_accessible on public.notes for update to authenticated
using (auth.uid()=user_id or exists(select 1 from public.note_collaborators c where c.note_id=notes.id and c.user_id=auth.uid() and c.status='accepted' and c.role='editor'))
with check (auth.uid()=user_id);
drop policy if exists notes_delete_own on public.notes;
create policy notes_delete_owner on public.notes for delete to authenticated using (auth.uid()=user_id);

create policy note_labels_select on public.note_labels for select to authenticated using (auth.uid()=user_id);
create policy note_labels_insert on public.note_labels for insert to authenticated with check (auth.uid()=user_id);
create policy note_labels_update on public.note_labels for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy note_labels_delete on public.note_labels for delete to authenticated using (auth.uid()=user_id);

create policy note_label_links_select on public.note_label_links for select to authenticated using (
  exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted')))
);
create policy note_label_links_insert on public.note_label_links for insert to authenticated with check (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));
create policy note_label_links_delete on public.note_label_links for delete to authenticated using (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));

create policy note_checklist_select on public.note_checklist_items for select to authenticated using (
  exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted')))
);
create policy note_checklist_insert on public.note_checklist_items for insert to authenticated with check (
  exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted' and c.role='editor')))
);
create policy note_checklist_update on public.note_checklist_items for update to authenticated
using (exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted' and c.role='editor'))))
with check (exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted' and c.role='editor'))));
create policy note_checklist_delete on public.note_checklist_items for delete to authenticated using (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));

create policy note_attachments_select on public.note_attachments for select to authenticated using (
  exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted')))
);
create policy note_attachments_insert on public.note_attachments for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from public.notes n where n.id=note_id and (n.user_id=auth.uid() or exists(select 1 from public.note_collaborators c where c.note_id=n.id and c.user_id=auth.uid() and c.status='accepted' and c.role='editor')))
);
create policy note_attachments_delete on public.note_attachments for delete to authenticated using (user_id=auth.uid());

create policy note_reminders_select on public.note_reminders for select to authenticated using (user_id=auth.uid());
create policy note_reminders_insert on public.note_reminders for insert to authenticated with check (user_id=auth.uid());
create policy note_reminders_update on public.note_reminders for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy note_reminders_delete on public.note_reminders for delete to authenticated using (user_id=auth.uid());

create policy note_collaborators_select on public.note_collaborators for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));
create policy note_collaborators_insert on public.note_collaborators for insert to authenticated with check (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));
create policy note_collaborators_update on public.note_collaborators for update to authenticated using (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid())) with check (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));
create policy note_collaborators_delete on public.note_collaborators for delete to authenticated using (exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));

create policy note_share_invites_select on public.note_share_invites for select to authenticated using (inviter_id=auth.uid() or lower(email)=lower((select email from auth.users where id=auth.uid())));
create policy note_share_invites_insert on public.note_share_invites for insert to authenticated with check (inviter_id=auth.uid() and exists(select 1 from public.notes n where n.id=note_id and n.user_id=auth.uid()));
create policy note_share_invites_update on public.note_share_invites for update to authenticated using (inviter_id=auth.uid() or lower(email)=lower((select email from auth.users where id=auth.uid()))) with check (true);

insert into storage.buckets(id,name,public) values ('notes-media','notes-media',false) on conflict(id) do nothing;
create policy notes_media_select on storage.objects for select to authenticated using (bucket_id='notes-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy notes_media_insert on storage.objects for insert to authenticated with check (bucket_id='notes-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy notes_media_update on storage.objects for update to authenticated using (bucket_id='notes-media' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='notes-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy notes_media_delete on storage.objects for delete to authenticated using (bucket_id='notes-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.purge_deleted_notes()
returns void language plpgsql security definer set search_path=public as $$
begin
  delete from public.notes where is_deleted=true and deleted_at is not null and deleted_at < now() - interval '7 days';
end; $$;
revoke all on function public.purge_deleted_notes() from public, anon, authenticated;

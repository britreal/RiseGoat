create extension if not exists pg_trgm;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  note_type text not null default 'text' check (note_type in ('text','checklist','drawing','image','audio')),
  color text not null default 'default' check (color in ('default','warm','yellow','green','blue','purple','pink','red')),
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_updated_idx on public.notes(user_id, updated_at desc);
create index if not exists notes_user_deleted_idx on public.notes(user_id, is_deleted, updated_at desc);
create index if not exists notes_search_trgm_idx on public.notes using gin ((title || ' ' || content) gin_trgm_ops);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own" on public.notes for select to authenticated using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert to authenticated with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_notes_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes for each row execute function public.set_notes_updated_at();

create or replace function public.purge_deleted_notes()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.notes where is_deleted = true and deleted_at is not null and deleted_at < now() - interval '7 days';
end; $$;

revoke all on function public.purge_deleted_notes() from public, anon, authenticated;

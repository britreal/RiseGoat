-- Persist per-user control of sidebar menu visibility.
alter table public.profiles
  add column if not exists menu_visibility jsonb not null default '{}'::jsonb;

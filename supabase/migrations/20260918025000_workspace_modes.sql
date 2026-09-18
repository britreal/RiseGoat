-- Workspace mode separates personal and business experiences per account.
alter table public.profiles
  add column if not exists workspace_mode text not null default 'negocios'
  check (workspace_mode in ('pessoal','negocios'));

alter table public.action_flows
  add column if not exists workspace_mode text not null default 'negocios'
  check (workspace_mode in ('pessoal','negocios'));

alter table public.goals
  add column if not exists workspace_mode text not null default 'negocios'
  check (workspace_mode in ('pessoal','negocios'));

update public.action_flows
set workspace_mode = case when lower(category) = 'personal' then 'pessoal' else 'negocios' end
where workspace_mode = 'negocios';

update public.goals
set workspace_mode = 'negocios'
where workspace_mode is null;
-- Flux — Phase 1 foundation
-- Workflows, runs and step history. User-scoped with RLS.
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null default '',
  descricao text not null default '',
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  versao integer not null default 1 check (versao > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  product_id uuid null,
  status text not null default 'queued'
    check (status in ('queued','running','waiting_approval','waiting_ai','succeeded','failed','cancelled')),
  input jsonb not null default '{}'::jsonb,
  graph_snapshot jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists public.run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  node_id text not null,
  node_type text not null,
  status text not null default 'pending'
    check (status in ('pending','running','succeeded','failed','skipped','waiting')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  attempts integer not null default 0 check (attempts >= 0),
  started_at timestamptz,
  finished_at timestamptz,
  unique (run_id, node_id)
);

alter table public.workflows enable row level security;
alter table public.runs enable row level security;
alter table public.run_steps enable row level security;

drop policy if exists "workflows_select_own" on public.workflows;
create policy "workflows_select_own" on public.workflows for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "workflows_insert_own" on public.workflows;
create policy "workflows_insert_own" on public.workflows for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "workflows_update_own" on public.workflows;
create policy "workflows_update_own" on public.workflows for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "workflows_delete_own" on public.workflows;
create policy "workflows_delete_own" on public.workflows for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "runs_select_own" on public.runs;
create policy "runs_select_own" on public.runs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "runs_insert_own" on public.runs;
create policy "runs_insert_own" on public.runs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "runs_update_own" on public.runs;
create policy "runs_update_own" on public.runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "runs_delete_own" on public.runs;
create policy "runs_delete_own" on public.runs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "run_steps_select_own" on public.run_steps;
create policy "run_steps_select_own" on public.run_steps for select to authenticated using (
  exists (select 1 from public.runs r where r.id = run_steps.run_id and r.user_id = (select auth.uid()))
);
drop policy if exists "run_steps_insert_own" on public.run_steps;
create policy "run_steps_insert_own" on public.run_steps for insert to authenticated with check (
  exists (select 1 from public.runs r where r.id = run_steps.run_id and r.user_id = (select auth.uid()))
);
drop policy if exists "run_steps_update_own" on public.run_steps;
create policy "run_steps_update_own" on public.run_steps for update to authenticated using (
  exists (select 1 from public.runs r where r.id = run_steps.run_id and r.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.runs r where r.id = run_steps.run_id and r.user_id = (select auth.uid()))
);
drop policy if exists "run_steps_delete_own" on public.run_steps;
create policy "run_steps_delete_own" on public.run_steps for delete to authenticated using (
  exists (select 1 from public.runs r where r.id = run_steps.run_id and r.user_id = (select auth.uid()))
);

grant select, insert, update, delete on public.workflows to authenticated;
grant select, insert, update, delete on public.runs to authenticated;
grant select, insert, update, delete on public.run_steps to authenticated;

create index if not exists idx_workflows_user_created on public.workflows(user_id, created_at desc);
create index if not exists idx_workflows_updated on public.workflows(user_id, updated_at desc);
create index if not exists idx_runs_run_id on public.runs(id);
create index if not exists idx_runs_workflow_id on public.runs(workflow_id);
create index if not exists idx_runs_user_created on public.runs(user_id, created_at desc);
create index if not exists idx_run_steps_run_id on public.run_steps(run_id);
create index if not exists idx_run_steps_run_node on public.run_steps(run_id, node_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='runs') then
    alter publication supabase_realtime add table public.runs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='run_steps') then
    alter publication supabase_realtime add table public.run_steps;
  end if;
end
$$;

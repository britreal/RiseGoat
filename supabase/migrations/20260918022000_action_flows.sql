create table if not exists public.action_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Negócios',
  template_key text,
  objective text not null default '',
  goal text not null default '',
  status text not null default 'draft' check (status in ('draft','active','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.action_flow_nodes (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.action_flows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  node_type text not null default 'action' check (node_type in ('action','task','decision','result','module','person','metric','note')),
  label text not null,
  description text not null default '',
  module_name text,
  module_path text,
  position_x numeric(8,2) not null default 80,
  position_y numeric(8,2) not null default 80,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.action_flow_edges (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.action_flows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.action_flow_nodes(id) on delete cascade,
  target_node_id uuid not null references public.action_flow_nodes(id) on delete cascade,
  edge_label text not null default '',
  branch_key text not null default '',
  created_at timestamptz not null default now(),
  unique (source_node_id, target_node_id, branch_key)
);

create table if not exists public.action_flow_runs (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.action_flows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active','completed','paused')),
  current_node_id uuid references public.action_flow_nodes(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.action_flow_run_nodes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.action_flow_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id uuid not null references public.action_flow_nodes(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','completed','skipped','blocked')),
  note text not null default '',
  started_at timestamptz,
  completed_at timestamptz,
  unique (run_id, node_id)
);

create index if not exists action_flows_user_idx on public.action_flows(user_id);
create index if not exists action_flow_nodes_flow_idx on public.action_flow_nodes(flow_id);
create index if not exists action_flow_nodes_user_idx on public.action_flow_nodes(user_id);
create index if not exists action_flow_edges_flow_idx on public.action_flow_edges(flow_id);
create index if not exists action_flow_edges_source_idx on public.action_flow_edges(source_node_id);
create index if not exists action_flow_edges_target_idx on public.action_flow_edges(target_node_id);
create index if not exists action_flow_runs_user_idx on public.action_flow_runs(user_id);
create index if not exists action_flow_runs_flow_idx on public.action_flow_runs(flow_id);
create index if not exists action_flow_run_nodes_run_idx on public.action_flow_run_nodes(run_id);
create index if not exists action_flow_run_nodes_node_idx on public.action_flow_run_nodes(node_id);

alter table public.action_flows enable row level security;
alter table public.action_flow_nodes enable row level security;
alter table public.action_flow_edges enable row level security;
alter table public.action_flow_runs enable row level security;
alter table public.action_flow_run_nodes enable row level security;

drop policy if exists owner_all_action_flows on public.action_flows;
create policy owner_all_action_flows on public.action_flows for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_action_flow_nodes on public.action_flow_nodes;
create policy owner_all_action_flow_nodes on public.action_flow_nodes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_action_flow_edges on public.action_flow_edges;
create policy owner_all_action_flow_edges on public.action_flow_edges for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_action_flow_runs on public.action_flow_runs;
create policy owner_all_action_flow_runs on public.action_flow_runs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists owner_all_action_flow_run_nodes on public.action_flow_run_nodes;
create policy owner_all_action_flow_run_nodes on public.action_flow_run_nodes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on table public.action_flows, public.action_flow_nodes, public.action_flow_edges, public.action_flow_runs, public.action_flow_run_nodes from anon;
grant select, insert, update, delete on table public.action_flows, public.action_flow_nodes, public.action_flow_edges, public.action_flow_runs, public.action_flow_run_nodes to authenticated;

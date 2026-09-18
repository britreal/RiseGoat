alter table public.revenues add column if not exists launch_id uuid references public.launches(id) on delete set null;
create index if not exists revenues_launch_id_idx on public.revenues(launch_id);
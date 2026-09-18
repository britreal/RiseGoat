-- Add owner policies to legacy user-scoped tables that had RLS without policies.
alter table public.time_sessions enable row level security;
drop policy if exists "time sessions own" on public.time_sessions;
create policy "time sessions own" on public.time_sessions
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.words enable row level security;
drop policy if exists "words own" on public.words;
create policy "words own" on public.words
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
-- Harden legacy time aggregation functions against search_path manipulation.
create or replace function public.get_daily_seconds(uid uuid, day date)
returns table(total_seconds bigint)
language sql
stable
set search_path = public
as $$
  select coalesce(sum(extract(epoch from (end_time - start_time)))::bigint, 0)
  from public.time_sessions
  where user_id = uid
    and start_time::date = day;
$$;

create or replace function public.get_monthly_seconds(uid uuid, month_start date)
returns table(total_seconds bigint)
language sql
stable
set search_path = public
as $$
  select coalesce(sum(extract(epoch from (end_time - start_time)))::bigint, 0)
  from public.time_sessions
  where user_id = uid
    and start_time >= month_start
    and start_time < (month_start + interval '1 month');
$$;
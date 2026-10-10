-- Public-safe edges, view tracking, and administrator-only Tabuleiro metrics.
drop policy if exists conexoes_public_read on public.magnate_conexoes;
create policy conexoes_public_read on public.magnate_conexoes
for select to anon
using (
  exists(select 1 from public.magnates src where src.id=origem_id and src.visivel_publico=true)
  and exists(select 1 from public.magnates dst where dst.id=destino_id and dst.visivel_publico=true)
);
grant select on public.magnate_conexoes to anon,authenticated;

create or replace function public.record_magnate_view(p_magnate_id uuid)
returns void language plpgsql security definer
set search_path='pg_catalog','public'
as $$
declare v_visible boolean;
begin
  select visivel_publico into v_visible from public.magnates where id=p_magnate_id;
  if not found then raise exception 'Registro não encontrado.'; end if;
  if auth.uid() is null and not v_visible then
    raise exception 'Este registro não está disponível publicamente.';
  end if;
  -- Avoid repeatedly recording the same signed-in user opening the same detail in a short period.
  if auth.uid() is not null and exists(
    select 1 from public.magnate_views
    where magnate_id=p_magnate_id and user_id=auth.uid() and visto_em>now()-interval '60 seconds'
  ) then return; end if;
  insert into public.magnate_views(magnate_id,user_id) values(p_magnate_id,auth.uid());
end; $$;
revoke all on function public.record_magnate_view(uuid) from public;
grant execute on function public.record_magnate_view(uuid) to anon,authenticated;

create or replace function public.get_tabuleiro_metrics()
returns table(total_views bigint, authenticated_views bigint, unique_members bigint, total_magnates bigint, public_magnates bigint)
language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  return query
  select count(*)::bigint,
         count(*) filter(where v.user_id is not null)::bigint,
         count(distinct v.user_id)::bigint,
         (select count(*) from public.magnates)::bigint,
         (select count(*) from public.magnates where visivel_publico)::bigint
  from public.magnate_views v;
end; $$;
revoke all on function public.get_tabuleiro_metrics() from public,anon;
grant execute on function public.get_tabuleiro_metrics() to authenticated;

create or replace function public.get_tabuleiro_member_metrics()
returns table(user_id uuid, total_views bigint, distinct_magnates bigint, last_view_at timestamptz)
language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso restrito ao administrador.'; end if;
  return query
  select v.user_id,count(*)::bigint,count(distinct v.magnate_id)::bigint,max(v.visto_em)
  from public.magnate_views v
  where v.user_id is not null
  group by v.user_id
  order by max(v.visto_em) desc nulls last;
end; $$;
revoke all on function public.get_tabuleiro_member_metrics() from public,anon;
grant execute on function public.get_tabuleiro_member_metrics() to authenticated;

grant select on public.magnate_views to authenticated;

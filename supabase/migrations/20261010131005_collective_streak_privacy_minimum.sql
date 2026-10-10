-- Do not expose collective activity aggregates in circles smaller than three accepted members.
create or replace function public.get_circle_streak_summary(p_circle_id uuid)
returns table(opted_in_members integer,active_members_7d integer,group_active_days_7d integer)
language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
declare v_accepted integer;
begin
  if auth.uid() is null or not private.is_circle_member(p_circle_id,auth.uid()) then
    raise exception 'Apenas membros aceitos podem ver o resumo coletivo deste círculo.';
  end if;
  select count(*)::integer into v_accepted
  from public.circle_members cm where cm.circle_id=p_circle_id and cm.status='accepted';
  if v_accepted<3 then
    return query select 0::integer,0::integer,0::integer;
    return;
  end if;
  return query
  select count(distinct cm.user_id)::integer,count(distinct ev.user_id)::integer,count(distinct (ev.occurred_at at time zone 'utc')::date)::integer
  from public.circle_members cm
  join public.member_profiles mp on mp.user_id=cm.user_id and mp.collective_streak_opt_in=true
  left join public.member_activity_events ev on ev.user_id=cm.user_id and ev.event_type='checklist_completed' and ev.occurred_at>=now()-interval '7 days'
  where cm.circle_id=p_circle_id and cm.status='accepted';
end; $$;
revoke all on function public.get_circle_streak_summary(uuid) from public,anon;
grant execute on function public.get_circle_streak_summary(uuid) to authenticated;

create or replace function public.track_optin_checklist_completion()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_user_id uuid:=auth.uid();
begin
  if v_user_id is null then return new; end if;
  if new.is_completed and (tg_op='INSERT' or coalesce(old.is_completed,false)=false)
     and exists(select 1 from public.member_profiles mp where mp.user_id=v_user_id and mp.collective_streak_opt_in=true) then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(v_user_id,'checklist_completed','checklist_item',jsonb_build_object('event_date',(now() at time zone 'utc')::date));
  end if;
  return new;
end; $$;

-- Administrators may publish directly in rooms; regular members submit drafts for moderation.
drop policy if exists network_room_notes_insert_member on public.network_room_notes;
create policy network_room_notes_insert_member on public.network_room_notes for insert to authenticated
with check (
  created_by=auth.uid()
  and (public.is_admin() or private.is_room_member(room_id,auth.uid()))
  and (status='draft' or public.is_admin() or private.is_room_moderator(room_id,auth.uid()))
);

create or replace function public.get_circle_streak_summary(p_circle_id uuid)
returns table(opted_in_members integer,active_members_7d integer,group_active_days_7d integer)
language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
declare v_accepted integer;
begin
  if auth.uid() is null or not private.is_circle_member(p_circle_id,auth.uid()) then
    raise exception 'Apenas membros aceitos podem ver o resumo coletivo deste círculo.';
  end if;
  select count(*)::integer into v_accepted from public.circle_members cm where cm.circle_id=p_circle_id and cm.status='accepted';
  if v_accepted<3 then return query select 0::integer,0::integer,0::integer; return; end if;
  return query
  select count(distinct cm.user_id)::integer,count(distinct ev.user_id)::integer,count(distinct (ev.occurred_at at time zone 'utc')::date)::integer
  from public.circle_members cm
  join public.member_profiles mp on mp.user_id=cm.user_id and mp.collective_streak_opt_in=true
  left join public.member_activity_events ev on ev.user_id=cm.user_id and ev.event_type='checklist_completed' and ev.occurred_at>=now()-interval '7 days'
  where cm.circle_id=p_circle_id and cm.status='accepted';
end; $$;
revoke all on function public.get_circle_streak_summary(uuid) from public,anon;
grant execute on function public.get_circle_streak_summary(uuid) to authenticated;

-- Preserve only structural metadata for shared-network activity; never write titles or note contents.
create or replace function public.track_circle_note_metadata()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if tg_op='INSERT' then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.created_by,'circle_note_created','circle_note',jsonb_build_object('circle_id',new.circle_id));
  elsif old.is_pinned is distinct from new.is_pinned then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.created_by,case when new.is_pinned then 'circle_note_pinned' else 'circle_note_unpinned' end,'circle_note',jsonb_build_object('circle_id',new.circle_id));
  end if;
  return new;
end; $$;
drop trigger if exists circle_note_structural_activity on public.circle_notes;
create trigger circle_note_structural_activity after insert or update of is_pinned on public.circle_notes
for each row execute function public.track_circle_note_metadata();

create or replace function public.track_room_note_metadata()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if tg_op='INSERT' then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.created_by,case when new.status='published' then 'room_contribution_published' else 'room_contribution_submitted' end,'room_contribution',jsonb_build_object('room_id',new.room_id,'status',new.status));
  elsif old.status is distinct from new.status then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.created_by,case when new.status='published' then 'room_contribution_published' else 'room_contribution_unpublished' end,'room_contribution',jsonb_build_object('room_id',new.room_id,'status',new.status));
  elsif old.is_pinned is distinct from new.is_pinned then
    insert into public.member_activity_events(user_id,event_type,entity_type,metadata)
    values(new.created_by,case when new.is_pinned then 'room_contribution_pinned' else 'room_contribution_unpinned' end,'room_contribution',jsonb_build_object('room_id',new.room_id,'status',new.status));
  end if;
  return new;
end; $$;
drop trigger if exists room_note_structural_activity on public.network_room_notes;
create trigger room_note_structural_activity after insert or update of status,is_pinned on public.network_room_notes
for each row execute function public.track_room_note_metadata();
revoke all on function public.track_circle_note_metadata() from public,anon,authenticated;
revoke all on function public.track_room_note_metadata() from public,anon,authenticated;

create or replace function public.get_circle_streak_summary(p_circle_id uuid)
returns table(opted_in_members integer,active_members_7d integer,group_active_days_7d integer)
language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
declare v_accepted integer; v_opted_in integer;
begin
  if auth.uid() is null or not private.is_circle_member(p_circle_id,auth.uid()) then
    raise exception 'Apenas membros aceitos podem ver o resumo coletivo deste círculo.';
  end if;
  select count(*)::integer into v_accepted from public.circle_members cm where cm.circle_id=p_circle_id and cm.status='accepted';
  if v_accepted<3 then return query select 0::integer,0::integer,0::integer; return; end if;
  select count(*)::integer into v_opted_in
  from public.circle_members cm join public.member_profiles mp on mp.user_id=cm.user_id and mp.collective_streak_opt_in=true
  where cm.circle_id=p_circle_id and cm.status='accepted';
  if v_opted_in<3 then return query select 0::integer,0::integer,0::integer; return; end if;
  return query
  select count(distinct cm.user_id)::integer,count(distinct ev.user_id)::integer,count(distinct (ev.occurred_at at time zone 'utc')::date)::integer
  from public.circle_members cm
  join public.member_profiles mp on mp.user_id=cm.user_id and mp.collective_streak_opt_in=true
  left join public.member_activity_events ev on ev.user_id=cm.user_id and ev.event_type='checklist_completed' and ev.occurred_at>=now()-interval '7 days'
  where cm.circle_id=p_circle_id and cm.status='accepted';
end; $$;
revoke all on function public.get_circle_streak_summary(uuid) from public,anon;
grant execute on function public.get_circle_streak_summary(uuid) to authenticated;

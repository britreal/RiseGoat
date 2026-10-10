-- Add explicit opt-in for aggregate circle activity and moderation for shared topic rooms.
alter table public.member_profiles
  add column if not exists collective_streak_opt_in boolean not null default false;

drop policy if exists network_room_notes_select_member on public.network_room_notes;
create policy network_room_notes_select_member on public.network_room_notes
for select to authenticated
using (
  public.is_admin()
  or private.is_room_moderator(room_id,auth.uid())
  or (private.is_room_member(room_id,auth.uid()) and (status='published' or created_by=auth.uid()))
);

drop policy if exists network_room_notes_insert_member on public.network_room_notes;
create policy network_room_notes_insert_member on public.network_room_notes
for insert to authenticated
with check (
  created_by=auth.uid()
  and private.is_room_member(room_id,auth.uid())
  and (status='draft' or public.is_admin() or private.is_room_moderator(room_id,auth.uid()))
);

drop policy if exists network_room_members_admin_update on public.network_room_members;
create policy network_room_members_admin_update on public.network_room_members
for update to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.enforce_network_room_note_moderation()
returns trigger language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
begin
  if public.is_admin() or private.is_room_moderator(new.room_id,auth.uid()) then return new; end if;
  if tg_op='INSERT' then
    if new.status<>'draft' then raise exception 'Apenas administradores e moderadores podem publicar diretamente nesta sala.'; end if;
    return new;
  end if;
  if old.status='published' and (new.title is distinct from old.title or new.content is distinct from old.content) then
    new.status:='draft';
    return new;
  end if;
  if new.status is distinct from old.status and new.status<>'draft' then
    raise exception 'Apenas administradores e moderadores podem publicar contribuições.';
  end if;
  return new;
end; $$;
drop trigger if exists network_room_note_moderation_guard on public.network_room_notes;
create trigger network_room_note_moderation_guard
before insert or update of title,content,status on public.network_room_notes
for each row execute function public.enforce_network_room_note_moderation();

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
drop trigger if exists member_optin_checklist_completion on public.note_checklist_items;
create trigger member_optin_checklist_completion
after insert or update of is_completed on public.note_checklist_items
for each row execute function public.track_optin_checklist_completion();

create or replace function public.get_circle_streak_summary(p_circle_id uuid)
returns table(opted_in_members integer,active_members_7d integer,group_active_days_7d integer)
language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
begin
  if auth.uid() is null or not private.is_circle_member(p_circle_id,auth.uid()) then
    raise exception 'Apenas membros aceitos podem ver o resumo coletivo deste círculo.';
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

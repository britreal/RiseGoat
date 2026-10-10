-- Keep private shared notes inside their original circle/room.
create or replace function public.guard_circle_note_identity()
returns trigger language plpgsql set search_path='pg_catalog','public'
as $$
begin
  if tg_op='UPDATE' and (new.circle_id is distinct from old.circle_id or new.created_by is distinct from old.created_by) then
    raise exception 'O círculo e o autor original desta nota são imutáveis.';
  end if;
  return new;
end; $$;
drop trigger if exists circle_note_identity_guard on public.circle_notes;
create trigger circle_note_identity_guard
before update of circle_id,created_by on public.circle_notes
for each row execute function public.guard_circle_note_identity();
revoke all on function public.guard_circle_note_identity() from public,anon,authenticated;

drop policy if exists network_room_notes_update_author_or_moderator on public.network_room_notes;
create policy network_room_notes_update_author_or_moderator on public.network_room_notes
for update to authenticated
using (
  (created_by=auth.uid() and private.is_room_member(room_id,auth.uid()))
  or private.is_room_moderator(room_id,auth.uid())
  or public.is_admin()
)
with check (
  (created_by=auth.uid() and private.is_room_member(room_id,auth.uid()))
  or private.is_room_moderator(room_id,auth.uid())
  or public.is_admin()
);

create or replace function public.enforce_network_room_note_moderation()
returns trigger language plpgsql security definer set search_path='pg_catalog','public','private'
as $$
begin
  if tg_op='UPDATE' and (new.room_id is distinct from old.room_id or new.created_by is distinct from old.created_by) then
    raise exception 'A sala e o autor original desta contribuição são imutáveis.';
  end if;
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
before insert or update of title,content,status,room_id,created_by on public.network_room_notes
for each row execute function public.enforce_network_room_note_moderation();
revoke all on function public.enforce_network_room_note_moderation() from public,anon,authenticated;

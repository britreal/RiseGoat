-- Start the 30-day trash retention clock when a note enters the trash.
create or replace function public.sync_note_deleted_at()
returns trigger language plpgsql set search_path='pg_catalog','public'
as $$
begin
  if new.is_deleted then
    if new.deleted_at is null then
      new.deleted_at:=now();
    end if;
  else
    new.deleted_at:=null;
  end if;
  return new;
end; $$;
drop trigger if exists notes_deleted_at_guard on public.notes;
create trigger notes_deleted_at_guard before insert or update of is_deleted,deleted_at on public.notes
for each row execute function public.sync_note_deleted_at();
revoke all on function public.sync_note_deleted_at() from public,anon,authenticated;

update public.notes
set deleted_at=coalesce(updated_at,created_at,now())
where is_deleted=true and deleted_at is null;

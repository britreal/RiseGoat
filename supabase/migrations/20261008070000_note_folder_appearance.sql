alter table public.note_folders
  add column if not exists color text not null default '#8b8b8b',
  add column if not exists icon text not null default 'folder';

alter table public.note_folders
  drop constraint if exists note_folders_icon_check;
alter table public.note_folders
  add constraint note_folders_icon_check
  check (icon = any (array['folder','network','key-round','book-open']));

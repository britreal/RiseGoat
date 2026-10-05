alter table public.notes drop constraint if exists notes_color_check;
alter table public.notes add constraint notes_color_check check (
  color in (
    'default','warm','yellow','green','blue','purple','pink','red',
    'orange','teal','indigo','gray'
  )
);
-- Bind profile Links to first-class RiseGoat Blogs.
alter table public.links
  add column if not exists blog_id uuid;

alter table public.links
  drop constraint if exists links_blog_id_fkey;

alter table public.links
  add constraint links_blog_id_fkey
  foreign key (blog_id) references public.blogs(id) on delete set null;

create index if not exists idx_links_blog_id on public.links(blog_id)
  where blog_id is not null;

notify pgrst, 'reload schema';

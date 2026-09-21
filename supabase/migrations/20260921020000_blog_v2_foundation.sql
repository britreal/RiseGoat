-- Blog v2 foundation: query indexes, atomic pinning and optimized public RLS.

create index if not exists idx_microblog_blog_public_published
  on public.microblog_posts(blog_id, status, is_pinned desc, published_at desc, created_at desc);

create index if not exists idx_blogs_published_slug
  on public.blogs(lower(slug))
  where is_published = true;

drop policy if exists public_read_blogs on public.blogs;
drop policy if exists owner_read_blogs on public.blogs;
drop policy if exists select_blogs on public.blogs;

create policy select_blogs on public.blogs
for select to anon, authenticated
using (
  is_published = true
  or (select auth.uid()) = user_id
);

drop policy if exists public_read_microblog on public.microblog_posts;
drop policy if exists owner_read_microblog on public.microblog_posts;
drop policy if exists select_microblog_posts on public.microblog_posts;

create policy select_microblog_posts on public.microblog_posts
for select to anon, authenticated
using (
  (
    status = 'published'
    and exists (
      select 1 from public.blogs b
      where b.id = blog_id
        and b.is_published = true
    )
  )
  or (select auth.uid()) = user_id
);

create or replace function public.set_blog_post_pinned(
  p_post_id uuid,
  p_is_pinned boolean
)
returns boolean
language plpgsql
set search_path = public, pg_temp
as $$
declare
  target_blog_id uuid;
begin
  select blog_id
    into target_blog_id
    from public.microblog_posts
   where id = p_post_id
     and user_id = (select auth.uid());

  if target_blog_id is null then
    return false;
  end if;

  if p_is_pinned then
    update public.microblog_posts
       set is_pinned = false,
           updated_at = now()
     where blog_id = target_blog_id
       and user_id = (select auth.uid())
       and id <> p_post_id
       and is_pinned = true;
  end if;

  update public.microblog_posts
     set is_pinned = p_is_pinned,
         updated_at = now()
   where id = p_post_id
     and user_id = (select auth.uid());

  return found;
end;
$$;

grant execute on function public.set_blog_post_pinned(uuid, boolean) to authenticated;
revoke execute on function public.set_blog_post_pinned(uuid, boolean) from anon, public;

notify pgrst, 'reload schema';

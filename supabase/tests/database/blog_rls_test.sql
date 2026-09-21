begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select ok(
  (select relrowsecurity from pg_class where oid='public.blogs'::regclass),
  'blogs has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid='public.microblog_posts'::regclass),
  'microblog_posts has RLS enabled'
);

select has_column('public.blogs', 'slug', 'blogs has slug');
select has_column('public.microblog_posts', 'blog_id', 'microblog_posts has blog_id');
select has_index('public.blogs', 'idx_blogs_published_slug', 'blogs public slug index exists');
select has_index('public.microblog_posts', 'idx_microblog_blog_public_published', 'microblog public feed index exists');

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='blogs'
      and policyname='select_blogs'
  ),
  'blogs uses a single combined select policy'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='microblog_posts'
      and policyname='select_microblog_posts'
  ),
  'microblog_posts uses a single combined select policy'
);

select * from finish();
rollback;

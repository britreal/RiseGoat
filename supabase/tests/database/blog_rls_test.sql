begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

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
    select 1 from pg_policies
    where schemaname='public' and tablename='blogs' and policyname='select_blogs'
  ),
  'blogs uses the combined public/owner select policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='microblog_posts' and policyname='select_microblog_posts'
  ),
  'microblog_posts uses the combined public/owner select policy'
);

select ok(
  not coalesce(
    (select prosecdef
       from pg_proc p
       join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public'
        and p.proname='set_blog_post_pinned'
        and pg_get_function_identity_arguments(p.oid)='p_post_id uuid, p_is_pinned boolean'),
    true
  ),
  'blog pinning function is not SECURITY DEFINER'
);

select function_returns(
  'set_blog_post_pinned',
  ARRAY['uuid','boolean'],
  'boolean'
);

select set_config(
  'risegoat.test_user_id',
  (select id::text from auth.users order by created_at limit 1),
  true
);

insert into public.blogs (
  id, user_id, slug, name, is_published
) values
  ('00000000-0000-4000-8000-000000000101', current_setting('risegoat.test_user_id')::uuid, '__rls_blog_unpublished__', 'RLS Test Unpublished', false),
  ('00000000-0000-4000-8000-000000000102', current_setting('risegoat.test_user_id')::uuid, '__rls_blog_published__', 'RLS Test Published', true);

insert into public.microblog_posts (
  id, user_id, blog_id, slug, content, status, is_pinned
) values
  ('00000000-0000-4000-8000-000000000201', current_setting('risegoat.test_user_id')::uuid, '00000000-0000-4000-8000-000000000101', 'private-published-post', 'test', 'published', false),
  ('00000000-0000-4000-8000-000000000202', current_setting('risegoat.test_user_id')::uuid, '00000000-0000-4000-8000-000000000102', 'public-pinned-post', 'test', 'published', true),
  ('00000000-0000-4000-8000-000000000203', current_setting('risegoat.test_user_id')::uuid, '00000000-0000-4000-8000-000000000102', 'public-second-post', 'test', 'published', false);

set local role anon;

select is(
  (select count(*)::bigint from public.blogs where id='00000000-0000-4000-8000-000000000102'),
  1::bigint,
  'anon can read a published blog'
);

select is(
  (select count(*)::bigint from public.blogs where id='00000000-0000-4000-8000-000000000101'),
  0::bigint,
  'anon cannot read an unpublished blog'
);

select is(
  (select count(*)::bigint from public.microblog_posts where id='00000000-0000-4000-8000-000000000202'),
  1::bigint,
  'anon can read a post from a published blog'
);

select is(
  (select count(*)::bigint from public.microblog_posts where id='00000000-0000-4000-8000-000000000201'),
  0::bigint,
  'anon cannot read a published-status post from an unpublished blog'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('risegoat.test_user_id'), true);

select is(
  (select count(*)::bigint from public.blogs where id='00000000-0000-4000-8000-000000000101'),
  1::bigint,
  'owner can read their unpublished blog'
);

select is(
  public.set_blog_post_pinned('00000000-0000-4000-8000-000000000203', true),
  true,
  'owner can pin their post through the atomic RPC'
);

select is(
  (select count(*)::bigint from public.microblog_posts
    where blog_id='00000000-0000-4000-8000-000000000102' and is_pinned=true),
  1::bigint,
  'a blog never has more than one pinned post'
);

select is(
  (select is_pinned from public.microblog_posts where id='00000000-0000-4000-8000-000000000203'),
  true,
  'the requested post becomes pinned'
);

select * from finish();
rollback;

-- Independent blogs and first-class microblog publishing.
-- Existing microblog rows are attached to a per-user default blog.
-- Legacy public microblog URLs remain supported by the client router.

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null default 'Meu Blog',
  description text not null default '',
  avatar_url text not null default '',
  cover_url text not null default '',
  theme_color text not null default '#0f172a',
  accent_color text not null default '#06b6d4',
  theme_font text not null default 'inter',
  content_width text not null default 'medium' check (content_width in ('narrow','medium','wide')),
  post_style text not null default 'cards' check (post_style in ('cards','minimal','editorial')),
  show_author boolean not null default true,
  is_published boolean not null default true,
  seo_title text not null default '',
  seo_description text not null default '',
  seo_keywords text not null default '',
  seo_image_url text not null default '',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.microblog_posts
  add column if not exists blog_id uuid,
  add column if not exists slug text,
  add column if not exists excerpt text not null default '',
  add column if not exists status text not null default 'published',
  add column if not exists published_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists links jsonb not null default '[]'::jsonb;

alter table public.microblog_posts drop constraint if exists microblog_posts_status_check;
alter table public.microblog_posts add constraint microblog_posts_status_check check (status in ('draft','published','archived'));

insert into public.blogs (user_id, slug, name, description, avatar_url, cover_url, theme_color, accent_color, theme_font, seo_title, seo_description, seo_image_url)
select p.id, lower(p.username), coalesce(nullif(trim(p.display_name), ''), 'Meu Blog'), coalesce(p.bio,''), coalesce(p.avatar_url,''),
       coalesce(p.cover_url,''), coalesce(p.theme_color,'#0f172a'), coalesce(p.accent_color,'#06b6d4'),
       coalesce(p.theme_font,'inter'), coalesce(nullif(p.seo_title,''),coalesce(nullif(trim(p.display_name),''),p.username)),
       coalesce(p.seo_description,''), coalesce(p.seo_image_url,'')
from public.profiles p
where not exists (select 1 from public.blogs b where b.user_id=p.id)
on conflict (slug) do nothing;

update public.microblog_posts m
set blog_id=b.id, slug='post-'||replace(substr(m.id::text,1,8),'-',''),
    published_at=coalesce(m.published_at,m.created_at), updated_at=coalesce(m.updated_at,m.created_at)
from public.blogs b
where b.user_id=m.user_id and m.blog_id is null;

update public.microblog_posts
set slug='post-'||replace(substr(id::text,1,8),'-','')
where slug is null or btrim(slug)='';

alter table public.microblog_posts alter column blog_id set not null;
alter table public.microblog_posts alter column slug set not null;
alter table public.microblog_posts alter column published_at set default now();

alter table public.microblog_posts drop constraint if exists microblog_posts_blog_id_fkey;
alter table public.microblog_posts add constraint microblog_posts_blog_id_fkey
  foreign key (blog_id) references public.blogs(id) on delete cascade;

create unique index if not exists blogs_slug_lower_unique on public.blogs(lower(slug));
create index if not exists idx_blogs_user_id on public.blogs(user_id);
create index if not exists idx_microblog_blog_public on public.microblog_posts(blog_id,status,is_pinned desc,created_at desc);
create unique index if not exists microblog_posts_blog_slug_unique on public.microblog_posts(blog_id,slug);
create unique index if not exists microblog_posts_one_pinned_per_blog on public.microblog_posts(blog_id) where is_pinned;

alter table public.blogs enable row level security;

drop policy if exists public_read_blogs on public.blogs;
drop policy if exists owner_read_blogs on public.blogs;
drop policy if exists insert_own_blogs on public.blogs;
drop policy if exists update_own_blogs on public.blogs;
drop policy if exists delete_own_blogs on public.blogs;

create policy public_read_blogs on public.blogs for select to anon,authenticated using (is_published=true);
create policy owner_read_blogs on public.blogs for select to authenticated using ((select auth.uid())=user_id);
create policy insert_own_blogs on public.blogs for insert to authenticated with check ((select auth.uid())=user_id);
create policy update_own_blogs on public.blogs for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy delete_own_blogs on public.blogs for delete to authenticated using ((select auth.uid())=user_id);

drop policy if exists public_read_microblog on public.microblog_posts;
drop policy if exists owner_read_microblog on public.microblog_posts;
drop policy if exists insert_own_microblog on public.microblog_posts;
drop policy if exists update_own_microblog on public.microblog_posts;
drop policy if exists delete_own_microblog on public.microblog_posts;

create policy public_read_microblog on public.microblog_posts for select to anon,authenticated using (status='published');
create policy owner_read_microblog on public.microblog_posts for select to authenticated using ((select auth.uid())=user_id);
create policy insert_own_microblog on public.microblog_posts for insert to authenticated
with check ((select auth.uid())=user_id and exists(select 1 from public.blogs b where b.id=blog_id and b.user_id=(select auth.uid())));
create policy update_own_microblog on public.microblog_posts for update to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id and exists(select 1 from public.blogs b where b.id=blog_id and b.user_id=(select auth.uid())));
create policy delete_own_microblog on public.microblog_posts for delete to authenticated using ((select auth.uid())=user_id);

grant select on table public.blogs to anon,authenticated;
grant insert,update,delete on table public.blogs to authenticated;
grant select on table public.microblog_posts to anon,authenticated;
grant insert,update,delete on table public.microblog_posts to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare desired_username text; desired_display_name text;
begin
  desired_username:=lower(trim(coalesce(new.raw_user_meta_data->>'username','')));
  if desired_username='' then desired_username:='user_'||replace(substr(new.id::text,1,8),'-',''); end if;
  desired_display_name:=coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),desired_username);
  begin
    insert into public.profiles(id,username,display_name) values(new.id,desired_username,desired_display_name) on conflict(id) do nothing;
  exception when unique_violation then
    desired_username:='user_'||replace(substr(new.id::text,1,12),'-','');
    insert into public.profiles(id,username,display_name) values(new.id,desired_username,desired_display_name) on conflict(id) do nothing;
  end;
  if not exists(select 1 from public.blogs where user_id=new.id) then
    insert into public.blogs(user_id,slug,name,seo_title) values(new.id,desired_username,desired_display_name,desired_display_name) on conflict(slug) do nothing;
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public,anon,authenticated;

notify pgrst,'reload schema';
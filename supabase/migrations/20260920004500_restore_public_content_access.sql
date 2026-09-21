-- Restore least-privilege anonymous access to intentionally public content.
-- The waitlist remains closed for account creation; public profiles/content stay shareable.
grant select on table public.profiles to anon;
grant select on table public.links to anon;
grant select on table public.microblog_posts to anon;
grant select on table public.sales_pages to anon;
grant select on table public.sales_blocks to anon;

grant insert on table public.page_visits to anon;
grant insert on table public.link_clicks to anon;
grant insert on table public.newsletter_leads to anon;

notify pgrst, 'reload schema';

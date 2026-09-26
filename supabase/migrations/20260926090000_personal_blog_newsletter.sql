-- Personal blog reset: prevent duplicate newsletter subscriptions per owner.
create unique index if not exists idx_newsletter_leads_owner_email
  on public.newsletter_leads(user_id, lower(email));

create index if not exists idx_microblog_posts_blog_published
  on public.microblog_posts(blog_id, status, published_at desc, created_at desc);

notify pgrst, 'reload schema';

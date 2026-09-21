-- Sales page canvas settings: background and global content width.
alter table public.sales_pages
  add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists idx_sales_pages_published_slug
  on public.sales_pages(lower(slug))
  where is_published = true;

notify pgrst, 'reload schema';

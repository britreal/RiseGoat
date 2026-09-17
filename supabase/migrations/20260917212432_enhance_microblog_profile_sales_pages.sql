/*
# Simply Connect v2 — Enhanced microblog, profile themes, sales pages

## Changes to existing tables

### profiles (add columns)
- `theme_font` (text, default 'inter') — font family for public page
- `accent_color` (text, default '#06b6d4') — accent/CTA color for public page
- `link_style` (text, default 'rounded') — link button style: 'rounded' | 'square' | 'pill'

### microblog_posts (add columns)
- `title` (text, default '') — optional post title
- `image_url` (text, default '') — optional image attachment
- `seo_title` (text, default '') — custom SEO title
- `seo_description` (text, default '') — custom SEO meta description
- `seo_keywords` (text, default '') — comma-separated SEO keywords

## New tables

### sales_pages
- `id` (uuid, PK)
- `user_id` (uuid, FK auth.users, default auth.uid())
- `slug` (text, not null) — URL slug for the sales page
- `title` (text, not null) — page title
- `is_published` (boolean, default false)
- `seo_title` (text, default '')
- `seo_description` (text, default '')
- `created_at`, `updated_at` (timestamptz)

### sales_blocks
- `id` (uuid, PK)
- `page_id` (uuid, FK sales_pages, ON DELETE CASCADE)
- `user_id` (uuid, FK auth.users, default auth.uid())
- `block_type` (text) — 'heading' | 'text' | 'image' | 'button' | 'spacer' | 'divider'
- `content` (text) — text content or image URL
- `settings` (jsonb, default '{}') — block-specific config (alignment, color, size, button URL, etc.)
- `sort_order` (int, default 0)
- `created_at` (timestamptz)

## Security
- sales_pages: public SELECT (published pages), owner CRUD
- sales_blocks: public SELECT (on published pages), owner CRUD
- All owner-scoped with DEFAULT auth.uid()

## Notes
1. Removed 280 char limit on microblog_posts — posts can now be any length.
2. Sales pages are public when published, private when draft.
3. Sales blocks are readable by public only when the parent page is published.
*/

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_font text NOT NULL DEFAULT 'inter';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#06b6d4';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS link_style text NOT NULL DEFAULT 'rounded';

-- Add columns to microblog_posts
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS image_url text NOT NULL DEFAULT '';
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '';
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '';
ALTER TABLE microblog_posts ADD COLUMN IF NOT EXISTS seo_keywords text NOT NULL DEFAULT '';

-- Sales pages
CREATE TABLE IF NOT EXISTS sales_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sales_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_published_sales_pages" ON sales_pages;
CREATE POLICY "public_read_published_sales_pages" ON sales_pages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_sales_pages" ON sales_pages;
CREATE POLICY "insert_own_sales_pages" ON sales_pages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sales_pages" ON sales_pages;
CREATE POLICY "update_own_sales_pages" ON sales_pages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sales_pages" ON sales_pages;
CREATE POLICY "delete_own_sales_pages" ON sales_pages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Sales blocks
CREATE TABLE IF NOT EXISTS sales_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES sales_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  content text NOT NULL DEFAULT '',
  settings jsonb NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sales_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_sales_blocks" ON sales_blocks;
CREATE POLICY "public_read_sales_blocks" ON sales_blocks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_sales_blocks" ON sales_blocks;
CREATE POLICY "insert_own_sales_blocks" ON sales_blocks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sales_blocks" ON sales_blocks;
CREATE POLICY "update_own_sales_blocks" ON sales_blocks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sales_blocks" ON sales_blocks;
CREATE POLICY "delete_own_sales_blocks" ON sales_blocks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_pages_user_id ON sales_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_blocks_page_id ON sales_blocks(page_id, sort_order);

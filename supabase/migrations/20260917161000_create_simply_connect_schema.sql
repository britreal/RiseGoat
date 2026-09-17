/*
# Simply Connect — Creator Pages Platform Schema

Creates the full database schema for a creator pages platform where users sign up,
build their public creator page, post microblog updates, collect newsletter leads,
and track analytics.

## Tables

1. `profiles` — extends auth.users with creator-specific data
   - `id` (uuid, PK, references auth.users)
   - `username` (text, unique) — the @handle for the public page
   - `display_name` (text) — name shown on public page
   - `bio` (text) — short bio/tagline
   - `avatar_url` (text) — profile photo URL
   - `cover_url` (text) — cover/banner image URL
   - `theme_color` (text, default '#0f172a') — accent color for public page
   - `created_at` (timestamptz)

2. `links` — social/custom links on the creator's page
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `label` (text) — display text e.g. "Instagram"
   - `url` (text) — destination URL
   - `icon` (text) — icon key for rendering
   - `sort_order` (int, default 0)
   - `is_active` (boolean, default true)
   - `clicks` (int, default 0) — aggregate click counter
   - `created_at` (timestamptz)

3. `microblog_posts` — short-form posts shown on public page
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `content` (text) — the post text
   - `is_pinned` (boolean, default false)
   - `created_at` (timestamptz)

4. `newsletter_leads` — email signups collected from public page
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, default auth.uid()) — which creator's list
   - `name` (text)
   - `email` (text)
   - `source` (text) — where the signup came from
   - `created_at` (timestamptz)

5. `page_visits` — analytics: page view events
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, default auth.uid()) — whose page was visited
   - `visitor_referrer` (text)
   - `created_at` (timestamptz)

6. `link_clicks` — analytics: individual click events
   - `id` (uuid, PK)
   - `link_id` (uuid, references links, ON DELETE CASCADE)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `created_at` (timestamptz)

7. `drafts` — saved draft posts not yet published
   - `id` (uuid, PK)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `title` (text)
   - `content` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Security (RLS)

- `profiles`: public SELECT (so public pages load without auth), owner-only INSERT/UPDATE
- `links`: public SELECT (active links only), owner-only full CRUD
- `microblog_posts`: public SELECT, owner-only INSERT/UPDATE/DELETE
- `newsletter_leads`: public INSERT (visitors sign up), owner-only SELECT/DELETE
- `page_visits`: public INSERT (tracking visits), owner-only SELECT
- `link_clicks`: public INSERT (tracking clicks), owner-only SELECT
- `drafts`: owner-only full CRUD (private)

## Important Notes

1. Public pages (profiles, links, microblog) are readable by anon so visitors don't need to sign in.
2. Newsletter lead capture and analytics event logging are INSERT-only for anon — visitors can submit but cannot read.
3. All owner-scoped tables use `DEFAULT auth.uid()` so frontend inserts work without passing user_id.
4. Drafts are fully private — only the authenticated owner can see them.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  theme_color text NOT NULL DEFAULT '#0f172a',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- LINKS
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  icon text NOT NULL DEFAULT 'link',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  clicks int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_links" ON links;
CREATE POLICY "public_read_links" ON links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_links" ON links;
CREATE POLICY "insert_own_links" ON links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_links" ON links;
CREATE POLICY "update_own_links" ON links FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_links" ON links;
CREATE POLICY "delete_own_links" ON links FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- MICROBLOG POSTS
CREATE TABLE IF NOT EXISTS microblog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE microblog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_microblog" ON microblog_posts;
CREATE POLICY "public_read_microblog" ON microblog_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_microblog" ON microblog_posts;
CREATE POLICY "insert_own_microblog" ON microblog_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_microblog" ON microblog_posts;
CREATE POLICY "update_own_microblog" ON microblog_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_microblog" ON microblog_posts;
CREATE POLICY "delete_own_microblog" ON microblog_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- NEWSLETTER LEADS
CREATE TABLE IF NOT EXISTS newsletter_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  source text NOT NULL DEFAULT 'public_page',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE newsletter_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_leads" ON newsletter_leads;
CREATE POLICY "public_insert_leads" ON newsletter_leads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_read_leads" ON newsletter_leads;
CREATE POLICY "owner_read_leads" ON newsletter_leads FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_delete_leads" ON newsletter_leads;
CREATE POLICY "owner_delete_leads" ON newsletter_leads FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PAGE VISITS (analytics)
CREATE TABLE IF NOT EXISTS page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_referrer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_visits" ON page_visits;
CREATE POLICY "public_insert_visits" ON page_visits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_read_visits" ON page_visits;
CREATE POLICY "owner_read_visits" ON page_visits FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- LINK CLICKS (analytics)
CREATE TABLE IF NOT EXISTS link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES links(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_clicks" ON link_clicks;
CREATE POLICY "public_insert_clicks" ON link_clicks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "owner_read_clicks" ON link_clicks;
CREATE POLICY "owner_read_clicks" ON link_clicks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- DRAFTS (private)
CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_drafts" ON drafts;
CREATE POLICY "select_own_drafts" ON drafts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_drafts" ON drafts;
CREATE POLICY "insert_own_drafts" ON drafts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_drafts" ON drafts;
CREATE POLICY "update_own_drafts" ON drafts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_drafts" ON drafts;
CREATE POLICY "delete_own_drafts" ON drafts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_sort ON links(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_microblog_user_id ON microblog_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON newsletter_leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON page_visits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON link_clicks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id, updated_at DESC);

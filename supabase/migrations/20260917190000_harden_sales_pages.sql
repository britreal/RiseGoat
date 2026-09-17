-- RiseGoat sales pages hardening
-- Safe to run after the sales_pages/sales_blocks migration.

ALTER TABLE sales_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_blocks ENABLE ROW LEVEL SECURITY;

-- A creator cannot accidentally create two pages with the same public URL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_pages_user_slug_unique
  ON sales_pages(user_id, slug);

-- Keep owner access explicit.
DROP POLICY IF EXISTS "insert_own_sales_pages" ON sales_pages;
CREATE POLICY "insert_own_sales_pages" ON sales_pages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sales_pages" ON sales_pages;
CREATE POLICY "update_own_sales_pages" ON sales_pages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sales_pages" ON sales_pages;
CREATE POLICY "delete_own_sales_pages" ON sales_pages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public visitors only need published pages.
DROP POLICY IF EXISTS "public_read_published_sales_pages" ON sales_pages;
CREATE POLICY "public_read_published_sales_pages" ON sales_pages
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR auth.uid() = user_id);

-- Blocks follow the visibility of their parent page.
DROP POLICY IF EXISTS "public_read_sales_blocks" ON sales_blocks;
CREATE POLICY "public_read_sales_blocks" ON sales_blocks
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sales_pages
      WHERE sales_pages.id = sales_blocks.page_id
        AND (sales_pages.is_published = true OR sales_pages.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_sales_blocks" ON sales_blocks;
CREATE POLICY "insert_own_sales_blocks" ON sales_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sales_blocks" ON sales_blocks;
CREATE POLICY "update_own_sales_blocks" ON sales_blocks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sales_blocks" ON sales_blocks;
CREATE POLICY "delete_own_sales_blocks" ON sales_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sales_pages_published_slug
  ON sales_pages(slug) WHERE is_published = true;

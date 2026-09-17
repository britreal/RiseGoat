/*
  RiseGoat — links, affiliate products and SEO metadata
*/

ALTER TABLE links ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'link';
ALTER TABLE links ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE links ADD COLUMN IF NOT EXISTS thumbnail_url text NOT NULL DEFAULT '';
ALTER TABLE links ADD COLUMN IF NOT EXISTS sensitive boolean NOT NULL DEFAULT false;
ALTER TABLE links ADD COLUMN IF NOT EXISTS product_price text NOT NULL DEFAULT '';
ALTER TABLE links ADD COLUMN IF NOT EXISTS product_currency text NOT NULL DEFAULT 'BRL';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_image_url text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'links_link_type_check'
      AND conrelid = 'links'::regclass
  ) THEN
    ALTER TABLE links
      ADD CONSTRAINT links_link_type_check
      CHECK (link_type IN ('link','youtube','course','affiliate'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_links_public_order
  ON links(user_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_links_type
  ON links(user_id, link_type);

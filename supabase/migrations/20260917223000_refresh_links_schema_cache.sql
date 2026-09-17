/*
  RiseGoat — ensure the new Links/SEO columns exist and refresh PostgREST.
  Safe to run even if the columns already exist.
*/

ALTER TABLE public.links ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'link';
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS thumbnail_url text NOT NULL DEFAULT '';
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS sensitive boolean NOT NULL DEFAULT false;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS product_price text NOT NULL DEFAULT '';
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS product_currency text NOT NULL DEFAULT 'BRL';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seo_image_url text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'links_link_type_check'
      AND conrelid = 'public.links'::regclass
  ) THEN
    ALTER TABLE public.links
      ADD CONSTRAINT links_link_type_check
      CHECK (link_type IN ('link','youtube','course','affiliate'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

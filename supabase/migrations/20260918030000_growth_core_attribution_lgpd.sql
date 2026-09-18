-- Growth core: positioning, lead attribution and LGPD-safe subscription state.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'criador';

ALTER TABLE public.newsletter_leads
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consented_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_page text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_referrer text NOT NULL DEFAULT '';

ALTER TABLE public.page_visits
  ADD COLUMN IF NOT EXISTS page_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text NOT NULL DEFAULT '';

ALTER TABLE public.link_clicks
  ADD COLUMN IF NOT EXISTS page_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referrer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text NOT NULL DEFAULT '';

ALTER TABLE public.revenues
  ADD COLUMN IF NOT EXISTS attribution_method text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_newsletter_leads_attribution
  ON public.newsletter_leads(user_id, utm_source, utm_campaign, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_utm
  ON public.page_visits(user_id, utm_source, utm_campaign, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_clicks_utm
  ON public.link_clicks(user_id, utm_source, utm_campaign, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenues_utm
  ON public.revenues(user_id, utm_source, utm_campaign, occurred_on DESC);

NOTIFY pgrst, 'reload schema';

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_leads_unsubscribe_token
  ON public.newsletter_leads(unsubscribe_token);

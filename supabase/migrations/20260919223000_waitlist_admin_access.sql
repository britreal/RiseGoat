-- Waitlist access mode + protected application admin membership.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "read own admin membership" ON public.app_admins;
CREATE POLICY "read own admin membership"
  ON public.app_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'auth_page',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_signups_email_lower
  ON public.waitlist_signups (lower(email));

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at
  ON public.waitlist_signups (created_at DESC);

DROP POLICY IF EXISTS "public_can_join_waitlist" ON public.waitlist_signups;
CREATE POLICY "public_can_join_waitlist"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(name)) BETWEEN 1 AND 120
    AND length(trim(email)) BETWEEN 3 AND 320
    AND position('@' in email) > 1
  );

DROP POLICY IF EXISTS "admin_can_read_waitlist" ON public.waitlist_signups;
CREATE POLICY "admin_can_read_waitlist"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Seed the current RiseGoat owner as the first application admin.
INSERT INTO public.app_admins (user_id)
SELECT id
FROM public.profiles
WHERE username = 'ibritreal'
ON CONFLICT (user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

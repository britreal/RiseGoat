import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xofrlyblnsvcjsywynzu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_V1WJVeWemXn45P1HnLXANQ_I_AhtYnU';

export const publicSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

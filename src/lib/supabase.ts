import { createClient } from '@supabase/supabase-js';

// RiseGoat is intentionally connected only to the Fluently Supabase project.
const supabaseUrl = 'https://xofrlyblnsvcjsywynzu.supabase.co';
const supabaseAnonKey = 'sb_publishable_V1WJVeWemXn45P1HnLXANQ_I_AhtYnU';

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);

  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeout);
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

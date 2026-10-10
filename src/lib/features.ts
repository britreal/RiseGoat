/**
 * Release switches for experimental and operational features.
 *
 * These values are public build-time switches, never secrets. Keep sensitive credentials
 * (especially Supabase service_role) out of VITE_* variables and browser bundles.
 * Deployments may set the matching VITE_FEATURE_* variable to "true" or "false".
 */
const env = import.meta.env as Record<string, string | undefined>;

function flag(name: string, fallback: boolean): boolean {
  const value = env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

export const FEATURES = Object.freeze({
  // Removed from the current UI; retained as off-switches for emergency rollback.
  googleTakeoutImport: flag('VITE_FEATURE_GOOGLE_TAKEOUT_IMPORT', false),
  localReminders: flag('VITE_FEATURE_LOCAL_REMINDERS', false),
  publicSignup: flag('VITE_FEATURE_PUBLIC_SIGNUP', false),

  // Curated access is not public signup. Waitlist is enabled while invitations require approval.
  waitlistSignup: flag('VITE_FEATURE_WAITLIST_SIGNUP', true),

  // Network modules.
  tabuleiro: flag('VITE_FEATURE_TABULEIRO', false),
  pngExport: flag('VITE_FEATURE_PNG_EXPORT', true),
  circles: flag('VITE_FEATURE_CIRCLES', true),

  // Web Push must stay off until subscriptions and server-side scheduling are deployed.
  webPushReminders: flag('VITE_FEATURE_WEB_PUSH_REMINDERS', false),
} as const);

export type FeatureFlag = keyof typeof FEATURES;

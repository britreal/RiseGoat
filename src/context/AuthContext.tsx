import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    }).catch((error) => { console.error('Failed to initialize authentication:', error); if (mounted) setLoading(false); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => { setSession(currentSession); setUser(currentSession?.user ?? null); });
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, username: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: username.toLowerCase().trim(), display_name: displayName.trim() } } });
    if (error) return { error: error.message, needsConfirmation: false };
    if (!data.user) return { error: 'Não foi possível criar a conta.', needsConfirmation: false };
    return { error: null, needsConfirmation: !data.session };
  }

  async function signOut() { await supabase.auth.signOut(); setSession(null); setUser(null); }

  return <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; }
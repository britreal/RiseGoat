import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, WorkspaceMode } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(() => (localStorage.getItem('risegoat-workspace-mode') as WorkspaceMode) || 'negocios');

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load profile:', error);
        setProfile(null);
        return;
      }

      // A missing profile should never block the entire application.
      // The Profile page can render a recovery state and the user can continue using the app.
      const nextProfile = data as Profile | null;
      setProfile(nextProfile);
      const mode = nextProfile?.workspace_mode === 'pessoal' ? 'pessoal' : 'negocios';
      setWorkspaceModeState(mode);
      localStorage.setItem('risegoat-workspace-mode', mode);
    } catch (error) {
      console.error('Unexpected profile loading error:', error);
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      if (mounted) setLoading(false);
    }).catch((error) => {
      console.error('Failed to initialize authentication:', error);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  async function setWorkspaceMode(mode: WorkspaceMode) {
    if (!user) return false;
    const previous = workspaceMode;
    setWorkspaceModeState(mode);
    localStorage.setItem('risegoat-workspace-mode', mode);
    const { error } = await supabase.from('profiles').update({ workspace_mode: mode }).eq('id', user.id);
    if (error) {
      setWorkspaceModeState(previous);
      localStorage.setItem('risegoat-workspace-mode', previous);
      return false;
    }
    setProfile((current) => current ? { ...current, workspace_mode: mode } : current);
    return true;
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, username: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase().trim(), display_name: displayName.trim() } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Falha ao criar conta' };

    // The profile is created by the database trigger so signup also works when email confirmation is enabled.
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setWorkspaceModeState('negocios');
    localStorage.removeItem('risegoat-workspace-mode');
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile, workspaceMode, setWorkspaceMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { MenuVisibility, Profile, WorkspaceMode } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => Promise<boolean>;
  menuVisibility: MenuVisibility;
  setMenuVisibility: (visibility: MenuVisibility) => Promise<boolean>;
  setMenuItemVisibility: (path: string, visible: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(() => (localStorage.getItem('risegoat-workspace-mode') as WorkspaceMode) || 'negocios');
  const [menuVisibility, setMenuVisibilityState] = useState<MenuVisibility>({});

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
      setMenuVisibilityState((nextProfile?.menu_visibility as MenuVisibility | null) ?? {});
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

  async function setMenuVisibility(visibility: MenuVisibility) {
    if (!user) return false;
    const previous = menuVisibility;
    setMenuVisibilityState(visibility);
    const { error } = await supabase.from('profiles').update({ menu_visibility: visibility }).eq('id', user.id);
    if (error) {
      setMenuVisibilityState(previous);
      return false;
    }
    setProfile((current) => current ? { ...current, menu_visibility: visibility } : current);
    return true;
  }

  async function setMenuItemVisibility(path: string, visible: boolean) {
    return setMenuVisibility({ ...menuVisibility, [path]: visible });
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
    if (error) return { error: error.message, needsConfirmation: false };
    if (!data.user) return { error: 'Falha ao criar conta', needsConfirmation: false };

    // When email confirmation is enabled Supabase returns a user without an active session.
    // Keep the user on the auth screen and explain the next step instead of redirecting to a protected route.
    return { error: null, needsConfirmation: !data.session };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setMenuVisibilityState({});
    setWorkspaceModeState('negocios');
    localStorage.removeItem('risegoat-workspace-mode');
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile, workspaceMode, setWorkspaceMode, menuVisibility, setMenuVisibility, setMenuItemVisibility }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

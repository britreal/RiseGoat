import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { Spinner } from '@/components/ui';
import '@/lib/landing.css';
import '@/lib/auth.css';
import '@/lib/notes.css';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const NotesPage = lazy(() => import('@/pages/NotesPage').then((m) => ({ default: m.NotesPage })));
const GraphPage = lazy(() => import('@/pages/GraphPage').then((m) => ({ default: m.GraphPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (route.name === 'auth' && session) { navigate('/notes'); return; }
    if (route.name === 'landing' && session) { navigate('/notes'); return; }
    if ((route.name === 'notes' || route.name === 'map' || route.name === 'settings') && !session) navigate('/auth');
  }, [route.name, session, loading, navigate]);

  useEffect(() => {
    const meta = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta) meta.content = route.name === 'landing' ? 'index,follow' : 'noindex,nofollow,noarchive';
  }, [route.name]);

  if (loading) return <Spinner />;
  return <Suspense fallback={<Spinner />}>{route.name === 'landing' ? <LandingPage /> : route.name === 'auth' ? <AuthPage /> : route.name === 'map' ? <GraphPage /> : route.name === 'settings' ? <SettingsPage /> : <NotesPage />}</Suspense>;
}

function App() { return <AuthProvider><AppContent /></AuthProvider>; }
export default App;
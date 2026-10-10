import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { Spinner } from '@/components/ui';
import { FEATURES } from '@/lib/features';
import '@/lib/landing.css';
import '@/lib/auth.css';
import '@/lib/notes.css';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const NotesPage = lazy(() => import('@/pages/NotesPage').then((m) => ({ default: m.NotesPage })));
const GraphPage = lazy(() => import('@/pages/GraphPage').then((m) => ({ default: m.GraphPage })));
const TabuleiroPage = lazy(() => import('@/pages/TabuleiroPage').then((m) => ({ default: m.TabuleiroPage })));
const MagnateDetalhe = lazy(() => import('@/pages/MagnateDetalhe').then((m) => ({ default: m.MagnateDetalhe })));
const TabuleiroGrafo = lazy(() => import('@/pages/TabuleiroGrafo').then((m) => ({ default: m.TabuleiroGrafo })));

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (route.name === 'auth' && session) { navigate('/notes'); return; }
    if (route.name === 'landing' && session) { navigate('/notes'); return; }
    const isTabuleiroRoute = route.name === 'tabuleiro' || route.name === 'tabuleiro-detail' || route.name === 'tabuleiro-graph';
    if (isTabuleiroRoute && !FEATURES.TABULEIRO) { navigate('/notes'); return; }
    if (route.name === 'tabuleiro-graph' && !FEATURES.TABULEIRO_GRAPH_VIEW) { navigate('/tabuleiro'); return; }
    if (isTabuleiroRoute && !session && !FEATURES.TABULEIRO_PUBLIC_PREVIEW) { navigate('/auth'); return; }
    if ((route.name === 'notes' || route.name === 'map' || route.name === 'settings') && !session) navigate('/auth');
  }, [route.name, session, loading, navigate]);

  useEffect(() => {
    const meta = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const publicTabuleiro = FEATURES.TABULEIRO && FEATURES.TABULEIRO_PUBLIC_PREVIEW
      && (route.name === 'tabuleiro' || route.name === 'tabuleiro-detail');
    if (meta) meta.content = route.name === 'landing' || publicTabuleiro ? 'index,follow' : 'noindex,nofollow,noarchive';
  }, [route.name]);

  if (loading) return <Spinner />;
  const page = route.name === 'landing' ? <LandingPage />
    : route.name === 'auth' ? <AuthPage />
    : route.name === 'map' ? <GraphPage />
    : route.name === 'settings' ? <NotesPage initialSettingsOpen />
    : route.name === 'tabuleiro' && FEATURES.TABULEIRO ? <TabuleiroPage />
    : route.name === 'tabuleiro-detail' && FEATURES.TABULEIRO ? <MagnateDetalhe />
    : route.name === 'tabuleiro-graph' && FEATURES.TABULEIRO && FEATURES.TABULEIRO_GRAPH_VIEW ? <TabuleiroGrafo />
    : <NotesPage />;
  return <Suspense fallback={<Spinner />}>{page}</Suspense>;
}

function App() { return <AuthProvider><AppContent /></AuthProvider>; }
export default App;
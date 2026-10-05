import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { Spinner } from '@/components/ui';
import '@/lib/notes.css';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const NotesPage = lazy(() => import('@/pages/NotesPage').then((m) => ({ default: m.NotesPage })));

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (route.name === 'auth' && session) {
      navigate('/');
      return;
    }

    if (route.name === 'notes' && !session) {
      navigate('/auth');
    }
  }, [route.name, session, loading, navigate]);

  useEffect(() => {
    const meta = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta) meta.content = route.name === 'auth' ? 'noindex,nofollow,noarchive' : 'noindex,nofollow,noarchive';
  }, [route.name]);

  if (loading) return <Spinner />;

  if (!session && route.name === 'notes') return <Spinner />;

  return (
    <Suspense fallback={<Spinner />}>
      {route.name === 'auth' ? <AuthPage /> : <NotesPage />}
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

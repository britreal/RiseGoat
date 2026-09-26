import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Spinner } from '@/components/ui';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const AdminHomePage = lazy(() => import('@/pages/AdminHomePage').then((m) => ({ default: m.AdminHomePage })));
const PostsPage = lazy(() => import('@/pages/PostsPage').then((m) => ({ default: m.PostsPage })));
const NewsletterPage = lazy(() => import('@/pages/NewsletterPage').then((m) => ({ default: m.NewsletterPage })));
const BlogSettingsPage = lazy(() => import('@/pages/BlogSettingsPage').then((m) => ({ default: m.BlogSettingsPage })));
const PublicHomePage = lazy(() => import('@/pages/PublicHomePage').then((m) => ({ default: m.PublicHomePage })));
const PublicBlogPage = lazy(() => import('@/pages/PublicBlogPage').then((m) => ({ default: m.PublicBlogPage })));
const PublicBlogPostPage = lazy(() => import('@/pages/PublicBlogPostPage').then((m) => ({ default: m.PublicBlogPostPage })));
const UnsubscribePage = lazy(() => import('@/pages/UnsubscribePage').then((m) => ({ default: m.UnsubscribePage })));

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading } = useAuth();

  const isPublic = route.name === 'home' || route.name === 'public-blog' || route.name === 'public-blog-post' || route.name === 'unsubscribe';

  useEffect(() => {
    const meta = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (meta) meta.content = isPublic ? 'index,follow' : 'noindex,nofollow,noarchive';
  }, [isPublic]);

  useEffect(() => {
    if (route.name === 'auth' && session) {
      navigate('/admin');
      return;
    }

    const privateRoutes = new Set(['admin', 'posts', 'newsletter', 'site']);
    if (privateRoutes.has(route.name) && !loading && !session) navigate('/auth');
  }, [route.name, session, loading, navigate]);

  let page: React.ReactNode = <PublicHomePage />;

  if (route.name === 'auth') page = <AuthPage />;
  else if (route.name === 'admin') page = <DashboardLayout currentPath="/admin" navigate={navigate}><AdminHomePage navigate={navigate} /></DashboardLayout>;
  else if (route.name === 'posts') page = <DashboardLayout currentPath="/posts" navigate={navigate}><PostsPage initialView="all" /></DashboardLayout>;
  else if (route.name === 'newsletter') page = <DashboardLayout currentPath="/newsletter" navigate={navigate}><NewsletterPage /></DashboardLayout>;
  else if (route.name === 'site') page = <DashboardLayout currentPath="/site" navigate={navigate}><BlogSettingsPage /></DashboardLayout>;
  else if (route.name === 'public-blog') page = <PublicBlogPage slug={route.slug} />;
  else if (route.name === 'public-blog-post') page = <PublicBlogPostPage slug={route.slug} postSlug={route.postSlug} />;
  else if (route.name === 'unsubscribe') page = <UnsubscribePage token={route.token} />;

  if (loading) return <Spinner />;
  if (!session && ['admin', 'posts', 'newsletter', 'site'].includes(route.name)) return <Spinner />;

  return <Suspense fallback={<Spinner />}>{page}</Suspense>;
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;

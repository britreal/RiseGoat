import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { LinksPage } from '@/pages/LinksPage';
import { MicroblogPage } from '@/pages/MicroblogPage';
import { NewsletterPage } from '@/pages/NewsletterPage';
import { PostsPage } from '@/pages/PostsPage';
import { DraftsPage } from '@/pages/DraftsPage';
import { LeadsPage } from '@/pages/LeadsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PublicPage } from '@/pages/PublicPage';
import { Spinner } from '@/components/ui';

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading } = useAuth();

  // Public page — no auth required
  if (route.name === 'public') {
    return <PublicPage username={route.username} />;
  }

  // Auth page
  if (route.name === 'auth') {
    if (loading) return <Spinner />;
    if (session) {
      navigate('/dashboard');
      return <Spinner />;
    }
    return <AuthPage />;
  }

  // All other routes require auth
  if (loading) return <Spinner />;

  if (!session) {
    return <AuthPage />;
  }

  const currentPath = `/${route.name}`;
  const pageMap: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage navigate={navigate} />,
    profile: <ProfilePage />,
    links: <LinksPage />,
    microblog: <MicroblogPage />,
    newsletter: <NewsletterPage />,
    posts: <PostsPage />,
    drafts: <DraftsPage />,
    leads: <LeadsPage />,
    analytics: <AnalyticsPage />,
    settings: <SettingsPage />,
  };

  return (
    <DashboardLayout currentPath={currentPath} navigate={navigate}>
      {pageMap[route.name] ?? <DashboardPage navigate={navigate} />}
    </DashboardLayout>
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

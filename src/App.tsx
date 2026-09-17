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
import { SalesPagesPage } from '@/pages/SalesPagesPage';
import { SalesBuilderPage } from '@/pages/SalesBuilderPage';
import { PublicPage } from '@/pages/PublicPage';
import { PublicMicroblogPage } from '@/pages/PublicMicroblogPage';
import { PublicSalesPage } from '@/pages/PublicSalesPage';
import { Spinner } from '@/components/ui';

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading } = useAuth();

  if (route.name === 'public') return <PublicPage username={route.username} />;
  if (route.name === 'public-microblog') return <PublicMicroblogPage username={route.username} postId={route.postId} />;
  if (route.name === 'public-sales') return <PublicSalesPage slug={route.slug} />;

  if (route.name === 'auth') {
    if (loading) return <Spinner />;
    if (session) { navigate('/dashboard'); return <Spinner />; }
    return <AuthPage />;
  }

  if (loading) return <Spinner />;
  if (!session) return <AuthPage />;

  if (route.name === 'sales-editor') {
    return <SalesBuilderPage pageId={route.pageId} navigate={navigate} />;
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
    sales: <SalesPagesPage navigate={navigate} />,
  };

  return <DashboardLayout currentPath={currentPath} navigate={navigate}>{pageMap[route.name] ?? <DashboardPage navigate={navigate} />}</DashboardLayout>;
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;

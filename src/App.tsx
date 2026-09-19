import { useEffect } from 'react';
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
import { LeadsPage } from '@/pages/LeadsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SalesPagesPage } from '@/pages/SalesPagesPage';
import { CommandCenterPage } from '@/pages/CommandCenterPage';
import { GoatPage } from '@/pages/GoatPage';
import { OffersPage, RevenuePage, PartnershipsPage, LaunchesPage, GoalsPage, RadarPage } from '@/pages/BusinessModulesPage';
import { ActionFlowsPage } from '@/pages/ActionFlowsPage';
import { ProductPortfolioPage } from '@/pages/ProductPortfolioPage';
import { BookWriterPage } from '@/pages/BookWriterPage';
import { SalesBuilderPage } from '@/pages/SalesBuilderPage';
import { PublicPage } from '@/pages/PublicPage';
import { PublicMicroblogPage } from '@/pages/PublicMicroblogPage';
import { PublicSalesPage } from '@/pages/PublicSalesPage';
import { UnsubscribePage } from '@/pages/UnsubscribePage';
import { Spinner } from '@/components/ui';

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading, workspaceMode } = useAuth();

  if (route.name === 'public') return <PublicPage username={route.username} />;
  if (route.name === 'public-microblog') return <PublicMicroblogPage username={route.username} postId={route.postId} />;
  if (route.name === 'public-sales') return <PublicSalesPage slug={route.slug} />;
  if (route.name === 'unsubscribe') return <UnsubscribePage token={route.token} />;

  if (route.name === 'auth') {
    if (loading) return <Spinner />;
    if (session) { navigate('/dashboard'); return <Spinner />; }
    return <AuthPage />;
  }

  if (loading) return <Spinner />;
  if (!session) return <AuthPage />;

  const businessOnly = new Set(['profile','links','microblog','newsletter','posts','drafts','leads','analytics','sales','offers','product-portfolio','book-writer','revenue','command-center','partnerships','launches','radar','sales-editor']);
  if (workspaceMode === 'pessoal' && businessOnly.has(route.name)) {
    navigate('/dashboard');
    return <Spinner />;
  }
  if (workspaceMode === 'negocios' && route.name === 'goat') {
    navigate('/dashboard');
    return <Spinner />;
  }

  if (route.name === 'goat') return <DashboardLayout currentPath="/goat" navigate={navigate}><GoatPage /></DashboardLayout>;

  if (route.name === 'sales-editor') {
    return <SalesBuilderPage pageId={route.pageId} navigate={navigate} />;
  }

  const currentPath = `/${route.name}`;
  const pageMap: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage navigate={navigate} />,
    'action-flows': <ActionFlowsPage navigate={navigate} />,
    profile: <ProfilePage />,
    links: <LinksPage />,
    microblog: <MicroblogPage />,
    newsletter: <NewsletterPage />,
    posts: <PostsPage initialView="all" />,
    drafts: <PostsPage initialView="drafts" />,
    leads: <LeadsPage />,
    analytics: <AnalyticsPage />,
    settings: <SettingsPage />,
    sales: <SalesPagesPage navigate={navigate} />,
    'command-center': <CommandCenterPage />,
    offers: <OffersPage />,
    'product-portfolio': <ProductPortfolioPage />,
    'book-writer': <BookWriterPage />,
    revenue: <RevenuePage />,
    partnerships: <PartnershipsPage />,
    launches: <LaunchesPage />,
    radar: <RadarPage />,
    goals: <GoalsPage />,
  };

  return <DashboardLayout currentPath={currentPath} navigate={navigate}>{pageMap[route.name] ?? <DashboardPage navigate={navigate} />}</DashboardLayout>;
}

function hideBoltBadge() {
  const hide = () => {
    const candidates = document.querySelectorAll<HTMLElement>(
      'a, button, [role="button"], [data-bolt], [data-badge], [class*="bolt" i], [id*="bolt" i], [class*="badge" i], [id*="badge" i]'
    );

    candidates.forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const isBoltBadge =
        text.includes('made in bolt') ||
        href.includes('bolt.new') ||
        aria.includes('made in bolt') ||
        title.includes('made in bolt') ||
        el.hasAttribute('data-bolt') ||
        el.hasAttribute('data-badge') ||
        el.className.toString().toLowerCase().includes('badge') ||
        el.id.toLowerCase().includes('badge');

      if (isBoltBadge) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  };

  hide();
  const observer = new MutationObserver(hide);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}

function App() {
  useEffect(() => hideBoltBadge(), []);
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;

import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from '@/lib/router';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Spinner } from '@/components/ui';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const LinksPage = lazy(() => import('@/pages/LinksPage').then((m) => ({ default: m.LinksPage })));
const MicroblogPage = lazy(() => import('@/pages/MicroblogPage').then((m) => ({ default: m.MicroblogPage })));
const NewsletterPage = lazy(() => import('@/pages/NewsletterPage').then((m) => ({ default: m.NewsletterPage })));
const PostsPage = lazy(() => import('@/pages/PostsPage').then((m) => ({ default: m.PostsPage })));
const LeadsPage = lazy(() => import('@/pages/LeadsPage').then((m) => ({ default: m.LeadsPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SalesPagesPage = lazy(() => import('@/pages/SalesPagesPage').then((m) => ({ default: m.SalesPagesPage })));
const CommandCenterPage = lazy(() => import('@/pages/CommandCenterPage').then((m) => ({ default: m.CommandCenterPage })));
const GoatPage = lazy(() => import('@/pages/GoatPage').then((m) => ({ default: m.GoatPage })));
const ActionFlowsPage = lazy(() => import('@/pages/ActionFlowsPage').then((m) => ({ default: m.ActionFlowsPage })));
const ProductPortfolioPage = lazy(() => import('@/pages/ProductPortfolioPage').then((m) => ({ default: m.ProductPortfolioPage })));
const BookWriterPage = lazy(() => import('@/pages/BookWriterPage').then((m) => ({ default: m.BookWriterPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const SalesBuilderPage = lazy(() => import('@/pages/SalesBuilderPage').then((m) => ({ default: m.SalesBuilderPage })));
const OffersPage = lazy(() => import('@/pages/BusinessModulesPage').then((m) => ({ default: m.OffersPage })));
const RevenuePage = lazy(() => import('@/pages/BusinessModulesPage').then((m) => ({ default: m.RevenuePage })));
const PartnershipsPage = lazy(() => import('@/pages/BusinessModulesPage').then((m) => ({ default: m.PartnershipsPage })));
const LaunchesPage = lazy(() => import('@/pages/BusinessModulesPage').then((m) => ({ default: m.LaunchesPage })));
const RadarPage = lazy(() => import('@/pages/BusinessModulesPage').then((m) => ({ default: m.RadarPage })));
const GoalsPage = lazy(() => import('@/pages/BusinessModulesPage').then((m) => ({ default: m.GoalsPage })));
const FluxPage = lazy(() => import('@/pages/FluxPage').then((m) => ({ default: m.FluxPage })));
const PublicPage = lazy(() => import('@/pages/PublicPage').then((m) => ({ default: m.PublicPage })));
const PublicMicroblogPage = lazy(() => import('@/pages/PublicMicroblogPage').then((m) => ({ default: m.PublicMicroblogPage })));
const PublicBlogPage = lazy(() => import('@/pages/PublicBlogPage').then((m) => ({ default: m.PublicBlogPage })));
const PublicBlogPostPage = lazy(() => import('@/pages/PublicBlogPostPage').then((m) => ({ default: m.PublicBlogPostPage })));
const PublicSalesPage = lazy(() => import('@/pages/PublicSalesPage').then((m) => ({ default: m.PublicSalesPage })));
const UnsubscribePage = lazy(() => import('@/pages/UnsubscribePage').then((m) => ({ default: m.UnsubscribePage })));

function AppContent() {
  const { route, navigate } = useRouter();
  const { session, loading, workspaceMode } = useAuth();

  const isPublic = route.name === 'public' || route.name === 'public-microblog' || route.name === 'public-blog' ||
    route.name === 'public-blog-post' || route.name === 'public-sales' || route.name === 'unsubscribe';

  useEffect(() => {
    let tag = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!tag) { tag = document.createElement('meta'); tag.name = 'robots'; document.head.appendChild(tag); }
    tag.content = isPublic ? 'index,follow' : 'noindex,nofollow,noarchive';
  }, [isPublic]);

  useEffect(() => {
    const businessOnly = new Set(['profile','links','microblog','newsletter','posts','drafts','leads','analytics','sales','offers','product-portfolio','book-writer','revenue','command-center','partnerships','launches','radar','sales-editor','flux']);
    if (!isPublic && route.name === 'auth' && session) navigate('/dashboard');
    if (!isPublic && route.name !== 'auth' && !loading && !session) navigate('/auth');
    if (!isPublic && session && workspaceMode === 'pessoal' && businessOnly.has(route.name)) navigate('/dashboard');
    if (!isPublic && session && workspaceMode === 'negocios' && (route.name === 'goat')) navigate('/dashboard');
  }, [route.name, session, loading, workspaceMode, navigate, isPublic]);

  let page: React.ReactNode = <DashboardPage navigate={navigate} />;

  if (route.name === 'public') page = <PublicPage username={route.username} />;
  else if (route.name === 'public-microblog') page = <PublicMicroblogPage username={route.username} postId={route.postId} />;
  else if (route.name === 'public-blog') page = <PublicBlogPage slug={route.slug} />;
  else if (route.name === 'public-blog-post') page = <PublicBlogPostPage slug={route.slug} postSlug={route.postSlug} />;
  else if (route.name === 'public-sales') page = <PublicSalesPage slug={route.slug} />;
  else if (route.name === 'unsubscribe') page = <UnsubscribePage token={route.token} />;
  else if (route.name === 'auth') page = <AuthPage />;
  else if (route.name === 'admin') page = <DashboardLayout currentPath="/admin" navigate={navigate}><AdminPage /></DashboardLayout>;
  else if (route.name === 'goat') page = <DashboardLayout currentPath="/goat" navigate={navigate}><GoatPage /></DashboardLayout>;
  else if (route.name === 'sales-editor') page = <SalesBuilderPage pageId={route.pageId} navigate={navigate} />;
  else {
    const currentPath = '/' + route.name;
    if (route.name === 'dashboard') page = <DashboardPage navigate={navigate} />;
    else if (route.name === 'action-flows') page = <ActionFlowsPage navigate={navigate} />;
    else if (route.name === 'profile') page = <ProfilePage />;
    else if (route.name === 'links') page = <LinksPage />;
    else if (route.name === 'microblog') page = <MicroblogPage />;
    else if (route.name === 'newsletter') page = <NewsletterPage />;
    else if (route.name === 'posts') page = <PostsPage initialView="all" />;
    else if (route.name === 'drafts') page = <PostsPage initialView="drafts" />;
    else if (route.name === 'leads') page = <LeadsPage />;
    else if (route.name === 'analytics') page = <AnalyticsPage />;
    else if (route.name === 'settings') page = <SettingsPage />;
    else if (route.name === 'sales') page = <SalesPagesPage navigate={navigate} />;
    else if (route.name === 'command-center') page = <CommandCenterPage />;
    else if (route.name === 'offers') page = <OffersPage />;
    else if (route.name === 'product-portfolio') page = <ProductPortfolioPage />;
    else if (route.name === 'book-writer') page = <BookWriterPage />;
    else if (route.name === 'revenue') page = <RevenuePage />;
    else if (route.name === 'partnerships') page = <PartnershipsPage />;
    else if (route.name === 'launches') page = <LaunchesPage />;
    else if (route.name === 'radar') page = <RadarPage />;
    else if (route.name === 'goals') page = <GoalsPage />;
    else if (route.name === 'flux') page = <FluxPage workflowId={route.workflowId} navigate={navigate} />;
    page = <DashboardLayout currentPath={currentPath} navigate={navigate}>{page}</DashboardLayout>;
  }

  if (loading) return <Spinner />;
  if (!session && !isPublic && route.name !== 'auth') return <Spinner />;
  return <Suspense fallback={<Spinner />}>{page}</Suspense>;
}

function hideBoltBadge() {
  let scheduled = false;
  const hide = () => {
    const candidates = document.querySelectorAll<HTMLElement>('[data-bolt], [data-badge], a, button');
    candidates.forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute('href') || '').toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const isBoltBadge = text.includes('made in bolt') || href.includes('bolt.new') ||
        aria.includes('made in bolt') || title.includes('made in bolt') || el.hasAttribute('data-bolt');
      if (isBoltBadge) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    });
  };
  hide();
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => { scheduled = false; hide(); });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}

function App() {
  useEffect(() => hideBoltBadge(), []);
  return <AuthProvider><AppContent /></AuthProvider>;
}

export default App;
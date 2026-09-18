import { type ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sparkles, LayoutDashboard, Link2, MessageSquare, Mail, FileText, Users,
  BarChart3, Settings, LogOut, ExternalLink, Menu, X, ShoppingBag, Network, Activity,
  CircleDollarSign, Handshake, CalendarDays, Radar as RadarIcon, Target, Workflow, UserRound, BriefcaseBusiness,
} from 'lucide-react';

interface NavItem { label: string; path: string; icon: typeof LayoutDashboard; group: string; mode: 'shared' | 'pessoal' | 'negocios'; }

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Núcleo', mode: 'shared' },
  { label: 'Fluxos de Ação', path: '/action-flows', icon: Workflow, group: 'Núcleo', mode: 'shared' },
  { label: 'Metas', path: '/goals', icon: Target, group: 'Núcleo', mode: 'shared' },
  { label: 'Perfil', path: '/profile', icon: Users, group: 'Presença', mode: 'negocios' },
  { label: 'Links', path: '/links', icon: Link2, group: 'Presença', mode: 'negocios' },
  { label: 'Posts', path: '/posts', icon: FileText, group: 'Conteúdo', mode: 'negocios' },
  { label: 'Microblog', path: '/microblog', icon: MessageSquare, group: 'Conteúdo', mode: 'negocios' },
  { label: 'Newsletter', path: '/newsletter', icon: Mail, group: 'Captação', mode: 'negocios' },
  { label: 'Leads', path: '/leads', icon: Users, group: 'Captação', mode: 'negocios' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, group: 'Medição', mode: 'negocios' },
  { label: 'Ofertas', path: '/offers', icon: ShoppingBag, group: 'Monetização', mode: 'negocios' },
  { label: 'Páginas de Venda', path: '/sales', icon: ShoppingBag, group: 'Monetização', mode: 'negocios' },
  { label: 'Receita', path: '/revenue', icon: CircleDollarSign, group: 'Monetização', mode: 'negocios' },
  { label: 'Centro de Comando', path: '/command-center', icon: Network, group: 'Estratégia', mode: 'negocios' },
  { label: 'Parcerias', path: '/partnerships', icon: Handshake, group: 'Estratégia', mode: 'negocios' },
  { label: 'Lançamentos', path: '/launches', icon: CalendarDays, group: 'Estratégia', mode: 'negocios' },
  { label: 'Radar', path: '/radar', icon: RadarIcon, group: 'Estratégia', mode: 'negocios' },
  { label: 'GOAT', path: '/goat', icon: Activity, group: 'Pessoal', mode: 'pessoal' },
  { label: 'Configurações', path: '/settings', icon: Settings, group: 'Conta', mode: 'shared' },
];

interface DashboardLayoutProps { children: ReactNode; currentPath: string; navigate: (path: string) => void; }

export function DashboardLayout({ children, currentPath, navigate }: DashboardLayoutProps) {
  const { profile, signOut, workspaceMode, setWorkspaceMode } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => item.mode === 'shared' || item.mode === workspaceMode);
  const groups = [...new Set(visibleNavItems.map((n) => n.group))];
  const groupTone: Record<string, string> = {
    'Presença': 'text-blue-700 bg-blue-50',
    'Captação': 'text-emerald-700 bg-emerald-50',
    'Conteúdo': 'text-violet-700 bg-violet-50',
    'Medição': 'text-cyan-700 bg-cyan-50',
    'Monetização': 'text-amber-700 bg-amber-50',
    'Núcleo': 'text-slate-700 bg-slate-100',
    'Execução': 'text-indigo-700 bg-indigo-50',
    'Estratégia': 'text-red-700 bg-red-50',
    'Pessoal': 'text-slate-700 bg-slate-100',
    'Conta': 'text-slate-600 bg-slate-100',
    'Início': 'text-slate-700 bg-slate-100',
  };
  function handleNav(path: string) { navigate(path); setMobileOpen(false); }
  async function handleWorkspaceMode(mode: 'pessoal' | 'negocios') {
    const saved = await setWorkspaceMode(mode);
    if (!saved) return;
    const businessPaths = ['/profile','/links','/microblog','/newsletter','/leads','/analytics','/posts','/sales','/offers','/revenue','/command-center','/partnerships','/launches','/radar'];
    if (mode === 'pessoal' && businessPaths.includes(currentPath)) navigate('/dashboard');
    if (mode === 'negocios' && currentPath === '/goat') navigate('/dashboard');
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={cn('fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-slate-800 tracking-tight">RiseGoat</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => <div key={group}><p className={cn('px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider', groupTone[group]?.split(' ')[0] || 'text-slate-400')}>{group}</p><div className="space-y-0.5">{visibleNavItems.filter((n) => n.group === group).map((item) => <button key={item.path} onClick={() => handleNav(item.path)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition', currentPath === item.path ? groupTone[item.group] : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}><item.icon className="w-4 h-4 shrink-0" />{item.label}</button>)}</div></div>)}
        </nav>
        <div className="border-t border-slate-200 p-3 space-y-1">
          {profile && <button onClick={() => window.open(`/u/${profile.username}`, '_blank')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"><ExternalLink className="w-4 h-4 shrink-0" />Ver minha página</button>}
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"><LogOut className="w-4 h-4 shrink-0" />Sair</button>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 min-h-14 flex items-center px-4 lg:px-6 gap-3">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100">{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          <div className="hidden lg:flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div><span className="font-bold text-slate-800 text-sm">RiseGoat</span></div>
          <div className="ml-auto flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => void handleWorkspaceMode('pessoal')} className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition', workspaceMode === 'pessoal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}><UserRound className="w-3.5 h-3.5" /> Pessoal</button>
            <button onClick={() => void handleWorkspaceMode('negocios')} className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition', workspaceMode === 'negocios' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}><BriefcaseBusiness className="w-3.5 h-3.5" /> Negócios</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

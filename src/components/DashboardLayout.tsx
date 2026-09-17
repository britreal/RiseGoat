import { type ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sparkles, LayoutDashboard, Link2, MessageSquare, Mail, FileText, Users,
  BarChart3, Settings, LogOut, ExternalLink, Menu, X, ShoppingBag,
} from 'lucide-react';

interface NavItem { label: string; path: string; icon: typeof LayoutDashboard; group: string; }

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Início' },
  { label: 'Perfil', path: '/profile', icon: Users, group: 'Minha Página' },
  { label: 'Links', path: '/links', icon: Link2, group: 'Minha Página' },
  { label: 'Microblog', path: '/microblog', icon: MessageSquare, group: 'Minha Página' },
  { label: 'Newsletter', path: '/newsletter', icon: Mail, group: 'Minha Página' },
  { label: 'Posts', path: '/posts', icon: FileText, group: 'Conteúdo' },
  { label: 'Rascunhos', path: '/drafts', icon: FileText, group: 'Conteúdo' },
  { label: 'Páginas de venda', path: '/sales', icon: ShoppingBag, group: 'Monetização' },
  { label: 'Leads', path: '/leads', icon: Users, group: 'Leads' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, group: 'Leads' },
  { label: 'Configurações', path: '/settings', icon: Settings, group: 'Conta' },
];

interface DashboardLayoutProps { children: ReactNode; currentPath: string; navigate: (path: string) => void; }

export function DashboardLayout({ children, currentPath, navigate }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = [...new Set(navItems.map((n) => n.group))];
  function handleNav(path: string) { navigate(path); setMobileOpen(false); }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={cn('fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
          <span className="font-bold text-slate-800 tracking-tight">RiseGoat</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => <div key={group}><p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group}</p><div className="space-y-0.5">{navItems.filter((n) => n.group === group).map((item) => <button key={item.path} onClick={() => handleNav(item.path)} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition', currentPath === item.path ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}><item.icon className="w-4 h-4 shrink-0" />{item.label}</button>)}</div></div>)}
        </nav>
        <div className="border-t border-slate-200 p-3 space-y-1">
          {profile && <button onClick={() => window.open(`/u/${profile.username}`, '_blank')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"><ExternalLink className="w-4 h-4 shrink-0" />Ver minha página</button>}
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"><LogOut className="w-4 h-4 shrink-0" />Sair</button>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-3"><button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 rounded-lg hover:bg-slate-100">{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div><span className="font-bold text-slate-800 text-sm">RiseGoat</span></div></header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

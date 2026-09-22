import { type ReactNode, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Sparkles, LogOut, Menu, X, UserRound, BriefcaseBusiness } from 'lucide-react';
import { navItems } from '@/lib/navigation';

interface DashboardLayoutProps { children: ReactNode; currentPath: string; navigate: (path: string) => void; }

export function DashboardLayout({ children, currentPath, navigate }: DashboardLayoutProps) {
  const { signOut, workspaceMode, setWorkspaceMode, menuVisibility, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => {
    const modeVisible = item.mode === 'shared' || item.mode === workspaceMode;
    const visibilityAllowed = item.controllable === false || menuVisibility[item.path] !== false;
    const adminVisible = !item.adminOnly || isAdmin;
    return modeVisible && visibilityAllowed && adminVisible;
  });
  const groups = [...new Set(visibleNavItems.map((n) => n.group))];

  function handleNav(path: string) { navigate(path); setMobileOpen(false); }

  async function handleWorkspaceMode(mode: 'pessoal' | 'negocios') {
    const saved = await setWorkspaceMode(mode);
    if (!saved) return;
    const businessPaths = ['/action-flows','/goals','/profile','/links','/microblog','/newsletter','/leads','/analytics','/posts','/drafts','/sales','/offers','/product-portfolio','/book-writer','/revenue','/command-center','/partnerships','/launches','/radar'];
    if (mode === 'pessoal' && businessPaths.includes(currentPath)) navigate('/dashboard');
    if (mode === 'negocios' && (currentPath === '/goat' || currentPath === '/anki')) navigate('/dashboard');
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex">
      <aside className={cn('fixed lg:sticky top-0 left-0 h-screen w-[248px] bg-white/95 backdrop-blur border-r border-slate-200/80 flex flex-col z-50 transition-transform', mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex items-center gap-3 px-5 h-[68px] border-b border-slate-200/80">
          <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shadow-sm"><Sparkles className="w-4 h-4 text-white" /></div>
          <div className="min-w-0">
            <span className="block font-black text-slate-950 tracking-[-0.02em]">RiseGoat</span>
            <span className="block text-[10px] font-medium text-slate-400 mt-0.5">Workspace operacional</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{group}</p>
              <div className="space-y-0.5">
                {visibleNavItems.filter((n) => n.group === group).map((item) => (
                  <button key={item.path} onClick={() => handleNav(item.path)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all',
                      currentPath === item.path ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950')}>
                    <item.icon className="w-[17px] h-[17px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200/80 p-3 space-y-1 bg-slate-50/40">
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"><LogOut className="w-4 h-4 shrink-0" />Sair</button>
        </div>
      </aside>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80 min-h-14 flex items-center px-4 lg:px-7 gap-3">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100">{mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          <div className="hidden lg:flex items-center gap-2"><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.16em]">Workspace</span></div>
          <div className="ml-auto flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
            <button onClick={() => void handleWorkspaceMode('pessoal')} className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition', workspaceMode === 'pessoal' ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800')}><UserRound className="w-3.5 h-3.5" /> Pessoal</button>
            <button onClick={() => void handleWorkspaceMode('negocios')} className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition', workspaceMode === 'negocios' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}><BriefcaseBusiness className="w-3.5 h-3.5" /> Negócios</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

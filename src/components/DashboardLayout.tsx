import { type ReactNode, useState } from 'react';
import { LogOut, Menu, X, ExternalLink, PenLine } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { navItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPath: string;
  navigate: (path: string) => void;
}

export function DashboardLayout({ children, currentPath, navigate }: DashboardLayoutProps) {
  const { signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-slate-900">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-16 border-b border-slate-200 px-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-black tracking-tight">RiseGoat</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Blog pessoal</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-2 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                  active ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 p-4">
          <a href="/" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Abrir blog <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => void signOut()} className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </aside>

      {open && <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/20 lg:hidden" />}

      <div className="lg:pl-64 min-h-screen">
        <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100"><Menu className="w-5 h-5" /></button>
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <PenLine className="w-3.5 h-3.5" />
            <span>{profile?.display_name || profile?.username || 'Área privada'}</span>
          </div>
          <div className="ml-auto text-xs text-slate-400">Seu espaço de escrita</div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

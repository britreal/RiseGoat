import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-1.5">RiseGoat</p>
        <h1 className="text-[28px] leading-tight font-black tracking-[-0.03em] text-slate-950">{title}</h1>
        {subtitle && <p className="text-sm leading-6 text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof import('lucide-react').Inbox; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-sm leading-6 text-slate-400 mt-1 max-w-md">{subtitle}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-7 h-7 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      <p className="text-xs font-medium text-slate-400">Carregando…</p>
    </div>
  );
}

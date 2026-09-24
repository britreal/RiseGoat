import type { LucideIcon } from 'lucide-react';
import {
  Activity, BarChart3, BookOpen, CalendarDays, CircleDollarSign, FileText, Handshake,
  LayoutDashboard, Link2, Mail, MessageSquare, Network, PackageOpen, Radar as RadarIcon,
  Settings, ShieldCheck, ShoppingBag, Target, Users, Workflow,
} from 'lucide-react';

export type NavMode = 'shared' | 'pessoal' | 'negocios';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  group: string;
  mode: NavMode;
  controllable?: boolean;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Núcleo', mode: 'shared' },
  { label: 'Flux', path: '/flux', icon: Workflow, group: 'Núcleo', mode: 'negocios' },
  { label: 'Metas', path: '/goals', icon: Target, group: 'Núcleo', mode: 'negocios' },
  { label: 'Perfil', path: '/profile', icon: Users, group: 'Presença', mode: 'negocios' },
  { label: 'Links', path: '/links', icon: Link2, group: 'Presença', mode: 'negocios' },
  { label: 'Posts', path: '/posts', icon: FileText, group: 'Conteúdo', mode: 'negocios' },
  { label: 'Blog', path: '/microblog', icon: MessageSquare, group: 'Conteúdo', mode: 'negocios' },
  { label: 'Newsletter', path: '/newsletter', icon: Mail, group: 'Captação', mode: 'negocios' },
  { label: 'Leads', path: '/leads', icon: Users, group: 'Captação', mode: 'negocios' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, group: 'Medição', mode: 'negocios' },
  { label: 'Ofertas', path: '/offers', icon: ShoppingBag, group: 'Monetização', mode: 'negocios' },
  { label: 'Páginas de Venda', path: '/sales', icon: ShoppingBag, group: 'Monetização', mode: 'negocios' },
  { label: 'Portfólio de Produtos', path: '/product-portfolio', icon: PackageOpen, group: 'Monetização', mode: 'negocios' },
  { label: 'Escritor de Livros/Ebooks', path: '/book-writer', icon: BookOpen, group: 'Monetização', mode: 'negocios' },
  { label: 'Receita', path: '/revenue', icon: CircleDollarSign, group: 'Monetização', mode: 'negocios' },
  { label: 'Centro de Comando', path: '/command-center', icon: Network, group: 'Estratégia', mode: 'negocios' },
  { label: 'Parcerias', path: '/partnerships', icon: Handshake, group: 'Estratégia', mode: 'negocios' },
  { label: 'Lançamentos', path: '/launches', icon: CalendarDays, group: 'Estratégia', mode: 'negocios' },
  { label: 'Radar', path: '/radar', icon: RadarIcon, group: 'Estratégia', mode: 'negocios' },
  { label: 'GOAT', path: '/goat', icon: Activity, group: 'Pessoal', mode: 'pessoal' },
  { label: 'Administração', path: '/admin', icon: ShieldCheck, group: 'Administração', mode: 'shared', controllable: false, adminOnly: true },
  { label: 'Configurações', path: '/settings', icon: Settings, group: 'Conta', mode: 'shared', controllable: false },
];

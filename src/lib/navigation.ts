import type { LucideIcon } from 'lucide-react';
import { StickyNote } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

/**
 * Notes is now the entire private product experience.
 * The former blog/admin navigation is intentionally removed.
 */
export const navItems: NavItem[] = [
  { label: 'Notas', path: '/', icon: StickyNote },
];

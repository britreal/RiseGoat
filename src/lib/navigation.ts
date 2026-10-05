import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutDashboard, Mail, Settings, StickyNote } from 'lucide-react';
export interface NavItem { label:string; path:string; icon:LucideIcon; }
export const navItems:NavItem[]=[
 {label:'Notas',path:'/notes',icon:StickyNote},
 {label:'Visão geral',path:'/admin',icon:LayoutDashboard},
 {label:'Posts',path:'/posts',icon:FileText},
 {label:'Newsletter',path:'/newsletter',icon:Mail},
 {label:'Meu blog',path:'/site',icon:Settings},
];

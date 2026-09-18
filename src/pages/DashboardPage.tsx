import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Spinner } from '@/components/ui';
import { Eye, MousePointerClick, Users, TrendingUp, ExternalLink, ArrowRight } from 'lucide-react';
import type { PageVisit, LinkClick, NewsletterLead, Link, MicroblogPost } from '@/types';
import { formatNumber, timeAgo } from '@/lib/utils';

export function DashboardPage({ navigate }: { navigate: (path: string) => void }) {
  const { user, profile, workspaceMode } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [clicks, setClicks] = useState<LinkClick[]>([]);
  const [leads, setLeads] = useState<NewsletterLead[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [posts, setPosts] = useState<MicroblogPost[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('page_visits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('link_clicks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('newsletter_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('links').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('microblog_posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]).then(([v, c, l, ln, p]) => {
      setVisits((v.data as PageVisit[]) ?? []);
      setClicks((c.data as LinkClick[]) ?? []);
      setLeads((l.data as NewsletterLead[]) ?? []);
      setLinks((ln.data as Link[]) ?? []);
      setPosts((p.data as MicroblogPost[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <Spinner />;

  const weekAgo = Date.now() - 7 * 86400000;
  const weekVisits = visits.filter((v) => new Date(v.created_at).getTime() > weekAgo).length;
  const weekClicks = clicks.filter((c) => new Date(c.created_at).getTime() > weekAgo).length;
  const weekLeads = leads.filter((l) => new Date(l.created_at).getTime() > weekAgo).length;
  const conversion = weekVisits > 0 ? ((weekLeads / weekVisits) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Visitas (7d)', value: formatNumber(weekVisits), total: visits.length, icon: Eye, color: 'cyan' },
    { label: 'Cliques (7d)', value: formatNumber(weekClicks), total: clicks.length, icon: MousePointerClick, color: 'blue' },
    { label: 'Leads (7d)', value: formatNumber(weekLeads), total: leads.length, icon: Users, color: 'green' },
    { label: 'Conversão', value: `${conversion}%`, total: 0, icon: TrendingUp, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-50 text-cyan-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  if (workspaceMode === 'pessoal') {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Pessoal</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Olá{profile?.display_name ? ', ' + profile.display_name : ''}!</h1>
          <p className="text-sm text-slate-500 mt-1">Seu espaço pessoal para executar projetos, acompanhar metas e evoluir com consistência.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <button onClick={() => navigate('/action-flows')} className="text-left">
            <Card className="p-5 h-full hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4"><ArrowRight className="w-5 h-5 text-slate-700"/></div>
              <p className="text-sm font-bold text-slate-800">Fluxos de Ação</p>
              <p className="text-xs text-slate-400 mt-1 leading-5">Transforme um objetivo pessoal em etapas executáveis e marque o que foi feito.</p>
            </Card>
          </button>
          <button onClick={() => navigate('/goat')} className="text-left">
            <Card className="p-5 h-full hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4"><TrendingUp className="w-5 h-5 text-emerald-700"/></div>
              <p className="text-sm font-bold text-slate-800">GOAT</p>
              <p className="text-xs text-slate-400 mt-1 leading-5">Hábitos, heatmap, livros, audiobooks e acompanhamento corporal.</p>
            </Card>
          </button>
          <button onClick={() => navigate('/goals')} className="text-left">
            <Card className="p-5 h-full hover:shadow-md transition">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4"><Users className="w-5 h-5 text-blue-700"/></div>
              <p className="text-sm font-bold text-slate-800">Metas</p>
              <p className="text-xs text-slate-400 mt-1 leading-5">Objetivos e resultados-chave para manter direção e revisão.</p>
            </Card>
          </button>
        </div>

        <Card className="p-5 bg-slate-950 text-white border-0">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Regra do espaço pessoal</p>
          <h2 className="text-lg font-black mt-1">Faça, marque e avance.</h2>
          <p className="text-xs text-slate-300 mt-1.5 max-w-2xl leading-5">Use o fluxo como checklist operacional. Você não precisa entrar no GOAT para dar check em uma etapa de um projeto pessoal.</p>
        </Card>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/u/${profile?.username}`;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Olá{profile?.display_name ? `, ${profile.display_name}` : ''}!
        </h1>
        <p className="text-sm text-slate-500 mt-1">Aqui está o resumo da sua página</p>
      </div>

      {/* Public page banner */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-slate-900 to-slate-800 border-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 mb-1">Sua página pública</p>
            <p className="text-sm text-white font-medium truncate">{publicUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition"
            >
              Copiar
            </button>
            <button
              onClick={() => window.open(`/u/${profile?.username}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Abrir
            </button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${colorMap[stat.color]} flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 mb-6 overflow-hidden relative bg-slate-950 text-white border-0">
        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full border border-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Execução</p>
            <h2 className="text-lg font-black text-white mt-1">Fluxos de Ação</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">Desenhe processos para qualquer negócio, salve modelos e execute etapa por etapa conectando os módulos do RiseGoat.</p>
          </div>
          <button onClick={() => navigate('/action-flows')} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-semibold hover:bg-slate-100 transition shrink-0">
            Abrir fluxos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <QuickLink
          title="Editar perfil"
          subtitle="Foto, bio, cor do tema"
          onClick={() => navigate('/profile')}
        />
        <QuickLink
          title="Gerenciar links"
          subtitle={`${links.length} links ativos`}
          onClick={() => navigate('/links')}
        />
        <QuickLink
          title="Ver leads"
          subtitle={`${leads.length} contatos`}
          onClick={() => navigate('/leads')}
        />
        <QuickLink
          title="Analytics"
          subtitle="Visitas, cliques, conversão"
          onClick={() => navigate('/analytics')}
        />
        <QuickLink
          title="Centro de Comando"
          subtitle="Teia, CRM, tarefas e oportunidades"
          onClick={() => navigate('/command-center')}
        />
      </div>

      {/* Recent posts */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Postagens recentes</h2>
          <button
            onClick={() => navigate('/posts')}
            className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-500 font-medium"
          >
            Ver todas <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma postagem ainda</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="flex items-start gap-3">
                <div className="w-1 h-full bg-slate-100 rounded-full self-stretch" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-2">{post.content}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{timeAgo(post.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function QuickLink({ title, subtitle, onClick }: { title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition text-left group"
    >
      <div>
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition shrink-0" />
    </button>
  );
}

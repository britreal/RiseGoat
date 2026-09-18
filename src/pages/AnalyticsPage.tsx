import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner } from '@/components/ui';
import { Eye, MousePointerClick, Users, TrendingUp, BarChart3 } from 'lucide-react';
import type { PageVisit, LinkClick, NewsletterLead, Link } from '@/types';
import { formatNumber } from '@/lib/utils';

function money(value:number){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||0)); }

export function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [clicks, setClicks] = useState<LinkClick[]>([]);
  const [leads, setLeads] = useState<NewsletterLead[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [revenueRows, setRevenueRows] = useState<any[]>([]);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('page_visits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('link_clicks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('newsletter_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('revenues').select('id,value,status,occurred_on,lead_id,source,utm_source,utm_medium,utm_campaign,utm_content,utm_term').eq('user_id', user.id).order('occurred_on', { ascending: false }),

      supabase.from('links').select('*').eq('user_id', user.id).order('clicks', { ascending: false }),
    ]).then(([v, c, l, r, ln]) => {
      setVisits((v.data as PageVisit[]) ?? []);
      setClicks((c.data as LinkClick[]) ?? []);
      setLeads((l.data as NewsletterLead[]) ?? []);
      setRevenueRows((r.data as any[]) ?? []);
      setLinks((ln.data as Link[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));
  const attributionRows = revenueRows.filter((row) => row.status === 'received').reduce((acc: Record<string, { source:string; campaign:string; revenue:number; leads:number }>, row) => {
    const lead = row.lead_id ? leadMap.get(row.lead_id) : undefined;
    const source = row.utm_source || lead?.utm_source || row.source || 'direto';
    const campaign = row.utm_campaign || lead?.utm_campaign || 'sem campanha';
    const key = source + '|' + campaign;
    if (!acc[key]) acc[key] = { source, campaign, revenue: 0, leads: 0 };
    acc[key].revenue += Number(row.value || 0);
    if (row.lead_id) acc[key].leads += 1;
    return acc;
  }, {});
  const topAttribution = Object.values(attributionRows).sort((a,b) => b.revenue - a.revenue).slice(0,8);

  if (loading) return <Spinner />;

  const cutoff = Date.now() - range * 86400000;
  const recentVisits = visits.filter((v) => new Date(v.created_at).getTime() > cutoff);
  const recentClicks = clicks.filter((c) => new Date(c.created_at).getTime() > cutoff);
  const recentLeads = leads.filter((l) => new Date(l.created_at).getTime() > cutoff);

  const conversionRate = recentVisits.length > 0
    ? ((recentLeads.length / recentVisits.length) * 100).toFixed(1)
    : '0.0';

  // Daily breakdown for chart
  const days = Array.from({ length: Math.min(range, 30) }, (_, i) => {
    const date = new Date(Date.now() - (Math.min(range, 30) - 1 - i) * 86400000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    return {
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      visits: visits.filter((v) => {
        const t = new Date(v.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length,
      clicks: clicks.filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length,
      leads: leads.filter((l) => {
        const t = new Date(l.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      }).length,
    };
  });

  const maxVal = Math.max(...days.map((d) => Math.max(d.visits, d.clicks, d.leads)), 1);

  const stats = [
    { label: 'Visitas', value: recentVisits.length, total: visits.length, icon: Eye, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { label: 'Cliques', value: recentClicks.length, total: clicks.length, icon: MousePointerClick, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Leads', value: recentLeads.length, total: leads.length, icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
    { label: 'Conversão', value: `${conversionRate}%`, total: 0, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Analytics"
        subtitle="Desempenho da sua página"
        action={
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  range === r ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            {stat.total > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">{formatNumber(stat.total)} total</p>
            )}
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Atividade recente</h2>
        </div>
        <div className="flex items-end gap-1 h-40">
          {days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full flex flex-col items-center justify-end h-full gap-0.5">
                <div
                  className="w-full max-w-[20px] bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-sm transition-all group-hover:from-cyan-600 group-hover:to-cyan-400"
                  style={{ height: `${(day.visits / maxVal) * 100}%`, minHeight: day.visits > 0 ? '4px' : '0' }}
                  title={`${day.visits} visitas`}
                />
                <div
                  className="w-full max-w-[20px] bg-gradient-to-t from-blue-500 to-blue-300 rounded-sm transition-all group-hover:from-blue-600 group-hover:to-blue-400"
                  style={{ height: `${(day.clicks / maxVal) * 100}%`, minHeight: day.clicks > 0 ? '4px' : '0' }}
                  title={`${day.clicks} cliques`}
                />
              </div>
              {i % Math.ceil(days.length / 6) === 0 && (
                <span className="text-[9px] text-slate-400">{day.label}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" /> Visitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-400 rounded-sm" /> Cliques
          </span>
        </div>
      </Card>

      {/* Top links */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Links mais clicados</h2>
        {links.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Nenhum link ainda</p>
        ) : (
          <div className="space-y-2">
            {links.slice(0, 5).map((link) => {
              const maxClicks = Math.max(...links.map((l) => l.clicks), 1);
              return (
                <div key={link.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{link.label}</p>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">{link.clicks} cliques</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                        style={{ width: `${(link.clicks / maxClicks) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card className="p-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Atribuição: origem → receita</h2>
            <p className="text-xs text-slate-400 mt-1">Cruza UTM dos leads com receitas vinculadas a esses leads. Registros antigos sem UTM continuam aparecendo como direto.</p>
          </div>
          <BarChart3 className="w-4 h-4 text-slate-400" />
        </div>
        {topAttribution.length === 0 ? <p className="text-sm text-slate-400">Ainda não há receitas recebidas com dados de atribuição.</p> : <div className="space-y-2">
          {topAttribution.map((row) => <div key={row.source + row.campaign} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center p-3 rounded-xl bg-slate-50">
            <div><p className="text-sm font-medium text-slate-700">{row.source}</p><p className="text-xs text-slate-400">{row.campaign} · {row.leads} lead(s) atribuídos</p></div>
            <span className="text-xs text-slate-400">receita</span><span className="text-sm font-bold text-slate-900">{money(row.revenue)}</span>
          </div>)}
        </div>}
      </Card>
    </div>
  );
}

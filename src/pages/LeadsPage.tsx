import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Users, Download, Trash2, MapPin } from 'lucide-react';
import type { NewsletterLead } from '@/types';
import { formatDateTime, exportToCSV, timeAgo } from '@/lib/utils';

export function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<NewsletterLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('newsletter_leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLeads((data as NewsletterLead[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function deleteLead(id: string) {
    const { error } = await supabase.from('newsletter_leads').delete().eq('id', id);
    if (!error) setLeads(leads.filter((l) => l.id !== id));
  }

  function handleExport() {
    exportToCSV('leads.csv', leads.map((l) => ({ nome: l.name, email: l.email, origem: l.source, data: l.created_at })));
  }

  if (loading) return <Spinner />;

  const sources = [...new Set(leads.map((l) => l.source))];
  const filtered = filter === 'all' ? leads : leads.filter((l) => l.source === filter);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Leads"
        subtitle="Contatos que se inscreveram na sua newsletter"
        action={
          leads.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
            >
              <Download className="w-4 h-4" /> Exportar
            </button>
          )
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Origens</p>
          <p className="text-2xl font-bold text-slate-900">{sources.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Esta semana</p>
          <p className="text-2xl font-bold text-slate-900">
            {leads.filter((l) => new Date(l.created_at) > new Date(Date.now() - 7 * 86400000)).length}
          </p>
        </Card>
      </div>

      {sources.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos
          </button>
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="Nenhum lead ainda" subtitle="Compartilhe sua página para capturar contatos" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                  {(lead.name || lead.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{lead.name || lead.email}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 truncate">{lead.email}</p>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {lead.source}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 shrink-0 hidden sm:block">{timeAgo(lead.created_at)}</span>
                <button
                  onClick={() => deleteLead(lead.id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

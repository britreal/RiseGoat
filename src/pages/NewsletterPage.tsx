import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Mail, Users, TrendingUp, Loader2, Check } from 'lucide-react';
import type { NewsletterLead } from '@/types';
import { formatDateTime, exportToCSV, timeAgo } from '@/lib/utils';

export function NewsletterPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<NewsletterLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

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

  function handleExport() {
    exportToCSV('newsletter-leads.csv', leads.map((l) => ({ nome: l.name, email: l.email, origem: l.source, data: l.created_at })));
  }

  async function sendBroadcast() {
    setSending(true);
    setSent(false);
    await new Promise((r) => setTimeout(r, 800));
    setSubject('');
    setBody('');
    setSent(true);
    setSending(false);
    setTimeout(() => setSent(false), 2500);
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Newsletter" subtitle="Sua lista de contatos e campanhas" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-cyan-500" />
            <span className="text-xs text-slate-500">Inscritos</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-slate-500">Esta semana</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {leads.filter((l) => new Date(l.created_at) > new Date(Date.now() - 7 * 86400000)).length}
          </p>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500">Total enviados</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">0</p>
        </Card>
      </div>

      {/* Broadcast */}
      <Card className="p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Enviar campanha</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto do email"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Conteúdo da mensagem..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={sendBroadcast}
              disabled={!subject.trim() || !body.trim() || sending || leads.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Enviar para {leads.length} inscritos
            </button>
            {sent && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="w-4 h-4" /> Enviado
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Leads list */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">Inscritos</h2>
        {leads.length > 0 && (
          <button onClick={handleExport} className="text-sm text-cyan-600 hover:text-cyan-500 font-medium">
            Exportar CSV
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <Card>
          <EmptyState icon={Mail} title="Nenhum inscrito ainda" subtitle="Compartilhe sua página para crescer sua lista" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                  {lead.name.charAt(0).toUpperCase() || lead.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {lead.name || lead.email}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{lead.email}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{timeAgo(lead.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

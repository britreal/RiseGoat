import { useCallback, useEffect, useState } from 'react';
import { Download, Inbox, Loader2, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, EmptyState, PageHeader } from '@/components/ui';

interface WaitlistSignup {
  id: string;
  name: string;
  email: string;
  source: string;
  created_at: string;
}

export function AdminPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWaitlist = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('waitlist_signups')
      .select('id,name,email,source,created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('Não foi possível carregar a lista de espera.');
      setItems([]);
    } else {
      setItems((data || []) as WaitlistSignup[]);
    }

    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void loadWaitlist();
  }, [loadWaitlist]);

  function exportCsv() {
    const header = ['Nome', 'Email', 'Origem', 'Data'];
    const rows = items.map((item) => [
      item.name,
      item.email,
      item.source,
      new Date(item.created_at).toLocaleString('pt-BR'),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => '"' + value.replace(/"/g, '""') + '"').join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'risegoat-lista-de-espera.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) {
    return (
      <div className="p-5 lg:p-8 max-w-4xl mx-auto">
        <Card className="p-10 text-center">
          <ShieldCheck className="w-8 h-8 mx-auto text-slate-400" />
          <h1 className="mt-4 text-xl font-black text-slate-950">Área restrita</h1>
          <p className="mt-2 text-sm text-slate-500">Esta área está disponível apenas para administradores.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Lista de espera"
        subtitle="Acompanhe quem deixou nome e email enquanto o cadastro permanece fechado."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadWaitlist()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={items.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Interessados</p>
              <p className="text-2xl font-black text-slate-950 mt-0.5">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Acesso</p>
              <p className="text-sm font-bold text-slate-950 mt-1">Cadastro fechado</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-sm text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando lista...
          </div>
        ) : error ? (
          <div className="p-8 text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState title="Ainda não há inscritos" subtitle="Os primeiros nomes adicionados à lista aparecerão aqui." icon={Inbox} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Nome</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Email</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Origem</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Entrada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.email}</td>
                    <td className="px-5 py-3.5 text-slate-500">{item.source}</td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{new Date(item.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

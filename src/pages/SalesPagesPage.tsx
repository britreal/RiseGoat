import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, FileText, ExternalLink, Eye, EyeOff, Loader2, Copy } from 'lucide-react';
import type { SalesPage } from '@/types';
import { timeAgo } from '@/lib/utils';

export function SalesPagesPage({ navigate }: { navigate: (path: string) => void }) {
  const { user, profile } = useAuth();
  const [pages, setPages] = useState<SalesPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sales_pages')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setPages((data as SalesPage[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function createPage() {
    if (!user || !newTitle.trim() || !newSlug.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('sales_pages')
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        slug: newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
      })
      .select()
      .single();
    if (!error && data) {
      setPages([data as SalesPage, ...pages]);
      setNewTitle('');
      setNewSlug('');
      navigate(`/sales-editor/${(data as SalesPage).id}`);
    }
    setCreating(false);
  }

  async function deletePage(id: string) {
    const { error } = await supabase.from('sales_pages').delete().eq('id', id);
    if (!error) setPages(pages.filter((p) => p.id !== id));
  }

  async function togglePublish(page: SalesPage) {
    const { error } = await supabase
      .from('sales_pages')
      .update({ is_published: !page.is_published, updated_at: new Date().toISOString() })
      .eq('id', page.id);
    if (!error) {
      setPages(pages.map((p) => (p.id === page.id ? { ...p, is_published: !p.is_published } : p)));
    }
  }

  async function duplicatePage(page: SalesPage) {
    if (!user) return;
    const { data: blocks } = await supabase.from('sales_blocks').select('*').eq('page_id', page.id).order('sort_order');
    const { data: newPage, error } = await supabase
      .from('sales_pages')
      .insert({
        user_id: user.id,
        title: page.title + ' (cópia)',
        slug: page.slug + '-copy',
      })
      .select()
      .single();
    if (!error && newPage && blocks) {
      for (const block of blocks as unknown as Array<{ block_type: string; content: string; settings: Record<string, unknown>; sort_order: number }>) {
        await supabase.from('sales_blocks').insert({
          page_id: (newPage as SalesPage).id,
          user_id: user.id,
          block_type: block.block_type,
          content: block.content,
          settings: block.settings,
          sort_order: block.sort_order,
        });
      }
      setPages([(newPage as SalesPage), ...pages]);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Páginas de Venda"
        subtitle="Crie páginas de venda com blocos personalizados"
        action={
          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Nova página
          </button>
        }
      />

      {creating && (
        <Card className="p-5 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Curso de Produção Musical"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Slug (URL)</label>
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
              <span className="pl-3 pr-1 text-slate-400 text-xs">/p/</span>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="curso-producao"
                className="flex-1 py-2 pr-3 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createPage}
              disabled={creating || !newTitle.trim() || !newSlug.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Criar página
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {pages.length === 0 && !creating ? (
        <Card>
          <EmptyState icon={FileText} title="Nenhuma página de venda" subtitle="Crie páginas de venda como no WordPress" />
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <Card key={page.id} className="p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{page.title}</p>
                    {page.is_published ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">publicada</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">rascunho</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    /p/{page.slug} — editado {timeAgo(page.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePublish(page)}
                    className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 transition"
                    title={page.is_published ? 'Despublicar' : 'Publicar'}
                  >
                    {page.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => duplicatePage(page)}
                    className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 transition"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {page.is_published && (
                    <a
                      href={`#/p/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 transition"
                      title="Ver página"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/sales-editor/${page.id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deletePage(page.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

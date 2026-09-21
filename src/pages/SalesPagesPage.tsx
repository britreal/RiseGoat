import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, FileText, ExternalLink, Eye, EyeOff, Loader2, Copy, AlertCircle } from 'lucide-react';
import type { SalesPage } from '@/types';
import { timeAgo } from '@/lib/utils';

function normalizeSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function SalesPagesPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [pages, setPages] = useState<SalesPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    supabase.from('sales_pages').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) setErrorMessage(`Não foi possível carregar as páginas: ${error.message}`);
      else setPages((data as SalesPage[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  async function createPage() {
    if (creating) return;
    if (!user) { setErrorMessage('Sua sessão expirou. Entre novamente na sua conta.'); return; }

    const title = newTitle.trim();
    const slug = normalizeSlug(newSlug);
    if (!title || !slug) { setErrorMessage('Informe um título e um slug válido.'); return; }

    if (pages.some((page) => page.slug === slug)) {
      setErrorMessage('Esse slug já está sendo usado. Escolha outro.');
      return;
    }

    setCreating(true);
    setErrorMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError || !authData.session?.user) {
        throw new Error('Sua sessão não está mais válida. Faça login novamente.');
      }

      const { data, error } = await supabase.from('sales_pages').insert({
        user_id: authData.session.user.id,
        title,
        slug,
      }).select('id, user_id, slug, title, is_published, seo_title, seo_description, created_at, updated_at').single();

      if (error) throw new Error(error.message || 'O Supabase recusou a criação da página.');
      if (!data?.id) throw new Error('O Supabase criou a página, mas não retornou o ID.');

      const createdPage = data as SalesPage;
      setPages((current) => [createdPage, ...current]);
      setNewTitle('');
      setNewSlug('');
      setShowCreate(false);
      navigate(`/sales/editor/${createdPage.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro inesperado ao criar a página.');
    } finally {
      setCreating(false);
    }
  }

  async function deletePage(id: string) {
    if (!user) return;
    const { error } = await supabase.from('sales_pages').delete().eq('id', id).eq('user_id', user.id);
    if (!error) setPages((current) => current.filter((p) => p.id !== id));
    else setErrorMessage(error.message);
  }

  async function togglePublish(page: SalesPage) {
    if (!user) return;
    const { error } = await supabase.from('sales_pages').update({ is_published: !page.is_published, updated_at: new Date().toISOString() }).eq('id', page.id).eq('user_id', user.id);
    if (!error) setPages((current) => current.map((p) => p.id === page.id ? { ...p, is_published: !p.is_published } : p));
    else setErrorMessage(error.message);
  }

  async function duplicatePage(page: SalesPage) {
    if (!user) return;
    setErrorMessage('');
    const { data: blocks, error: blocksError } = await supabase.from('sales_blocks').select('*').eq('page_id', page.id).eq('user_id', user.id).order('sort_order');
    if (blocksError) { setErrorMessage(blocksError.message); return; }

    const baseSlug = normalizeSlug(`${page.slug}-copy`);
    const used = new Set(pages.map((item) => item.slug));
    let slug = baseSlug || 'pagina-copy';
    let suffix = 2;
    while (used.has(slug)) slug = `${baseSlug || 'pagina-copy'}-${suffix++}`;

    const { data: newPage, error } = await supabase.from('sales_pages').insert({ user_id: user.id, title: `${page.title} (cópia)`, slug, settings: page.settings || {} }).select().single();
    if (error || !newPage) { setErrorMessage(error?.message ?? 'Não foi possível duplicar a página.'); return; }

    for (const block of (blocks ?? []) as unknown as Array<{ block_type: string; content: string; settings: Record<string, unknown>; sort_order: number }>) {
      const { error: blockError } = await supabase.from('sales_blocks').insert({ page_id: (newPage as SalesPage).id, user_id: user.id, block_type: block.block_type, content: block.content, settings: block.settings, sort_order: block.sort_order });
      if (blockError) {
        await supabase.from('sales_pages').delete().eq('id', (newPage as SalesPage).id).eq('user_id', user.id);
        setErrorMessage('Não foi possível duplicar todos os blocos. A cópia incompleta foi removida.');
        return;
      }
    }
    setPages((current) => [newPage as SalesPage, ...current]);
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Páginas de Venda" subtitle="Crie, edite e publique páginas comerciais sem código." action={<button onClick={() => { setShowCreate((v) => !v); setErrorMessage(''); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"><Plus className="w-4 h-4" /> Nova página</button>} />

      {errorMessage && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span className="break-words">{errorMessage}</span></div>}

      {showCreate && <Card className="p-5 mb-4 space-y-3">
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Título</label><input autoFocus type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Curso de Produção Musical" disabled={creating} className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:opacity-60" /></div>
        <div><label className="block text-xs font-medium text-slate-500 mb-1">Slug (URL)</label><div className="flex items-center border border-slate-200 rounded-lg bg-slate-50"><span className="pl-3 pr-1 text-slate-400 text-xs">/p/</span><input type="text" value={newSlug} onChange={(e) => setNewSlug(normalizeSlug(e.target.value))} placeholder="curso-producao" disabled={creating} className="flex-1 py-2 pr-3 bg-transparent text-sm focus:outline-none disabled:opacity-60" /></div><p className="text-[11px] text-slate-400 mt-1">Somente letras, números e hífens.</p></div>
        <div className="flex gap-2"><button onClick={createPage} disabled={creating || !newTitle.trim() || !normalizeSlug(newSlug)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">{creating && <Loader2 className="w-4 h-4 animate-spin" />}{creating ? 'Criando...' : 'Criar página'}</button><button onClick={() => { if (!creating) { setShowCreate(false); setErrorMessage(''); } }} disabled={creating} className="px-4 py-2 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-100 transition disabled:opacity-50">Cancelar</button></div>
      </Card>}

      {pages.length === 0 && !showCreate ? <Card><EmptyState icon={FileText} title="Nenhuma página de venda" subtitle="Crie páginas de venda como no WordPress" /></Card> : <div className="space-y-2">{pages.map((page) => <Card key={page.id} className="p-4 hover:shadow-md transition"><div className="flex items-center justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-medium text-slate-800 truncate">{page.title}</p><span className="text-xs text-slate-400">{page.is_published ? 'publicada' : 'rascunho'}</span></div><p className="text-xs text-slate-400 truncate mt-0.5">/p/{page.slug} — editado {timeAgo(page.updated_at)}</p></div><div className="flex items-center gap-1 shrink-0"><button onClick={() => togglePublish(page)} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 transition" title={page.is_published ? 'Despublicar' : 'Publicar'}>{page.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button><button onClick={() => duplicatePage(page)} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 transition" title="Duplicar"><Copy className="w-4 h-4" /></button>{page.is_published && <a href={`/p/${page.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 transition" title="Ver página"><ExternalLink className="w-4 h-4" /></a>}<button onClick={() => navigate(`/sales/editor/${page.id}`)} className="px-3 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-50 rounded-lg transition">Editar</button><button onClick={() => deletePage(page.id)} className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button></div></div></Card>)}</div>}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, FileText, Loader2, Save, Send, X } from 'lucide-react';
import type { Draft } from '@/types';
import { timeAgo } from '@/lib/utils';

export function DraftsPage() {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setDrafts((data as Draft[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function createDraft() {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('drafts')
      .insert({ user_id: user.id, title: 'Novo rascunho', content: '' })
      .select()
      .single();
    if (!error && data) {
      const draft = data as Draft;
      setDrafts([draft, ...drafts]);
      setEditing(draft);
      setTitle(draft.title);
      setContent(draft.content);
    }
    setSaving(false);
  }

  async function saveDraft() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('drafts')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', editing.id);
    if (!error) {
      setDrafts(drafts.map((d) => (d.id === editing.id ? { ...d, title, content, updated_at: new Date().toISOString() } : d)));
      setEditing(null);
      setTitle('');
      setContent('');
    }
    setSaving(false);
  }

  async function publishDraft(draft: Draft) {
    if (!user) return;
    await supabase.from('microblog_posts').insert({ user_id: user.id, content: draft.content || draft.title });
    await supabase.from('drafts').delete().eq('id', draft.id);
    setDrafts(drafts.filter((d) => d.id !== draft.id));
  }

  async function deleteDraft(id: string) {
    const { error } = await supabase.from('drafts').delete().eq('id', id);
    if (!error) setDrafts(drafts.filter((d) => d.id !== id));
  }

  function startEditing(draft: Draft) {
    setEditing(draft);
    setTitle(draft.title);
    setContent(draft.content);
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Rascunhos"
        subtitle="Idees salvas que ainda não foram publicadas"
        action={
          <button
            onClick={createDraft}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Novo rascunho
          </button>
        }
      />

      {editing && (
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">Editando rascunho</h2>
            <button type="button" aria-label="Fechar popup" title="Fechar" onClick={() => { setEditing(null); setTitle(''); setContent(''); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100 hover:text-slate-900">
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 mb-3"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Conteúdo..."
            rows={5}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
            <button
              onClick={() => publishDraft(editing)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition"
            >
              <Send className="w-4 h-4" /> Publicar
            </button>
          </div>
        </Card>
      )}

      {drafts.length === 0 && !editing ? (
        <Card>
          <EmptyState icon={FileText} title="Nenhum rascunho" subtitle="Crie um rascunho para salvar suas ideias" />
        </Card>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <Card key={draft.id} className="p-4 hover:shadow-md transition cursor-pointer" >
              <div className="flex items-start justify-between gap-3" onClick={() => startEditing(draft)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{draft.title || 'Sem título'}</p>
                  <p className="text-xs text-slate-400 truncate">{draft.content || 'Sem conteúdo'}</p>
                  <p className="text-xs text-slate-300 mt-1">Editado {timeAgo(draft.updated_at)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteDraft(draft.id); }}
                  className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

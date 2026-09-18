import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Trash2, Pin, FileText, Loader2, Send, Search, Image as ImageIcon } from 'lucide-react';
import type { Draft, MicroblogPost } from '@/types';
import { uploadUserImage } from '@/lib/storage';
import { timeAgo } from '@/lib/utils';

export function PostsPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MicroblogPost[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'all'|'drafts'>('all');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('microblog_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
    ]).then(([postResult, draftResult]) => {
      setPosts((postResult.data as MicroblogPost[]) ?? []);
      setDrafts((draftResult.data as Draft[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  async function saveDraft() {
    if (!user || (!content.trim() && !title.trim())) return;
    setPosting(true);
    const { data, error } = await supabase.from('drafts').insert({
      user_id: user.id,
      title: title.trim() || 'Sem título',
      content: content.trim(),
    }).select().single();
    if (!error && data) {
      setDrafts((current) => [data as Draft, ...current]);
      setTitle('');
      setContent('');
      setImageFile(null);
      setView('drafts');
    }
    setPosting(false);
  }

  async function publishDraft(draft: Draft) {
    if (!user) return;
    setPosting(true);
    const { data, error } = await supabase.from('microblog_posts').insert({
      user_id: user.id,
      content: draft.content || draft.title,
      title: draft.title,
    }).select().single();
    if (!error && data) {
      await supabase.from('drafts').delete().eq('id', draft.id).eq('user_id', user.id);
      setPosts((current) => [data as MicroblogPost, ...current]);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setView('all');
    }
    setPosting(false);
  }

  async function deleteDraft(id: string) {
    if (!user) return;
    const { error } = await supabase.from('drafts').delete().eq('id', id).eq('user_id', user.id);
    if (!error) setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  async function post() {
    if (!user || !content.trim()) return;
    setPosting(true);
    let nextImageUrl = imageUrl;
    try {
      if (imageFile && user) nextImageUrl = await uploadUserImage(user.id, imageFile, 'posts');
    } catch (error: any) {
      window.alert(error?.message || 'Não foi possível enviar a imagem.');
      setPosting(false);
      return;
    }
    const { data, error } = await supabase
      .from('microblog_posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        title: title.trim(),
        image_url: nextImageUrl.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setPosts([data as MicroblogPost, ...posts]);
      setContent('');
      setTitle('');
      setImageUrl('');
      setImageFile(null);
    }
    setPosting(false);
  }

  async function deletePost(id: string) {
    const { error } = await supabase.from('microblog_posts').delete().eq('id', id);
    if (!error) setPosts(posts.filter((p) => p.id !== id));
  }

  async function togglePin(post: MicroblogPost) {
    if (post.is_pinned) {
      await supabase.from('microblog_posts').update({ is_pinned: false }).eq('id', post.id);
      setPosts(posts.map((p) => (p.id === post.id ? { ...p, is_pinned: false } : p)));
    } else {
      await supabase.from('microblog_posts').update({ is_pinned: false }).eq('user_id', user!.id);
      await supabase.from('microblog_posts').update({ is_pinned: true }).eq('id', post.id);
      setPosts(
        posts
          .map((p) => ({ ...p, is_pinned: p.id === post.id }))
          .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Posts" subtitle="Publicações e rascunhos em um só lugar" />
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('all')} className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (view==='all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500')}>Publicados ({posts.length})</button>
        <button onClick={() => setView('drafts')} className={'px-3 py-1.5 rounded-lg text-xs font-medium ' + (view==='drafts' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500')}>Rascunhos ({drafts.length})</button>
      </div>

      <Card className="p-4 mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 mb-3"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva uma nova postagem..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none mb-3"
        />
        <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600 mb-3">
          <ImageIcon className="w-4 h-4" /> {imageFile?.name || 'Adicionar imagem do PC ou celular (opcional)'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{content.length} caracteres</span>
          <div className="flex items-center gap-2">
            <button
              onClick={saveDraft}
              disabled={(!content.trim() && !title.trim()) || posting}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Salvar rascunho
            </button>
            <button
              onClick={post}
              disabled={!content.trim() || posting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publicar
          </button>
        </div>
      </Card>

      {view === 'drafts' ? (
        drafts.length === 0 ? <Card><EmptyState icon={FileText} title="Nenhum rascunho" subtitle="Use Salvar rascunho no editor acima para guardar uma ideia" /></Card> :
        <div className="space-y-3">
          {drafts.map((draft) => <Card key={draft.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{draft.title || 'Sem título'}</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-4 mt-1">{draft.content || 'Sem conteúdo'}</p>
                <p className="text-xs text-slate-400 mt-2">Atualizado {timeAgo(draft.updated_at)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => void publishDraft(draft)} disabled={posting} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-600 text-white disabled:opacity-50">Publicar</button>
                <button onClick={() => void deleteDraft(draft.id)} className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </Card>)}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title="Nenhuma postagem" subtitle="Suas publicações aparecem aqui" />
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {post.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mb-2">
                      <Pin className="w-3 h-3" /> Fixado
                    </span>
                  )}
                  {post.title && (
                    <p className="text-sm font-semibold text-slate-800 mb-1">{post.title}</p>
                  )}
                  <p className={`text-sm text-slate-700 whitespace-pre-wrap ${post.content.length > 280 ? 'line-clamp-4' : ''}`}>
                    {post.content}
                  </p>
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full max-h-32 object-cover rounded-lg mt-2" />
                  )}
                  {(post.seo_title || post.seo_description) && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full mt-2">
                      <Search className="w-2.5 h-2.5" /> SEO
                    </span>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{timeAgo(post.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePin(post)}
                    className={`p-1.5 rounded-lg transition ${
                      post.is_pinned ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
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

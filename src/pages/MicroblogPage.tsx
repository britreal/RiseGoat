import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, Pin, MessageSquare, Loader2, Send, X, Image as ImageIcon } from 'lucide-react';
import type { MicroblogPost } from '@/types';
import { timeAgo } from '@/lib/utils';

export function MicroblogPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<MicroblogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [editingPost, setEditingPost] = useState<MicroblogPost | null>(null);

  // SEO fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('microblog_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts((data as MicroblogPost[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  function resetForm() {
    setContent('');
    setTitle('');
    setImageUrl('');
    setButtonText('');
    setButtonUrl('');
    setSeoTitle('');
    setSeoDescription('');
    setShowOptions(false);
    setEditingPost(null);
  }

  async function post() {
    if (!user || !content.trim()) return;
    setPosting(true);
    const payload = {
      user_id: user.id,
      content: content.trim(),
      title: title.trim(),
      image_url: imageUrl.trim(),
      button_text: buttonText.trim(),
      button_url: buttonUrl.trim(),
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
    };
    if (editingPost) {
      const { data, error } = await supabase
        .from('microblog_posts')
        .update(payload)
        .eq('id', editingPost.id)
        .select()
        .single();
      if (!error && data) {
        setPosts(posts.map((p) => (p.id === editingPost.id ? data as MicroblogPost : p)));
      }
    } else {
      const { data, error } = await supabase
        .from('microblog_posts')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        setPosts([data as MicroblogPost, ...posts]);
      }
    }
    resetForm();
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

  function startEdit(post: MicroblogPost) {
    setEditingPost(post);
    setContent(post.content);
    setTitle(post.title);
    setImageUrl(post.image_url);
    setButtonText(post.button_text || '');
    setButtonUrl(post.button_url || '');
    setSeoTitle(post.seo_title);
    setSeoDescription(post.seo_description);
    setShowOptions(true);
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Microblog" subtitle="Postagens que aparecem na sua página pública" />

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
          placeholder="O que você está fazendo agora?"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none mb-3"
        />
        {imageUrl && (
          <div className="relative mb-3">
            <img src={imageUrl} alt="" className="w-full max-h-48 object-cover rounded-lg" />
            <button
              onClick={() => setImageUrl('')}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg text-white hover:bg-black/70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showOptions && (
          <div className="space-y-3 mb-3 pb-3 border-b border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> URL da imagem
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">Botão no final do artigo (opcional)</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <input type="text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Texto do botão" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400" />
                <input type="url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">O botão só aparece quando os dois campos estiverem preenchidos.</p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <Search className="w-3 h-3" /> SEO (opcional)
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Título SEO"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                />
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Descrição SEO (meta description)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Opções
            </button>
            {editingPost && (
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" /> Cancelar edição
              </button>
            )}
          </div>
          <button
            onClick={post}
            disabled={!content.trim() || posting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {editingPost ? 'Salvar' : 'Publicar'}
          </button>
        </div>
      </Card>

      {posts.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquare} title="Nenhuma postagem" subtitle="Compartilhe uma atualização" />
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {post.title && (
                    <p className="text-sm font-semibold text-slate-800 mb-1">{post.title}</p>
                  )}
                  <p className={`text-sm text-slate-700 whitespace-pre-wrap ${post.content.length > 280 ? 'line-clamp-4' : ''}`}>
                    {post.content}
                  </p>
                  {post.content.length > 280 && (
                    <p className="text-xs text-cyan-600 mt-1">{post.content.length} caracteres — ver completo na página</p>
                  )}
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="w-full max-h-32 object-cover rounded-lg mt-2" />
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
                    onClick={() => startEdit(post)}
                    className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
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

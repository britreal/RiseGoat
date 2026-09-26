import { FormEvent, useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Blog } from '@/types';

export function BlogSettingsPage() {
  const { user, profile } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    avatar_url: '',
    cover_url: '',
    theme_color: '#f6f2ea',
    accent_color: '#b45309',
    theme_font: 'inter',
    content_width: 'medium',
    post_style: 'editorial',
    is_published: true,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    seo_image_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('blogs').select('*').eq('user_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          const b = data as Blog;
          setBlog(b);
          setForm({
            name: b.name,
            slug: b.slug,
            description: b.description,
            avatar_url: b.avatar_url,
            cover_url: b.cover_url,
            theme_color: b.theme_color,
            accent_color: b.accent_color,
            theme_font: b.theme_font,
            content_width: b.content_width,
            post_style: b.post_style,
            is_published: b.is_published,
            seo_title: b.seo_title,
            seo_description: b.seo_description,
            seo_keywords: b.seo_keywords,
            seo_image_url: b.seo_image_url,
          });
          setLoading(false);
          return;
        }

        const { data: created, error: createError } = await supabase.from('blogs').insert({
          user_id: user.id,
          slug: profile?.username || 'blog',
          name: profile?.display_name || profile?.username || 'Meu blog',
          description: profile?.bio || '',
          avatar_url: profile?.avatar_url || '',
          is_published: true,
        }).select('*').single();

        if (createError || !created) {
          setError('Não foi possível criar o blog.');
        } else {
          const b = created as Blog;
          setBlog(b);
          setForm((current) => ({ ...current, name: b.name, slug: b.slug, description: b.description, avatar_url: b.avatar_url }));
        }
        setLoading(false);
      });
  }, [user, profile]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || !blog) return;
    setSaving(true);
    setSaved(false);
    setError('');

    const normalizedSlug = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'blog';
    const { data, error: saveError } = await supabase.from('blogs').update({
      name: form.name.trim() || 'Meu blog',
      slug: normalizedSlug,
      description: form.description.trim(),
      avatar_url: form.avatar_url.trim(),
      cover_url: form.cover_url.trim(),
      theme_color: form.theme_color,
      accent_color: form.accent_color,
      theme_font: form.theme_font,
      content_width: form.content_width,
      post_style: form.post_style,
      is_published: form.is_published,
      seo_title: form.seo_title.trim(),
      seo_description: form.seo_description.trim(),
      seo_keywords: form.seo_keywords.trim(),
      seo_image_url: form.seo_image_url.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', blog.id).eq('user_id', user.id).select('*').single();

    setSaving(false);
    if (saveError || !data) {
      setError(saveError?.code === '23505' ? 'Esse endereço já está em uso.' : 'Não foi possível salvar.');
      return;
    }

    setBlog(data as Blog);
    setForm((current) => ({ ...current, slug: normalizedSlug }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const field = (label: string, key: keyof typeof form, placeholder = '') => (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        value={String(form[key])}
        onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );

  return (
    <form onSubmit={save} className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex items-end justify-between gap-5 mb-9">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Meu blog</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">Identidade</h1>
          <p className="mt-2 text-sm text-slate-500">Tudo o que define a aparência e o posicionamento do site.</p>
        </div>
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-slate-950 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-emerald-400" /> : null}
          {saving ? 'Salvando…' : saved ? 'Salvo' : 'Salvar'}
        </button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="space-y-5">
        {field('Nome', 'name', 'Meu nome')}
        {field('Endereço do blog', 'slug', 'meu-nome')}
        {field('Descrição', 'description', 'O que você escreve e por que vale acompanhar.')}
        {field('Avatar URL', 'avatar_url', 'https://...')}
        {field('Capa URL', 'cover_url', 'https://...')}
        {field('Título SEO', 'seo_title', 'Título que aparece no Google')}
        {field('Descrição SEO', 'seo_description', 'Descrição para mecanismos de busca')}
        {field('Palavras-chave', 'seo_keywords', 'blog, estudos, ideias')}

        <div className="grid sm:grid-cols-2 gap-4">
          {field('Imagem SEO', 'seo_image_url', 'https://...')}
          {field('Cor de destaque', 'accent_color', '#b45309')}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-xs font-semibold text-slate-500">Largura</span><select value={form.content_width} onChange={(e) => setForm((c) => ({ ...c, content_width: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"><option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option></select></label>
          <label className="block"><span className="text-xs font-semibold text-slate-500">Estilo</span><select value={form.post_style} onChange={(e) => setForm((c) => ({ ...c, post_style: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"><option value="editorial">Editorial</option><option value="cards">Cards</option><option value="minimal">Minimal</option></select></label>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((c) => ({ ...c, is_published: e.target.checked }))} />
          <span><span className="block text-sm font-semibold">Site publicado</span><span className="block text-xs text-slate-400 mt-1">Quando desligado, o conteúdo não aparece publicamente.</span></span>
        </label>
      </div>
    </form>
  );
}

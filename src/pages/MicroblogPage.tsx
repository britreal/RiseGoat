import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, Pin, MessageSquare, Loader2, Send, X, Search, Settings2, Palette, Globe2, ExternalLink, Pencil } from 'lucide-react';
import type { Blog, MicroblogPost, PostLink } from '@/types';
import { timeAgo } from '@/lib/utils';
import { uploadUserImage } from '@/lib/storage';

type Tab = 'posts' | 'blogs' | 'settings' | 'design' | 'seo';
type BlogForm = Omit<Blog, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type PostForm = {
  title: string; slug: string; content: string; excerpt: string; image_url: string;
  button_text: string; button_url: string; seo_title: string; seo_description: string; seo_keywords: string;
  links: PostLink[]; status: 'draft' | 'published' | 'archived';
};

const inputClass = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-slate-400';
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';
const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const RESERVED = new Set(['auth','dashboard','profile','links','microblog','newsletter','posts','drafts','leads','analytics','settings','sales','offers','product-portfolio','book-writer','revenue','command-center','partnerships','launches','radar','goals','goat','admin','u','p','unsubscribe','assets','api']);

const emptyBlog = (): BlogForm => ({
  slug: '', name: 'Meu Blog', description: '', avatar_url: '', cover_url: '', theme_color: '#0f172a', accent_color: '#06b6d4',
  theme_font: 'inter', content_width: 'medium', post_style: 'cards', show_author: true, is_published: true,
  seo_title: '', seo_description: '', seo_keywords: '', seo_image_url: '', settings: {},
});
const emptyPost = (): PostForm => ({
  title: '', slug: '', content: '', excerpt: '', image_url: '', button_text: '', button_url: '',
  seo_title: '', seo_description: '', seo_keywords: '', links: [], status: 'published',
});

export function MicroblogPage() {
  const { user, profile } = useAuth();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activeBlogId, setActiveBlogId] = useState('');
  const [posts, setPosts] = useState<MicroblogPost[]>([]);
  const [tab, setTab] = useState<Tab>('posts');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState<PostForm>(emptyPost());
  const [blogForm, setBlogForm] = useState<BlogForm>(emptyBlog());
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const activeBlog = useMemo(() => blogs.find((b) => b.id === activeBlogId) || null, [blogs, activeBlogId]);

  async function loadBlogs(preferredId?: string) {
    if (!user) return;
    const { data, error } = await supabase.from('blogs').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    if (error) { setLoading(false); setNotice(error.message); return; }
    let nextBlogs = (data as Blog[]) || [];
    if (!nextBlogs.length) {
      const fallbackSlug = slugify(profile?.username || user.email?.split('@')[0] || 'meu-blog') || 'meu-blog';
      const { data: created, error: createError } = await supabase.from('blogs').insert({
        user_id: user.id, slug: fallbackSlug, name: profile?.display_name || 'Meu Blog', description: profile?.bio || '',
        avatar_url: profile?.avatar_url || '', cover_url: profile?.cover_url || '', theme_color: profile?.theme_color || '#0f172a',
        accent_color: profile?.accent_color || '#06b6d4', theme_font: profile?.theme_font || 'inter',
        seo_title: profile?.seo_title || '', seo_description: profile?.seo_description || '', seo_image_url: profile?.seo_image_url || '',
      }).select().single();
      if (createError) { setNotice(createError.message); setLoading(false); return; }
      if (created) nextBlogs = [created as Blog];
    }
    setBlogs(nextBlogs);
    const nextId = preferredId && nextBlogs.some((b) => b.id === preferredId) ? preferredId : nextBlogs.find((b) => b.id === activeBlogId)?.id || nextBlogs[0].id;
    setActiveBlogId(nextId);
    setLoading(false);
  }

  async function loadPosts(blogId: string) {
    if (!user || !blogId) { setPosts([]); return; }
    const { data } = await supabase.from('microblog_posts').select('*').eq('blog_id', blogId).eq('user_id', user.id)
      .order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    setPosts((data as MicroblogPost[]) || []);
  }

  useEffect(() => { void loadBlogs(); }, [user?.id]);
  useEffect(() => { if (activeBlogId) void loadPosts(activeBlogId); }, [activeBlogId, user?.id]);

  useEffect(() => {
    if (!activeBlog) return;
    setBlogForm({
      slug: activeBlog.slug, name: activeBlog.name, description: activeBlog.description, avatar_url: activeBlog.avatar_url,
      cover_url: activeBlog.cover_url, theme_color: activeBlog.theme_color, accent_color: activeBlog.accent_color, theme_font: activeBlog.theme_font,
      content_width: activeBlog.content_width, post_style: activeBlog.post_style, show_author: activeBlog.show_author, is_published: activeBlog.is_published,
      seo_title: activeBlog.seo_title, seo_description: activeBlog.seo_description, seo_keywords: activeBlog.seo_keywords,
      seo_image_url: activeBlog.seo_image_url, settings: activeBlog.settings || {},
    });
    setEditingBlogId(activeBlog.id);
  }, [activeBlog?.id]);

  function resetPost() { setEditingPostId(null); setPostForm(emptyPost()); }
  function editPost(post: MicroblogPost) {
    setEditingPostId(post.id);
    setPostForm({
      title: post.title || '', slug: post.slug || '', content: post.content || '', excerpt: post.excerpt || '', image_url: post.image_url || '',
      button_text: post.button_text || '', button_url: post.button_url || '', seo_title: post.seo_title || '',
      seo_description: post.seo_description || '', seo_keywords: post.seo_keywords || '', links: Array.isArray(post.links) ? post.links : [],
      status: post.status || 'published',
    });
    setTab('posts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function savePost() {
    if (!user || !activeBlog || !postForm.content.trim()) return;
    setSaving(true); setNotice('');
    let imageUrl = postForm.image_url;
    try {
      const input = document.getElementById('microblog-image-file') as HTMLInputElement | null;
      if (input?.files?.[0]) imageUrl = await uploadUserImage(user.id, input.files[0], 'microblog');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.'); setSaving(false); return; }
    const cleanSlug = slugify(postForm.slug || postForm.title) || ('post-' + crypto.randomUUID().slice(0, 8));
    const existing = editingPostId ? posts.find((p) => p.id === editingPostId) : null;
    const now = new Date().toISOString();
    const payload = {
      user_id: user.id, blog_id: activeBlog.id, slug: cleanSlug, title: postForm.title.trim(), content: postForm.content.trim(),
      excerpt: postForm.excerpt.trim() || postForm.content.trim().slice(0, 180), image_url: imageUrl.trim(), button_text: postForm.button_text.trim(),
      button_url: postForm.button_url.trim(), seo_title: postForm.seo_title.trim(), seo_description: postForm.seo_description.trim(),
      seo_keywords: postForm.seo_keywords.trim(), links: postForm.links.filter((l) => l.label.trim() && l.url.trim()),
      status: postForm.status, published_at: postForm.status === 'published' ? (existing?.published_at || now) : null, updated_at: now,
    };
    const result = editingPostId
      ? await supabase.from('microblog_posts').update(payload).eq('id', editingPostId).eq('user_id', user.id)
      : await supabase.from('microblog_posts').insert(payload);
    if (result.error) setNotice(result.error.message.includes('microblog_posts_blog_slug_unique') || result.error.code === '23505' ? 'Esse slug de publicação já está em uso neste blog.' : result.error.message);
    else { resetPost(); await loadPosts(activeBlog.id); setNotice('Publicação salva.'); }
    setSaving(false);
  }

  async function deletePost(id: string) {
    if (!window.confirm('Apagar esta publicação?')) return;
    const { error } = await supabase.from('microblog_posts').delete().eq('id', id).eq('user_id', user!.id);
    if (!error) setPosts((current) => current.filter((p) => p.id !== id));
  }

  async function togglePin(post: MicroblogPost) {
    if (!user || !activeBlog) return;
    if (post.is_pinned) await supabase.from('microblog_posts').update({ is_pinned: false }).eq('id', post.id).eq('user_id', user.id);
    else {
      await supabase.from('microblog_posts').update({ is_pinned: false }).eq('blog_id', activeBlog.id).eq('user_id', user.id);
      await supabase.from('microblog_posts').update({ is_pinned: true }).eq('id', post.id).eq('user_id', user.id);
    }
    await loadPosts(activeBlog.id);
  }

  function addLink() { setPostForm((f) => ({ ...f, links: [...f.links, { label: '', url: '' }] })); }
  function removeLink(index: number) { setPostForm((f) => ({ ...f, links: f.links.filter((_, i) => i !== index) })); }
  function updateLink(index: number, key: keyof PostLink, value: string) {
    setPostForm((f) => ({ ...f, links: f.links.map((l, i) => i === index ? { ...l, [key]: value } : l) }));
  }

  function startNewBlog() {
    setEditingBlogId(null); setBlogForm({ ...emptyBlog(), name: 'Novo Blog', slug: slugify((profile?.username || 'meu-blog') + '-blog') });
    setTab('blogs'); setNotice('');
  }

  async function saveBlog() {
    if (!user) return;
    const slug = slugify(blogForm.slug);
    if (!slug || RESERVED.has(slug)) { setNotice('Escolha um slug válido e que não seja uma rota reservada.'); return; }
    setSaving(true); setNotice('');
    const payload = { ...blogForm, slug, updated_at: new Date().toISOString() };
    const result = editingBlogId
      ? await supabase.from('blogs').update(payload).eq('id', editingBlogId).eq('user_id', user.id).select().single()
      : await supabase.from('blogs').insert({ ...payload, user_id: user.id }).select().single();
    if (result.error) setNotice(result.error.message.includes('duplicate') ? 'Esse endereço de blog já está em uso.' : result.error.message);
    else {
      const saved = result.data as Blog;
      setBlogs((current) => editingBlogId ? current.map((b) => b.id === saved.id ? saved : b) : [...current, saved]);
      setActiveBlogId(saved.id); setEditingBlogId(saved.id); setBlogForm({
        slug: saved.slug, name: saved.name, description: saved.description, avatar_url: saved.avatar_url, cover_url: saved.cover_url,
        theme_color: saved.theme_color, accent_color: saved.accent_color, theme_font: saved.theme_font, content_width: saved.content_width,
        post_style: saved.post_style, show_author: saved.show_author, is_published: saved.is_published, seo_title: saved.seo_title,
        seo_description: saved.seo_description, seo_keywords: saved.seo_keywords, seo_image_url: saved.seo_image_url, settings: saved.settings || {},
      });
      setNotice('Blog salvo.');
    }
    setSaving(false);
  }

  async function deleteBlog(id: string) {
    if (blogs.length === 1) { setNotice('Mantenha pelo menos um blog na conta.'); return; }
    if (!window.confirm('Apagar este blog e todos os posts dele?')) return;
    const { error } = await supabase.from('blogs').delete().eq('id', id).eq('user_id', user!.id);
    if (!error) { const next = blogs.filter((b) => b.id !== id); setBlogs(next); setActiveBlogId(next[0].id); }
  }

  async function uploadBlogImage(field: 'avatar_url' | 'cover_url' | 'seo_image_url', file: File) {
    if (!user) return;
    try { const url = await uploadUserImage(user.id, file, 'blog'); setBlogForm((f) => ({ ...f, [field]: url })); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.'); }
  }

  if (loading) return <Spinner />;
  const tabs: Array<{ id: Tab; label: string; icon: typeof MessageSquare }> = [
    { id:'posts',label:'Publicações',icon:MessageSquare },{id:'blogs',label:'Blogs',icon:Settings2},{id:'settings',label:'Configurações',icon:Settings2},{id:'design',label:'Design',icon:Palette},{id:'seo',label:'SEO',icon:Search},
  ];

  return <div className="p-6 lg:p-8 max-w-6xl mx-auto">
    <PageHeader title="Blog" subtitle="Microblog independente com URL própria, posts, links, fixação, design e SEO."
      action={activeBlog ? <a href={'/' + activeBlog.slug} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-white"><ExternalLink className="w-4 h-4"/>Abrir blog</a> : null}/>
    {notice && <div className="mb-4 px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600">{notice}</div>}
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-white border border-slate-200 p-1">{tabs.map((t)=>{const Icon=t.icon;return <button key={t.id} onClick={()=>setTab(t.id)} className={'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold '+(tab===t.id?'bg-slate-950 text-white':'text-slate-500 hover:bg-slate-100')}><Icon className="w-3.5 h-3.5"/>{t.label}</button>})}</div>
      <select value={activeBlogId} onChange={(e)=>setActiveBlogId(e.target.value)} className="ml-auto px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold">{blogs.map((b)=><option key={b.id} value={b.id}>{b.name} — /{b.slug}</option>)}</select>
    </div>

    {tab==='posts' && activeBlog && <Card className="p-5 mb-5">
      <div className="flex items-center justify-between mb-4"><div><p className="text-sm font-bold">{editingPostId?'Editar publicação':'Nova publicação'}</p><p className="text-xs text-slate-400 mt-1">Publicado em /{activeBlog.slug}/seu-post</p></div>{editingPostId&&<button onClick={resetPost} className="text-xs font-bold text-red-500">Cancelar edição</button>}</div>
      <div className="space-y-3">
        <input value={postForm.title} onChange={(e)=>setPostForm({...postForm,title:e.target.value})} placeholder="Título" className={inputClass}/>
        <textarea value={postForm.content} onChange={(e)=>setPostForm({...postForm,content:e.target.value})} placeholder="Escreva sua publicação..." rows={7} className={inputClass+' resize-y'}/>
        <div className="grid lg:grid-cols-2 gap-3"><div><label className={labelClass}>Slug</label><input value={postForm.slug} onChange={(e)=>setPostForm({...postForm,slug:slugify(e.target.value)})} placeholder="meu-post" className={inputClass}/></div><div><label className={labelClass}>Resumo</label><input value={postForm.excerpt} onChange={(e)=>setPostForm({...postForm,excerpt:e.target.value})} placeholder="Resumo do post" className={inputClass}/></div></div>
        <div><label className={labelClass}>Imagem</label><div className="grid lg:grid-cols-2 gap-2"><input id="microblog-image-file" type="file" accept="image/*" className="text-xs"/><input value={postForm.image_url} onChange={(e)=>setPostForm({...postForm,image_url:e.target.value})} placeholder="URL da imagem" className={inputClass}/></div></div>
        <div className="border-t border-slate-100 pt-4"><div className="flex items-center justify-between mb-2"><p className="text-xs font-bold">Links do post</p><button onClick={addLink} type="button" className="text-xs font-bold text-cyan-600">+ Adicionar link</button></div>{postForm.links.map((link,i)=><div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 mb-2"><input value={link.label} onChange={(e)=>updateLink(i,'label',e.target.value)} placeholder="Texto" className={inputClass}/><input type="url" value={link.url} onChange={(e)=>updateLink(i,'url',e.target.value)} placeholder="https://" className={inputClass}/><button type="button" onClick={()=>removeLink(i)} className="px-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button></div>)}</div>
        <div className="grid lg:grid-cols-2 gap-2"><input value={postForm.button_text} onChange={(e)=>setPostForm({...postForm,button_text:e.target.value})} placeholder="Texto do botão / CTA" className={inputClass}/><input type="url" value={postForm.button_url} onChange={(e)=>setPostForm({...postForm,button_url:e.target.value})} placeholder="URL do CTA" className={inputClass}/></div>
        <details className="border-t border-slate-100 pt-3"><summary className="text-xs font-bold cursor-pointer">SEO da publicação</summary><div className="grid gap-2 mt-3"><input value={postForm.seo_title} onChange={(e)=>setPostForm({...postForm,seo_title:e.target.value})} placeholder="Título SEO" className={inputClass}/><textarea value={postForm.seo_description} onChange={(e)=>setPostForm({...postForm,seo_description:e.target.value})} placeholder="Meta description" rows={2} className={inputClass}/><input value={postForm.seo_keywords} onChange={(e)=>setPostForm({...postForm,seo_keywords:e.target.value})} placeholder="Palavras-chave" className={inputClass}/></div></details>
        <div className="flex flex-wrap justify-between items-center gap-3 pt-2"><select value={postForm.status} onChange={(e)=>setPostForm({...postForm,status:e.target.value as PostForm['status']})} className={inputClass+' max-w-[180px]'}><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select><button onClick={()=>void savePost()} disabled={saving||!postForm.content.trim()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold disabled:opacity-50">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}{editingPostId?'Salvar alterações':'Publicar'}</button></div>
      </div>
    </Card>}

    {tab==='posts' && activeBlog && (posts.length===0?<Card><EmptyState icon={MessageSquare} title="Nenhuma publicação" subtitle="Crie seu primeiro post." /></Card>:<div className="space-y-3">{posts.map((post)=><Card key={post.id} className="p-4"><div className="flex gap-3 items-start"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1">{post.title&&<p className="text-sm font-bold truncate">{post.title}</p>}<span className={'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full '+(post.status==='published'?'bg-emerald-50 text-emerald-600':post.status==='draft'?'bg-amber-50 text-amber-600':'bg-slate-100 text-slate-500')}>{post.status}</span></div><p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">{post.content}</p><p className="text-[11px] text-slate-400 mt-2">/{activeBlog.slug}/{post.slug} · {timeAgo(post.created_at)}</p></div><div className="flex gap-1 shrink-0"><button title="Abrir" onClick={()=>window.open('/'+activeBlog.slug+'/'+post.slug,'_blank')} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100"><ExternalLink className="w-4 h-4"/></button><button title="Fixar" onClick={()=>void togglePin(post)} className={'p-1.5 rounded-lg '+(post.is_pinned?'text-amber-500 bg-amber-50':'text-slate-300 hover:bg-slate-100')}><Pin className="w-4 h-4"/></button><button title="Editar" onClick={()=>editPost(post)} className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-100"><Pencil className="w-4 h-4"/></button><button title="Apagar" onClick={()=>void deletePost(post.id)} className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div></div></Card>)}</div>)}

    {tab==='blogs' && <div className="grid lg:grid-cols-[1fr_360px] gap-5"><Card className="p-5"><div className="flex items-center justify-between mb-4"><div><p className="text-sm font-bold">Seus blogs</p><p className="text-xs text-slate-400 mt-1">Cada blog possui um endereço independente.</p></div><button onClick={startNewBlog} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 text-white text-xs font-bold"><Plus className="w-4 h-4"/>Novo</button></div><div className="space-y-2">{blogs.map((b)=><div key={b.id} className={'flex items-center gap-3 p-3 rounded-xl border '+(b.id===activeBlogId?'border-slate-950 bg-slate-50':'border-slate-200')}><div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">{b.avatar_url?<img src={b.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy"/>:<span className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500">{b.name.charAt(0)}</span>}</div><button onClick={()=>{setActiveBlogId(b.id);setEditingBlogId(b.id);}} className="flex-1 text-left min-w-0"><p className="text-sm font-bold truncate">{b.name}</p><p className="text-xs text-slate-400 truncate">/{b.slug}</p></button><button onClick={()=>void deleteBlog(b.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>)}</div></Card><Card className="p-5"><p className="text-sm font-bold mb-4">{editingBlogId?'Editar blog':'Criar blog'}</p><div className="space-y-3"><div><label className={labelClass}>Nome</label><input value={blogForm.name} onChange={(e)=>setBlogForm({...blogForm,name:e.target.value})} className={inputClass}/></div><div><label className={labelClass}>Slug</label><div className="flex items-center gap-2"><span className="text-xs text-slate-400">/</span><input value={blogForm.slug} onChange={(e)=>setBlogForm({...blogForm,slug:slugify(e.target.value)})} className={inputClass}/></div></div><div><label className={labelClass}>Descrição</label><textarea value={blogForm.description} onChange={(e)=>setBlogForm({...blogForm,description:e.target.value})} rows={4} className={inputClass}/></div><label className="flex gap-2 items-center text-xs font-semibold text-slate-600"><input type="checkbox" checked={blogForm.is_published} onChange={(e)=>setBlogForm({...blogForm,is_published:e.target.checked})}/> Blog público</label><button onClick={()=>void saveBlog()} disabled={saving} className="w-full py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold">{saving?'Salvando…':'Salvar blog'}</button></div></Card></div>}

    {activeBlog && (tab==='settings'||tab==='design'||tab==='seo') && <Card className="p-5 lg:p-6">
      {tab==='settings'&&<div className="grid lg:grid-cols-2 gap-6"><div><h2 className="text-base font-bold mb-4">Configurações</h2><div className="space-y-3"><div><label className={labelClass}>Nome</label><input value={blogForm.name} onChange={(e)=>setBlogForm({...blogForm,name:e.target.value})} className={inputClass}/></div><div><label className={labelClass}>Slug público</label><input value={blogForm.slug} onChange={(e)=>setBlogForm({...blogForm,slug:slugify(e.target.value)})} className={inputClass}/></div><div><label className={labelClass}>Descrição</label><textarea value={blogForm.description} onChange={(e)=>setBlogForm({...blogForm,description:e.target.value})} rows={6} className={inputClass}/></div><label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={blogForm.show_author} onChange={(e)=>setBlogForm({...blogForm,show_author:e.target.checked})}/> Mostrar autor</label><label className="flex items-center gap-2 text-sm font-semibold text-slate-600"><input type="checkbox" checked={blogForm.is_published} onChange={(e)=>setBlogForm({...blogForm,is_published:e.target.checked})}/> Publicar blog</label></div></div><div className="rounded-2xl bg-slate-50 p-5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Endereço</p><p className="text-xl font-black mt-2 break-all">https://www.risegoat.com/{blogForm.slug||'seu-blog'}</p><a href={'/'+blogForm.slug} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-cyan-600"><Globe2 className="w-4 h-4"/>Abrir</a></div></div>}
      {tab==='design'&&<div><h2 className="text-base font-bold mb-4">Design</h2><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"><div><label className={labelClass}>Fundo</label><input type="color" value={blogForm.theme_color} onChange={(e)=>setBlogForm({...blogForm,theme_color:e.target.value})} className="w-full h-11 rounded-xl"/></div><div><label className={labelClass}>Destaque</label><input type="color" value={blogForm.accent_color} onChange={(e)=>setBlogForm({...blogForm,accent_color:e.target.value})} className="w-full h-11 rounded-xl"/></div><div><label className={labelClass}>Fonte</label><select value={blogForm.theme_font} onChange={(e)=>setBlogForm({...blogForm,theme_font:e.target.value})} className={inputClass}><option value="inter">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select></div><div><label className={labelClass}>Largura</label><select value={blogForm.content_width} onChange={(e)=>setBlogForm({...blogForm,content_width:e.target.value as BlogForm['content_width']})} className={inputClass}><option value="narrow">Estreita</option><option value="medium">Média</option><option value="wide">Ampla</option></select></div><div><label className={labelClass}>Posts</label><select value={blogForm.post_style} onChange={(e)=>setBlogForm({...blogForm,post_style:e.target.value as BlogForm['post_style']})} className={inputClass}><option value="cards">Cards</option><option value="minimal">Minimal</option><option value="editorial">Editorial</option></select></div><div><label className={labelClass}>Avatar</label><input type="file" accept="image/*" onChange={(e)=>e.target.files?.[0]&&void uploadBlogImage('avatar_url',e.target.files[0])} className="text-xs"/></div><div><label className={labelClass}>Capa</label><input type="file" accept="image/*" onChange={(e)=>e.target.files?.[0]&&void uploadBlogImage('cover_url',e.target.files[0])} className="text-xs"/></div><div className="md:col-span-2"><label className={labelClass}>URLs</label><div className="grid md:grid-cols-2 gap-2"><input value={blogForm.avatar_url} onChange={(e)=>setBlogForm({...blogForm,avatar_url:e.target.value})} placeholder="Avatar URL" className={inputClass}/><input value={blogForm.cover_url} onChange={(e)=>setBlogForm({...blogForm,cover_url:e.target.value})} placeholder="Capa URL" className={inputClass}/></div></div></div></div>}
      {tab==='seo'&&<div className="max-w-2xl"><h2 className="text-base font-bold">SEO</h2><p className="text-xs text-slate-400 mt-1 mb-5">Metadados do endereço público do blog.</p><div className="space-y-3"><input value={blogForm.seo_title} onChange={(e)=>setBlogForm({...blogForm,seo_title:e.target.value})} placeholder="Título SEO" className={inputClass}/><textarea value={blogForm.seo_description} onChange={(e)=>setBlogForm({...blogForm,seo_description:e.target.value})} placeholder="Meta description" rows={4} className={inputClass}/><input value={blogForm.seo_keywords} onChange={(e)=>setBlogForm({...blogForm,seo_keywords:e.target.value})} placeholder="Palavras-chave" className={inputClass}/><div><label className={labelClass}>Imagem social</label><div className="grid lg:grid-cols-2 gap-2"><input value={blogForm.seo_image_url} onChange={(e)=>setBlogForm({...blogForm,seo_image_url:e.target.value})} placeholder="https://..." className={inputClass}/><input type="file" accept="image/*" onChange={(e)=>e.target.files?.[0]&&void uploadBlogImage('seo_image_url',e.target.files[0])} className="text-xs"/></div></div></div></div>}
      <div className="flex justify-end pt-5 mt-6 border-t border-slate-100"><button onClick={()=>void saveBlog()} disabled={saving} className="px-5 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold">{saving?'Salvando…':'Salvar configurações'}</button></div>
    </Card>}
  </div>;
}
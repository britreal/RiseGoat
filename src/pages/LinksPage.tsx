import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadUserImage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Link2, Youtube, GraduationCap, ShoppingBag, Image as ImageIcon, ShieldAlert, Upload, BookOpen } from 'lucide-react';
import type { Link, Blog } from '@/types';

type LinkType = 'link' | 'youtube' | 'course' | 'affiliate' | 'blog';

const TYPE_OPTIONS: Array<{ value: LinkType; label: string; icon: typeof Link2; help: string }> = [
  { value: 'link', label: 'Link', icon: Link2, help: 'Instagram, WhatsApp, site...' },
  { value: 'youtube', label: 'YouTube', icon: Youtube, help: 'Exibe o vídeo na página' },
  { value: 'course', label: 'Curso', icon: GraduationCap, help: 'Link de curso ou aula' },
  { value: 'affiliate', label: 'Afiliado', icon: ShoppingBag, help: 'Produto com imagem e compra' },
  { value: 'blog', label: 'Blog', icon: BookOpen, help: 'Vincula um Blog do RiseGoat ao seu perfil' },
];

const ICON_OPTIONS = ['link', 'instagram', 'spotify', 'soundcloud', 'youtube', 'twitter', 'github', 'globe', 'mail', 'phone', 'music', 'mic', 'headphones', 'camera', 'shopping-bag', 'calendar', 'map-pin', 'star', 'heart'];

function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1).split('/')[0] || null;
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = parts.indexOf('embed');
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];
      const shortsIndex = parts.indexOf('shorts');
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];
    }
  } catch (error) {
    void error;
  }
  return null;
}

export function LinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<LinkType>('link');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newThumbnail, setNewThumbnail] = useState('');
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newSensitive, setNewSensitive] = useState(false);
  const [newIcon, setNewIcon] = useState('link');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('links').select('*').eq('user_id', user.id).order('sort_order', { ascending: true }),
      supabase.from('blogs').select('id,user_id,slug,name,is_published').eq('user_id', user.id).eq('is_published', true).order('created_at', { ascending: true }),
    ]).then(([linksRes, blogsRes]) => {
      const data = linksRes.data;
      const error = linksRes.error;
      setBlogs((blogsRes.data as Blog[]) ?? []);
      if (error) setFormError(error.message);
      setLinks((data as Link[]) ?? []);
      const firstBlog = (blogsRes.data as Blog[] | null)?.[0];
      if (firstBlog) setSelectedBlogId(firstBlog.id);
      setLoading(false);
    });
  }, [user]);

  function resetForm() {
    setNewType('link'); setNewLabel(''); setNewUrl(''); setNewDescription(''); setSelectedBlogId(blogs[0]?.id || '');
    setNewThumbnail(''); setNewThumbnailFile(null); setNewPrice(''); setNewSensitive(false); setNewIcon('link'); setFormError('');
  }

  async function addLink() {
    setFormError('');
    if (!user || !newLabel.trim() || !newUrl.trim()) return setFormError('Preencha título e URL.');
    if (newType === 'blog') {
      const blog = blogs.find((item) => item.id === selectedBlogId);
      if (!blog) return setFormError('Selecione um Blog publicado.');
    }
    if (newType === 'youtube' && !youtubeId(newUrl.trim())) return setFormError('Cole uma URL válida do YouTube.');
    if (newType === 'affiliate' && !newThumbnailFile && !newThumbnail.trim()) return setFormError('Produtos afiliados precisam de uma imagem.');
    let thumbnailUrl = newThumbnail.trim();
    try {
      if (newThumbnailFile) thumbnailUrl = await uploadUserImage(user.id, newThumbnailFile, 'links');
    } catch (error: any) { return setFormError(error?.message || 'Não foi possível enviar a imagem.'); }

    const selectedBlog = newType === 'blog' ? blogs.find((item) => item.id === selectedBlogId) : null;
    const linkUrl = selectedBlog ? '/' + selectedBlog.slug : newUrl.trim();
    const { data, error } = await supabase.from('links').insert({
      user_id: user.id,
      label: newType === 'blog' && selectedBlog ? (newLabel.trim() || selectedBlog.name) : newLabel.trim(),
      url: linkUrl,
      icon: newType === 'youtube' ? 'youtube' : newType === 'course' ? 'book' : newType === 'affiliate' ? 'shopping-bag' : newType === 'blog' ? 'book' : newIcon,
      link_type: newType,
      blog_id: selectedBlog?.id || null,
      description: newDescription.trim(),
      thumbnail_url: thumbnailUrl,
      sensitive: newSensitive,
      product_price: newPrice.trim(),
      product_currency: 'BRL',
      sort_order: links.length,
    }).select().single();

    if (error || !data) { setFormError(error?.message || 'Não foi possível adicionar.'); return; }
    setLinks([...links, data as Link]);
    resetForm();
    setAdding(false);
  }

  async function deleteLink(id: string) {
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (!error) setLinks(links.filter((l) => l.id !== id));
  }

  async function toggleActive(link: Link) {
    const { error } = await supabase.from('links').update({ is_active: !link.is_active }).eq('id', link.id);
    if (!error) setLinks(links.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)));
  }

  async function moveLink(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= links.length) return;
    const updated = [...links];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setLinks(updated);
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('links').update({ sort_order: i }).eq('id', updated[i].id).eq('user_id', user!.id);
    }
  }

  if (loading) return <Spinner />;
  const selectedType = TYPE_OPTIONS.find((x) => x.value === newType)!;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="Links" subtitle="Links, vídeos, cursos e produtos afiliados da sua página." action={
        <button onClick={() => setAdding(!adding)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition shadow-sm">
          <Plus className="w-4 h-4" /> Novo item
        </button>
      } />

      {adding && (
        <Card className="p-5 mb-5">
          <p className="text-sm font-semibold text-slate-800 mb-2">O que você quer adicionar?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {TYPE_OPTIONS.map((type) => (
              <button key={type.value} onClick={() => setNewType(type.value)}
                className={'flex items-center gap-2 p-3 rounded-xl border text-left transition ' + (newType === type.value ? 'border-slate-900 bg-slate-950 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                <type.icon className="w-4 h-4 shrink-0" /><span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mb-4">{selectedType.help}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={newType === 'affiliate' ? 'Tênis Nike Air Force 1' : newType === 'youtube' ? 'Meu vídeo no YouTube' : newType === 'course' ? 'Meu curso' : 'Instagram'} className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">URL de destino</label>
              <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." disabled={newType === 'blog'} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
          </div>

          {newType === 'blog' && (
            <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Blog publicado</label>
                <select value={selectedBlogId} onChange={(e) => {
                  const id = e.target.value;
                  setSelectedBlogId(id);
                  const blog = blogs.find((item) => item.id === id);
                  if (blog) {
                    setNewLabel(blog.name);
                    setNewUrl('/' + blog.slug);
                  }
                }} className="w-full h-11 px-3.5 text-sm border border-slate-200 rounded-xl bg-white">
                  <option value="">Selecione um Blog</option>
                  {blogs.map((blog) => <option key={blog.id} value={blog.id}>{blog.name} — /{blog.slug}</option>)}
                </select>
              </div>
              <p className="text-[11px] text-slate-400">Esse link fica vinculado ao Blog. A URL é preenchida automaticamente e aparecerá no seu Perfil como um link normal.</p>
            </div>
          )}

          {(newType === 'affiliate' || newType === 'course') && (
            <div className="mt-3"><label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} placeholder="Descrição curta..." className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
            </div>
          )}

          {newType === 'affiliate' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1"><ImageIcon className="w-3 h-3 inline mr-1" />Imagem do produto</label>
                <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-600"><Upload className="w-4 h-4" /> {newThumbnailFile?.name || 'Escolher imagem do PC ou celular'}<input type="file" accept="image/*" className="hidden" onChange={(e) => setNewThumbnailFile(e.target.files?.[0] || null)} /></label>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Preço</label>
                <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="R$ 99,90" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
            </div>
          )}

          {newType === 'link' && (
            <div className="mt-3"><label className="block text-xs font-medium text-slate-500 mb-1">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((icon) => (
                  <button key={icon} type="button" onClick={() => setNewIcon(icon)}
                    className={'px-3 py-1.5 text-xs rounded-lg border transition ' + (newIcon === icon ? 'border-slate-900 bg-slate-950 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 p-3 mt-4 rounded-xl border border-slate-200 cursor-pointer">
            <input type="checkbox" checked={newSensitive} onChange={(e) => setNewSensitive(e.target.checked)} className="mt-0.5" />
            <span><span className="flex items-center gap-1.5 text-sm font-medium text-slate-700"><ShieldAlert className="w-4 h-4 text-slate-500" /> Conteúdo sensível / 18+</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">O visitante precisará confirmar que é maior de 18 antes de abrir.</span></span>
          </label>

          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={addLink} className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl">Adicionar</button>
            <button onClick={() => { resetForm(); setAdding(false); }} className="px-4 py-2.5 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-100">Cancelar</button>
          </div>
        </Card>
      )}

      {links.length === 0 && !adding ? (
        <Card><EmptyState icon={Link2} title="Nenhum item ainda" subtitle="Adicione links, vídeos, cursos ou produtos afiliados." /></Card>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => (
            <Card key={link.id} className="p-4 flex items-center gap-3">
              <div className="flex flex-col">
                <button onClick={() => moveLink(index, -1)} disabled={index === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><GripVertical className="w-4 h-4 rotate-180" /></button>
                <button onClick={() => moveLink(index, 1)} disabled={index === links.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><GripVertical className="w-4 h-4" /></button>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                {link.link_type === 'youtube' ? <Youtube className="w-4 h-4 text-slate-500" /> : link.link_type === 'course' ? <GraduationCap className="w-4 h-4 text-slate-500" /> : link.link_type === 'affiliate' ? <ShoppingBag className="w-4 h-4 text-slate-500" /> : link.link_type === 'blog' ? <BookOpen className="w-4 h-4 text-slate-500" /> : <Link2 className="w-4 h-4 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{link.label}</p>
                <p className="text-xs text-slate-400 truncate">{link.link_type === 'affiliate' ? (link.description || 'Produto') + (link.product_price ? ' · ' + link.product_price : '') : link.link_type === 'blog' ? 'Blog vinculado' : link.url}</p>
              </div>
              {link.sensitive && <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" aria-label="18+" />}
              <span className="text-xs text-slate-400 hidden sm:block">{link.clicks} cliques</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleActive(link)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition" title={link.is_active ? 'Ocultar' : 'Mostrar'}>{link.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"><ExternalLink className="w-4 h-4" /></a>
                <button onClick={() => deleteLink(link.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

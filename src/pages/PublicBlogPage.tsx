import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Sparkles, ArrowRight, UserRound } from 'lucide-react';
import type { Blog, MicroblogPost, Profile } from '@/types';
import { timeAgo } from '@/lib/utils';

function fontStack(font: string) { if (font === 'serif') return 'Georgia, "Times New Roman", serif'; if (font === 'mono') return 'ui-monospace, SFMono-Regular, Menlo, monospace'; return 'Inter, system-ui, sans-serif'; }
function setMeta(name: string, content: string) { let e = document.head.querySelector('meta[name="' + name + '"]') as HTMLMetaElement | null; if (!e) { e = document.createElement('meta'); e.name = name; document.head.appendChild(e); } e.content = content; }
function setProp(name: string, content: string) { let e = document.head.querySelector('meta[property="' + name + '"]') as HTMLMetaElement | null; if (!e) { e = document.createElement('meta'); e.setAttribute('property', name); document.head.appendChild(e); } e.content = content; }

export function PublicBlogPage({ slug }: { slug: string }) {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<MicroblogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from('blogs').select('*').eq('slug', slug.toLowerCase()).eq('is_published', true).maybeSingle().then(async ({ data }) => {
      if (!alive) return;
      if (!data) { setNotFound(true); setLoading(false); return; }
      const b = data as Blog;
      const [profileRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', b.user_id).maybeSingle(),
        supabase.from('microblog_posts').select('*').eq('blog_id', b.id).eq('status', 'published').order('is_pinned', { ascending: false }).order('published_at', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      if (!alive) return;
      const p = profileRes.data as Profile | null;
      setBlog(b); setProfile(p); setPosts((postsRes.data as MicroblogPost[]) || []);

      const title = b.seo_title || b.name + ' — RiseGoat';
      const description = b.seo_description || b.description || 'Blog de ' + b.name;
      const image = b.seo_image_url || b.cover_url || b.avatar_url;
      const canonical = window.location.origin + '/' + b.slug;
      document.title = title;
      setMeta('description', description);
      setMeta('robots', 'index,follow');
      setProp('og:title', title); setProp('og:description', description); setProp('og:type', 'website'); setProp('og:url', canonical);
      if (image) setProp('og:image', image);
      setMeta('twitter:card', 'summary_large_image');
      let canonicalTag = document.head.querySelector('link[data-risegoat-canonical]') as HTMLLinkElement | null;
      if (!canonicalTag) { canonicalTag = document.createElement('link'); canonicalTag.rel = 'canonical'; canonicalTag.dataset.risegoatCanonical = 'true'; document.head.appendChild(canonicalTag); }
      canonicalTag.href = canonical;
      document.getElementById('risegoat-blog-schema')?.remove();
      const schema = document.createElement('script'); schema.id = 'risegoat-blog-schema'; schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Blog', name: b.name, description, url: canonical, image: image || undefined, author: { '@type': 'Person', name: p?.display_name || p?.username || b.name } });
      document.head.appendChild(schema);
      setLoading(false);
    }).catch(() => { if (alive) { setNotFound(true); setLoading(false); } });
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-7 h-7 text-white/50 animate-spin" /></div>;
  if (notFound || !blog) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white"><Sparkles className="w-8 h-8 text-white/30 mb-3" /><h1 className="text-xl font-bold">Blog não encontrado</h1><p className="text-sm text-white/40 mt-1">O endereço /{slug} não existe ou não está publicado.</p></div>;

  const bg = blog.theme_color || '#0f172a';
  const accent = blog.accent_color || '#06b6d4';
  const width = blog.content_width === 'narrow' ? 'max-w-2xl' : blog.content_width === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  const editorial = blog.post_style === 'editorial';

  return <div className="min-h-screen text-white" style={{ backgroundColor: bg, fontFamily: fontStack(blog.theme_font) }}>
    {blog.cover_url && <div className="h-44 sm:h-64 overflow-hidden"><img src={blog.cover_url} alt="" className="w-full h-full object-cover" fetchPriority="high" /></div>}
    <main className={width + ' mx-auto px-4 pb-16 ' + (blog.cover_url ? '-mt-10' : 'pt-12')}>
      <header className="text-center mb-10">
        {blog.avatar_url ? <img src={blog.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 mx-auto shadow-xl" style={{ borderColor: bg }} /> : <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-black bg-white/10 border border-white/10">{blog.name.charAt(0).toUpperCase()}</div>}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-4">{blog.name}</h1>
        {blog.description && <p className="max-w-2xl mx-auto text-sm sm:text-base text-white/60 leading-7 mt-3">{blog.description}</p>}
        {profile && blog.show_author && <a href={'/@' + profile.username} className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70 mt-4"><UserRound className="w-3.5 h-3.5" />{profile.display_name || profile.username}</a>}
      </header>
      <div className={editorial ? 'space-y-8' : 'space-y-4'}>
        {posts.length === 0 ? <div className="border border-white/10 rounded-2xl p-10 text-center text-white/40">Nenhuma publicação ainda.</div> : posts.map((post) => {
          const title = post.title || post.excerpt || post.content.slice(0, 80);
          const preview = post.excerpt || post.content.slice(0, 220);
          const card = blog.post_style === 'cards';
          return <article key={post.id} className={(card ? 'rounded-2xl border p-5 sm:p-7 ' : '') + (editorial ? 'border-white/10 bg-white/[0.03] ' : '') + 'transition hover:border-white/20'} style={card ? { backgroundColor: 'rgba(255,255,255,.04)', borderColor: 'rgba(255,255,255,.10)' } : undefined}>
            {post.image_url && <img src={post.image_url} alt={title} className="w-full max-h-80 object-cover rounded-xl mb-5" loading="lazy" decoding="async" />}
            <div className="flex items-center justify-between gap-3 mb-2"><time className="text-[11px] uppercase tracking-wider text-white/35">{timeAgo(post.published_at || post.created_at)}</time>{post.is_pinned && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>Fixado</span>}</div>
            <h2 className={(editorial ? 'text-2xl sm:text-3xl' : 'text-xl') + ' font-black leading-tight'}>{title}</h2>
            <p className="text-sm text-white/60 leading-7 mt-3 whitespace-pre-wrap">{preview}{post.content.length > preview.length ? '…' : ''}</p>
            <a href={'/' + blog.slug + '/' + post.slug} className="inline-flex items-center gap-2 text-sm font-bold mt-5" style={{ color: accent }}>Ler publicação <ArrowRight className="w-4 h-4" /></a>
          </article>;
        })}
      </div>
      <footer className="text-center pt-12"><a href="/auth" className="inline-flex items-center gap-1 text-xs text-white/25"><Sparkles className="w-3 h-3" />Powered by risegoat</a></footer>
    </main>
  </div>;
}
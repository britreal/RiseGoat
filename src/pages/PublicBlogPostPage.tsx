import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Sparkles, ArrowLeft, ExternalLink, UserRound, Pin } from 'lucide-react';
import type { Blog, MicroblogPost, Profile, PostLink } from '@/types';
import { timeAgo } from '@/lib/utils';

function fontStack(font: string) { if (font === 'serif') return 'Georgia, "Times New Roman", serif'; if (font === 'mono') return 'ui-monospace, SFMono-Regular, Menlo, monospace'; return 'Inter, system-ui, sans-serif'; }
function setMeta(name: string, content: string) { let e = document.head.querySelector('meta[name="' + name + '"]') as HTMLMetaElement | null; if (!e) { e = document.createElement('meta'); e.name = name; document.head.appendChild(e); } e.content = content; }
function setProp(name: string, content: string) { let e = document.head.querySelector('meta[property="' + name + '"]') as HTMLMetaElement | null; if (!e) { e = document.createElement('meta'); e.setAttribute('property', name); document.head.appendChild(e); } e.content = content; }
function Content({ value }: { value: string }) { const parts = value.split(/(https?:\/\/[^\s]+)/g); return <>{parts.map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{part}</a> : part)}</>; }

export function PublicBlogPostPage({ slug, postSlug }: { slug: string; postSlug: string }) {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [post, setPost] = useState<MicroblogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from('blogs').select('*').eq('slug', slug.toLowerCase()).eq('is_published', true).maybeSingle().then(async ({ data }) => {
      if (!alive) return;
      if (!data) { setNotFound(true); setLoading(false); return; }
      const b = data as Blog;
      const [pRes, mRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', b.user_id).maybeSingle(),
        supabase.from('microblog_posts').select('*').eq('blog_id', b.id).eq('slug', postSlug.toLowerCase()).eq('status', 'published').maybeSingle(),
      ]);
      if (!alive) return;
      if (!mRes.data) { setNotFound(true); setLoading(false); return; }
      const p = mRes.data as MicroblogPost;
      const prof = pRes.data as Profile | null;
      setBlog(b); setProfile(prof); setPost(p);

      const title = p.seo_title || p.title || b.name;
      const description = p.seo_description || p.excerpt || p.content.slice(0, 155);
      const image = p.image_url || b.seo_image_url || b.cover_url || b.avatar_url;
      const canonical = window.location.origin + '/' + b.slug + '/' + p.slug;
      document.title = title + ' — ' + b.name;
      setMeta('description', description); setMeta('robots', 'index,follow');
      setProp('og:title', title); setProp('og:description', description); setProp('og:type', 'article'); setProp('og:url', canonical);
      if (image) setProp('og:image', image);
      setMeta('twitter:card', 'summary_large_image');
      let c = document.head.querySelector('link[data-risegoat-canonical]') as HTMLLinkElement | null;
      if (!c) { c = document.createElement('link'); c.rel = 'canonical'; c.dataset.risegoatCanonical = 'true'; document.head.appendChild(c); }
      c.href = canonical;
      document.getElementById('risegoat-blog-post-schema')?.remove();
      const s = document.createElement('script'); s.id = 'risegoat-blog-post-schema'; s.type = 'application/ld+json';
      s.textContent = JSON.stringify({ '@context':'https://schema.org','@type':'Article',headline:title,description,image:image||undefined,datePublished:p.published_at||p.created_at,dateModified:p.updated_at||p.created_at,author:{'@type':'Person',name:prof?.display_name||prof?.username||b.name},mainEntityOfPage:canonical });
      document.head.appendChild(s);
      setLoading(false);
    }).catch(() => { if (alive) { setNotFound(true); setLoading(false); } });
    return () => { alive = false; };
  }, [slug, postSlug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-7 h-7 text-white/50 animate-spin" /></div>;
  if (notFound || !blog || !post) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white"><Sparkles className="w-8 h-8 text-white/30 mb-3" /><h1 className="text-xl font-bold">Publicação não encontrada</h1></div>;

  const bg = blog.theme_color || '#0f172a';
  const accent = blog.accent_color || '#06b6d4';
  const links = (Array.isArray(post.links) ? post.links : []) as PostLink[];

  return <div className="min-h-screen text-white" style={{ backgroundColor: bg, fontFamily: fontStack(blog.theme_font) }}>
    {blog.cover_url && <div className="h-40 sm:h-56 overflow-hidden"><img src={blog.cover_url} alt="" className="w-full h-full object-cover" fetchPriority="high" /></div>}
    <main className={(blog.content_width === 'narrow' ? 'max-w-2xl' : blog.content_width === 'wide' ? 'max-w-5xl' : 'max-w-3xl') + ' mx-auto px-4 pb-16 ' + (blog.cover_url ? '-mt-10' : 'pt-10')}>
      <div className="flex items-center justify-between mb-6"><a href={'/' + blog.slug} className="inline-flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white"><ArrowLeft className="w-4 h-4" />Voltar para o blog</a>{post.is_pinned && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold" style={{ color: accent }}><Pin className="w-3.5 h-3.5" />Fixado</span>}</div>
      <article className="rounded-2xl border p-5 sm:p-9" style={{ backgroundColor:'rgba(255,255,255,.04)', borderColor:'rgba(255,255,255,.10)' }}>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/35 mb-4"><span>{timeAgo(post.published_at || post.created_at)}</span>{profile && blog.show_author && <><span>·</span><a href={'/@' + profile.username} className="hover:text-white/70">{profile.display_name || profile.username}</a></>}</div>
        {post.title && <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight">{post.title}</h1>}
        {post.image_url && <img src={post.image_url} alt={post.title || blog.name} className="w-full max-h-[520px] object-cover rounded-xl mt-6" fetchPriority="high" />}
        <div className="mt-7 text-base sm:text-lg leading-8 whitespace-pre-wrap text-white/85"><Content value={post.content} /></div>
        {links.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold hover:bg-white/10" style={{ borderColor: accent + '55' }}>{l.label}<ExternalLink className="w-3.5 h-3.5" /></a>)}</div>}
        {post.button_text && post.button_url && <a href={post.button_url} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: accent }}>{post.button_text}</a>}
      </article>
      <div className="flex items-center justify-center gap-2 pt-8 text-xs text-white/30"><UserRound className="w-4 h-4" />{profile ? <a href={'/@' + profile.username} className="hover:text-white/60">{profile.display_name || profile.username}</a> : blog.name}</div>
    </main>
  </div>;
}
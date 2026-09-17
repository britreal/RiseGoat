import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import type { Profile, MicroblogPost } from '@/types';
import { timeAgo } from '@/lib/utils';

function fontStack(font: string): string {
  if (font === 'serif') return 'Georgia, "Times New Roman", serif';
  if (font === 'mono') return 'ui-monospace, "SF Mono", Menlo, monospace';
  return 'Inter, system-ui, sans-serif';
}

export function PublicMicroblogPage({ username, postId }: { username: string; postId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [post, setPost] = useState<MicroblogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from('profiles').select('*').eq('username', username.toLowerCase()).maybeSingle().then(async ({ data: profileData }) => {
      if (!alive) return;
      if (!profileData) { setNotFound(true); setLoading(false); return; }
      const p = profileData as Profile;
      const { data: postData } = await supabase.from('microblog_posts').select('*').eq('id', postId).eq('user_id', p.id).maybeSingle();
      if (!alive) return;
      if (!postData) { setNotFound(true); setLoading(false); return; }
      setProfile(p);
      setPost(postData as MicroblogPost);

      const seoTitle = postData.seo_title || postData.title || p.display_name || p.username;
      const seoDescription = postData.seo_description || postData.content.slice(0, 155);
      const seoImage = postData.image_url || p.seo_image_url || p.cover_url || p.avatar_url;
      document.title = seoTitle + ' — ' + (p.display_name || p.username);
      let description = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!description) {
        description = document.createElement('meta');
        description.name = 'description';
        document.head.appendChild(description);
      }
      description.content = seoDescription;
      let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'index,follow';
      let ogTitle = document.head.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.content = seoTitle;
      let ogDescription = document.head.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
      }
      ogDescription.content = seoDescription;
      if (seoImage) {
        let ogImage = document.head.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.content = seoImage;
      }
      const canonical = window.location.origin + window.location.pathname + '#/u/' + encodeURIComponent(p.username) + '/microblog/' + encodeURIComponent(postData.id);
      let canonicalTag = document.head.querySelector('link[data-risegoat-canonical]') as HTMLLinkElement | null;
      if (!canonicalTag) {
        canonicalTag = document.createElement('link');
        canonicalTag.rel = 'canonical';
        canonicalTag.setAttribute('data-risegoat-canonical', 'true');
        document.head.appendChild(canonicalTag);
      }
      canonicalTag.href = canonical;
      document.getElementById('risegoat-article-schema')?.remove();
      const schema = document.createElement('script');
      schema.id = 'risegoat-article-schema';
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: postData.title || seoTitle,
        description: seoDescription,
        image: seoImage || undefined,
        datePublished: postData.created_at,
        author: { '@type': 'Person', name: p.display_name || p.username, identifier: p.username },
        mainEntityOfPage: canonical,
      });
      document.head.appendChild(schema);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [username, postId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 text-white/50 animate-spin" /></div>;
  if (notFound || !profile || !post) return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center px-4"><Sparkles className="w-8 h-8 text-white/40 mb-3" /><h1 className="text-xl font-bold text-white">Artigo não encontrado</h1></div>;

  const themeColor = profile.theme_color || '#0f172a';
  const accentColor = profile.accent_color || '#06b6d4';

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeColor, fontFamily: fontStack(profile.theme_font || 'inter') }}>
      {profile.cover_url && <div className="h-40 sm:h-56 w-full overflow-hidden"><img src={profile.cover_url} alt="" className="w-full h-full object-cover" /></div>}
      <main className={`max-w-2xl mx-auto px-4 pb-16 ${profile.cover_url ? '-mt-10 sm:-mt-12' : 'pt-10'}`}>
        <header className="text-center mb-8">
          {profile.cover_url && <div className="mb-4"><img src={profile.avatar_url} alt={profile.display_name} className="w-20 h-20 rounded-full object-cover border-4 mx-auto shadow-xl" style={{ borderColor: themeColor }} /></div>}
          {!profile.cover_url && profile.avatar_url && <img src={profile.avatar_url} alt={profile.display_name} className="w-20 h-20 rounded-full object-cover border-4 mx-auto shadow-xl mb-4" style={{ borderColor: themeColor }} />}
          {!profile.avatar_url && <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white" style={{ backgroundColor: '#334155' }}>{(profile.display_name || profile.username).charAt(0).toUpperCase()}</div>}
          <h1 className="text-xl font-bold text-white">{profile.display_name || profile.username}</h1>
          {profile.bio && <p className="text-sm text-white/60 mt-1">{profile.bio}</p>}
        </header>

        <article className="rounded-2xl border p-5 sm:p-8" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <a href={`/u/${profile.username}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white transition"><ArrowLeft className="w-3.5 h-3.5" /> Voltar ao perfil</a>
            <span className="text-xs text-white/30">{timeAgo(post.created_at)}</span>
          </div>
          {post.title && <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-5">{post.title}</h2>}
          {post.image_url && <img src={post.image_url} alt={post.title || ''} className="w-full max-h-[520px] object-cover rounded-xl mb-6" />}
          <div className="text-[15px] sm:text-base text-white/90 whitespace-pre-wrap leading-8">{post.content}</div>
          {post.button_text && post.button_url && <div className="pt-7 mt-7 border-t border-white/10"><a href={post.button_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: accentColor }}>{post.button_text}</a></div>}
        </article>

        <div className="text-center mt-8"><a href={`#/u/${profile.username}`} className="text-xs text-white/30 hover:text-white/50 transition"><Sparkles className="w-3 h-3 inline mr-1" />{profile.display_name || profile.username}</a></div>
      </main>
    </div>
  );
}

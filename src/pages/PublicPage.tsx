import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2, Gift, Check, Youtube, GraduationCap, ShieldAlert, X, BookOpen } from 'lucide-react';
import type { Profile, Link, MicroblogPost } from '@/types';
import { timeAgo } from '@/lib/utils';

const ICON_MAP: Record<string, string> = {
  instagram: 'Instagram',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  youtube: 'YouTube',
  twitter: 'Twitter',
  github: 'GitHub',
  globe: 'Website',
  mail: 'Email',
  phone: 'Phone',
  music: 'Music',
  mic: 'Mic',
  headphones: 'Headphones',
  camera: 'Camera',
  'shopping-bag': 'Shop',
  calendar: 'Calendar',
  'map-pin': 'Location',
  star: 'Star',
  heart: 'Heart',
  link: 'Link',
};

function fontStack(font: string): string {
  switch (font) {
    case 'serif': return 'Georgia, "Times New Roman", serif';
    case 'mono': return 'ui-monospace, "SF Mono", Menlo, monospace';
    default: return 'Inter, system-ui, sans-serif';
  }
}

function linkRadius(style: string): string {
  if (style === 'pill') return '9999px';
  if (style === 'square') return '0px';
  return '16px';
}

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

function getAttribution(profileId: string) {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
  const params = new URLSearchParams(window.location.search);
  const current = Object.fromEntries(keys.map((key) => [key, params.get(key) || '']));
  const key = 'risegoat_attribution_' + profileId;
  if (keys.some((field) => current[field])) {
    sessionStorage.setItem(key, JSON.stringify(current));
    return current;
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) || '{}');
    return Object.fromEntries(keys.map((field) => [field, String(stored?.[field] || '')]));
  } catch (error) {
    void error;
    return current;
  }
}

function setMeta(name: string, content: string) {
  let tag = document.head.querySelector('meta[name="' + name + '"]') as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setPropertyMeta(property: string, content: string) {
  let tag = document.head.querySelector('meta[property="' + property + '"]') as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export function PublicPage({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [posts, setPosts] = useState<MicroblogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [ageGateLink, setAgeGateLink] = useState<Link | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const p = data as Profile;
        setProfile(p);

        const seoTitle = p.seo_title || p.display_name || p.username;
        const seoDescription = p.seo_description || p.bio || ('Página de ' + (p.display_name || p.username));
        const seoImage = p.seo_image_url || p.cover_url || p.avatar_url;
        document.title = seoTitle + ' — RiseGoat';
        setMeta('description', seoDescription);
        setMeta('robots', 'index,follow');
        setPropertyMeta('og:title', seoTitle);
        setPropertyMeta('og:description', seoDescription);
        setPropertyMeta('og:type', 'profile');
        if (seoImage) setPropertyMeta('og:image', seoImage);
        const canonical = window.location.origin + '/@' + encodeURIComponent(p.username);
        setPropertyMeta('og:url', canonical);
        setMeta('twitter:card', 'summary_large_image');
        let canonicalTag = document.head.querySelector('link[data-risegoat-canonical]') as HTMLLinkElement | null;
        if (!canonicalTag) {
          canonicalTag = document.createElement('link');
          canonicalTag.rel = 'canonical';
          canonicalTag.setAttribute('data-risegoat-canonical', 'true');
          document.head.appendChild(canonicalTag);
        }
        canonicalTag.href = canonical;

        const schemaId = 'risegoat-profile-schema';
        document.getElementById(schemaId)?.remove();
        const schema = document.createElement('script');
        schema.id = schemaId;
        schema.type = 'application/ld+json';
        schema.textContent = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          name: seoTitle,
          description: seoDescription,
          url: canonical,
          mainEntity: {
            '@type': 'Person',
            name: p.display_name || p.username,
            identifier: p.username,
            description: p.bio || undefined,
            image: seoImage || undefined,
          },
        });
        document.head.appendChild(schema);

        const attribution = getAttribution(p.id);
        supabase.from('page_visits').insert({
          user_id: p.id,
          visitor_referrer: document.referrer || '',
          page_url: window.location.href,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          utm_term: attribution.utm_term,
        }).then();

        Promise.all([
          supabase.from('links').select('*').eq('user_id', p.id).eq('is_active', true).order('sort_order'),
          supabase.from('microblog_posts').select('*').eq('user_id', p.id).eq('status', 'published').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20),
        ]).then(([l, m]) => {
          setLinks((l.data as Link[]) ?? []);
          setPosts((m.data as MicroblogPost[]) ?? []);
          setLoading(false);
        });
      });
  }, [username]);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !email.trim()) return;
    if (!consent) {
      setSubscribeError('Marque o consentimento para entrar na lista.');
      return;
    }
    setSubmitting(true);
    setSubscribeError('');
    const attribution = getAttribution(profile.id);
    const { error } = await supabase.from('newsletter_leads').insert({
      user_id: profile.id,
      name: name.trim(),
      email: email.trim(),
      source: 'public_page',
      marketing_consent: true,
      consented_at: new Date().toISOString(),
      unsubscribed_at: null,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      landing_page: window.location.href,
      first_referrer: document.referrer || '',
    });
    setSubmitting(false);
    if (error) {
      setSubscribeError(error.message);
      return;
    }
    setSubmitted(true);
    setName('');
    setEmail('');
    setConsent(false);
  }

  function openLink(link: Link, event?: React.MouseEvent<HTMLAnchorElement>) {
    if (link.sensitive) {
      event?.preventDefault();
      setAgeGateLink(link);
      return;
    }
    trackClick(link);
  }

  async function trackClick(link: Link) {
    const attribution = profile ? getAttribution(profile.id) : {
      utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '',
    };
    await supabase.from('link_clicks').insert({
      link_id: link.id,
      user_id: link.user_id,
      page_url: window.location.href,
      referrer: document.referrer || '',
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
    });
    await supabase.from('links').update({ clicks: link.clicks + 1 }).eq('id', link.id);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Página não encontrada</h1>
        <p className="text-sm text-slate-400">O usuário @{username} não existe no risegoat.</p>
      </div>
    );
  }

  const themeColor = profile?.theme_color || '#0f172a';
  const accentColor = profile?.accent_color || '#06b6d4';
  const themeFont = profile?.theme_font || 'inter';
  const linkStyle = profile?.link_style || 'rounded';
  const fontFamily = fontStack(themeFont);
  const radius = linkRadius(linkStyle);

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeColor, fontFamily }}>
      {profile?.cover_url && (
        <div className="h-40 sm:h-56 w-full overflow-hidden">
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="max-w-md mx-auto px-4 pb-12">
        {/* Avatar + Name */}
        <div className={`text-center ${profile?.cover_url ? '-mt-16' : 'pt-16'}`}>
          <div className="inline-block">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-24 h-24 rounded-full object-cover border-4 shadow-xl"
                style={{ borderColor: themeColor }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white border-4 shadow-xl"
                style={{ backgroundColor: '#334155', borderColor: themeColor }}
              >
                {(profile?.display_name || profile?.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">{profile?.display_name || profile?.username}</h1>
          {profile?.bio && (
            <p className="text-sm text-white/60 mt-1 px-4">{profile.bio}</p>
          )}
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div className="mt-8 space-y-3">
            {links.map((link) => {
              const videoId = link.link_type === 'youtube' ? youtubeId(link.url) : null;
              const isAffiliate = link.link_type === 'affiliate';
              const isCourse = link.link_type === 'course';
              const isBlog = link.link_type === 'blog';

              if (videoId) {
                return (
                  <div key={link.id} className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: accentColor + '25' }}>
                    <div className="px-5 py-3 flex items-center gap-2 text-white">
                      <Youtube className="w-5 h-5" style={{ color: accentColor }} />
                      <span className="text-sm font-semibold flex-1">{link.label}</span>
                      {link.sensitive && <ShieldAlert className="w-4 h-4 text-white/40" />}
                    </div>
                    {link.sensitive ? (
                      <button onClick={() => setAgeGateLink(link)} className="relative w-full aspect-video bg-black/60 flex items-center justify-center text-center px-6">
                        <div>
                          <ShieldAlert className="w-8 h-8 text-white/70 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-white">Conteúdo 18+</p>
                          <p className="text-xs text-white/50 mt-1">Clique para confirmar a idade</p>
                        </div>
                      </button>
                    ) : (
                      <iframe
                        title={link.label}
                        src={'https://www.youtube.com/embed/' + videoId}
                        className="w-full aspect-video"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    )}
                    {link.description && <p className="px-5 py-3 text-xs text-white/60">{link.description}</p>}
                  </div>
                );
              }

              if (isAffiliate) {
                return (
                  <div key={link.id} className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: accentColor + '25' }}>
                    {link.thumbnail_url && <img src={link.thumbnail_url} alt={link.label} className="w-full aspect-[2/1] object-cover" loading="lazy" />}
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-white">{link.label}</h3>
                          {link.description && <p className="text-sm text-white/60 mt-1 leading-relaxed">{link.description}</p>}
                          {link.product_price && <p className="text-lg font-bold text-white mt-3">{link.product_price}</p>}
                        </div>
                        {link.sensitive && <ShieldAlert className="w-4 h-4 text-white/40 shrink-0" />}
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={(e) => openLink(link, e)} className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:opacity-90 transition">
                        Ver produto →
                      </a>
                    </div>
                  </div>
                );
              }

              return (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" onClick={(e) => openLink(link, e)}
                  className="flex items-center gap-3 px-5 py-3.5 backdrop-blur-sm border text-white transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  style={{ backgroundColor: accentColor + '15', borderColor: accentColor + '30', borderRadius: radius }}>
                  <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor + '20', borderRadius: radius === '9999px' ? '9999px' : '10px' }}>
                    {isCourse ? <GraduationCap className="w-4 h-4 text-white/80" /> : isBlog ? <BookOpen className="w-4 h-4 text-white/80" /> : <span className="text-xs font-bold text-white/80 uppercase">{(ICON_MAP[link.icon] || link.label).slice(0, 2)}</span>}
                  </div>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{link.label}</span>
                    {isCourse && link.description && <span className="block text-xs text-white/50 truncate mt-0.5">{link.description}</span>}
                  </span>
                  {link.sensitive && <ShieldAlert className="w-4 h-4 text-white/40 shrink-0" />}
                  <svg className="w-4 h-4 text-white/40 group-hover:text-white/70 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              );
            })}
          </div>
        )}
        {/* Divider */}
        {links.length > 0 && posts.length > 0 && (
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Publicações</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}

        {/* Microblog */}
        {posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => {
              const isLong = post.content.length > 280;
              return (
                <div key={post.id} className="px-5 py-4 backdrop-blur-sm border rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {post.title && <h3 className="text-base font-semibold text-white mb-2">{post.title}</h3>}
                  {post.image_url && <img src={post.image_url} alt={post.title || ''} className="w-full rounded-xl mb-3 max-h-64 object-cover" />}
                  <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{isLong ? post.content.slice(0, 280) + '...' : post.content}</p>
                  {isLong && (() => {
                    const linkedBlog = links.find((link) => link.link_type === 'blog' && link.blog_id === post.blog_id && link.is_active);
                    return linkedBlog ? <a href={linkedBlog.url + '/' + post.slug} className="inline-flex items-center text-xs font-medium mt-2 transition" style={{ color: accentColor }}>Ler artigo completo →</a> : null;
                  })()}
                  <p className="text-xs text-white/30 mt-2">{timeAgo(post.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-8">
          <div className="flex-1 h-px bg-white/10" />
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Newsletter */}
        <div className="px-5 py-6 backdrop-blur-sm border rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5" style={{ color: accentColor }} />
            <h2 className="text-base font-semibold text-white">Entre na minha lista</h2>
          </div>
          <p className="text-xs text-white/50 mb-4">Receba novidades e atualizações direto no seu email</p>

          {submitted ? (
            <div className="flex items-center gap-2 py-3 text-green-400">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Inscrição confirmada! Obrigado.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30 transition"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu email"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/30 transition"
              />
              <label className="flex items-start gap-2 text-[11px] text-white/50 leading-relaxed cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-cyan-400" />
                <span>Concordo em receber emails desta página e posso cancelar minha inscrição depois.</span>
              </label>
              {subscribeError && <p className="text-xs text-red-300">{subscribeError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 font-semibold rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                style={{ backgroundColor: accentColor, borderRadius: radius === '9999px' ? '9999px' : '12px' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Quero receber'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <a
            href="#/auth"
            className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 transition"
          >
            <Sparkles className="w-3 h-3" />
            Powered by risegoat
          </a>
        </div>
      </div>

      {ageGateLink && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5 text-slate-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Conteúdo sensível</h2>
            <p className="text-sm text-slate-500 mt-2">Este link foi marcado como conteúdo para maiores de 18 anos. Confirme sua idade para continuar.</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setAgeGateLink(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"><X className="w-4 h-4 inline mr-1" />Voltar</button>
              <a href={ageGateLink.url} target="_blank" rel="noopener noreferrer" onClick={() => { trackClick(ageGateLink); setAgeGateLink(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium text-center">Tenho 18+</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2, Gift, Check } from 'lucide-react';
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

        // Apply SEO meta if available
        // (set document title for SEO)
        if (p.display_name) {
          document.title = `${p.display_name} — risegoat`;
        }

        supabase.from('page_visits').insert({
          user_id: p.id,
          visitor_referrer: document.referrer || '',
        }).then();

        Promise.all([
          supabase.from('links').select('*').eq('user_id', p.id).eq('is_active', true).order('sort_order'),
          supabase.from('microblog_posts').select('*').eq('user_id', p.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20),
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
    setSubmitting(true);
    await supabase.from('newsletter_leads').insert({
      user_id: profile.id,
      name: name.trim(),
      email: email.trim(),
      source: 'public_page',
    });
    setSubmitting(false);
    setSubmitted(true);
    setName('');
    setEmail('');
  }

  async function trackClick(link: Link) {
    await supabase.from('link_clicks').insert({
      link_id: link.id,
      user_id: link.user_id,
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
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick(link)}
                className="flex items-center gap-3 px-5 py-3.5 backdrop-blur-sm border text-white transition-all hover:scale-[1.02] active:scale-[0.98] group"
                style={{
                  backgroundColor: accentColor + '15',
                  borderColor: accentColor + '30',
                  borderRadius: radius,
                }}
              >
                <div
                  className="w-9 h-9 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: accentColor + '20', borderRadius: radius === '9999px' ? '9999px' : '10px' }}
                >
                  <span className="text-xs font-bold text-white/80 uppercase">
                    {(ICON_MAP[link.icon] || link.label).slice(0, 2)}
                  </span>
                </div>
                <span className="flex-1 text-sm font-medium">{link.label}</span>
                <svg className="w-4 h-4 text-white/40 group-hover:text-white/70 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            ))}
          </div>
        )}

        {/* Divider */}
        {links.length > 0 && posts.length > 0 && (
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Microblog</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}

        {/* Microblog */}
        {posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => {
              const isLong = post.content.length > 280;

              return (
                <div
                  key={post.id}
                  className="px-5 py-4 backdrop-blur-sm border rounded-2xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  {post.is_pinned && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: accentColor }}>
                      Fixado
                    </span>
                  )}
                  {post.title && (
                    <h3 className="text-base font-semibold text-white mb-2">{post.title}</h3>
                  )}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title || ''}
                      className="w-full rounded-xl mb-3 max-h-64 object-cover"
                    />
                  )}
                  <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                    {isLong ? post.content.slice(0, 280) + '...' : post.content}
                  </p>
                  {isLong && (
                    <a
                      href={`#/u/${profile?.username}/microblog/${post.id}`}
                      className="inline-flex items-center text-xs font-medium mt-2 transition"
                      style={{ color: accentColor }}
                    >
                      Ler artigo completo →
                    </a>
                  )}
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
    </div>
  );
}

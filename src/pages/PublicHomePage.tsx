import { useEffect, useState } from 'react';
import { ArrowRight, Mail, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Blog, MicroblogPost } from '@/types';

function setMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export function PublicHomePage() {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [posts, setPosts] = useState<MicroblogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: blogData } = await supabase
        .from('blogs')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (!blogData) {
        setLoading(false);
        return;
      }

      const currentBlog = blogData as Blog;
      const { data: postData } = await supabase
        .from('microblog_posts')
        .select('*')
        .eq('blog_id', currentBlog.id)
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (!alive) return;
      setBlog(currentBlog);
      setPosts((postData as MicroblogPost[]) || []);

      document.title = currentBlog.seo_title || currentBlog.name || 'RiseGoat';
      setMeta('description', currentBlog.seo_description || currentBlog.description || 'Blog pessoal.');
      setMeta('robots', 'index,follow');
      setLoading(false);
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  async function subscribe() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!blog || !normalizedEmail) return;

    setSubmitting(true);
    setSubscribeError('');

    const { error } = await supabase.from('newsletter_leads').insert({
      user_id: blog.user_id,
      name: name.trim(),
      email: normalizedEmail,
      source: 'site_home',
      marketing_consent: true,
      consented_at: new Date().toISOString(),
      landing_page: window.location.pathname,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setSubscribed(true);
        return;
      }
      setSubscribeError('Não foi possível assinar agora. Tente novamente.');
      return;
    }

    setEmail('');
    setName('');
    setSubscribed(true);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#f6f2ea] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (!blog) {
    return <div className="min-h-screen bg-[#f6f2ea] px-6 flex items-center justify-center text-center"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">RiseGoat</p><h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">O blog ainda não foi publicado.</h1><p className="mt-3 text-slate-500">Entre na área privada para configurar seu site.</p><a href="#/auth" className="inline-flex mt-6 px-5 py-3 rounded-full bg-slate-950 text-white text-sm font-semibold">Entrar</a></div></div>;
  }

  const accent = blog.accent_color || '#b45309';

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f6f2ea]/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <a href="/" className="text-base font-black tracking-[-0.03em]">{blog.name}</a>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-500">
            <a href="#latest" className="hover:text-slate-900">Textos</a>
            <a href="#newsletter" className="hover:text-slate-900">Newsletter</a>
          </nav>
          <a href="#/auth" className="text-xs font-semibold text-slate-400 hover:text-slate-900">Entrar</a>
        </div>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 pb-16">
          <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-12 items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 mb-6">Blog pessoal</p>
              <h1 className="text-5xl sm:text-7xl font-black tracking-[-0.055em] leading-[0.95] max-w-3xl">
                {blog.name}
              </h1>
              <p className="mt-7 text-lg sm:text-xl leading-8 text-slate-600 max-w-2xl">
                {blog.description || 'Ideias, estudos, aprendizados e coisas que estou tentando entender melhor.'}
              </p>
              <a href="#latest" className="inline-flex items-center gap-2 mt-8 text-sm font-bold" style={{ color: accent }}>
                Ler os textos <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <div className="lg:justify-self-end">
              {blog.cover_url ? (
                <img src={blog.cover_url} alt="" className="w-full lg:w-80 aspect-[4/5] object-cover rounded-[2rem] shadow-xl shadow-black/10" />
              ) : blog.avatar_url ? (
                <img src={blog.avatar_url} alt="" className="w-48 h-48 object-cover rounded-full ml-auto ring-8 ring-black/5" />
              ) : (
                <div className="w-48 h-48 ml-auto rounded-full bg-slate-950 text-white flex items-center justify-center text-6xl font-black">
                  {blog.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="latest" className="max-w-5xl mx-auto px-5 sm:px-8 py-16 border-t border-black/5">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Arquivo recente</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">Últimos textos</h2>
            </div>
            <span className="hidden sm:inline text-xs text-slate-400">{posts.length} publicações</span>
          </div>

          {posts.length === 0 ? (
            <div className="py-16 border-y border-black/5 text-slate-400">Ainda não há publicações.</div>
          ) : (
            <div className="grid gap-0 border-y border-black/5">
              {posts.map((post, index) => (
                <a
                  key={post.id}
                  href={`/blog/${encodeURIComponent(blog.slug)}/${encodeURIComponent(post.slug)}`}
                  className="group grid sm:grid-cols-[100px_1fr_auto] gap-4 sm:gap-8 py-7 border-b last:border-b-0 border-black/5 items-start"
                >
                  <span className="text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : 'Rascunho'}
                      {post.is_pinned && <span style={{ color: accent }}>• fixado</span>}
                    </div>
                    <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight group-hover:underline underline-offset-4">
                      {post.title || post.excerpt || post.content.slice(0, 80)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 max-w-2xl">
                      {post.excerpt || post.content.slice(0, 180)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 mt-1 text-slate-300 group-hover:text-slate-700 transition" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section id="newsletter" className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
          <div className="rounded-[2rem] bg-slate-950 text-white p-7 sm:p-12">
            <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-end">
              <div>
                <Mail className="w-6 h-6 mb-5 text-white/60" />
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Newsletter</p>
                <h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight">Receba o próximo texto.</h2>
                <p className="mt-4 text-sm sm:text-base leading-7 text-white/55 max-w-xl">
                  Uma seleção do que estou pensando, estudando e escrevendo. Sem spam.
                </p>
              </div>

              {subscribed ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold">Você está dentro.</p>
                    <p className="text-sm text-white/50 mt-1">Quando houver um novo envio, ele chega no seu e-mail.</p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void subscribe();
                  }}
                  className="space-y-3"
                >
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome (opcional)" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30" />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30" />
                  <button disabled={submitting} className="w-full rounded-xl bg-white text-slate-950 px-4 py-3.5 text-sm font-bold disabled:opacity-60">
                    {submitting ? 'Inscrevendo…' : 'Assinar newsletter'}
                  </button>
                  {subscribeError && <p className="text-xs text-red-300">{subscribeError}</p>}
                  <p className="text-[11px] leading-5 text-white/35">Ao assinar, você concorda em receber meus textos por e-mail. Você pode sair quando quiser.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
        <span>© {new Date().getFullYear()} {blog.name}</span>
        <a href="#/auth" className="hover:text-slate-900">Área privada</a>
      </footer>
    </div>
  );
}

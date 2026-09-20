import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowRight, Check, Circle, Loader2, LockKeyhole, Sparkles, Users, Zap } from 'lucide-react';

export function AuthPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoginLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) setError(signInError);
    setLoginLoading(false);
  }

  async function handleWaitlist(e: FormEvent) {
    e.preventDefault();
    setWaitlistError(null);
    setWaitlistSuccess(false);
    const name = waitlistName.trim();
    const normalizedEmail = waitlistEmail.trim().toLowerCase();

    if (!name) return setWaitlistError('Digite seu nome.');
    if (!normalizedEmail) return setWaitlistError('Digite seu email.');

    setWaitlistLoading(true);
    const { error: insertError } = await supabase
      .from('waitlist_signups')
      .insert({ name, email: normalizedEmail, source: 'auth_page' });

    if (insertError) {
      setWaitlistError(insertError.code === '23505'
        ? 'Este email já está na lista. Quando abrirmos, avisaremos você.'
        : 'Não foi possível entrar na lista agora. Tente novamente.');
    } else {
      setWaitlistSuccess(true);
      setWaitlistName('');
      setWaitlistEmail('');
    }
    setWaitlistLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-52 right-[-12%] w-[520px] h-[520px] rounded-full bg-white/[0.06] blur-3xl" />
        <div className="absolute -bottom-64 left-[-10%] w-[560px] h-[560px] rounded-full bg-slate-500/[0.08] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_34%)]" />
      </div>

      <main className="relative min-h-screen max-w-6xl mx-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-10 flex items-center">
        <div className="w-full grid lg:grid-cols-[1.06fr_0.94fr] gap-10 lg:gap-16 items-center">
          <section className="py-4 lg:py-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
              <Circle className="w-2 h-2 fill-current" />
              Acesso antecipado
            </div>

            <div className="flex items-center gap-3 mt-7">
              <div className="w-10 h-10 rounded-xl bg-white text-slate-950 flex items-center justify-center shadow-lg shadow-black/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black tracking-[-0.03em] text-lg">RiseGoat</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35 font-bold">creator operating system</p>
              </div>
            </div>

            <h1 className="mt-8 max-w-xl text-4xl sm:text-5xl lg:text-[58px] leading-[0.98] font-black tracking-[-0.055em]">
              Transforme ideia, conteúdo e produto em um sistema.
            </h1>

            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-white/55">
              Um workspace para organizar o que você cria, acompanha e vende — sem espalhar sua operação por várias ferramentas.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl">
              {[
                ['Execução', 'Fluxos, metas e organização para transformar plano em ação.', Zap],
                ['Audiência', 'Conteúdo, leads e presença reunidos no mesmo lugar.', Users],
                ['Produtos', 'Ideias, ofertas e livros preparados para virar ativos.', Sparkles],
                ['Receita', 'Conecte sua operação de conteúdo à parte comercial.', ArrowRight],
              ].map(([title, description, Icon]) => (
                <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <Icon className="w-4 h-4 text-white/80" />
                  <p className="mt-3 text-sm font-bold">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">{description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35">
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Workspace único</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Focado em execução</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Cadastro em breve</span>
            </div>
          </section>

          <section className="w-full max-w-md lg:ml-auto">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.055] backdrop-blur-xl shadow-[0_30px_100px_rgba(0,0,0,0.42)] overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Área de acesso</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Entrar no RiseGoat</h2>
                    <p className="mt-1.5 text-sm text-white/45">Já possui uma conta? Continue de onde parou.</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.05] flex items-center justify-center shrink-0">
                    <LockKeyhole className="w-4 h-4 text-white/65" />
                  </div>
                </div>

                <form onSubmit={handleLogin} className="mt-7 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/65 mb-2">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" required
                      className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-black/20 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/65 mb-2">Senha</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required
                      className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-black/20 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition" />
                  </div>

                  {error && <div role="alert" className="rounded-2xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}

                  <button type="submit" disabled={loginLoading}
                    className="w-full py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 text-sm font-black transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Entrar
                  </button>
                </form>
              </div>

              <div className="border-t border-white/10 bg-black/15 p-6 sm:p-8">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.14em] text-white/55">Em breve</span>
                <h3 className="mt-3 text-lg font-black tracking-[-0.02em]">Ainda não tem acesso?</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/40">Deixe seu nome e email. Quando o cadastro abrir, você será avisado.</p>

                {waitlistSuccess ? (
                  <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-400/10 flex items-center justify-center shrink-0"><Check className="w-4 h-4 text-emerald-300" /></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-100">Você está na lista.</p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-100/50">Guardamos seu email e avisaremos quando o cadastro estiver aberto.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleWaitlist} className="mt-5 space-y-3">
                    <input type="text" value={waitlistName} onChange={(e) => setWaitlistName(e.target.value)} placeholder="Seu nome" autoComplete="name"
                      className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/[0.035] text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition" />
                    <input type="email" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} placeholder="Seu melhor email" autoComplete="email" required
                      className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/[0.035] text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition" />
                    {waitlistError && <p role="alert" className="text-xs text-red-200 px-1">{waitlistError}</p>}
                    <button type="submit" disabled={waitlistLoading}
                      className="w-full py-3.5 rounded-2xl border border-white/10 bg-white/[0.08] hover:bg-white/[0.12] text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                      {waitlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                      Entrar na lista de espera
                    </button>
                  </form>
                )}

                <div className="mt-4 flex items-center gap-2 text-[11px] text-white/25">
                  <LockKeyhole className="w-3 h-3" />
                  Seus dados ficam somente para o aviso de abertura.
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-white/20 mt-5">© {new Date().getFullYear()} RiseGoat</p>
          </section>
        </div>
      </main>
    </div>
  );
}

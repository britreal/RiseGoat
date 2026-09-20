import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Loader2 } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!username.trim() || !displayName.trim()) {
        setError('Preencha todos os campos');
        setLoading(false);
        return;
      }
      if (username.length < 3) {
        setError('Usuário deve ter pelo menos 3 caracteres');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, username, displayName);
      if (error) setError(error);
      else window.location.hash = '/dashboard';
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
      else window.location.hash = '/dashboard';
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black text-white tracking-[-0.03em]">RiseGoat</span>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[28px] p-7 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <h1 className="text-xl font-semibold text-white mb-1">
            {mode === 'signup' ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {mode === 'signup'
              ? 'Sua página de criador em minutos'
              : 'Acesse seu painel de criador'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Nome de exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: BRIT REAL"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Usuário (@)</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/30 transition">
                    <span className="pl-4 pr-1 text-slate-500 text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                      placeholder="usuario"
                      className="flex-1 py-2.5 pr-4 bg-transparent text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-slate-950 hover:bg-slate-100 text-sm font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signup' ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            {mode === 'signup' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError(null);
              }}
              className="text-white hover:text-slate-300 font-semibold transition"
            >
              {mode === 'signup' ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

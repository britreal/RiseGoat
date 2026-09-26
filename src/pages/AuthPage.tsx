import { useState, type FormEvent } from 'react';
import { Loader2, LockKeyhole, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] px-5 flex items-center justify-center">
      <div className="w-full max-w-md">
        <a href="/" className="text-xs uppercase tracking-[0.22em] text-slate-400">Voltar ao blog</a>
        <div className="mt-8 rounded-[2rem] bg-white border border-black/5 shadow-xl shadow-black/5 p-7 sm:p-9">
          <LockKeyhole className="w-6 h-6 text-slate-400" />
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mt-6">Área privada</p>
          <h1 className="text-3xl font-black tracking-tight mt-2">Entrar para escrever</h1>
          <p className="text-sm text-slate-500 mt-3 leading-6">Gerencie seus textos e sua newsletter em um só lugar.</p>

          <form onSubmit={submit} className="mt-8 space-y-3">
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 text-white px-4 py-3 text-sm font-bold disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

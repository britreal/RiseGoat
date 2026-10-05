import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) { event.preventDefault(); setError(null); setLoading(true); const result = await signIn(email.trim(), password); setLoading(false); if (result.error) setError(result.error); }

  return <div className="auth-screen"><div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" /><div className="auth-wrap">
    <a href="/" className="auth-back"><ArrowLeft size={15} /> Início</a>
    <div className="auth-card"><div className="auth-icon"><LockKeyhole size={20} /></div><p className="auth-kicker">Espaço privado</p><h1>Entre no Notas.</h1><p className="auth-copy">Suas ideias, listas e pensamentos em um espaço simples e silencioso.</p>
      <form onSubmit={submit} className="auth-form">
        <label><span>E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></label>
        <label><span>Senha</span><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={loading} className="auth-submit">{loading ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}{loading ? 'Entrando…' : 'Continuar'}</button>
      </form>
      <p className="auth-note">Acesso protegido por autenticação segura.</p>
    </div></div></div>;
}
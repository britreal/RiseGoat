import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'waitlist' | 'forgot' | 'reset';

export function AuthPage() {
  const { signIn, signUp, resetPassword, updatePassword, recoveryMode } = useAuth();
  const initialMode: Mode = new URLSearchParams(window.location.search).get('mode') === 'waitlist' ? 'waitlist' : recoveryMode ? 'reset' : 'signin';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState(new URLSearchParams(window.location.search).get('ref') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recoveryMode) setMode('reset');
  }, [recoveryMode]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmation('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    let result: { error: string | null } = { error: null };

    if (mode === 'signin') {
      result = await signIn(email.trim(), password);
    } else if (mode === 'waitlist') {
      const { error: requestError } = await supabase.rpc('request_membership', {
        p_name: name.trim(),
        p_email: email.trim(),
        p_referral_code: referralCode.trim() || null,
      });
      result = { error: requestError?.message ?? null };
      if (!result.error) setMessage('Solicitação recebida. A entrada é analisada manualmente; se aprovada, você receberá um link seguro por e-mail.');
    } else if (mode === 'forgot') {
      result = await resetPassword(email.trim());
      if (!result.error) setMessage('Enviamos um link para redefinir sua senha. Confira seu e-mail.');
    } else {
      if (password.length < 6) result.error = 'Use uma senha com pelo menos 6 caracteres.';
      else if (password !== confirmation) result.error = 'As senhas não coincidem.';
      else result = await updatePassword(password);
      if (!result.error) {
        setMessage('Senha atualizada. Você já pode continuar.');
        setMode('signin');
        setPassword('');
        setConfirmation('');
      }
    }

    setLoading(false);
    if (result.error) setError(result.error);
  }

  const title = mode === 'signin' ? 'Entre na RiseGoat.' : mode === 'waitlist' ? 'Solicite um convite.' : mode === 'forgot' ? 'Recupere seu acesso.' : 'Crie uma nova senha.';
  const copy = mode === 'signin'
    ? 'Suas notas, relações e contextos em um espaço privado.'
    : mode === 'waitlist'
      ? 'A RiseGoat funciona por convite. Cada solicitação passa por curadoria manual e só recebe acesso quando aprovada.'
      : mode === 'forgot'
        ? 'Digite seu e-mail e enviaremos um link seguro para voltar ao seu espaço.'
        : 'Escolha uma nova senha para proteger sua conta.';

  return (
    <div className="auth-screen">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-wrap">
        <a href="/" className="auth-back"><ArrowLeft size={15} /> Início</a>
        <div className="auth-card">
          <div className="auth-icon">{mode === 'waitlist' ? <UserPlus size={20} /> : mode === 'forgot' ? <Mail size={20} /> : mode === 'reset' ? <KeyRound size={20} /> : <LockKeyhole size={20} />}</div>
          <p className="auth-kicker">RiseGoat · Rede privada</p>
          <h1>{title}</h1>
          <p className="auth-copy">{copy}</p>

          <form onSubmit={submit} className="auth-form">
            {(mode === 'signin' || mode === 'waitlist' || mode === 'forgot') && (
              <label><span>E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></label>
            )}
            {mode === 'waitlist' && <label><span>Nome</span><input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></label>}
            {mode === 'waitlist' && <label><span>Código de indicação (opcional)</span><input maxLength={32} autoCapitalize="characters" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="RG-XXXXXXXXXX" /></label>}

            {(mode === 'signin' || mode === 'reset') && (
              <label><span>{mode === 'reset' ? 'Nova senha' : 'Senha'}</span><div className="auth-password"><input required type={showPassword ? 'text' : 'password'} autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            )}

            {mode === 'reset' && (
              <label><span>Confirmar senha</span><input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Repita a senha" /></label>
            )}

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-success"><CheckCircle2 size={15} /> {message}</p>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
              {loading ? 'Processando…' : mode === 'signin' ? 'Entrar' : mode === 'waitlist' ? 'Solicitar acesso' : mode === 'forgot' ? 'Enviar link' : 'Atualizar senha'}
            </button>
          </form>

          <div className="auth-links">
            {mode === 'signin' && <><button type="button" onClick={() => switchMode('forgot')}>Esqueci minha senha</button><span>·</span><button type="button" onClick={() => switchMode('waitlist')}>Solicitar convite</button></>}
            {(mode === 'waitlist' || mode === 'forgot') && <button type="button" onClick={() => switchMode('signin')}>Já tenho acesso</button>}
            {mode === 'reset' && <button type="button" onClick={() => switchMode('signin')}>Voltar para entrar</button>}
          </div>

          <p className="auth-note">Acesso protegido pelo Supabase Auth.</p>
        </div>
      </div>
    </div>
  );
}

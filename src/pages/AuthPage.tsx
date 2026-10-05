import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

export function AuthPage() {
  const { signIn, signUp, resetPassword, updatePassword, recoveryMode } = useAuth();
  const [mode, setMode] = useState<Mode>(recoveryMode ? 'reset' : 'signin');
  const [email, setEmail] = useState('');
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
    } else if (mode === 'signup') {
      if (password.length < 6) result.error = 'Use uma senha com pelo menos 6 caracteres.';
      else if (password !== confirmation) result.error = 'As senhas não coincidem.';
      else {
        const signup = await signUp(email.trim(), password);
        result = signup;
        if (!signup.error) {
          setMessage(signup.needsConfirmation ? 'Conta criada. Confira seu e-mail para confirmar o acesso.' : 'Conta criada. Abrindo seu espaço…');
          setMode('signin');
          setPassword('');
          setConfirmation('');
        }
      }
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

  const title = mode === 'signin' ? 'Entre no Notas.' : mode === 'signup' ? 'Crie seu espaço.' : mode === 'forgot' ? 'Recupere seu acesso.' : 'Crie uma nova senha.';
  const copy = mode === 'signin'
    ? 'Suas ideias, listas e pensamentos em um espaço simples e silencioso.'
    : mode === 'signup'
      ? 'Comece a guardar o que importa, sem complicação.'
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
          <div className="auth-icon">{mode === 'signup' ? <UserPlus size={20} /> : mode === 'forgot' ? <Mail size={20} /> : mode === 'reset' ? <KeyRound size={20} /> : <LockKeyhole size={20} />}</div>
          <p className="auth-kicker">Notas</p>
          <h1>{title}</h1>
          <p className="auth-copy">{copy}</p>

          <form onSubmit={submit} className="auth-form">
            {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
              <label><span>E-mail</span><input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></label>
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
              <label><span>{mode === 'reset' ? 'Nova senha' : 'Senha'}</span><div className="auth-password"><input required type={showPassword ? 'text' : 'password'} autoComplete={mode === 'reset' ? 'new-password' : mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <label><span>Confirmar senha</span><input required type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Repita a senha" /></label>
            )}

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-success"><CheckCircle2 size={15} /> {message}</p>}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
              {loading ? 'Processando…' : mode === 'signin' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : mode === 'forgot' ? 'Enviar link' : 'Atualizar senha'}
            </button>
          </form>

          <div className="auth-links">
            {mode === 'signin' && <><button type="button" onClick={() => switchMode('forgot')}>Esqueci minha senha</button><span>·</span><button type="button" onClick={() => switchMode('signup')}>Criar conta</button></>}
            {(mode === 'signup' || mode === 'forgot') && <button type="button" onClick={() => switchMode('signin')}>Já tenho uma conta</button>}
            {mode === 'reset' && <button type="button" onClick={() => switchMode('signin')}>Voltar para entrar</button>}
          </div>

          <p className="auth-note">Acesso protegido pelo Supabase Auth.</p>
        </div>
      </div>
    </div>
  );
}

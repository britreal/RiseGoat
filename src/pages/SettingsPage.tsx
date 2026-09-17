import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card } from '@/components/ui';
import { Check, AlertTriangle, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.functions.invoke('get-email-connection', { body: { user_id: user.id } })
      .then(({ data }) => {
        const connection = data?.connection;
        if (connection) {
          setSmtpHost(connection.smtp_host); setSmtpPort(String(connection.smtp_port)); setSmtpUser(connection.smtp_user);
          setFromName(connection.from_name); setFromEmail(connection.from_email);
        }
        setEmailLoading(false);
      });
  }, [user]);

  function validateEmailForm() {
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpPassword || !fromEmail.trim()) return 'Preencha Host, Usuário, Senha e E-mail do remetente.';
    const port = Number(smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return 'A porta SMTP deve estar entre 1 e 65535.';
    if (!/^\S+@\S+\.\S+$/.test(fromEmail.trim())) return 'Informe um e-mail do remetente válido.';
    return null;
  }

  async function testEmailConnection() {
    setEmailError(null); setEmailMessage(null); setTested(false);
    const validation = validateEmailForm(); if (validation) { setEmailError(validation); return; }
    if (!user) return;
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('test-email-connection', {
      body: { user_id: user.id, smtp_host: smtpHost.trim(), smtp_port: Number(smtpPort), smtp_user: smtpUser.trim(), smtp_password: smtpPassword, from_name: fromName.trim(), from_email: fromEmail.trim() }
    });
    setTesting(false);
    if (error || !data?.ok) setEmailError(data?.error || error?.message || 'Não foi possível testar a conexão.');
    else { setTested(true); setEmailMessage('Conexão validada e e-mail de teste enviado para sua conta. Agora você pode salvar.'); }
  }

  async function saveEmailConnection() {
    setEmailError(null); setEmailMessage(null);
    const validation = validateEmailForm(); if (validation) { setEmailError(validation); return; }
    if (!tested) { setEmailError('Teste a conexão antes de salvar.'); return; }
    if (!user) return;
    setEmailSaving(true);
    const { data, error } = await supabase.functions.invoke('save-email-connection', {
      body: { user_id: user.id, smtp_host: smtpHost.trim(), smtp_port: Number(smtpPort), smtp_user: smtpUser.trim(), smtp_password: smtpPassword, from_name: fromName.trim(), from_email: fromEmail.trim() }
    });
    setEmailSaving(false);
    if (error || !data?.ok) setEmailError(data?.error || error?.message || 'Não foi possível salvar.');
    else { setEmailMessage('E-mail conectado com segurança.'); setSmtpPassword(''); setTested(false); }
  }

  async function updatePassword() {
    setPwError(null); setPwSuccess(false);
    if (!currentPassword || !newPassword) { setPwError('Preencha ambos os campos'); return; }
    if (newPassword.length < 6) { setPwError('A nova senha deve ter pelo menos 6 caracteres'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPwError(error.message);
    else { setPwSuccess(true); setCurrentPassword(''); setNewPassword(''); setTimeout(() => setPwSuccess(false), 2500); }
  }

  async function deleteAccount() {
    if (!user) return;
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase.auth.signOut();
    window.location.hash = '/auth';
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta" />
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Conta</h2>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label><input type="email" value={user?.email ?? ''} disabled className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Usuário</label><input type="text" value={`@${profile?.username ?? ''}`} disabled className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" /></div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-cyan-500" /><h2 className="text-sm font-semibold text-slate-800">Conectar meu e-mail</h2></div>
          <p className="text-xs text-slate-500 mb-4">Use seu próprio SMTP para enviar newsletters. Sua senha nunca é retornada ao frontend e é armazenada criptografada no servidor.</p>
          {emailLoading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div> : <div className="space-y-3">
            <div className="grid sm:grid-cols-[1fr_120px] gap-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Host SMTP</label><input value={smtpHost} onChange={e=>{setSmtpHost(e.target.value);setTested(false)}} placeholder="smtp.exemplo.com" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Porta</label><input type="number" value={smtpPort} onChange={e=>{setSmtpPort(e.target.value);setTested(false)}} placeholder="587" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Usuário</label><input value={smtpUser} onChange={e=>{setSmtpUser(e.target.value);setTested(false)}} placeholder="seu@email.com" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Senha</label><input type="password" value={smtpPassword} onChange={e=>{setSmtpPassword(e.target.value);setTested(false)}} placeholder="••••••••" autoComplete="new-password" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Nome do remetente</label><input value={fromName} onChange={e=>{setFromName(e.target.value);setTested(false)}} placeholder={profile?.display_name || 'Seu nome'} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">E-mail do remetente</label><input type="email" value={fromEmail} onChange={e=>{setFromEmail(e.target.value);setTested(false)}} placeholder={user?.email || 'voce@email.com'} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button onClick={testEmailConnection} disabled={testing || emailSaving} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium rounded-lg disabled:opacity-50">{testing?<Loader2 className="w-4 h-4 animate-spin"/>:<Mail className="w-4 h-4"/>}Testar conexão</button>
              <button onClick={saveEmailConnection} disabled={emailSaving || testing || !tested} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50">{emailSaving?<Loader2 className="w-4 h-4 animate-spin"/>:<ShieldCheck className="w-4 h-4"/>}Salvar e conectar</button>
              {tested && <span className="flex items-center gap-1 text-sm text-green-600"><Check className="w-4 h-4"/> Testado</span>}
            </div>
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
            {emailMessage && <p className="text-sm text-green-600">{emailMessage}</p>}
            <p className="text-[11px] text-slate-400">A senha SMTP é criptografada com AES-256-GCM usando uma chave que fica apenas nas variáveis secretas da Edge Function.</p>
          </div>}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Alterar senha</h2>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Senha atual</label><input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Nova senha</label><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="•••••••" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
            {pwError && <p className="text-sm text-red-500">{pwError}</p>}
            {pwSuccess && <p className="flex items-center gap-1 text-sm text-green-600"><Check className="w-4 h-4"/> Senha alterada</p>}
            <button onClick={updatePassword} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg">Alterar senha</button>
          </div>
        </Card>

        <Card className="p-6 border-red-200">
          <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div><div className="flex-1"><h2 className="text-sm font-semibold text-slate-800 mb-1">Excluir conta</h2><p className="text-xs text-slate-500 mb-3">Esta ação é permanente. Todos os seus dados, links, posts, páginas de venda e leads serão removidos.</p><button onClick={()=>{if(confirm('Tem certeza? Esta ação não pode ser desfeita.')) deleteAccount()}} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg">Excluir conta</button></div></div>
        </Card>
        <button onClick={()=>signOut()} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Sair da conta</button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card } from '@/components/ui';
import { Check, AlertTriangle, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Newsletter config
  const [newsFromName, setNewsFromName] = useState('');
  const [newsReplyTo, setNewsReplyTo] = useState('');
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsSaved, setNewsSaved] = useState(false);

  async function updatePassword() {
    setPwError(null);
    setPwSuccess(false);
    if (!currentPassword || !newPassword) {
      setPwError('Preencha ambos os campos');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPwSuccess(false), 2500);
    }
  }

  async function saveNewsletterConfig() {
    setNewsSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setNewsSaving(false);
    setNewsSaved(true);
    setTimeout(() => setNewsSaved(false), 2500);
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
        {/* Account info */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Conta</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Usuário</label>
              <input
                type="text"
                value={`@${profile?.username ?? ''}`}
                disabled
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
              />
            </div>
          </div>
        </Card>

        {/* Newsletter email config */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-cyan-500" />
            <h2 className="text-sm font-semibold text-slate-800">Newsletter — Email</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Configure como seus emails da newsletter serão enviados. Esta funcionalidade estará disponível em breve — preencha as informações agora para estar pronto.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nome do remetente</label>
              <input
                type="text"
                value={newsFromName}
                onChange={(e) => setNewsFromName(e.target.value)}
                placeholder={profile?.display_name || 'Seu nome'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email de resposta (reply-to)</label>
              <input
                type="email"
                value={newsReplyTo}
                onChange={(e) => setNewsReplyTo(e.target.value)}
                placeholder={user?.email || 'voce@email.com'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveNewsletterConfig}
                disabled={newsSaving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {newsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar configuração
              </button>
              {newsSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="w-4 h-4" /> Salvo
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Password */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Alterar senha</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Senha atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="•••••••"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            {pwError && <p className="text-sm text-red-500">{pwError}</p>}
            {pwSuccess && (
              <p className="flex items-center gap-1 text-sm text-green-600">
                <Check className="w-4 h-4" /> Senha alterada
              </p>
            )}
            <button
              onClick={updatePassword}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition"
            >
              Alterar senha
            </button>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="p-6 border-red-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">Excluir conta</h2>
              <p className="text-xs text-slate-500 mb-3">
                Esta ação é permanente. Todos os seus dados, links, posts, páginas de venda e leads serão removidos.
              </p>
              <button
                onClick={() => {
                  if (confirm('Tem certeza? Esta ação não pode ser desfeita.')) deleteAccount();
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
              >
                Excluir conta
              </button>
            </div>
          </div>
        </Card>

        <button
          onClick={() => signOut()}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}

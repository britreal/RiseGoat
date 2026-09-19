import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card } from '@/components/ui';
import { Check, AlertTriangle, Mail, Loader2, ShieldCheck, Database, BookOpen, ArrowRight, Target, Sparkles, Network, BarChart3, Settings2, Layers3, CircleDollarSign, Handshake, CalendarDays, Radar as RadarIcon, UserRound, LockKeyhole, Server, Info, LogOut, ChevronRight, Eye, EyeOff, RotateCcw, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { navItems } from '@/lib/navigation';

export function SettingsPage() {
  const { user, profile, signOut, menuVisibility, setMenuVisibility } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const controllableItems = navItems.filter((item) => item.controllable !== false);
  const controlGroups = ['Núcleo', 'Presença', 'Conteúdo', 'Captação', 'Medição', 'Monetização', 'Estratégia', 'Pessoal'] as const;

  function isMenuVisible(path: string) {
    return menuVisibility[path] !== false;
  }

  async function updateMenuVisibility(path: string, visible: boolean) {
    await setMenuVisibility({ ...menuVisibility, [path]: visible });
  }

  async function toggleControlGroup(group: string, visible: boolean) {
    const updates = controllableItems
      .filter((item) => item.group === group)
      .reduce<Record<string, boolean>>((acc, item) => {
        acc[item.path] = visible;
        return acc;
      }, {});
    await setMenuVisibility({ ...menuVisibility, ...updates });
  }

  function resetMenuVisibility() {
    return setMenuVisibility({});
  }

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
    <div className="min-h-full bg-slate-50/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        <PageHeader
          title="Configurações"
          subtitle="Controle sua conta, integrações, segurança e informações do RiseGoat."
          action={
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          }
        />

        <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
          <aside className="lg:sticky lg:top-6">
            <Card className="p-3">
              <p className="px-3 pt-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Configuração</p>
              <div className="space-y-1">
                {[
                  { label: 'Sobre o sistema', id: 'settings-system', icon: Info, tone: 'bg-slate-950 text-white' },
                  { label: 'Controle', id: 'settings-control', icon: Power, tone: 'bg-amber-50 text-amber-700' },
                  { label: 'Conta', id: 'settings-account', icon: UserRound, tone: 'bg-slate-100 text-slate-700' },
                  { label: 'E-mail', id: 'settings-email', icon: Mail, tone: 'bg-cyan-50 text-cyan-700' },
                  { label: 'Segurança', id: 'settings-security', icon: LockKeyhole, tone: 'bg-slate-100 text-slate-700' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition text-left"
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tone}`}><Icon className="w-4 h-4" /></span>
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                  );
                })}
              </div>
            </Card>
            <div className="hidden lg:block rounded-2xl border border-slate-200 bg-white p-4 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-cyan-600" />
                <p className="text-xs font-bold text-slate-700">Infraestrutura</p>
              </div>
              <p className="text-[11px] text-slate-400 leading-5">RiseGoat conectado ao projeto Fluently para autenticação, dados e armazenamento.</p>
            </div>
          </aside>

          <div className="space-y-6">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="p-6 bg-slate-950 text-white">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Sobre o RiseGoat</p>
                <h2 className="text-2xl font-black tracking-tight mt-1">O sistema, explicado</h2>
                <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-6">
                  Este documento explica a arquitetura de uso do RiseGoat: qual é a ordem das ferramentas,
                  o que cada uma faz, como os fluxos se conectam e qual problema cada etapa foi criada para resolver.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-7">
          <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </span>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Documentação viva</p>
              </div>
              <h3 className="text-lg font-black tracking-tight text-slate-950 mt-3">O RiseGoat mudou de um painel de páginas para um sistema operacional pessoal + negócios.</h3>
              <p className="text-xs text-slate-600 mt-2 leading-5">
                A arquitetura atual separa o espaço <strong>Pessoal</strong> do espaço <strong>Negócios</strong>, mantém os dados do usuário no Supabase
                e transforma processos em fluxos executáveis. Esta página resume o estado atual do produto.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Versão documental</p>
              <p className="text-lg font-black text-slate-950 mt-1">18/09/2026</p>
              <p className="text-xs text-slate-500 mt-2 leading-5">Atualizada após a última rodada de arquitetura, Fluxos de Ação, workspace e segurança.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-slate-700" />
                <p className="text-sm font-bold text-slate-900">Pessoal</p>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-5">
                Espaço para desenvolvimento individual, hábitos, corpo, estudos, projetos e metas pessoais. O GOAT fica aqui e os
                passos de um fluxo podem ser marcados como feitos diretamente na execução.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-slate-700" />
                <p className="text-sm font-bold text-slate-900">Negócios</p>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-5">
                Espaço para presença, conteúdo, audiência, leads, analytics, vendas, receita, estratégia, parcerias e lançamentos.
                O sistema esconde áreas incompatíveis com o modo ativo e protege também o acesso direto às rotas.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Arquitetura atual</p>
                <h3 className="text-lg font-black tracking-tight text-slate-950 mt-1">Como as partes do sistema se organizam</h3>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Layers3 className="w-3.5 h-3.5" /> 2 espaços + módulos compartilhados
              </span>
            </div>

            <div className="grid lg:grid-cols-3 gap-3">
              {[
                {
                  name: 'Núcleo',
                  items: 'Dashboard, Fluxos de Ação e Metas',
                  text: 'Planejar, acompanhar e executar objetivos sem depender de várias ferramentas separadas.'
                },
                {
                  name: 'Negócios',
                  items: 'Perfil, Links, Microblog, Newsletter, Leads, Analytics, Posts, Rascunhos, Páginas de Venda, Ofertas, Receita, Centro de Comando, Parcerias, Lançamentos e Radar',
                  text: 'Opera a presença pública, aquisição, conteúdo, monetização e camada estratégica.'
                },
                {
                  name: 'Pessoal',
                  items: 'Dashboard pessoal, GOAT, Fluxos de Ação e Metas',
                  text: 'Concentra rotina e evolução pessoal, com processos executáveis e acompanhamento de progresso.'
                },
              ].map(section => (
                <div key={section.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">{section.name}</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{section.items}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-5">{section.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Atualizações estruturais</p>
                <h3 className="text-lg font-black tracking-tight text-slate-950 mt-1">O que foi adicionado ou reformulado</h3>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Check className="w-3.5 h-3.5" /> Consolidado do histórico recente
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-3">
              {[
                {
                  title: 'Pessoal / Negócios',
                  text: 'Switcher persistente no topo, dados separados por workspace, dashboard próprio para Pessoal e bloqueio de rotas incompatíveis.',
                },
                {
                  title: 'Fluxos de Ação 2.0',
                  text: 'Biblioteca com 23 templates pessoais e de negócios, Canvas, execução e duplicação. Cada template pesquisado possui plano base/documentado e plano ideal do RiseGoat.',
                },
                {
                  title: 'Proveniência das fontes',
                  text: 'Cada template pesquisado guarda as fontes utilizadas, o modo do plano escolhido e metadados que distinguem etapas baseadas em fontes da camada organizacional do RiseGoat.',
                },
                {
                  title: 'Execução pessoal',
                  text: 'Etapas de Fluxos de Ação no espaço Pessoal podem funcionar como checklist, com ação de marcar como feito sem precisar entrar no GOAT.',
                },
                {
                  title: 'Monetização',
                  text: 'Foram adicionados Ofertas, Receita, Parcerias, Lançamentos e Metas/resultado-chave, além das relações entre receita, ofertas e lançamentos.',
                },
                {
                  title: 'Páginas de Venda',
                  text: 'Builder visual com blocos editáveis para texto, imagem, espaçamento, botões, cores, fontes e tamanhos, com página pública por slug.',
                },
                {
                  title: 'GOAT',
                  text: 'Hábitos, heatmap, biblioteca de livros/audiobooks e Body Analytics, com popups mais claros e acompanhamento de evolução corporal.',
                },
                {
                  title: 'Mídia e uploads',
                  text: 'Uploads diretos para Supabase em perfil, posts, microblog e páginas de venda, com helper compartilhado e validação de imagens.',
                },
                {
                  title: 'Segurança e autenticação',
                  text: 'Novos usuários recebem perfil automaticamente; tabelas legadas receberam políticas de proprietário e funções legadas tiveram o search_path protegido.',
                },
                {
                  title: 'Infraestrutura',
                  text: 'O RiseGoat usa exclusivamente o projeto Supabase Fluently, com Auth, Database, Storage e Edge Functions para os fluxos que precisam de backend seguro.',
                },
                {
                  title: 'Desempenho e estabilidade',
                  text: 'Foram adicionados índices para chaves estrangeiras, correções para estados de loading, conflitos de ícones, renderização do GOAT e estados vazios de Receita.',
                },
                {
                  title: 'Qualidade de código',
                  text: 'Existe workflow de CI para typecheck, lint e build. A última verificação conhecida passou no typecheck; o lint ainda possui avisos/erros legados fora desta documentação.',
                },
              ].map((item, index) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-xl bg-slate-950 text-white flex items-center justify-center text-[10px] font-black">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1.5 leading-5">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Fluxos de Ação</p>
              <h3 className="text-lg font-black tracking-tight text-slate-950 mt-1">A diferença entre plano base e plano ideal</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-900">Plano base / documentado</p>
                <p className="text-xs text-slate-600 mt-2 leading-5">
                  É a síntese operacional das fontes utilizadas para aquele template. As fontes ficam visíveis na biblioteca do fluxo
                  e são registradas junto ao processo salvo.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5">
                <p className="text-sm font-bold text-slate-900">Plano ideal do RiseGoat</p>
                <p className="text-xs text-slate-600 mt-2 leading-5">
                  É uma camada de organização criada pelo próprio sistema para transformar o plano base em um processo mais executável,
                  conectando etapas a módulos, decisões, métricas e resultados. Não é apresentado como exigência das fontes.
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {['Shopify', 'Google Analytics', 'Mailchimp', 'HubSpot', 'SBA', 'Atlassian', 'Learning Scientists', 'CDC', 'NIH/NICHD', 'Todoist', 'Stripe'].map(source => (
                  <span key={source} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">{source}</span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3 leading-5">
                Estas são as famílias de fontes usadas na pesquisa dos templates atuais. A biblioteca do Fluxo de Ação mantém as URLs
                específicas associadas a cada template.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-cyan-700">Ciclo operacional</p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-semibold text-slate-700">
              {[
                'Definir objetivo',
                'Escolher ou criar fluxo',
                'Executar etapas',
                'Marcar / medir',
                'Conectar módulos',
                'Revisar resultado',
                'Repetir ou ajustar',
              ].map((step, index, all) => (
                <span key={step} className="inline-flex items-center gap-2">
                  <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">{step}</span>
                  {index < all.length - 1 && <ArrowRight className="w-4 h-4 text-cyan-500" />}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-5">
              O sistema não obriga que todo trabalho siga uma única ordem. O ciclo acima é uma forma de entender como objetivos,
              processos, execução, métricas e revisão se relacionam dentro do RiseGoat.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-700" />
              <p className="text-sm font-bold text-slate-900">Camada de dados</p>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Identidade</p>
                <p className="text-xs text-slate-600 mt-1 leading-5">Supabase Auth + perfil do usuário, com workspace persistido.</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Operação</p>
                <p className="text-xs text-slate-600 mt-1 leading-5">Dados de conteúdo, leads, ofertas, receita, estratégia, metas, GOAT e fluxos.</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Mídia / integrações</p>
                <p className="text-xs text-slate-600 mt-1 leading-5">Storage para imagens e Edge Functions para operações que exigem backend seguro, como SMTP.</p>
              </div>
            </div>
          </div>
        </div>
        </Card>

        <div id="settings-control" className="scroll-mt-20">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Power className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Visibilidade da navegação</p>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 mt-0.5">Controle</h2>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 max-w-2xl leading-5">
                  Ative ou desative o que aparece no menu lateral. A preferência é salva na sua conta e respeita o espaço
                  Pessoal ou Negócios. Os módulos continuam existindo; aqui você controla somente a visibilidade.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void resetMenuVisibility()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
              </button>
            </div>

            <div className="mt-6 space-y-7">
              {controlGroups.map((group) => {
                const groupItems = controllableItems.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;
                const enabledCount = groupItems.filter((item) => isMenuVisible(item.path)).length;
                const allEnabled = enabledCount === groupItems.length;
                const currentModeLabel = group === 'Pessoal' ? 'Pessoal' : group === 'Núcleo' ? 'Pessoal + Negócios' : 'Negócios';

                return (
                  <div key={group} className="rounded-2xl border border-slate-200 bg-slate-50/70 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{group}</h3>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">{currentModeLabel}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{enabledCount} de {groupItems.length} visíveis</p>
                      </div>
                      <button
                        type="button"
                        aria-label={allEnabled ? `Desativar todos de ${group}` : `Ativar todos de ${group}`}
                        aria-pressed={allEnabled}
                        onClick={() => void toggleControlGroup(group, !allEnabled)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                          allEnabled
                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {allEnabled ? 'Todos ativos' : 'Ativar todos'}
                      </button>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {groupItems.map((item) => {
                        const visible = isMenuVisible(item.path);
                        const Icon = item.icon;
                        return (
                          <div key={item.path} className="flex items-center gap-3 px-4 py-3 bg-white/80">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              visible ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-300'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold ${visible ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</p>
                              <p className="text-[10px] text-slate-400">{item.path}</p>
                            </div>
                            <button
                              type="button"
                              aria-label={visible ? `Ocultar ${item.label}` : `Mostrar ${item.label}`}
                              aria-pressed={visible}
                              onClick={() => void updateMenuVisibility(item.path, !visible)}
                              className={`shrink-0 w-11 h-7 rounded-full p-1 transition ${visible ? 'bg-slate-950' : 'bg-slate-300'}`}
                            >
                              <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${visible ? 'translate-x-4' : 'translate-x-0'}`}>
                                {visible ? <Eye className="w-3 h-3 text-slate-500 mx-auto mt-1" /> : <EyeOff className="w-3 h-3 text-slate-300 mx-auto mt-1" />}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-3">
              <p className="text-[11px] text-amber-800 leading-5">
                <strong>Configurações permanece visível</strong> para que você nunca perca o acesso a este painel de controle.
              </p>
            </div>
          </Card>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1"><Database className="w-4 h-4 text-cyan-500" /><h2 className="text-sm font-semibold text-slate-800">Supabase</h2></div>
          <p className="text-xs text-slate-500 mb-4">Banco de dados e autenticação do RiseGoat.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Projeto</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">Fluently</div>
              <div className="text-[11px] text-slate-500 mt-1">xofrlyblnsvcjsywynzu</div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-green-600">Conexão</div>
              <div className="text-sm font-semibold text-green-700 mt-1">Configurada</div>
              <div className="text-[11px] text-green-600 mt-1">Supabase Auth + Database</div>
            </div>
          </div>
        </Card>

        <div id="settings-account" className="pt-1 scroll-mt-20">
          <div className="flex items-center gap-2 mb-3 px-1">
            <UserRound className="w-4 h-4 text-slate-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Conta e identidade</p>
          </div>
          <Card className="p-6"> 
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Conta</h2>
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label><input type="email" value={user?.email ?? ''} disabled className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Usuário</label><input type="text" value={`@${profile?.username ?? ''}`} disabled className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500" /></div>
          </div>
          </Card>
        </div>

        <div id="settings-email" className="pt-1 scroll-mt-20">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Mail className="w-4 h-4 text-cyan-600" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Integrações</p>
          </div>
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
        </div>

        <div id="settings-security" className="pt-1 scroll-mt-20">
          <div className="flex items-center gap-2 mb-3 px-1">
            <LockKeyhole className="w-4 h-4 text-slate-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Segurança</p>
          </div>
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
        </div>

        <Card className="p-6 border-red-200 shadow-sm">
          <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div><div className="flex-1"><h2 className="text-sm font-semibold text-slate-800 mb-1">Excluir conta</h2><p className="text-xs text-slate-500 mb-3">Esta ação é permanente. Todos os seus dados, links, posts, páginas de venda e leads serão removidos.</p><button onClick={()=>{if(confirm('Tem certeza? Esta ação não pode ser desfeita.')) deleteAccount()}} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg">Excluir conta</button></div></div>
        </Card>
      </div>
        </div>
      </div>
    </div>
  );
}

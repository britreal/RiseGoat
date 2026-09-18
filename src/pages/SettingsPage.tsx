import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card } from '@/components/ui';
import { Check, AlertTriangle, Mail, Loader2, ShieldCheck, Database, BookOpen, ArrowRight, Target, Sparkles, Network, BarChart3, Settings2, Layers3 } from 'lucide-react';
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
        <Card className="overflow-hidden border-slate-200">
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
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                  <Target className="w-4 h-4 text-slate-700" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Objetivo</p>
                <p className="text-sm font-bold text-slate-800 mt-1">Transformar atenção em sistema</p>
                <p className="text-xs text-slate-500 mt-1 leading-5">Planejar, publicar, captar, analisar e monetizar em um único ambiente.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                  <Network className="w-4 h-4 text-slate-700" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Lógica</p>
                <p className="text-sm font-bold text-slate-800 mt-1">Conteúdo → audiência → negócio</p>
                <p className="text-xs text-slate-500 mt-1 leading-5">Cada ferramenta alimenta a próxima etapa e reduz a fragmentação operacional.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3">
                  <Sparkles className="w-4 h-4 text-slate-700" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Resultado</p>
                <p className="text-sm font-bold text-slate-800 mt-1">Mais clareza e execução</p>
                <p className="text-xs text-slate-500 mt-1 leading-5">Menos ferramentas soltas, menos informação perdida e mais visão do negócio.</p>
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Ordem do sistema</p>
                  <h3 className="text-lg font-black tracking-tight text-slate-950 mt-1">Como usar o RiseGoat</h3>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400"><Layers3 className="w-3.5 h-3.5" /> Fluxo recomendado</span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    n: '01', name: 'Dashboard', group: 'Início', icon: BarChart3,
                    function: 'Visão inicial do que está acontecendo no sistema.',
                    how: 'Use como ponto de entrada para enxergar seus indicadores e acessar rapidamente as áreas principais.',
                    pain: 'Evita começar o trabalho sem saber o que precisa de atenção.'
                  },
                  {
                    n: '02', name: 'Perfil', group: 'Minha Página', icon: Settings2,
                    function: 'Constrói a identidade e a página pública da sua marca.',
                    how: 'Cadastre nome, bio, foto, capa, SEO e informações que serão exibidas na sua presença pública.',
                    pain: 'Resolve a falta de uma identidade central e de um lugar próprio para concentrar sua audiência.'
                  },
                  {
                    n: '03', name: 'Links', group: 'Minha Página', icon: ArrowRight,
                    function: 'Organiza links, ofertas, afiliados e destinos importantes.',
                    how: 'Crie, ordene e ative seus links; use imagens quando necessário e direcione visitantes para cada próxima ação.',
                    pain: 'Evita espalhar seus links em várias ferramentas e perder oportunidades de clique ou venda.'
                  },
                  {
                    n: '04', name: 'Microblog', group: 'Minha Página', icon: Sparkles,
                    function: 'Transforma ideias curtas em conteúdo publicado na sua página.',
                    how: 'Crie posts rápidos, use imagens e mantenha uma camada de conteúdo contínuo ligada ao seu perfil.',
                    pain: 'Resolve o problema de ter ideias, mas não ter um lugar simples para registrá-las e publicá-las.'
                  },
                  {
                    n: '05', name: 'Newsletter', group: 'Crescimento', icon: Mail,
                    function: 'Cria e organiza campanhas de e-mail e a operação de comunicação direta.',
                    how: 'Conecte seu SMTP, gerencie campanhas e use seus leads para distribuir conteúdo e ofertas.',
                    pain: 'Reduz a dependência exclusiva das redes sociais para falar com a audiência.'
                  },
                  {
                    n: '06', name: 'Posts', group: 'Conteúdo', icon: BookOpen,
                    function: 'Organiza a criação e publicação de conteúdo de forma estruturada.',
                    how: 'Crie posts, adicione mídia e mantenha o conteúdo dentro do ecossistema do RiseGoat.',
                    pain: 'Resolve a dispersão da produção de conteúdo e facilita manter uma rotina de publicação.'
                  },
                  {
                    n: '07', name: 'Rascunhos', group: 'Conteúdo', icon: BookOpen,
                    function: 'Guarda ideias e conteúdos antes da publicação.',
                    how: 'Salve materiais incompletos para continuar depois sem depender de notas externas.',
                    pain: 'Evita perder ideias e reduz o atrito entre ter uma ideia e transformá-la em publicação.'
                  },
                  {
                    n: '08', name: 'Páginas de venda', group: 'Monetização', icon: Target,
                    function: 'Cria páginas de venda com blocos visuais e conteúdo editável.',
                    how: 'Monte uma página com texto, imagem, espaço, botão, cores, fontes e tamanhos; publique quando estiver pronta.',
                    pain: 'Resolve a necessidade de criar uma página comercial sem montar cada estrutura manualmente fora do sistema.'
                  },
                  {
                    n: '09', name: 'Centro de Comando', group: 'Estratégia', icon: Network,
                    function: 'Organiza ativos, contatos, conexões, oportunidades, estratégia, defesa e finanças.',
                    how: 'Use a Teia de Autoridade para mapear relações; registre oportunidades, tarefas, conteúdos, produtos e sinais estratégicos.',
                    pain: 'Resolve a falta de visão integrada sobre quem, o quê e quais oportunidades estão conectados ao negócio.'
                  },
                  {
                    n: '10', name: 'GOAT', group: 'Estratégia', icon: Sparkles,
                    function: 'Acompanha desenvolvimento pessoal: hábitos, consistência, leitura, audiobooks e evolução corporal.',
                    how: 'Marque hábitos diariamente, acompanhe o heatmap, registre Body Analytics e organize sua biblioteca por status.',
                    pain: 'Resolve a dificuldade de manter consistência e medir evolução pessoal junto da execução profissional.'
                  },
                  {
                    n: '11', name: 'Leads', group: 'Crescimento', icon: Target,
                    function: 'Centraliza os contatos captados pela operação.',
                    how: 'Acompanhe quem entrou na sua base e use esses dados para nutrir, analisar e transformar audiência em relacionamento.',
                    pain: 'Evita que potenciais clientes fiquem espalhados ou sejam esquecidos.'
                  },
                  {
                    n: '12', name: 'Analytics', group: 'Crescimento', icon: BarChart3,
                    function: 'Mostra o comportamento e os resultados da sua presença digital.',
                    how: 'Use as métricas para observar visitas, cliques e sinais de desempenho das páginas e links.',
                    pain: 'Resolve decisões baseadas apenas em sensação, sem saber o que realmente está gerando atenção e ação.'
                  },
                  {
                    n: '13', name: 'Configurações', group: 'Conta', icon: Settings2,
                    function: 'Administra conta, segurança, conexão de e-mail e documentação do sistema.',
                    how: 'Gerencie senha, SMTP, conexão do banco e consulte este documento para entender a arquitetura do RiseGoat.',
                    pain: 'Evita que configurações importantes e informações sobre o funcionamento fiquem sem um lugar central.'
                  },
                ].map((item, index, all) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                      <div className="flex gap-4">
                        <div className="shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center text-xs font-black">{item.n}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Icon className="w-4 h-4 text-slate-500" />
                            <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">{item.group}</span>
                          </div>
                          <div className="grid lg:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Funcionalidade</p>
                              <p className="text-xs text-slate-600 mt-1.5 leading-5">{item.function}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Como funciona</p>
                              <p className="text-xs text-slate-600 mt-1.5 leading-5">{item.how}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">Dor que resolve</p>
                              <p className="text-xs text-slate-600 mt-1.5 leading-5">{item.pain}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < all.length - 1 && <div className="hidden sm:block absolute left-[34px] -bottom-3 h-3 border-l border-dashed border-slate-200" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-cyan-700">Visão operacional</p>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs font-semibold text-slate-700">
                <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">Construir presença</span>
                <ArrowRight className="w-4 h-4 text-cyan-500" />
                <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">Publicar conteúdo</span>
                <ArrowRight className="w-4 h-4 text-cyan-500" />
                <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">Captar audiência</span>
                <ArrowRight className="w-4 h-4 text-cyan-500" />
                <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">Medir comportamento</span>
                <ArrowRight className="w-4 h-4 text-cyan-500" />
                <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">Monetizar</span>
                <ArrowRight className="w-4 h-4 text-cyan-500" />
                <span className="px-3 py-2 rounded-xl bg-white border border-cyan-100">Evoluir</span>
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-5">
                O fluxo é contínuo: o conteúdo gera atenção, a atenção pode virar lead ou clique, os dados mostram o que funcionou,
                a monetização transforma resultado em negócio e o GOAT mantém a disciplina para repetir o processo.
              </p>
            </div>
          </div>
        </Card>

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

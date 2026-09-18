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
                  { n: '01', name: 'Dashboard', group: 'Início', icon: BarChart3, function: 'Centraliza a visão inicial da operação.', how: 'Use como ponto de entrada para conferir indicadores e acessar rapidamente as áreas principais.', pain: 'Evita trabalhar sem visão do que precisa de atenção.' },
                  { n: '02', name: 'Perfil', group: 'Minha Página', icon: Settings2, function: 'Constrói a identidade e a página pública.', how: 'Cadastre nome, bio, imagens, SEO e informações exibidas publicamente.', pain: 'Resolve a falta de uma presença central para sua marca.' },
                  { n: '03', name: 'Links', group: 'Minha Página', icon: ArrowRight, function: 'Organiza links, ofertas, afiliados e destinos.', how: 'Crie, ordene, ative e acompanhe links usados na sua página.', pain: 'Evita espalhar destinos e perder cliques ou oportunidades.' },
                  { n: '04', name: 'Microblog', group: 'Minha Página', icon: Sparkles, function: 'Publica conteúdo curto ligado ao seu perfil.', how: 'Crie posts rápidos, imagens, CTA e mantenha uma camada contínua de conteúdo.', pain: 'Resolve o problema de ter ideias sem um fluxo simples de publicação.' },
                  { n: '05', name: 'Newsletter', group: 'Crescimento', icon: Mail, function: 'Opera comunicação direta por e-mail.', how: 'Conecte SMTP, crie campanhas e envie conteúdo e ofertas aos seus leads.', pain: 'Reduz dependência exclusiva das redes sociais.' },
                  { n: '06', name: 'Leads', group: 'Crescimento', icon: Target, function: 'Centraliza pessoas captadas pela operação.', how: 'Acompanhe nomes, e-mails e origens para transformar audiência em relacionamento.', pain: 'Evita perder potenciais clientes em ferramentas separadas.' },
                  { n: '07', name: 'Analytics', group: 'Crescimento', icon: BarChart3, function: 'Mostra comportamento e resultados.', how: 'Acompanhe visitas, cliques e sinais de desempenho das propriedades digitais.', pain: 'Substitui decisões baseadas apenas em sensação por dados observáveis.' },
                  { n: '08', name: 'Posts', group: 'Conteúdo', icon: BookOpen, function: 'Organiza a produção e publicação de conteúdo.', how: 'Crie posts, adicione mídia e mantenha a produção dentro do ecossistema.', pain: 'Reduz dispersão e facilita manter consistência.' },
                  { n: '09', name: 'Rascunhos', group: 'Conteúdo', icon: BookOpen, function: 'Guarda ideias e conteúdos antes da publicação.', how: 'Salve materiais incompletos e retome depois.', pain: 'Evita perder ideias e reduz o atrito da criação.' },
                  { n: '10', name: 'Páginas de Venda', group: 'Monetização', icon: Target, function: 'Cria páginas de venda com blocos editáveis.', how: 'Monte texto, imagem, espaço, botão, cores, fontes e tamanho; publique quando estiver pronto.', pain: 'Evita depender de outra ferramenta para montar a estrutura comercial.' },
                  { n: '11', name: 'Ofertas', group: 'Monetização', icon: CircleDollarSign, function: 'Organiza tudo que pode ser vendido.', how: 'Cadastre tipo, status, preço, margem, comissão, canal, receita e vincule uma página de venda.', pain: 'Resolve a falta de uma visão central do catálogo e da rentabilidade das ofertas.' },
                  { n: '12', name: 'Receita', group: 'Monetização', icon: CircleDollarSign, function: 'Controla dinheiro recebido e pendente.', how: 'Registre fonte, valor e data e conecte cada receita a oferta, parceria, lead e lançamento.', pain: 'Evita perder o histórico financeiro e mostra distância até a meta mensal.' },
                  { n: '13', name: 'Centro de Comando', group: 'Estratégia', icon: Network, function: 'Integra propriedades, contatos, conexões, oportunidades, estratégia, defesa e finanças.', how: 'Use a Teia de Autoridade e seus painéis para organizar a estrutura estratégica.', pain: 'Resolve a falta de visão integrada sobre ativos, pessoas e oportunidades.' },
                  { n: '14', name: 'GOAT', group: 'Estratégia', icon: Sparkles, function: 'Acompanha desenvolvimento pessoal e consistência.', how: 'Gerencie hábitos, heatmap, Body Analytics, livros e audiobooks.', pain: 'Ajuda a transformar intenção pessoal em rotina acompanhável.' },
                  { n: '15', name: 'Parcerias', group: 'Estratégia', icon: Handshake, function: 'Organiza afiliados, parceiros e colaboradores.', how: 'Cadastre comissão, vendas, valor a pagar e conecte parceiros a leads e receitas.', pain: 'Evita controlar relacionamentos comerciais de forma espalhada.' },
                  { n: '16', name: 'Lançamentos', group: 'Estratégia', icon: CalendarDays, function: 'Planeja campanhas por período e fase.', how: 'Monte kanban, calendário, metas e resultados e vincule posts e newsletters.', pain: 'Evita executar campanhas sem cronograma ou conexão entre conteúdo e resultado.' },
                  { n: '17', name: 'Radar', group: 'Estratégia', icon: RadarIcon, function: 'Cruza dados automaticamente para encontrar oportunidades.', how: 'Compara interesses, ofertas e sinais de audiência, atualiza o score de alavancagem e permite criar tarefas.', pain: 'Reduz oportunidades escondidas em dados que estão isolados.' },
                  { n: '18', name: 'Configurações', group: 'Conta', icon: Settings2, function: 'Administra conta, segurança e integrações.', how: 'Gerencie senha, SMTP, conexão do banco e documentação do sistema.', pain: 'Mantém configurações críticas centralizadas.' },
                  { n: '19', name: 'Metas', group: 'Conta', icon: Target, function: 'Transforma objetivos macro em resultados-chave.', how: 'Cadastre três resultados-chave, progresso, prazo, revisão semanal e módulos vinculados.', pain: 'Evita trabalhar muito sem uma direção mensurável.' },
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

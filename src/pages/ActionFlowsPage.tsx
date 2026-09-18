import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeader, Spinner } from '@/components/ui';
import {
  ArrowLeft, ArrowRight, BarChart3, BriefcaseBusiness, Check, ChevronDown, CircleDollarSign,
  Clock3, Copy, GripVertical, Layers3, Link2, ListChecks, Map as MapIcon, MessageSquare,
  Network, Pause, Play, Plus, Radar, Rocket, Save, Settings2, ShoppingBag, Sparkles,
  Target, Trash2, UserRound, X, Zap,
} from 'lucide-react';

type NodeType = 'action' | 'task' | 'decision' | 'result' | 'module' | 'person' | 'metric' | 'note';
type FlowStatus = 'draft' | 'active' | 'completed';
type RunStatus = 'active' | 'paused' | 'completed';

type FlowNode = {
  id: string;
  flow_id: string;
  user_id: string;
  node_type: NodeType;
  label: string;
  description: string;
  module_name: string | null;
  module_path: string | null;
  position_x: number;
  position_y: number;
  metadata: Record<string, any>;
  sort_order: number;
};

type FlowEdge = {
  id: string;
  flow_id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_label: string;
  branch_key: string;
};

type Flow = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  template_key: string | null;
  objective: string;
  goal: string;
  status: FlowStatus;
  workspace_mode: 'pessoal' | 'negocios';
  created_at: string;
  updated_at: string;
  workspace_mode: 'pessoal' | 'negocios';
  plan_mode: 'base' | 'ideal';
  source_refs: Array<{ label: string; url: string }>;
};

type Run = {
  id: string;
  flow_id: string;
  user_id: string;
  name: string;
  status: RunStatus;
  current_node_id: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

type RunNode = {
  id: string;
  run_id: string;
  user_id: string;
  node_id: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'blocked';
  note: string;
  started_at: string | null;
  completed_at: string | null;
};

type TemplateNode = {
  type?: NodeType;
  label: string;
  description?: string;
  module?: keyof typeof MODULES;
  x?: number;
  y?: number;
};

type Template = {
  key: string;
  name: string;
  category: string;
  description: string;
  objective: string;
  goal: string;
  nodes: TemplateNode[];
};

const MODULES = {
  'Dashboard': '/dashboard',
  'Perfil': '/profile',
  'Links': '/links',
  'Microblog': '/microblog',
  'Newsletter': '/newsletter',
  'Leads': '/leads',
  'Analytics': '/analytics',
  'Posts': '/posts',
  'Rascunhos': '/drafts',
  'Páginas de Venda': '/sales',
  'Ofertas': '/offers',
  'Receita': '/revenue',
  'Centro de Comando': '/command-center',
  'GOAT': '/goat',
  'Parcerias': '/partnerships',
  'Lançamentos': '/launches',
  'Radar': '/radar',
  'Metas': '/goals',
  'Configurações': '/settings',
} as const;

const NODE_META: Record<NodeType, { label: string; icon: typeof Target; className: string }> = {
  action: { label: 'Ação', icon: Zap, className: 'border-blue-200 bg-blue-50 text-blue-700' },
  task: { label: 'Tarefa', icon: ListChecks, className: 'border-violet-200 bg-violet-50 text-violet-700' },
  decision: { label: 'Decisão', icon: Network, className: 'border-amber-200 bg-amber-50 text-amber-700' },
  result: { label: 'Resultado', icon: Target, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  module: { label: 'Módulo', icon: Layers3, className: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  person: { label: 'Pessoa', icon: UserRound, className: 'border-rose-200 bg-rose-50 text-rose-700' },
  metric: { label: 'Métrica', icon: BarChart3, className: 'border-slate-300 bg-slate-100 text-slate-700' },
  note: { label: 'Nota', icon: MessageSquare, className: 'border-slate-200 bg-white text-slate-600' },
};

const TEMPLATES: Template[] = [
  {
    key: 'shopify-store', name: 'Criar Loja Shopify', category: 'Negócios',
    description: 'Do produto escolhido até a loja pronta para vender.',
    objective: 'Colocar uma operação de e-commerce no ar.',
    goal: 'Primeira venda',
    nodes: [
      { label: 'Definir nicho e proposta', type: 'action', description: 'Escolher público, problema e posicionamento.' },
      { label: 'Selecionar produto', type: 'action', description: 'Escolher produto e fornecedor.' },
      { label: 'Validar produto', type: 'decision', description: 'Há sinais reais de demanda?' },
      { label: 'Construir identidade', type: 'action', description: 'Nome, identidade e ativos da marca.' },
      { label: 'Criar loja Shopify', type: 'module', description: 'Montar a estrutura da loja.', module: 'Páginas de Venda' },
      { label: 'Cadastrar produtos', type: 'task', description: 'Produtos, imagens, preços e informações.' },
      { label: 'Configurar checkout', type: 'task', description: 'Pagamento, frete, impostos e domínio.' },
      { label: 'Configurar Analytics', type: 'module', description: 'Instrumentar acompanhamento.', module: 'Analytics' },
      { label: 'Plano de aquisição', type: 'action', description: 'Definir fontes de tráfego.' },
      { label: 'Primeira venda', type: 'result', description: 'Registrar e analisar o primeiro resultado.', module: 'Receita' },
    ],
  },
  {
    key: 'digital-product', name: 'Criar Produto Digital', category: 'Negócios',
    description: 'Da ideia à oferta, página e primeiras vendas.',
    objective: 'Transformar conhecimento em um produto vendável.',
    goal: 'Oferta pronta e vendendo',
    nodes: [
      { label: 'Definir problema e transformação', type: 'action' },
      { label: 'Validar demanda', type: 'decision' },
      { label: 'Estruturar produto', type: 'action' },
      { label: 'Criar oferta', type: 'module', module: 'Ofertas' },
      { label: 'Criar página de venda', type: 'module', module: 'Páginas de Venda' },
      { label: 'Preparar aquisição', type: 'action' },
      { label: 'Captar interessados', type: 'module', module: 'Leads' },
      { label: 'Registrar primeiras vendas', type: 'module', module: 'Receita' },
    ],
  },
  {
    key: 'clothing-brand', name: 'Criar Marca de Roupa', category: 'Negócios',
    description: 'Marca, coleção, produção, loja e lançamento.',
    objective: 'Criar uma marca de roupa com operação comercial.',
    goal: 'Primeira coleção vendendo',
    nodes: [
      { label: 'Definir posicionamento', type: 'action' },
      { label: 'Pesquisar referências e público', type: 'action' },
      { label: 'Definir coleção', type: 'action' },
      { label: 'Validar produtos', type: 'decision' },
      { label: 'Encontrar produção', type: 'person' },
      { label: 'Montar loja', type: 'module', module: 'Páginas de Venda' },
      { label: 'Planejar lançamento', type: 'module', module: 'Lançamentos' },
      { label: 'Criar conteúdos', type: 'module', module: 'Posts' },
      { label: 'Abrir vendas', type: 'result', module: 'Receita' },
    ],
  },
  {
    key: 'saas', name: 'Criar SaaS', category: 'Negócios',
    description: 'Problema, MVP, validação, aquisição e monetização.',
    objective: 'Transformar uma solução digital em negócio recorrente.',
    goal: 'Primeiros clientes pagantes',
    nodes: [
      { label: 'Escolher problema', type: 'action' },
      { label: 'Definir usuário-alvo', type: 'action' },
      { label: 'Validar dor', type: 'decision' },
      { label: 'Construir MVP', type: 'task' },
      { label: 'Testar com usuários', type: 'person' },
      { label: 'Definir assinatura', type: 'module', module: 'Ofertas' },
      { label: 'Criar aquisição', type: 'action' },
      { label: 'Medir uso e conversão', type: 'module', module: 'Analytics' },
      { label: 'Registrar receita recorrente', type: 'module', module: 'Receita' },
    ],
  },
  {
    key: 'service-business', name: 'Criar Negócio de Serviço', category: 'Negócios',
    description: 'Oferta, prova, aquisição, venda e entrega.',
    objective: 'Criar uma operação de serviço simples e vendável.',
    goal: 'Primeiro cliente',
    nodes: [
      { label: 'Escolher serviço', type: 'action' },
      { label: 'Definir público e dor', type: 'action' },
      { label: 'Montar prova/portfólio', type: 'task' },
      { label: 'Criar oferta', type: 'module', module: 'Ofertas' },
      { label: 'Criar apresentação comercial', type: 'module', module: 'Páginas de Venda' },
      { label: 'Prospectar', type: 'action' },
      { label: 'Registrar lead', type: 'module', module: 'Leads' },
      { label: 'Fechar cliente', type: 'result', module: 'Receita' },
    ],
  },
  {
    key: 'agency', name: 'Criar Agência', category: 'Negócios',
    description: 'Nicho, serviço, equipe, aquisição e operação.',
    objective: 'Estruturar uma agência repetível.',
    goal: 'Operação com clientes ativos',
    nodes: [
      { label: 'Escolher nicho', type: 'action' },
      { label: 'Definir serviço principal', type: 'action' },
      { label: 'Criar oferta', type: 'module', module: 'Ofertas' },
      { label: 'Criar processo de entrega', type: 'task' },
      { label: 'Mapear parceiros', type: 'module', module: 'Parcerias' },
      { label: 'Criar aquisição', type: 'action' },
      { label: 'Organizar leads', type: 'module', module: 'Leads' },
      { label: 'Acompanhar receita', type: 'module', module: 'Receita' },
    ],
  },
  {
    key: 'paid-newsletter', name: 'Criar Newsletter Paga', category: 'Negócios',
    description: 'Tema, audiência, conteúdo, oferta e recorrência.',
    objective: 'Construir uma publicação própria monetizada.',
    goal: 'Primeiros assinantes',
    nodes: [
      { label: 'Escolher tema', type: 'action' },
      { label: 'Definir promessa editorial', type: 'action' },
      { label: 'Criar conteúdo inicial', type: 'module', module: 'Posts' },
      { label: 'Criar base de leads', type: 'module', module: 'Leads' },
      { label: 'Configurar e-mail', type: 'module', module: 'Newsletter' },
      { label: 'Criar assinatura', type: 'module', module: 'Ofertas' },
      { label: 'Lançar assinatura', type: 'module', module: 'Lançamentos' },
      { label: 'Acompanhar recorrência', type: 'module', module: 'Receita' },
    ],
  },
  {
    key: 'affiliate-business', name: 'Criar Negócio de Afiliados', category: 'Negócios',
    description: 'Nicho, ofertas, parceiros, aquisição e comissão.',
    objective: 'Construir uma operação de afiliados.',
    goal: 'Primeiras comissões',
    nodes: [
      { label: 'Escolher nicho', type: 'action' },
      { label: 'Encontrar ofertas', type: 'action' },
      { label: 'Cadastrar ofertas', type: 'module', module: 'Ofertas' },
      { label: 'Mapear parceiros', type: 'module', module: 'Parcerias' },
      { label: 'Criar ativos de aquisição', type: 'action' },
      { label: 'Captar interessados', type: 'module', module: 'Leads' },
      { label: 'Acompanhar vendas', type: 'module', module: 'Receita' },
      { label: 'Otimizar ofertas', type: 'module', module: 'Analytics' },
    ],
  },
  {
    key: 'launch-product', name: 'Lançar Produto', category: 'Aquisição',
    description: 'Planejamento, pré-lançamento, lançamento e pós.',
    objective: 'Executar um lançamento com sequência clara.',
    goal: 'Meta de receita atingida',
    nodes: [
      { label: 'Definir meta do lançamento', type: 'metric' },
      { label: 'Criar lançamento', type: 'module', module: 'Lançamentos' },
      { label: 'Preparar oferta', type: 'module', module: 'Ofertas' },
      { label: 'Criar página', type: 'module', module: 'Páginas de Venda' },
      { label: 'Produzir pré-lançamento', type: 'module', module: 'Posts' },
      { label: 'Aquecer leads', type: 'module', module: 'Newsletter' },
      { label: 'Abrir vendas', type: 'task' },
      { label: 'Registrar receita', type: 'module', module: 'Receita' },
      { label: 'Analisar resultado', type: 'module', module: 'Analytics' },
    ],
  },
  {
    key: 'campaign', name: 'Criar Campanha', category: 'Aquisição',
    description: 'Objetivo, mensagem, peças, distribuição e análise.',
    objective: 'Criar uma campanha mensurável.',
    goal: 'Campanha publicada e medida',
    nodes: [
      { label: 'Definir objetivo', type: 'action' },
      { label: 'Escolher público', type: 'action' },
      { label: 'Definir mensagem', type: 'action' },
      { label: 'Criar peças', type: 'module', module: 'Posts' },
      { label: 'Distribuir', type: 'module', module: 'Newsletter' },
      { label: 'Captar resposta', type: 'module', module: 'Leads' },
      { label: 'Medir resultado', type: 'module', module: 'Analytics' },
      { label: 'Decidir próxima ação', type: 'decision' },
    ],
  },
  {
    key: 'funnel', name: 'Criar Funil de Vendas', category: 'Aquisição',
    description: 'Entrada, captura, nutrição, oferta e conversão.',
    objective: 'Criar uma jornada de aquisição até compra.',
    goal: 'Funil funcionando e medido',
    nodes: [
      { label: 'Definir oferta central', type: 'module', module: 'Ofertas' },
      { label: 'Criar entrada', type: 'action' },
      { label: 'Criar página de captura', type: 'module', module: 'Páginas de Venda' },
      { label: 'Captar lead', type: 'module', module: 'Leads' },
      { label: 'Nutrir', type: 'module', module: 'Newsletter' },
      { label: 'Apresentar oferta', type: 'module', module: 'Páginas de Venda' },
      { label: 'Registrar compra', type: 'module', module: 'Receita' },
      { label: 'Medir conversão', type: 'module', module: 'Analytics' },
    ],
  },
  {
    key: 'lead-capture', name: 'Captar Leads', category: 'Aquisição',
    description: 'Fonte, captura, base, nutrição e próximo passo.',
    objective: 'Criar uma máquina contínua de captação.',
    goal: 'Meta de leads',
    nodes: [
      { label: 'Escolher fonte de tráfego', type: 'action' },
      { label: 'Criar isca/oferta de entrada', type: 'module', module: 'Ofertas' },
      { label: 'Criar captura', type: 'module', module: 'Páginas de Venda' },
      { label: 'Receber lead', type: 'module', module: 'Leads' },
      { label: 'Nutrir lead', type: 'module', module: 'Newsletter' },
      { label: 'Qualificar', type: 'decision' },
      { label: 'Registrar oportunidade', type: 'module', module: 'Centro de Comando' },
    ],
  },
  {
    key: 'influencer-campaign', name: 'Campanha com Influenciador', category: 'Aquisição',
    description: 'Encontrar parceiro, negociar, publicar e medir.',
    objective: 'Transformar uma parceria de influência em aquisição.',
    goal: 'Campanha rentável',
    nodes: [
      { label: 'Definir público e oferta', type: 'action' },
      { label: 'Encontrar influenciadores', type: 'action' },
      { label: 'Cadastrar parceria', type: 'module', module: 'Parcerias' },
      { label: 'Negociar', type: 'person' },
      { label: 'Criar materiais', type: 'module', module: 'Posts' },
      { label: 'Publicar', type: 'task' },
      { label: 'Acompanhar leads e vendas', type: 'module', module: 'Leads' },
      { label: 'Acompanhar receita', type: 'module', module: 'Receita' },
    ],
  },
  {
    key: 'new-company', name: 'Criar Empresa do Zero', category: 'Operação',
    description: 'Ideia, oferta, estrutura, aquisição e controle.',
    objective: 'Organizar a primeira versão completa do negócio.',
    goal: 'Negócio operando',
    nodes: [
      { label: 'Definir problema', type: 'action' },
      { label: 'Escolher modelo de negócio', type: 'action' },
      { label: 'Definir oferta', type: 'module', module: 'Ofertas' },
      { label: 'Definir meta', type: 'module', module: 'Metas' },
      { label: 'Criar presença', type: 'module', module: 'Perfil' },
      { label: 'Criar aquisição', type: 'action' },
      { label: 'Organizar leads', type: 'module', module: 'Leads' },
      { label: 'Organizar receita', type: 'module', module: 'Receita' },
      { label: 'Revisar indicadores', type: 'module', module: 'Analytics' },
    ],
  },
  {
    key: 'product-structure', name: 'Estruturar Produto', category: 'Operação',
    description: 'Problema, solução, entrega, oferta e feedback.',
    objective: 'Transformar uma ideia em produto utilizável.',
    goal: 'Produto validado',
    nodes: [
      { label: 'Definir problema', type: 'action' },
      { label: 'Definir transformação', type: 'action' },
      { label: 'Desenhar experiência', type: 'action' },
      { label: 'Criar MVP', type: 'task' },
      { label: 'Testar', type: 'person' },
      { label: 'Recolher feedback', type: 'task' },
      { label: 'Ajustar', type: 'decision' },
      { label: 'Cadastrar oferta', type: 'module', module: 'Ofertas' },
    ],
  },
  {
    key: 'validate-idea', name: 'Validar Ideia', category: 'Operação',
    description: 'Pesquisa, hipótese, teste, sinais e decisão.',
    objective: 'Reduzir incerteza antes de investir mais.',
    goal: 'Decisão baseada em evidência',
    nodes: [
      { label: 'Formular hipótese', type: 'action' },
      { label: 'Definir público', type: 'action' },
      { label: 'Pesquisar mercado', type: 'action' },
      { label: 'Criar teste mínimo', type: 'task' },
      { label: 'Captar respostas', type: 'module', module: 'Leads' },
      { label: 'Medir sinais', type: 'module', module: 'Analytics' },
      { label: 'Validou?', type: 'decision' },
      { label: 'Decidir continuar ou ajustar', type: 'result' },
    ],
  },
  {
    key: 'sales-process', name: 'Criar Processo de Vendas', category: 'Operação',
    description: 'Lead, qualificação, proposta, follow-up e fechamento.',
    objective: 'Criar um processo comercial repetível.',
    goal: 'Processo documentado',
    nodes: [
      { label: 'Definir ICP', type: 'action' },
      { label: 'Definir oferta', type: 'module', module: 'Ofertas' },
      { label: 'Definir entrada de leads', type: 'module', module: 'Leads' },
      { label: 'Qualificar', type: 'task' },
      { label: 'Apresentar proposta', type: 'task' },
      { label: 'Follow-up', type: 'task' },
      { label: 'Fechou?', type: 'decision' },
      { label: 'Registrar receita', type: 'module', module: 'Receita' },
    ],
  },
  {
    key: 'customer-service', name: 'Criar Processo de Atendimento', category: 'Operação',
    description: 'Entrada, diagnóstico, solução, acompanhamento e retenção.',
    objective: 'Padronizar atendimento e pós-venda.',
    goal: 'Processo operacional',
    nodes: [
      { label: 'Definir canais', type: 'action' },
      { label: 'Registrar contato', type: 'module', module: 'Leads' },
      { label: 'Diagnosticar demanda', type: 'task' },
      { label: 'Resolver', type: 'task' },
      { label: 'Registrar solução', type: 'note' },
      { label: 'Acompanhar satisfação', type: 'metric' },
      { label: 'Criar oportunidade de retenção', type: 'module', module: 'Ofertas' },
    ],
  },
  {
    key: 'hiring', name: 'Criar Processo de Contratação', category: 'Operação',
    description: 'Necessidade, perfil, seleção, entrevista e onboarding.',
    objective: 'Contratar de forma estruturada.',
    goal: 'Pessoa certa integrada',
    nodes: [
      { label: 'Definir necessidade', type: 'action' },
      { label: 'Definir perfil', type: 'action' },
      { label: 'Abrir busca', type: 'task' },
      { label: 'Filtrar candidatos', type: 'task' },
      { label: 'Entrevistar', type: 'person' },
      { label: 'Escolher', type: 'decision' },
      { label: 'Fazer onboarding', type: 'task' },
      { label: 'Registrar responsabilidades', type: 'note' },
    ],
  },
  {
    key: 'personal-routine', name: 'Rotina Pessoal', category: 'Pessoal',
    description: 'Organize uma sequência diária de ações e decisões pessoais.',
    objective: 'Criar uma rotina executável e repetível.',
    goal: 'Rotina concluída',
    nodes: [
      { label: 'Definir prioridade do dia', type: 'action' },
      { label: 'Planejar blocos de tempo', type: 'task' },
      { label: 'Executar hábitos', type: 'module', module: 'GOAT' },
      { label: 'Revisar o dia', type: 'metric', module: 'GOAT' },
      { label: 'Dia cumprido?', type: 'decision' },
      { label: 'Ajustar amanhã', type: 'action' },
    ],
  },
  {
    key: 'study-plan', name: 'Plano de Estudos', category: 'Pessoal',
    description: 'Do objetivo de aprendizado até revisão e execução.',
    objective: 'Transformar estudo em um processo consistente.',
    goal: 'Conteúdo dominado',
    nodes: [
      { label: 'Definir objetivo', type: 'action' },
      { label: 'Escolher material', type: 'action', module: 'GOAT' },
      { label: 'Criar sessão de estudo', type: 'task' },
      { label: 'Registrar aprendizado', type: 'note' },
      { label: 'Revisar', type: 'task' },
      { label: 'Dominou?', type: 'decision' },
      { label: 'Voltar ao estudo', type: 'action' },
    ],
  },
  {
    key: 'health-project', name: 'Projeto de Saúde', category: 'Pessoal',
    description: 'Meta, rotina, acompanhamento corporal e revisão.',
    objective: 'Executar um projeto pessoal de evolução física.',
    goal: 'Meta física atingida',
    nodes: [
      { label: 'Definir meta', type: 'metric', module: 'Metas' },
      { label: 'Criar hábitos', type: 'module', module: 'GOAT' },
      { label: 'Executar treino e rotina', type: 'task' },
      { label: 'Registrar Body Analytics', type: 'module', module: 'GOAT' },
      { label: 'Revisar evolução', type: 'decision' },
      { label: 'Ajustar rotina', type: 'action' },
    ],
  },
  {
    key: 'personal-project', name: 'Projeto Pessoal', category: 'Pessoal',
    description: 'Estruture qualquer projeto pessoal em etapas reutilizáveis.',
    objective: 'Tirar um projeto da cabeça e levar até a conclusão.',
    goal: 'Projeto concluído',
    nodes: [
      { label: 'Definir resultado final', type: 'result' },
      { label: 'Quebrar em etapas', type: 'action' },
      { label: 'Executar próxima etapa', type: 'task' },
      { label: 'Verificar progresso', type: 'metric' },
      { label: 'Concluiu?', type: 'decision' },
      { label: 'Corrigir ou continuar', type: 'action' },
    ],
  },
];


type TemplateResearch = {
  sources: Array<{ label: string; url: string }>;
  realPlan: string[];
  idealPlan: string[];
};

const TEMPLATE_RESEARCH: Record<string, TemplateResearch> = {
  'shopify-store': {
    sources: [
      { label: 'Shopify — checklist para abrir uma nova loja', url: 'https://help.shopify.com/pt-BR/manual/intro-to-shopify/initial-setup/new-to-shopify-checklists/general-checklist' },
      { label: 'Google Analytics — medição de e-commerce', url: 'https://support.google.com/analytics/answer/14430645?hl=pt-BR' },
    ],
    realPlan: ['Definir objetivos', 'Configurar informações básicas', 'Adicionar produtos', 'Escolher e ajustar a aparência', 'Configurar domínio, pagamentos e operação', 'Testar a experiência de compra', 'Lançar e promover', 'Medir eventos de e-commerce'],
    idealPlan: ['Validar oferta e margem antes de escalar', 'Usar critérios de entrada e saída por etapa', 'Conectar oferta, página e receita no RiseGoat', 'Medir conversão após o lançamento', 'Fazer revisão e iteração'],
  },
  'digital-product': {
    sources: [{ label: 'SBA — pesquisa e planejamento de negócio', url: 'https://www.sba.gov/counseling/plan-your-business/' }, { label: 'Atlassian — ciclo de vida de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }],
    realPlan: ['Pesquisar mercado e clientes', 'Definir problema e proposta', 'Planejar produto', 'Executar e testar', 'Preparar entrega', 'Lançar', 'Monitorar e revisar'],
    idealPlan: ['Validar demanda em pequena escala', 'Transformar etapas em tarefas verificáveis', 'Conectar oferta e página', 'Registrar feedback', 'Revisar pós-lançamento'],
  },
  'clothing-brand': {
    sources: [{ label: 'SBA — planejamento', url: 'https://www.sba.gov/counseling/plan-your-business/' }, { label: 'Shopify — primeiros passos', url: 'https://help.shopify.com/pt-BR/manual/intro-to-shopify/initial-setup/setup-getting-started' }],
    realPlan: ['Pesquisar mercado e público', 'Definir posicionamento e produto', 'Planejar coleção', 'Organizar produção', 'Preparar loja', 'Lançar', 'Vender e acompanhar'],
    idealPlan: ['Validar coleção antes de produzir volume alto', 'Registrar custos e margem', 'Definir critérios de aprovação por peça', 'Conectar lançamento, conteúdo e receita', 'Revisar demanda e margem'],
  },
  'saas': {
    sources: [{ label: 'Atlassian — ciclo de vida de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }, { label: 'Stripe — modelos de assinatura', url: 'https://docs.stripe.com/billing/subscriptions/metered-billing/thresholds' }, { label: 'Google Analytics — e-commerce e conversões', url: 'https://support.google.com/analytics/answer/14430645?hl=pt-BR' }],
    realPlan: ['Definir problema e objetivo', 'Planejar solução', 'Construir e testar', 'Monitorar uso', 'Definir cobrança', 'Lançar', 'Acompanhar resultados'],
    idealPlan: ['Validar o problema antes de ampliar', 'Manter MVP pequeno', 'Definir eventos e métricas', 'Testar preço e recorrência', 'Criar ciclo contínuo de feedback'],
  },
  'service-business': {
    sources: [{ label: 'HubSpot — qualificação de leads', url: 'https://blog.hubspot.com/sales/ultimate-guide-to-sales-qualification' }, { label: 'SBA — planejamento', url: 'https://www.sba.gov/counseling/plan-your-business/' }],
    realPlan: ['Definir cliente ideal', 'Definir problema e serviço', 'Criar oferta/proposta', 'Gerar e qualificar leads', 'Fazer contato', 'Apresentar proposta', 'Fechar e entregar'],
    idealPlan: ['Definir critérios antes da prospecção', 'Criar processo de proposta e follow-up', 'Registrar leads e receita', 'Documentar entrega', 'Revisar preço, escopo e aquisição'],
  },
  'agency': {
    sources: [{ label: 'HubSpot — pipeline de vendas', url: 'https://blog.hubspot.com/sales/sales-pipeline' }, { label: 'Atlassian — ciclo de vida de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }],
    realPlan: ['Definir nicho e oferta', 'Gerar e qualificar leads', 'Propor', 'Fechar', 'Executar entrega', 'Monitorar resultado', 'Melhorar processo'],
    idealPlan: ['Padronizar proposta e onboarding', 'Separar aquisição, vendas e entrega', 'Definir capacidade', 'Criar indicadores por cliente', 'Documentar processos repetíveis'],
  },
  'paid-newsletter': {
    sources: [{ label: 'Mailchimp — primeiros passos', url: 'https://mailchimp.com/pt-br/help/getting-started-with-mailchimp/' }, { label: 'Mailchimp — campanhas', url: 'https://mailchimp.com/pt-br/help/getting-started-with-campaigns/' }],
    realPlan: ['Definir público e proposta editorial', 'Configurar audiência', 'Criar formulário', 'Produzir conteúdo', 'Criar campanha', 'Enviar/automatizar', 'Medir'],
    idealPlan: ['Separar gratuito e pago', 'Criar calendário editorial', 'Definir métricas de aquisição e conversão', 'Conectar leads/ofertas/receita', 'Revisar retenção'],
  },
  'affiliate-business': {
    sources: [{ label: 'SBA — pesquisa e planejamento', url: 'https://www.sba.gov/counseling/plan-your-business/' }, { label: 'Google Analytics — e-commerce', url: 'https://support.google.com/analytics/answer/14430645?hl=pt-BR' }],
    realPlan: ['Escolher mercado e público', 'Pesquisar ofertas', 'Escolher canais', 'Criar aquisição', 'Gerar tráfego', 'Acompanhar conversões', 'Otimizar'],
    idealPlan: ['Avaliar comissão versus custo', 'Registrar ofertas como unidades de monetização', 'Mensurar jornada', 'Cortar canais sem retorno', 'Revisar economia da oferta'],
  },
  'launch-product': {
    sources: [{ label: 'Atlassian — execução de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }, { label: 'Mailchimp — campanhas', url: 'https://mailchimp.com/pt-br/help/getting-started-with-campaigns/' }],
    realPlan: ['Definir objetivo', 'Planejar', 'Preparar ativos', 'Executar', 'Monitorar', 'Encerrar e revisar'],
    idealPlan: ['Definir critérios por fase', 'Conectar conteúdo à oferta', 'Registrar meta e resultado', 'Fazer revisão imediata', 'Transformar aprendizados em próximo ciclo'],
  },
  'campaign': {
    sources: [{ label: 'Mailchimp — campanhas', url: 'https://mailchimp.com/pt-br/help/getting-started-with-campaigns/' }, { label: 'Atlassian — execução', url: 'https://www.atlassian.com/work-management/project-management/phases/' }],
    realPlan: ['Definir objetivo', 'Definir público', 'Criar mensagem e ativos', 'Distribuir', 'Publicar', 'Medir', 'Revisar'],
    idealPlan: ['Definir métrica principal', 'Testar antes de escalar', 'Registrar resultado por canal', 'Documentar aprendizado', 'Iterar'],
  },
  'funnel': {
    sources: [{ label: 'Mailchimp — jornada do cliente', url: 'https://mailchimp.com/resources/define-your-customer-journey-for-better-email-marketing/' }, { label: 'HubSpot — pipeline', url: 'https://blog.hubspot.com/sales/sales-pipeline' }],
    realPlan: ['Definir oferta e público', 'Criar entrada', 'Capturar contato', 'Nutrir/qualificar', 'Apresentar oferta', 'Converter', 'Medir'],
    idealPlan: ['Definir critérios de passagem', 'Separar qualificados', 'Criar mensagens por estágio', 'Medir conversão por etapa', 'Corrigir gargalo'],
  },
  'lead-capture': {
    sources: [{ label: 'Mailchimp — formulário de inscrição', url: 'https://mailchimp.com/pt-br/help/create-a-hosted-signup-form/' }, { label: 'HubSpot — qualificação', url: 'https://blog.hubspot.com/sales/ultimate-guide-to-sales-qualification' }],
    realPlan: ['Definir público e oferta de entrada', 'Criar captura', 'Coletar contatos', 'Qualificar', 'Nutrir/encaminhar', 'Medir'],
    idealPlan: ['Definir critérios antes de escalar', 'Conectar origem do lead', 'Criar nutrição', 'Registrar próxima ação', 'Medir oportunidade e venda'],
  },
  'influencer-campaign': {
    sources: [{ label: 'HubSpot — pipeline de vendas', url: 'https://blog.hubspot.com/sales/sales-pipeline' }, { label: 'Mailchimp — campanhas', url: 'https://mailchimp.com/pt-br/help/getting-started-with-campaigns/' }],
    realPlan: ['Definir objetivo e público', 'Encontrar parceiros', 'Avaliar fit', 'Negociar', 'Executar', 'Medir leads/vendas', 'Revisar'],
    idealPlan: ['Definir critérios de parceiro', 'Registrar comissão e entregas', 'Usar identificação por parceiro', 'Conectar leads e receita', 'Renovar com base em resultado'],
  },
  'new-company': {
    sources: [{ label: 'SBA — planejar um negócio', url: 'https://www.sba.gov/counseling/plan-your-business/' }, { label: 'SBA — lançar um negócio', url: 'https://www.sba.gov/counseling/launch-your-business/' }],
    realPlan: ['Pesquisar mercado', 'Escrever plano', 'Calcular custos iniciais', 'Definir estrutura/registro', 'Lançar', 'Operar', 'Revisar'],
    idealPlan: ['Definir premissas e critérios de validação', 'Registrar custos', 'Definir metas', 'Criar processos essenciais', 'Revisar mensalmente'],
  },
  'product-structure': {
    sources: [{ label: 'Atlassian — ciclo de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }, { label: 'HubSpot — necessidades do prospect', url: 'https://blog.hubspot.com/sales/ultimate-guide-to-sales-qualification' }],
    realPlan: ['Definir problema', 'Definir resultado', 'Planejar solução', 'Construir', 'Testar', 'Ajustar', 'Preparar entrega'],
    idealPlan: ['Definir critérios de aceitação', 'Testar cedo', 'Registrar feedback', 'Conectar produto à oferta', 'Revisar pós-entrega'],
  },
  'validate-idea': {
    sources: [{ label: 'SBA — pesquisa de mercado', url: 'https://www.sba.gov/counseling/plan-your-business/' }, { label: 'Atlassian — iniciação de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }],
    realPlan: ['Formular hipótese', 'Pesquisar mercado/concorrência', 'Definir teste', 'Executar', 'Avaliar evidências', 'Decidir'],
    idealPlan: ['Definir antes qual evidência muda a decisão', 'Testar a hipótese mais arriscada primeiro', 'Separar dados de interpretação', 'Não escalar antes de validar', 'Documentar decisão'],
  },
  'sales-process': {
    sources: [{ label: 'HubSpot — qualificação', url: 'https://blog.hubspot.com/sales/ultimate-guide-to-sales-qualification' }, { label: 'HubSpot — pipeline', url: 'https://blog.hubspot.com/sales/sales-pipeline' }],
    realPlan: ['Definir ICP', 'Definir critérios', 'Gerar leads', 'Classificar', 'Contato inicial', 'Qualificar', 'Proposta', 'Fechar', 'Revisar'],
    idealPlan: ['Registrar critérios no lead', 'Separar estágios quando fizer sentido', 'Definir próxima ação', 'Medir conversão por etapa', 'Revisar gargalos'],
  },
  'customer-service': {
    sources: [{ label: 'Atlassian — processos e execução', url: 'https://www.atlassian.com/work-management/project-management/phases/' }, { label: 'HubSpot — pipeline/ciclo de cliente', url: 'https://blog.hubspot.com/sales/sales-pipeline' }],
    realPlan: ['Definir canal', 'Registrar demanda', 'Diagnosticar', 'Resolver', 'Registrar resultado', 'Acompanhar', 'Revisar padrões'],
    idealPlan: ['Definir prioridade e prazo', 'Criar procedimentos reutilizáveis', 'Registrar problemas recorrentes', 'Transformar feedback em melhorias', 'Revisar qualidade'],
  },
  'hiring': {
    sources: [{ label: 'SBA — organização do negócio', url: 'https://www.sba.gov/counseling/plan-your-business/' }, { label: 'Atlassian — iniciação e planejamento', url: 'https://www.atlassian.com/work-management/project-management/phases/' }],
    realPlan: ['Definir necessidade', 'Definir função e critérios', 'Buscar', 'Filtrar', 'Entrevistar', 'Escolher', 'Integrar'],
    idealPlan: ['Definir critérios antes de selecionar', 'Separar essenciais de desejáveis', 'Registrar evidências', 'Criar onboarding', 'Revisar contratação'],
  },
  'personal-routine': {
    sources: [{ label: 'Todoist — revisão semanal', url: 'https://www.todoist.com/pt-BR/productivity-methods/weekly-review' }],
    realPlan: ['Escolher dia/hora de revisão', 'Fazer inventário', 'Revisar concluídas e pendentes', 'Revisar metas/projetos', 'Planejar semana seguinte'],
    idealPlan: ['Manter checklist pessoal', 'Usar métricas objetivas', 'Transformar pendências em próximas ações', 'Revisar o que realmente avançou', 'Manter o processo sustentável'],
  },
  'study-plan': {
    sources: [{ label: 'Learning Scientists — spaced practice', url: 'https://www.learningscientists.org/blog/2016/7/21-1' }, { label: 'Learning Scientists — retrieval practice', url: 'https://www.learningscientists.org/blog/2016/6/23-1' }],
    realPlan: ['Planejar sessões espaçadas', 'Distribuir o estudo no tempo', 'Recuperar informação da memória', 'Revisar conteúdo antigo', 'Avaliar o que ainda não domina'],
    idealPlan: ['Combinar espaçamento e recuperação', 'Usar perguntas sem consultar o material', 'Intercalar quando fizer sentido', 'Registrar dúvidas', 'Revisar semanalmente'],
  },
  'health-project': {
    sources: [{ label: 'CDC — atividade física para adultos', url: 'https://cdc.gov/physical-activity-basics/adding-adults/index.html' }, { label: 'NIH/NICHD — sono', url: 'https://www.nichd.nih.gov/health/topics/sleep/conditioninfo/how-much' }],
    realPlan: ['Definir objetivo', 'Escolher atividades adequadas', 'Planejar frequência', 'Registrar atividade e sono', 'Revisar evolução'],
    idealPlan: ['Usar métricas simples', 'Progredir conforme capacidade', 'Acompanhar sono', 'Usar histórico do Body Analytics', 'Adaptar orientações com profissional quando necessário'],
  },
  'personal-project': {
    sources: [{ label: 'Atlassian — ciclo de projetos', url: 'https://www.atlassian.com/work-management/project-management/phases/' }, { label: 'Todoist — revisão semanal', url: 'https://www.todoist.com/pt-BR/productivity-methods/weekly-review' }],
    realPlan: ['Definir resultado final', 'Iniciar', 'Planejar', 'Executar', 'Monitorar', 'Concluir e revisar'],
    idealPlan: ['Definir critério de conclusão', 'Quebrar em próximas ações', 'Revisar semanalmente', 'Registrar bloqueios', 'Guardar aprendizados'],
  },
};

function templateMode(template: Template): 'pessoal' | 'negocios' {
  return template.category === 'Pessoal' ? 'pessoal' : 'negocios';
}
function moneyShort(v: number) {
  const n = Number(v || 0);
  if (n >= 1000000) return 'R$ ' + (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
  if (n >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + ' mil';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function nodeClass(type: NodeType) {
  return NODE_META[type]?.className || NODE_META.note.className;
}

function Button({ children, onClick, tone = 'dark', disabled = false }: { children: ReactNode; onClick?: () => void; tone?: 'dark' | 'blue' | 'red' | 'ghost'; disabled?: boolean }) {
  const cls = tone === 'blue'
    ? 'bg-blue-600 hover:bg-blue-500'
    : tone === 'red'
      ? 'bg-red-600 hover:bg-red-500'
      : tone === 'ghost'
        ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
        : 'bg-slate-950 hover:bg-slate-800';
  return <button onClick={onClick} disabled={disabled} className={'inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 text-white ' + cls}>{children}</button>;
}

function Field({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<string | { value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-800 outline-none focus:border-slate-400">
          <option value="">Nenhum</option>
          {options.map(option => {
            const item = typeof option === 'string' ? { value: option, label: option } : option;
            return <option key={item.value} value={item.value}>{item.label}</option>;
          })}
        </select>
        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </label>
  );
}

function CanvasNode({ node, selected, connectFrom, onSelect, onStartConnect, onDrag }: {
  node: FlowNode; selected: boolean; connectFrom: boolean; onSelect: () => void; onStartConnect: () => void; onDrag: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const meta = NODE_META[node.node_type]; const Icon = meta.icon;
  return (
    <div
      onPointerDown={onDrag}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={'absolute w-52 rounded-2xl border-2 bg-white shadow-sm cursor-grab active:cursor-grabbing select-none transition ' + (selected ? 'ring-4 ring-slate-950/10 border-slate-950' : '') + (connectFrom ? ' ring-4 ring-blue-200' : '')}
      style={{ left: node.position_x, top: node.position_y }}
    >
      <div className="px-3.5 py-3 border-b border-slate-100 flex items-center gap-2">
        <div className={'w-8 h-8 rounded-lg flex items-center justify-center border ' + meta.className}><Icon className="w-4 h-4" /></div>
        <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">{meta.label}</p><p className="text-xs font-bold text-slate-800 truncate">{node.label}</p></div>
      </div>
      <div className="p-3">
        <p className="text-[11px] leading-5 text-slate-500 line-clamp-3">{node.description || 'Sem descrição.'}</p>
        {node.module_name && <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700"><Link2 className="w-3 h-3" /> {node.module_name}</span>}
        <div className="flex items-center justify-end gap-1.5 mt-2">
          <button onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onStartConnect(); }} className="text-[10px] font-semibold text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg">Conectar</button>
          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>
    </div>
  );
}

export function ActionFlowsPage({ navigate }: { navigate: (path: string) => void }) {
  const { user, workspaceMode } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<'library' | 'builder' | 'run'>('library');
  const [flow, setFlow] = useState<Flow | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [run, setRun] = useState<Run | null>(null);
  const [runNodes, setRunNodes] = useState<RunNode[]>([]);
  const [runLoading, setRunLoading] = useState(false);
  const [runModal, setRunModal] = useState(false);
  const [researchTemplate, setResearchTemplate] = useState<Template | null>(null);

  async function loadLibrary() {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const { data: flowData, error: flowError } = await supabase
        .from('action_flows')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_mode', workspaceMode)
        .order('updated_at', { ascending: false });
      if (flowError) throw flowError;
      const currentFlows = (flowData || []) as Flow[];
      const flowIds = currentFlows.map(f => f.id);
      const { data: runData, error: runError } = flowIds.length
        ? await supabase.from('action_flow_runs').select('*').eq('user_id', user.id).in('flow_id', flowIds).order('started_at', { ascending: false })
        : { data: [], error: null };
      if (runError) throw runError;
      setFlows(currentFlows);
      setRuns((runData || []) as Run[]);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os fluxos.');
      setFlows([]);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadLibrary(); }, [user?.id, workspaceMode]);

  async function openFlow(flowItem: Flow) {
    setError('');
    const [n, e] = await Promise.all([
      supabase.from('action_flow_nodes').select('*').eq('flow_id', flowItem.id).eq('user_id', user!.id).order('sort_order'),
      supabase.from('action_flow_edges').select('*').eq('flow_id', flowItem.id).eq('user_id', user!.id),
    ]);
    const err = n.error || e.error;
    if (err) return setError(err.message);
    setFlow(flowItem);
    setNodes((n.data || []) as FlowNode[]);
    setEdges((e.data || []) as FlowEdge[]);
    setSelectedNodeId(n.data?.[0]?.id || null);
    setConnectFrom(null);
    setScreen('builder');
  }

  function resolveStepModule(step: string, template: Template) {
    const normalized = step.toLowerCase();
    const candidates: Array<keyof typeof MODULES> = [
      'Receita','Ofertas','Páginas de Venda','Leads','Newsletter','Analytics','Lançamentos','Parcerias','Metas','GOAT',
    ];
    const direct = template.nodes.find(n => n.label.toLowerCase() === step.toLowerCase())?.module;
    if (direct) return direct;
    if (normalized.includes('receita') || normalized.includes('venda') || normalized.includes('compra')) return 'Receita';
    if (normalized.includes('oferta') || normalized.includes('produto') || normalized.includes('assinatura')) return 'Ofertas';
    if (normalized.includes('página') || normalized.includes('pagina') || normalized.includes('checkout') || normalized.includes('domínio') || normalized.includes('dominio')) return 'Páginas de Venda';
    if (normalized.includes('lead') || normalized.includes('contato') || normalized.includes('captur')) return 'Leads';
    if (normalized.includes('newsletter') || normalized.includes('e-mail') || normalized.includes('email')) return 'Newsletter';
    if (normalized.includes('analytics') || normalized.includes('medir') || normalized.includes('métrica') || normalized.includes('metrica')) return 'Analytics';
    if (normalized.includes('lançamento') || normalized.includes('lancamento')) return 'Lançamentos';
    if (normalized.includes('parceria') || normalized.includes('influenci')) return 'Parcerias';
    if (normalized.includes('meta') || normalized.includes('objetivo')) return 'Metas';
    if (template.category === 'Pessoal' && (normalized.includes('hábito') || normalized.includes('habito') || normalized.includes('sono') || normalized.includes('atividade') || normalized.includes('rotina'))) return 'GOAT';
    return null as typeof candidates[number] | null;
  }

  function resolveStepType(step: string, index: number, total: number): NodeType {
    const normalized = step.toLowerCase().trim();
    if (/[?]$/.test(step.trim()) || normalized.includes('decidir') || normalized.includes('validou')) return 'decision';
    if (normalized.includes('medir') || normalized.includes('monitorar') || normalized.includes('acompanhar') || normalized.includes('avaliar')) return 'metric';
    if (index === total - 1 && (normalized.includes('primeira') || normalized.includes('resultado') || normalized.includes('concluir') || normalized.includes('decid'))) return 'result';
    return 'action';
  }

  async function createFlow(template?: Template, planMode: 'base' | 'ideal' = 'ideal') {
    if (!user) return;
    const research = template ? TEMPLATE_RESEARCH[template.key] : undefined;
    const selectedPlan = research ? (planMode === 'base' ? research.realPlan : research.idealPlan) : [];
    const base = template ? {
      name: template.name + (research ? (planMode === 'base' ? ' — Plano Base' : ' — Plano Ideal') : ''),
      category: template.category,
      template_key: template.key,
      objective: template.objective,
      goal: template.goal,
    } : {
      name: 'Meu novo fluxo',
      category: workspaceMode === 'pessoal' ? 'Pessoal' : 'Negócios',
      template_key: null,
      objective: '',
      goal: '',
    };
    const sourceRefs = research?.sources || [];
    const { data, error: e } = await supabase.from('action_flows').insert({
      user_id: user.id,
      workspace_mode: workspaceMode,
      plan_mode: template ? planMode : 'ideal',
      source_refs: sourceRefs,
      ...base,
    }).select().single();
    if (e || !data) return setError(e?.message || 'Não foi possível criar o fluxo.');
    let createdNodes: FlowNode[] = [];
    if (template && selectedPlan.length) {
      const payload = selectedPlan.map((step, i) => {
        const moduleName = resolveStepModule(step, template);
        return {
          id: crypto.randomUUID(),
          flow_id: data.id,
          user_id: user.id,
          node_type: resolveStepType(step, i, selectedPlan.length),
          label: step,
          description: planMode === 'base' ? 'Etapa do plano documentado nas fontes deste modelo.' : 'Etapa do plano ideal do RiseGoat, construída como camada de organização sobre as fontes.',
          module_name: moduleName,
          module_path: moduleName ? MODULES[moduleName] : null,
          position_x: 70 + (i % 4) * 230,
          position_y: 70 + Math.floor(i / 4) * 190,
          metadata: { source_backed: planMode === 'base', source_labels: sourceRefs.map(s => s.label) },
          sort_order: i,
        };
      });
      const { data: nodeData, error: ne } = await supabase.from('action_flow_nodes').insert(payload).select();
      if (ne) return setError(ne.message);
      createdNodes = (nodeData || []) as FlowNode[];
      const createdEdges = createdNodes.slice(0, -1).map((n, i) => ({
        id: crypto.randomUUID(),
        flow_id: data.id,
        user_id: user.id,
        source_node_id: n.id,
        target_node_id: createdNodes[i + 1].id,
        edge_label: '',
        branch_key: '',
      }));
      if (createdEdges.length) {
        const { error: ee } = await supabase.from('action_flow_edges').insert(createdEdges);
        if (ee) return setError(ee.message);
      }
    } else if (template) {
      const payload = template.nodes.map((n, i) => ({
        id: crypto.randomUUID(), flow_id: data.id, user_id: user.id, node_type: n.type || 'action',
        label: n.label, description: n.description || '', module_name: n.module || null,
        module_path: n.module ? MODULES[n.module] : null, position_x: n.x ?? 70 + (i % 4) * 230,
        position_y: n.y ?? 70 + Math.floor(i / 4) * 190, metadata: {}, sort_order: i,
      }));
      const { data: nodeData, error: ne } = await supabase.from('action_flow_nodes').insert(payload).select();
      if (ne) return setError(ne.message);
      createdNodes = (nodeData || []) as FlowNode[];
    } else {
      const first: FlowNode = {
        id: crypto.randomUUID(), flow_id: data.id, user_id: user.id, node_type: 'action',
        label: 'Objetivo inicial', description: 'Defina o primeiro movimento deste fluxo.',
        module_name: null, module_path: null, position_x: 100, position_y: 120, metadata: {}, sort_order: 0,
      };
      const { data: nodeData, error: ne } = await supabase.from('action_flow_nodes').insert(first).select().single();
      if (ne || !nodeData) return setError(ne?.message || 'Não foi possível criar o primeiro bloco.');
      createdNodes = [nodeData as FlowNode];
    }
    const nextFlow = data as Flow;
    setFlows(v => [nextFlow, ...v]);
    setFlow(nextFlow); setNodes(createdNodes); setEdges([]); setSelectedNodeId(createdNodes[0]?.id || null); setScreen('builder');
  }

  async function saveFlow() {
    if (!flow || !user) return;
    setSaving(true); setError('');
    const { error: fe } = await supabase.from('action_flows').update({
      name: flow.name.trim() || 'Fluxo sem nome', category: flow.category, objective: flow.objective,
      goal: flow.goal, plan_mode: flow.plan_mode, source_refs: flow.source_refs, updated_at: new Date().toISOString(),
    }).eq('id', flow.id).eq('user_id', user.id);
    if (fe) { setSaving(false); return setError(fe.message); }
    const nodeResults = await Promise.all(nodes.map(n => supabase.from('action_flow_nodes').update({
      node_type: n.node_type, label: n.label, description: n.description, module_name: n.module_name,
      module_path: n.module_path, position_x: n.position_x, position_y: n.position_y, metadata: n.metadata,
      sort_order: n.sort_order, updated_at: new Date().toISOString(),
    }).eq('id', n.id).eq('flow_id', flow.id).eq('user_id', user.id)));
    const nodeError = nodeResults.find(x => x.error)?.error;
    if (nodeError) { setSaving(false); return setError(nodeError.message); }
    const { error: de } = await supabase.from('action_flow_edges').delete().eq('flow_id', flow.id).eq('user_id', user.id);
    if (de) { setSaving(false); return setError(de.message); }
    if (edges.length) {
      const { error: ee } = await supabase.from('action_flow_edges').insert(edges.map(e => ({ ...e, id: e.id || crypto.randomUUID() })));
      if (ee) { setSaving(false); return setError(ee.message); }
    }
    setFlows(v => v.map(x => x.id === flow.id ? { ...flow, updated_at: new Date().toISOString() } : x));
    setSaving(false);
  }

  function updateNode(id: string, patch: Partial<FlowNode>) {
    setNodes(v => v.map(n => n.id === id ? { ...n, ...patch } : n));
  }

  function addNode(type: NodeType = 'action') {
    const nextId = crypto.randomUUID();
    const node: FlowNode = {
      id: nextId, flow_id: flow!.id, user_id: user!.id, node_type: type,
      label: NODE_META[type].label + ' nova', description: '',
      module_name: type === 'module' ? 'Ofertas' : null,
      module_path: type === 'module' ? MODULES.Ofertas : null,
      position_x: 90 + ((nodes.length + 1) % 4) * 230,
      position_y: 100 + (Math.floor((nodes.length + 1) / 4) % 3) * 190,
      metadata: {}, sort_order: nodes.length,
    };
    setNodes(v => [...v, node]); setSelectedNodeId(nextId);
  }

  function removeNode(id: string) {
    setNodes(v => v.filter(n => n.id !== id));
    setEdges(v => v.filter(e => e.source_node_id !== id && e.target_node_id !== id));
    setSelectedNodeId(v => v === id ? null : v);
  }

  function connectNodes(targetId: string) {
    if (!connectFrom || connectFrom === targetId || !flow || !user) return;
    const exists = edges.some(e => e.source_node_id === connectFrom && e.target_node_id === targetId);
    if (!exists) {
      setEdges(v => [...v, { id: crypto.randomUUID(), flow_id: flow.id, user_id: user.id, source_node_id: connectFrom, target_node_id: targetId, edge_label: '', branch_key: '' }]);
    }
    setConnectFrom(null);
  }

  function dragNode(id: string, start: ReactPointerEvent<HTMLDivElement>) {
    start.currentTarget.setPointerCapture(start.pointerId);
    const startX = start.clientX, startY = start.clientY;
    const current = nodes.find(n => n.id === id);
    if (!current) return;
    const originX = current.position_x, originY = current.position_y;
    const move = (ev: PointerEvent) => updateNode(id, { position_x: Math.max(12, originX + ev.clientX - startX), position_y: Math.max(12, originY + ev.clientY - startY) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  async function deleteFlow(id: string) {
    if (!user || !window.confirm('Excluir este fluxo e suas execuções?')) return;
    const { error: e } = await supabase.from('action_flows').delete().eq('id', id).eq('user_id', user.id);
    if (e) return setError(e.message);
    setFlows(v => v.filter(x => x.id !== id));
    setRuns(v => v.filter(x => x.flow_id !== id));
  }

  async function cloneFlow(source: Flow) {
    if (!user) return;
    setError('');
    const { data: copied, error: fe } = await supabase.from('action_flows').insert({
      user_id: user.id,
      name: source.name + ' — cópia',
      category: source.category,
      template_key: source.template_key,
      objective: source.objective,
      goal: source.goal,
      status: 'draft',
      workspace_mode: source.workspace_mode,
    }).select().single();
    if (fe || !copied) return setError(fe?.message || 'Não foi possível duplicar o fluxo.');
    const { data: sourceNodes, error: ne } = await supabase.from('action_flow_nodes').select('*').eq('flow_id', source.id).eq('user_id', user.id).order('sort_order');
    if (ne) return setError(ne.message);
    const idMap = new Map<string, string>();
    const nodeRows = (sourceNodes || []).map((n: FlowNode) => {
      const id = crypto.randomUUID();
      idMap.set(n.id, id);
      return {
        id, flow_id: copied.id, user_id: user.id, node_type: n.node_type, label: n.label,
        description: n.description, module_name: n.module_name, module_path: n.module_path,
        position_x: n.position_x, position_y: n.position_y, metadata: n.metadata, sort_order: n.sort_order,
      };
    });
    if (nodeRows.length) {
      const { error: ie } = await supabase.from('action_flow_nodes').insert(nodeRows);
      if (ie) return setError(ie.message);
    }
    const { data: sourceEdges, error: ee } = await supabase.from('action_flow_edges').select('*').eq('flow_id', source.id).eq('user_id', user.id);
    if (ee) return setError(ee.message);
    const edgeRows = (sourceEdges || []).map((e: FlowEdge) => ({
      id: crypto.randomUUID(), flow_id: copied.id, user_id: user.id,
      source_node_id: idMap.get(e.source_node_id), target_node_id: idMap.get(e.target_node_id),
      edge_label: e.edge_label, branch_key: e.branch_key,
    })).filter(e => e.source_node_id && e.target_node_id);
    if (edgeRows.length) {
      const { error: ei } = await supabase.from('action_flow_edges').insert(edgeRows);
      if (ei) return setError(ei.message);
    }
    setFlows(v => [copied as Flow, ...v]);
    await openFlow(copied as Flow);
  }

  async function startRun() {
    if (!flow || !user || nodes.length === 0) return;
    setRunLoading(true); setError('');
    const first = [...nodes].sort((a,b) => a.sort_order-b.sort_order)[0];
    const { data: runData, error: re } = await supabase.from('action_flow_runs').insert({
      flow_id: flow.id, user_id: user.id, name: flow.name, status: 'active', current_node_id: first.id,
    }).select().single();
    if (re || !runData) { setRunLoading(false); return setError(re?.message || 'Não foi possível iniciar a execução.'); }
    const { data: rns, error: rnError } = await supabase.from('action_flow_run_nodes').insert(nodes.map((n, i) => ({
      id: crypto.randomUUID(), run_id: runData.id, user_id: user.id, node_id: n.id, status: i === 0 ? 'active' : 'pending', started_at: i === 0 ? new Date().toISOString() : null,
    }))).select();
    if (rnError) { setRunLoading(false); return setError(rnError.message); }
    setRun(runData as Run); setRunNodes((rns || []) as RunNode[]); setScreen('run'); setRunLoading(false);
  }

  async function openExistingRun(existing: Run) {
    if (!user) return;
    const { data, error: e } = await supabase.from('action_flow_run_nodes').select('*').eq('run_id', existing.id).eq('user_id', user.id);
    if (e) return setError(e.message);
    const flowItem = flows.find(f => f.id === existing.flow_id);
    if (flowItem) await openFlow(flowItem);
    setRun(existing); setRunNodes((data || []) as RunNode[]); setScreen('run');
  }

  async function advanceRun(status: RunNode['status'] = 'completed', nextNodeId?: string) {
    if (!run || !user || !run.current_node_id) return;
    const currentRunNode = runNodes.find(x => x.node_id === run.current_node_id);
    if (!currentRunNode) return;
    const now = new Date().toISOString();
    const { error: ce } = await supabase.from('action_flow_run_nodes').update({
      status, completed_at: status === 'completed' || status === 'skipped' ? now : null,
    }).eq('id', currentRunNode.id).eq('user_id', user.id);
    if (ce) return setError(ce.message);

    const outgoingEdges = edges
      .filter(e => e.source_node_id === run.current_node_id)
      .map(e => ({ edge: e, node: nodes.find(n => n.id === e.target_node_id) }))
      .filter(x => x.node) as Array<{ edge: FlowEdge; node: FlowNode }>;

    if (!nextNodeId && outgoingEdges.length > 1) {
      setError('Escolha o próximo caminho antes de concluir esta decisão.');
      return;
    }

    const nextCandidates = nextNodeId
      ? [nodes.find(n => n.id === nextNodeId)].filter(Boolean) as FlowNode[]
      : outgoingEdges.map(x => x.node);

    const next = nextCandidates.length ? nextCandidates[0] : undefined;

    if (!next) {
      const { error: re } = await supabase.from('action_flow_runs').update({ status: 'completed', current_node_id: null, completed_at: now, updated_at: now }).eq('id', run.id).eq('user_id', user.id);
      if (re) return setError(re.message);
      setRun({ ...run, status: 'completed', current_node_id: null, completed_at: now, updated_at: now });
      setRunNodes(v => v.map(x => x.id === currentRunNode.id ? { ...x, status, completed_at: now } : x));
      setRuns(v => v.map(x => x.id === run.id ? { ...x, status: 'completed', current_node_id: null } : x));
      return;
    }

    const targetRunNode = runNodes.find(x => x.node_id === next.id);
    if (!targetRunNode) return setError('A próxima etapa não está registrada nesta execução.');
    const { error: ne } = await supabase.from('action_flow_run_nodes').update({ status: 'active', started_at: now }).eq('id', targetRunNode.id).eq('user_id', user.id);
    if (ne) return setError(ne.message);
    const { error: re } = await supabase.from('action_flow_runs').update({ current_node_id: next.id, updated_at: now }).eq('id', run.id).eq('user_id', user.id);
    if (re) return setError(re.message);
    setRunNodes(v => v.map(x => x.id === currentRunNode.id ? { ...x, status, completed_at: now } : x.id === targetRunNode.id ? { ...x, status: 'active', started_at: now } : x));
    setRun({ ...run, current_node_id: next.id, updated_at: now });
  }

  async function pauseRun() {
    if (!run || !user) return;
    const { error: e } = await supabase.from('action_flow_runs').update({ status: run.status === 'paused' ? 'active' : 'paused', updated_at: new Date().toISOString() }).eq('id', run.id).eq('user_id', user.id);
    if (e) return setError(e.message);
    setRun(v => v ? { ...v, status: v.status === 'paused' ? 'active' : 'paused' } : v);
  }

  async function createTaskFromRun() {
    if (!run || !user || !run.current_node_id) return;
    const n = nodes.find(x => x.id === run.current_node_id);
    if (!n) return;
    const { error: e } = await supabase.from('authority_tasks').insert({
      user_id: user.id, title: 'Fluxo: ' + n.label, task_type: 'Fluxo', priority: 'Média', status: 'Aberta',
    });
    if (e) setError(e.message); else setError('');
  }

  const filteredTemplates = TEMPLATES.filter(t => templateMode(t) === workspaceMode && (category === 'Todos' || t.category === category) && (t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())));
  const currentNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) || null : null;
  const currentRunNode = run?.current_node_id ? runNodes.find(n => n.node_id === run.current_node_id) : null;
  const currentRunNodeData = run?.current_node_id ? nodes.find(n => n.id === run.current_node_id) : null;
  const progress = runNodes.length ? Math.round((runNodes.filter(n => n.status === 'completed' || n.status === 'skipped').length / runNodes.length) * 100) : 0;
  const outgoing = currentRunNodeData ? edges.filter(e => e.source_node_id === currentRunNodeData.id).map(e => ({ edge: e, node: nodes.find(n => n.id === e.target_node_id) })).filter(x => x.node) as Array<{edge: FlowEdge; node: FlowNode}> : [];

  function edgePath(edge: FlowEdge) {
    const a = nodes.find(n => n.id === edge.source_node_id);
    const b = nodes.find(n => n.id === edge.target_node_id);
    if (!a || !b) return null;
    const x1 = a.position_x + 104, y1 = a.position_y + 120;
    const x2 = b.position_x + 104, y2 = b.position_y;
    const midY = (y1 + y2) / 2;
    return { d: 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + midY + ', ' + x2 + ' ' + midY + ', ' + x2 + ' ' + y2, labelX: (x1+x2)/2, labelY: midY };
  }

  if (loading) return <Spinner />;

  if (screen === 'library') return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Fluxos de Ação"
        subtitle={workspaceMode === 'pessoal' ? 'Organize projetos pessoais com planos pesquisados, checklist e execução.' : 'Desenhe, salve e execute processos completos para negócios.'}
        action={<Button onClick={() => void createFlow()}><Plus className="w-4 h-4" /> Criar do zero</Button>}
      />
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 mb-5">
        <Card className="p-6 overflow-hidden relative bg-slate-950 text-white border-0">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10" />
          <div className="absolute right-20 -bottom-20 w-52 h-52 rounded-full border border-white/5" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400"><MapIcon className="w-3.5 h-3.5" /> Sistema de execução</div>
            <h2 className="text-3xl font-black tracking-tight mt-3 max-w-2xl">Pare de guardar processos na cabeça.</h2>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-6">Escolha um modelo, adapte o caminho ao seu negócio ou desenhe algo completamente novo. Depois execute etapa por etapa sem perder o contexto.</p>
            <div className="flex flex-wrap gap-2 mt-5">
              {['Template', 'Canvas', 'Módulos conectados', 'Execução', 'Tarefas'].map(x => <span key={x} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-[11px] text-slate-200">{x}</span>)}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Resumo</p>
          <p className="text-4xl font-black text-slate-950 mt-2">{flows.length}</p>
          <p className="text-xs text-slate-400">fluxos salvos</p>
          <div className="grid grid-cols-2 gap-2 mt-5"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Em execução</p><p className="text-xl font-black mt-1">{runs.filter(r=>r.status==='active').length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Modelos</p><p className="text-xl font-black mt-1">{TEMPLATES.length}</p></div></div>
        </Card>
      </div>

      <Card className="p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar fluxo ou template..." className="flex-1 h-11 rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:ring-4 focus:ring-slate-100" />
          <div className="flex gap-2 overflow-x-auto">
            {(workspaceMode === 'pessoal' ? ['Todos','Personal'] : ['Todos','Negócios','Aquisição','Operação']).map(c=><button key={c} onClick={()=>setCategory(c)} className={'px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap border ' + (category===c?'bg-slate-950 text-white border-slate-950':'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>{c}</button>)}
          </div>
        </div>
      </Card>

      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {flows.length > 0 && (
        <div className="mb-7">
          <div className="flex items-end justify-between mb-4"><div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Seus fluxos</p><h3 className="text-lg font-black text-slate-950 mt-1">Processos salvos</h3></div></div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{flows.map(f => <Card key={f.id} className="p-5 hover:shadow-md transition group"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center"><MapIcon className="w-4 h-4"/></div><div className="min-w-0 flex-1"><p className="font-bold text-slate-800 truncate">{f.name}</p><p className="text-[11px] text-slate-400 mt-1">{f.category} · {f.goal || 'Sem meta'}</p></div><div className="flex items-center gap-1"><button onClick={()=>void cloneFlow(f)} title="Duplicar fluxo" className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Copy className="w-4 h-4"/></button><button onClick={()=>void deleteFlow(f.id)} title="Excluir fluxo" className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button></div></div><p className="text-xs text-slate-500 line-clamp-2 mt-4">{f.objective || 'Sem objetivo definido.'}</p><div className="flex items-center justify-between mt-5"><span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-500">{f.status}</span><button onClick={()=>void openFlow(f)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950">Abrir <ArrowRight className="w-3.5 h-3.5"/></button></div></Card>)}</div>
        </div>
      )}

      <div>
        <div className="flex items-end justify-between mb-4"><div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Biblioteca</p><h3 className="text-lg font-black text-slate-950 mt-1">Comece por um fluxo pronto</h3></div><span className="text-xs text-slate-400">{filteredTemplates.length} modelos</span></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredTemplates.map(t => <Card key={t.key} className="p-5 hover:border-slate-300 hover:shadow-md transition"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">{t.category}</span><Sparkles className="w-4 h-4 text-slate-300"/></div><h4 className="text-base font-black text-slate-900 mt-2">{t.name}</h4><p className="text-xs text-slate-500 mt-1.5 leading-5">{t.description}</p><div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Objetivo</p><p className="text-xs font-semibold text-slate-700 mt-1">{t.goal}</p></div><div className="flex gap-2 mt-4"><button onClick={()=>setResearchTemplate(t)} className="flex-1 inline-flex justify-center items-center gap-2 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50">Ver plano</button><button onClick={()=>void createFlow(t)} className="flex-1 inline-flex justify-center items-center gap-2 h-10 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800"><Plus className="w-4 h-4"/> Usar modelo</button></div></Card>)}</div>
      </div>

      {runs.length>0 && <div className="mt-7"><div className="flex items-end justify-between mb-4"><div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Execuções recentes</p><h3 className="text-lg font-black text-slate-950 mt-1">Continue de onde parou</h3></div></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{runs.slice(0,6).map(r=>{const f=flows.find(x=>x.id===r.flow_id);return <button key={r.id} onClick={()=>void openExistingRun(r)} className="text-left"><Card className="p-4 hover:border-slate-300 hover:shadow-sm transition"><div className="flex items-center gap-3"><div className={'w-9 h-9 rounded-xl flex items-center justify-center '+(r.status==='completed'?'bg-emerald-50 text-emerald-700':'bg-blue-50 text-blue-700')}>{r.status==='completed'?<Check className="w-4 h-4"/>:<Play className="w-4 h-4"/>}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{f?.name || r.name}</p><p className="text-[11px] text-slate-400 mt-1">{r.status}</p></div><ArrowRight className="w-4 h-4 text-slate-300"/></div></Card></button>})}</div></div>}
    {researchTemplate && (() => {
      const research = TEMPLATE_RESEARCH[researchTemplate.key];
      if (!research) return null;
      return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Plano pesquisado</p><h2 className="text-2xl font-black text-slate-950 mt-1">{researchTemplate.name}</h2><p className="text-sm text-slate-500 mt-1">{researchTemplate.description}</p></div>
            <button onClick={()=>setResearchTemplate(null)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center"><X className="w-4 h-4"/></button>
          </div>
          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-slate-200 p-5"><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Plano base / documentado</p><p className="text-xs text-slate-500 mt-1.5">Etapas resumidas a partir das fontes indicadas.</p><div className="space-y-2 mt-4">{research.realPlan.map((step,i)=><div key={step} className="flex gap-3 text-sm text-slate-700"><span className="w-6 h-6 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">{i+1}</span><span>{step}</span></div>)}</div></div>
            <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50"><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Plano ideal do RiseGoat</p><p className="text-xs text-slate-500 mt-1.5">Camada de organização e execução adicionada pelo sistema, não apresentada como exigência da fonte.</p><div className="space-y-2 mt-4">{research.idealPlan.map((step,i)=><div key={step} className="flex gap-3 text-sm text-slate-700"><span className="w-6 h-6 shrink-0 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">{i+1}</span><span>{step}</span></div>)}</div></div>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-100"><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Fontes utilizadas</p><div className="flex flex-wrap gap-2 mt-3">{research.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white"><Link2 className="w-3.5 h-3.5"/>{s.label}</a>)}</div></div>
          <div className="flex flex-wrap justify-end gap-2 mt-5">
            <Button tone="ghost" onClick={()=>{setResearchTemplate(null);void createFlow(researchTemplate,'base')}}>Usar plano base</Button>
            <Button onClick={()=>{setResearchTemplate(null);void createFlow(researchTemplate,'ideal')}}><Plus className="w-4 h-4"/> Usar plano ideal</Button>
          </div>
        </Card>
      </div>;
    })()}
      </div>
  );

  if (screen === 'builder' && flow) return (
    <div className="h-[calc(100vh-0px)] min-h-[760px] bg-slate-50 flex flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={()=>{setScreen('library');setFlow(null)}} className="p-2 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-4 h-4"/></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Canvas</p><p className="text-sm font-black text-slate-900 truncate">{flow.name}</p></div>
        <Button tone="ghost" onClick={()=>setRunModal(true)}><Play className="w-4 h-4"/> Executar</Button>
        <Button onClick={()=>void saveFlow()} disabled={saving}><Save className="w-4 h-4"/>{saving?'Salvando':'Salvar'}</Button>
      </div>
      <div className="grid lg:grid-cols-[260px_1fr_310px] flex-1 min-h-0">
        <aside className="border-r border-slate-200 bg-white p-4 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Fluxo</p>
          <div className="space-y-3 mt-3">
            <Field label="Nome do fluxo" value={flow.name} onChange={v=>setFlow({...flow,name:v})}/>
            <SelectField label="Categoria" value={flow.category} onChange={v=>setFlow({...flow,category:v})} options={['Negócios','Aquisição','Operação','Personal','Outros']}/>
            <label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Objetivo</span><textarea rows={3} value={flow.objective} onChange={e=>setFlow({...flow,objective:e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-4 focus:ring-slate-100" /></label>
            <Field label="Resultado final" value={flow.goal} onChange={v=>setFlow({...flow,goal:v})}/>
          </div>

          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-3">Adicionar bloco</p>
            <div className="grid grid-cols-2 gap-2">{(Object.keys(NODE_META) as NodeType[]).map(type=>{const m=NODE_META[type];const Icon=m.icon;return <button key={type} onClick={()=>addNode(type)} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-left"><span className={'w-7 h-7 rounded-lg flex items-center justify-center border '+m.className}><Icon className="w-3.5 h-3.5"/></span><span className="text-[11px] font-semibold text-slate-600">{m.label}</span></button>})}</div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-700">Como desenhar</p>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-5">Arraste os blocos. Use <b>Conectar</b> em um bloco e depois clique no bloco de destino. Crie decisões com múltiplas saídas.</p>
          </div>
        </aside>

        <main className="relative overflow-auto bg-[radial-gradient(circle_at_1px_1px,_#cbd5e1_1px,_transparent_0)] [background-size:22px_22px]">
          <div className="relative min-w-[1100px] min-h-[900px] p-3">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1100, minHeight: 900 }}>
              <defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#94a3b8"/></marker></defs>
              {edges.map(edge=>{const p=edgePath(edge);return p?<g key={edge.id}><path d={p.d} fill="none" stroke="#94a3b8" strokeWidth="2.2" markerEnd="url(#flow-arrow)"/>{edge.edge_label&&<text x={p.labelX} y={p.labelY-6} fontSize="10" fill="#64748b" textAnchor="middle">{edge.edge_label}</text>}</g>:null})}
            </svg>
            {nodes.map(n=><CanvasNode key={n.id} node={n} selected={selectedNodeId===n.id} connectFrom={connectFrom===n.id} onSelect={()=>connectFrom?connectNodes(n.id):setSelectedNodeId(n.id)} onStartConnect={()=>setConnectFrom(n.id)} onDrag={e=>dragNode(n.id,e)} />)}
            {nodes.length===0 && <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><MapIcon className="w-8 h-8 text-slate-300 mx-auto"/><p className="text-sm font-semibold text-slate-500 mt-3">Canvas vazio</p><p className="text-xs text-slate-400 mt-1">Adicione o primeiro bloco na lateral.</p></div></div>}
          </div>
        </main>

        <aside className="border-l border-slate-200 bg-white p-4 overflow-y-auto">
          {currentNode ? (
            <>
              <div className="flex items-center justify-between mb-4"><div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Bloco selecionado</p><p className="text-sm font-black text-slate-900 mt-1">Editar etapa</p></div><button onClick={()=>removeNode(currentNode.id)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4"/></button></div>
              <div className="space-y-3">
                <SelectField label="Tipo" value={currentNode.node_type} onChange={v=>updateNode(currentNode.id,{node_type:v as NodeType})} options={(Object.keys(NODE_META) as NodeType[]).map(type=>({ value:type, label:NODE_META[type].label }))}/>
                <Field label="Nome" value={currentNode.label} onChange={v=>updateNode(currentNode.id,{label:v})}/>
                <label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Descrição</span><textarea rows={4} value={currentNode.description} onChange={e=>updateNode(currentNode.id,{description:e.target.value})} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-4 focus:ring-slate-100"/></label>
                <SelectField label="Módulo RiseGoat" value={currentNode.module_name || ''} onChange={v=>updateNode(currentNode.id,{module_name:v||null,module_path:v?(MODULES as any)[v]:null})} options={Object.keys(MODULES)}/>
                <div className="grid grid-cols-2 gap-2"><Field label="X" value={Math.round(currentNode.position_x)} onChange={v=>updateNode(currentNode.id,{position_x:Number(v)||0})} type="number"/><Field label="Y" value={Math.round(currentNode.position_y)} onChange={v=>updateNode(currentNode.id,{position_y:Number(v)||0})} type="number"/></div>
              </div>
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400 mb-2">Saídas</p>
                <div className="space-y-2">{edges.filter(e=>e.source_node_id===currentNode.id).map(e=><div key={e.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2"><ArrowRight className="w-3.5 h-3.5 text-slate-400"/><span className="text-xs font-semibold text-slate-700 truncate">{nodes.find(n=>n.id===e.target_node_id)?.label || 'Destino'}</span><button onClick={()=>setEdges(v=>v.filter(x=>x.id!==e.id))} className="ml-auto text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5"/></button></div><input value={e.edge_label} onChange={ev=>setEdges(v=>v.map(x=>x.id===e.id?{...x,edge_label:ev.target.value}:x))} placeholder="Rótulo: SIM, NÃO, próximo..." className="mt-2 w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs"/></div>)}{edges.filter(e=>e.source_node_id===currentNode.id).length===0&&<p className="text-xs text-slate-400">Nenhuma saída conectada.</p>}</div>
              </div>
              {currentNode.module_path && <button onClick={()=>navigate(currentNode.module_path!)} className="w-full mt-5 h-10 rounded-xl bg-cyan-50 text-cyan-700 text-xs font-semibold hover:bg-cyan-100">Abrir módulo</button>}
            </>
          ) : <div className="text-center py-20"><Settings2 className="w-7 h-7 text-slate-300 mx-auto"/><p className="text-sm font-semibold text-slate-500 mt-3">Selecione um bloco</p><p className="text-xs text-slate-400 mt-1">O painel de edição aparecerá aqui.</p></div>}
        </aside>
      </div>

      {runModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"><Card className="w-full max-w-md rounded-3xl p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Nova execução</p><h2 className="text-xl font-black text-slate-950 mt-1">{flow.name}</h2></div><button onClick={()=>setRunModal(false)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center"><X className="w-4 h-4"/></button></div><p className="text-sm text-slate-500 mt-4">Uma execução é uma cópia operacional do seu fluxo. O desenho original continua intacto e pode ser reutilizado.</p><button onClick={()=>{setRunModal(false);void startRun()}} disabled={runLoading} className="w-full mt-5 h-11 rounded-xl bg-slate-950 text-white text-sm font-semibold">{runLoading?'Iniciando...':'Iniciar execução'}</button></Card></div>}
    </div>
  );

  if (screen === 'run' && run) return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <button onClick={()=>{setScreen('library');setRun(null)}} className="p-2 rounded-lg hover:bg-slate-100 self-start"><ArrowLeft className="w-4 h-4"/></button>
        <div className="flex-1"><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Execução</p><h1 className="text-2xl font-black text-slate-950">{run.name}</h1></div>
        <button onClick={()=>void pauseRun()} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">{run.status==='paused'?<Play className="w-4 h-4"/>:<Pause className="w-4 h-4"/>}{run.status==='paused'?'Continuar':'Pausar'}</button>
      </div>
      <Card className="p-5 mb-5"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Progresso</p><p className="text-4xl font-black mt-1">{progress}%</p></div><p className="text-xs text-slate-400">{runNodes.filter(n=>n.status==='completed'||n.status==='skipped').length} de {runNodes.length} etapas</p></div><div className="h-2 rounded-full bg-slate-100 mt-4 overflow-hidden"><div className="h-full bg-slate-950 rounded-full transition-all" style={{width:progress+'%'}}/></div></Card>
      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5">
        <Card className="p-6">
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Etapa atual</p>
          {run.status==='completed' ? <div className="py-14 text-center"><div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto"><Check className="w-7 h-7"/></div><p className="text-lg font-black text-slate-900 mt-4">Fluxo concluído</p><p className="text-xs text-slate-400 mt-1">A execução foi finalizada.</p></div> : currentRunNodeData ? <div className="mt-4">
            <div className="rounded-3xl border-2 border-slate-200 p-6"><div className="flex items-start gap-4"><div className={'w-12 h-12 rounded-2xl flex items-center justify-center border '+nodeClass(currentRunNodeData.node_type)}>{(() => {const I=NODE_META[currentRunNodeData.node_type].icon;return <I className="w-5 h-5"/>})()}</div><div className="min-w-0 flex-1"><p className="text-xl font-black text-slate-950">{currentRunNodeData.label}</p><p className="text-sm text-slate-500 mt-2 leading-6">{currentRunNodeData.description||'Execute esta etapa e registre qualquer observação necessária.'}</p></div></div>{currentRunNodeData.module_name&&<button onClick={()=>navigate(currentRunNodeData.module_path!)} className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-xs font-semibold"><Link2 className="w-4 h-4"/> Abrir {currentRunNodeData.module_name}</button>}{currentRunNode?.status==='active'&&<div className="flex flex-wrap gap-2 mt-6"><Button onClick={()=>void advanceRun('completed')}><Check className="w-4 h-4"/> {workspaceMode === 'pessoal' ? 'Marcar como feito' : 'Concluir etapa'}</Button><Button tone="ghost" onClick={()=>void advanceRun('skipped')}>Pular</Button>{currentRunNodeData.node_type==='task'&&<button onClick={()=>void createTaskFromRun()} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50"><ListChecks className="w-4 h-4"/> Criar tarefa</button>}</div>}</div>
            {outgoing.length>1&&<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs font-bold text-amber-800">Escolha o próximo caminho</p><div className="grid sm:grid-cols-2 gap-2 mt-3">{outgoing.map(x=><button key={x.edge.id} onClick={()=>void advanceRun('completed',x.node.id)} className="text-left rounded-xl border border-white bg-white p-3 hover:border-amber-300"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">{x.edge.edge_label||x.edge.branch_key||'Próximo passo'}</p><p className="text-xs font-bold text-slate-800 mt-1">{x.node.label}</p></button>)}</div></div>}
          </div> : <p className="text-sm text-slate-400 mt-5">Nenhuma etapa ativa.</p>}
        </Card>
        <Card className="p-5"><div className="flex items-center gap-2 mb-4"><Clock3 className="w-4 h-4 text-slate-400"/><div><p className="text-sm font-bold text-slate-800">Checklist do fluxo</p><p className="text-[11px] text-slate-400">{runNodes.length} etapas</p></div></div><div className="space-y-2">{nodes.slice().sort((a,b)=>a.sort_order-b.sort_order).map((n,i)=>{const rn=runNodes.find(x=>x.node_id===n.id);return <button key={n.id} onClick={()=>{if(rn?.status==='active')setSelectedNodeId(n.id)}} className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50"><span className={'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold '+(rn?.status==='completed'?'bg-emerald-50 text-emerald-700':rn?.status==='active'?'bg-slate-950 text-white':'bg-slate-100 text-slate-400')}>{rn?.status==='completed'?<Check className="w-3.5 h-3.5"/>:i+1}</span><span className="flex-1 text-xs font-semibold text-slate-700 truncate">{n.label}</span><span className="text-[10px] text-slate-400">{rn?.status}</span></button>})}</div></Card>
      </div>
      {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    </div>
  );

  return null;
}

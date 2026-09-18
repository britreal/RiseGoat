import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, Spinner } from '@/components/ui';
import type {
  AuthorityProperty, AuthorityContact, AuthorityConnection, AuthorityTask,
  AuthorityContent, AuthorityOpportunity, ReciprocityEntry, LeverageNode,
  ProductPipelineItem, Commission, ContactDossier, AuthorityThreat, DefenseAction,
  AuthoritySuggestion, AuthoritySource,
} from '@/types';
import {
  Network, Search, Plus, Trash2, ExternalLink, Target, CheckSquare, Users,
  Briefcase, FileText, Wallet, Handshake, AlertTriangle, ArrowRight,
  Download, Upload, RefreshCw, Link2, X, ChevronDown, Shield,
} from 'lucide-react';

type Tab = 'overview' | 'map' | 'crm' | 'action' | 'opportunities' | 'intelligence' | 'strategy' | 'defense' | 'finance';
type EntityType = 'property' | 'contact';

const tabs: Array<{ id: Tab; label: string; icon: typeof Network }> = [
  { id: 'overview', label: 'Visão geral', icon: Network },
  { id: 'map', label: 'Mapa da teia', icon: Network },
  { id: 'crm', label: 'CRM', icon: Users },
  { id: 'action', label: 'Ação', icon: CheckSquare },
  { id: 'opportunities', label: 'Oportunidades', icon: Target },
  { id: 'intelligence', label: 'Inteligência', icon: Users },
  { id: 'strategy', label: 'Estratégia', icon: Handshake },
  { id: 'defense', label: 'Defesa', icon: Shield },
  { id: 'finance', label: 'Finanças', icon: Wallet },
];

const propertyTypes = ['Site', 'Perfil Social', 'Página', 'Produto', 'Newsletter', 'Canal'];
const propertyStatuses = ['Ativo', 'Em construção', 'Pausado', 'Arquivado'];
const objectives = ['Vender', 'Atrair', 'Nutrir', 'Redirecionar'];
const contactStatuses = ['Frio', 'Morno', 'Quente', 'Aliado', 'Inativo'];
const taskTypes = ['Criar conteúdo', 'Publicar', 'Contatar', 'Analisar', 'Negociar'];
const priorities = ['Alta', 'Média', 'Baixa'];
const taskStatuses = ['Backlog', 'Hoje', 'Em andamento', 'Feito'];
const opportunityStatuses = ['Identificada', 'Contatada', 'Negociando', 'Fechada', 'Perdida'];
const contentTypes = ['Artigo', 'Vídeo', 'Post', 'E-mail', 'Newsletter'];
const contentStatuses = ['Ideia', 'Rascunho', 'Publicado', 'Arquivado'];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function cleanTags(value: string) {
  return value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
}

function daysAgo(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export function CommandCenterPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState<AuthorityProperty[]>([]);
  const [contacts, setContacts] = useState<AuthorityContact[]>([]);
  const [connections, setConnections] = useState<AuthorityConnection[]>([]);
  const [tasks, setTasks] = useState<AuthorityTask[]>([]);
  const [contents, setContents] = useState<AuthorityContent[]>([]);
  const [opportunities, setOpportunities] = useState<AuthorityOpportunity[]>([]);
  const [ledger, setLedger] = useState<ReciprocityEntry[]>([]);
  const [leverage, setLeverage] = useState<LeverageNode[]>([]);
  const [products, setProducts] = useState<ProductPipelineItem[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [dossiers, setDossiers] = useState<ContactDossier[]>([]);
  const [threats, setThreats] = useState<AuthorityThreat[]>([]);
  const [defenseActions, setDefenseActions] = useState<DefenseAction[]>([]);
  const [suggestions, setSuggestions] = useState<AuthoritySuggestion[]>([]);
  const [sources, setSources] = useState<AuthoritySource[]>([]);\n  const [negotiations, setNegotiations] = useState<NegotiationDossier[]>([]);\n  const [hiddenConnections, setHiddenConnections] = useState<HiddenConnection[]>([]);\n  const [crossInfluence, setCrossInfluence] = useState<CrossInfluence[]>([]);\n  const [nodeMonetization, setNodeMonetization] = useState<NodeMonetization[]>([]);
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    const results = await Promise.all([
      supabase.from('authority_properties').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('authority_contacts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('authority_connections').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('authority_tasks').select('*').eq('user_id', user.id).order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('authority_contents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('authority_opportunities').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('reciprocity_ledger').select('*').eq('user_id', user.id).order('entry_date', { ascending: false }),
      supabase.from('authority_leverage').select('*').eq('user_id', user.id).order('score', { ascending: false }),
      supabase.from('product_pipeline').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('commissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('contact_dossiers').select('*').eq('user_id', user.id),
      supabase.from('authority_threats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('authority_defense_actions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('authority_suggestions').select('*').eq('user_id', user.id).order('score', { ascending: false }),
      supabase.from('authority_sources').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setProperties((results[0].data as AuthorityProperty[]) ?? []);
    setContacts((results[1].data as AuthorityContact[]) ?? []);
    setConnections((results[2].data as AuthorityConnection[]) ?? []);
    setTasks((results[3].data as AuthorityTask[]) ?? []);
    setContents((results[4].data as AuthorityContent[]) ?? []);
    setOpportunities((results[5].data as AuthorityOpportunity[]) ?? []);
    setLedger((results[6].data as ReciprocityEntry[]) ?? []);
    setLeverage((results[7].data as LeverageNode[]) ?? []);
    setProducts((results[8].data as ProductPipelineItem[]) ?? []);
    setCommissions((results[9].data as Commission[]) ?? []);
    setDossiers((results[10].data as ContactDossier[]) ?? []);
    setThreats((results[11].data as AuthorityThreat[]) ?? []);
    setDefenseActions((results[12].data as DefenseAction[]) ?? []);
    setSuggestions((results[13].data as AuthoritySuggestion[]) ?? []);
    setSources((results[14].data as AuthoritySource[]) ?? []);\n    setNegotiations((results[15].data as NegotiationDossier[]) ?? []);\n    setHiddenConnections((results[16].data as HiddenConnection[]) ?? []);\n    setCrossInfluence((results[17].data as CrossInfluence[]) ?? []);\n    setNodeMonetization((results[18].data as NodeMonetization[]) ?? []);
    const failed = results.find((x) => x.error);
    if (failed?.error) setNotice(failed.error.message);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load().then(() => runRadar()); }, [user]);

  async function runRadar() {
    if (!user) return;
    const { error } = await supabase.rpc('authority_run_radar', { p_user_id: user.id });
    if (error) {
      setNotice(error.message);
      return;
    }
    const [t, a] = await Promise.all([
      supabase.from('authority_threats').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('authority_defense_actions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setThreats((t.data as AuthorityThreat[]) ?? []);
    setDefenseActions((a.data as DefenseAction[]) ?? []);
  }

  async function syncRiseGoatData() {
    if (!user) return;
    setNotice('');
    try {
      const [profileRes, linksRes, salesRes, microblogRes, draftsRes, leadsRes, campaignsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('links').select('*').eq('user_id', user.id).order('sort_order'),
        supabase.from('sales_pages').select('*').eq('user_id', user.id),
        supabase.from('microblog_posts').select('*').eq('user_id', user.id),
        supabase.from('drafts').select('*').eq('user_id', user.id),
        supabase.from('newsletter_leads').select('*').eq('user_id', user.id),
        supabase.from('campaigns').select('*').eq('user_id', user.id),
      ]);

      const profile = profileRes.data;
      if (profile) {
        await supabase.from('authority_properties').upsert({
          user_id: user.id,
          name: profile.display_name || '@' + profile.username,
          property_type: 'Página',
          platform: 'RiseGoat',
          url: window.location.origin + '/u/' + profile.username,
          description: profile.bio || '',
          status: 'Ativo',
          objective: 'Atrair',
          source_kind: 'profiles',
          source_id: profile.id,
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      const profileProperty = (await supabase.from('authority_properties').select('id').eq('user_id', user.id).eq('source_kind', 'profiles').eq('source_id', user.id).maybeSingle()).data;
      const propertyId = profileProperty?.id || null;

      for (const item of (linksRes.data ?? []) as Array<Record<string, unknown>>) {
        const linkType = String(item.link_type || 'link');
        const propertyType = linkType === 'affiliate' ? 'Produto' : linkType === 'youtube' ? 'Canal' : linkType === 'course' ? 'Página' : 'Perfil Social';
        await supabase.from('authority_properties').upsert({
          user_id: user.id,
          name: String(item.label || 'Link'),
          property_type: propertyType,
          platform: String(item.icon || ''),
          url: String(item.url || ''),
          description: String(item.description || ''),
          status: item.is_active === false ? 'Pausado' : 'Ativo',
          objective: 'Redirecionar',
          tags: linkType,
          source_kind: 'links',
          source_id: String(item.id),
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      for (const item of (salesRes.data ?? []) as Array<Record<string, unknown>>) {
        await supabase.from('authority_properties').upsert({
          user_id: user.id,
          name: String(item.title || 'Página de venda'),
          property_type: 'Página',
          platform: 'RiseGoat',
          url: window.location.origin + '/p/' + String(item.slug || ''),
          description: '',
          status: item.is_published ? 'Ativo' : 'Em construção',
          objective: 'Vender',
          source_kind: 'sales_pages',
          source_id: String(item.id),
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      for (const item of (microblogRes.data ?? []) as Array<Record<string, unknown>>) {
        await supabase.from('authority_contents').upsert({
          user_id: user.id,
          title: String(item.title || item.content || 'Microblog'),
          property_id: propertyId,
          content_type: 'Post',
          status: 'Publicado',
          link: propertyId ? window.location.origin + '/u/' + (profile?.username || '') + '/microblog/' + String(item.id) : '',
          tags: 'microblog',
          source_kind: 'microblog_posts',
          source_id: String(item.id),
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      for (const item of (draftsRes.data ?? []) as Array<Record<string, unknown>>) {
        await supabase.from('authority_contents').upsert({
          user_id: user.id,
          title: String(item.title || 'Rascunho'),
          property_id: propertyId,
          content_type: 'Post',
          status: 'Rascunho',
          link: '',
          tags: 'rascunho',
          source_kind: 'drafts',
          source_id: String(item.id),
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      for (const item of (leadsRes.data ?? []) as Array<Record<string, unknown>>) {
        await supabase.from('authority_contacts').upsert({
          user_id: user.id,
          name: String(item.name || item.email || 'Lead'),
          email: String(item.email || ''),
          status: 'Frio',
          source_kind: 'newsletter_leads',
          source_id: String(item.id),
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      for (const item of (campaignsRes.data ?? []) as Array<Record<string, unknown>>) {
        await supabase.from('authority_contents').upsert({
          user_id: user.id,
          title: String(item.subject || 'Campanha'),
          property_id: propertyId,
          content_type: 'E-mail',
          status: String(item.status || 'Rascunho') === 'sent' ? 'Publicado' : 'Rascunho',
          tags: 'newsletter,email',
          source_kind: 'campaigns',
          source_id: String(item.id),
        }, { onConflict: 'user_id,source_kind,source_id' });
      }

      await Promise.all([
        supabase.from('authority_sources').upsert({ user_id: user.id, source_type: 'RiseGoat', name: 'Perfil e página pública', url: profile ? window.location.origin + '/u/' + profile.username : '' }, { onConflict: 'user_id,source_type,name' }),
        supabase.from('authority_sources').upsert({ user_id: user.id, source_type: 'RiseGoat', name: 'Links', url: '/links' }, { onConflict: 'user_id,source_type,name' }),
        supabase.from('authority_sources').upsert({ user_id: user.id, source_type: 'RiseGoat', name: 'Newsletter e campanhas', url: '/newsletter' }, { onConflict: 'user_id,source_type,name' }),
        supabase.from('authority_sources').upsert({ user_id: user.id, source_type: 'RiseGoat', name: 'Páginas de venda', url: '/sales' }, { onConflict: 'user_id,source_type,name' }),
      ]);

      setNotice('Dados do RiseGoat sincronizados com o Centro de Comando.');
      await load();
      await runRadar();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Falha ao sincronizar os dados.');
    }
  }

  useEffect(() => {
    if (loading) return;
    const snapshot = {
      saved_at: new Date().toISOString(),
      properties, contacts, connections, tasks, contents,
      opportunities, ledger, leverage, products, commissions,
    };
    try {
      localStorage.setItem('risegoat_command_center_backup', JSON.stringify(snapshot));
    } catch {}
  }, [loading, properties, contacts, connections, tasks, contents, opportunities, ledger, leverage, products, commissions]);

  const nodes = useMemo(() => {
    const p = properties.map((x) => ({ id: x.id, type: 'property' as EntityType, name: x.name, label: x.property_type }));
    const c = contacts.map((x) => ({ id: x.id, type: 'contact' as EntityType, name: x.name, label: x.status }));
    return [...p, ...c];
  }, [properties, contacts]);

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => (n.name + ' ' + n.label).toLowerCase().includes(q));
  }, [nodes, search]);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((x) => x.status !== 'Feito' && x.due_date === today);
  const overdueTasks = tasks.filter((x) => x.status !== 'Feito' && x.due_date && x.due_date < today);
  const openOpportunities = opportunities.filter((x) => !['Fechada', 'Perdida'].includes(x.status));
  const connectedIds = new Set(connections.flatMap((c) => [c.origin_id, c.destination_id]));
  const isolated = nodes.filter((n) => !connectedIds.has(n.id));
  const stagnant = openOpportunities.filter((x) => daysAgo(x.updated_at) > 7);
  const totals = {
    activeProperties: properties.filter((x) => x.status === 'Ativo').length,
    warmContacts: contacts.filter((x) => ['Morno', 'Quente', 'Aliado'].includes(x.status)).length,
    openValue: openOpportunities.reduce((sum, x) => sum + Number(x.estimated_value || 0), 0),
    monthlyRevenue: products.reduce((sum, x) => sum + Number(x.monthly_revenue || 0), 0),
  };

  async function addProperty(data: Partial<AuthorityProperty>) {
    if (!user || !data.name?.trim()) return;
    const { data: row, error } = await supabase.from('authority_properties').insert({
      user_id: user.id, name: data.name.trim(), property_type: data.property_type || 'Site',
      platform: data.platform?.trim() || '', url: data.url?.trim() || '', description: data.description?.trim() || '',
      status: data.status || 'Ativo', objective: data.objective || 'Atrair', tags: data.tags?.trim() || '',
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setProperties((v) => [row as AuthorityProperty, ...v]);
  }

  async function addContact(data: Partial<AuthorityContact>) {
    if (!user || !data.name?.trim()) return;
    const { data: row, error } = await supabase.from('authority_contacts').insert({
      user_id: user.id, name: data.name.trim(), email: data.email?.trim() || '',
      telegram: data.telegram?.trim() || '', occupation: data.occupation?.trim() || '',
      status: data.status || 'Frio', strategic_value: data.strategic_value?.trim() || '',
      next_action: data.next_action?.trim() || '', next_action_at: data.next_action_at || null,
      tags: data.tags?.trim() || '',
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setContacts((v) => [row as AuthorityContact, ...v]);
  }

  async function addConnection(data: { origin_id: string; origin_type: EntityType; destination_id: string; destination_type: EntityType; connection_type: string; strength: string; description: string }) {
    if (!user || !data.origin_id || !data.destination_id || data.origin_id === data.destination_id) return;
    const { data: row, error } = await supabase.from('authority_connections').insert({ user_id: user.id, ...data }).select().single();
    if (error) return setNotice(error.message);
    if (row) setConnections((v) => [row as AuthorityConnection, ...v]);
  }

  async function addTask(data: Partial<AuthorityTask>) {
    if (!user || !data.title?.trim()) return;
    const { data: row, error } = await supabase.from('authority_tasks').insert({
      user_id: user.id, title: data.title.trim(), entity_id: data.entity_id || null, entity_type: data.entity_type || null,
      task_type: data.task_type || 'Analisar', priority: data.priority || 'Média', due_date: data.due_date || null, status: data.status || 'Backlog',
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setTasks((v) => [...v, row as AuthorityTask].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')));
  }

  async function updateTask(id: string, status: string) {
    const { error } = await supabase.from('authority_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user!.id);
    if (error) return setNotice(error.message);
    setTasks((v) => v.map((x) => x.id === id ? { ...x, status } : x));
  }

  async function addOpportunity(data: Partial<AuthorityOpportunity>) {
    if (!user || !data.opportunity?.trim()) return;
    const { data: row, error } = await supabase.from('authority_opportunities').insert({
      user_id: user.id, opportunity: data.opportunity.trim(), involved: data.involved?.trim() || '',
      estimated_value: Number(data.estimated_value || 0), status: data.status || 'Identificada',
      your_part: data.your_part?.trim() || '', notes: data.notes?.trim() || '',
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setOpportunities((v) => [row as AuthorityOpportunity, ...v]);
  }

  async function updateOpportunity(id: string, status: string) {
    const { error } = await supabase.from('authority_opportunities').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user!.id);
    if (error) return setNotice(error.message);
    setOpportunities((v) => v.map((x) => x.id === id ? { ...x, status } : x));
  }

  async function addProduct(data: Partial<ProductPipelineItem>) {
    if (!user || !data.product?.trim()) return;
    const { data: row, error } = await supabase.from('product_pipeline').insert({
      user_id: user.id, product: data.product.trim(), product_type: data.product_type || 'Digital',
      status: data.status || 'Ideia', channel: data.channel?.trim() || '',
      monthly_revenue: Number(data.monthly_revenue || 0), margin: Number(data.margin || 0),
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setProducts((v) => [row as ProductPipelineItem, ...v]);
  }

  async function addCommission(data: Partial<Commission>) {
    if (!user) return;
    const { data: row, error } = await supabase.from('commissions').insert({
      user_id: user.id, business_value: Number(data.business_value || 0), rate: Number(data.rate || 0),
      payment_method: data.payment_method?.trim() || '', status: data.status || 'A receber', due_date: data.due_date || null,
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setCommissions((v) => [row as Commission, ...v]);
  }

  async function updateContactIntelligence(id: string, patch: { wealth_score?: number; fame_score?: number; decision_power_score?: number; resources_score?: number; intelligence_notes?: string }) {
    if (!user) return;
    const { error } = await supabase.from('authority_contacts').update(patch).eq('id', id).eq('user_id', user.id);
    if (error) return setNotice(error.message);
    setContacts((v) => v.map((x) => x.id === id ? { ...x, ...patch } : x));
  }

  async function createSuggestion(s: { source_entity_id:string; source_entity_type:EntityType; target_entity_id:string; target_entity_type:EntityType; score:number; reason:string }) {
    if (!user) return;
    const { data, error } = await supabase.from('authority_suggestions').upsert({
      user_id:user.id, ...s, status:'Nova'
    }, { onConflict:'user_id,source_entity_id,source_entity_type,target_entity_id,target_entity_type' }).select().single();
    if (error) return setNotice(error.message);
    if (data) setSuggestions((v) => [data as AuthoritySuggestion, ...v.filter((x) => x.id !== (data as AuthoritySuggestion).id)]);
  }

  async function addThreat(data: Partial<AuthorityThreat>) {
    if (!user || !data.title?.trim()) return;
    const { data: row, error } = await supabase.from('authority_threats').insert({
      user_id:user.id, title:data.title.trim(), category:data.category || 'Reputação', severity:data.severity || 'Média',
      source_url:data.source_url?.trim() || '', evidence:data.evidence?.trim() || '', status:'Aberta',
      linked_entity_id:data.linked_entity_id || null, linked_entity_type:data.linked_entity_type || null,
      due_date:data.due_date || null, response_summary:''
    }).select().single();
    if (error) return setNotice(error.message);
    if (row) setThreats((v) => [row as AuthorityThreat, ...v]);
  }

  async function updateThreat(id:string, patch:Partial<AuthorityThreat>) {
    if(!user) return;
    const {error}=await supabase.from('authority_threats').update(patch).eq('id',id).eq('user_id',user.id);
    if(error)return setNotice(error.message);
    setThreats((v)=>v.map((x)=>x.id===id?{...x,...patch}:x));
  }

  async function addDefenseAction(threat: AuthorityThreat, actionType:string, responseText:string) {
    if(!user)return;
    const actionTitle = actionType === 'Criar conteúdo' ? 'Criar conteúdo positivo' : actionType === 'Notificar aliado' ? 'Acionar aliado' : 'Criar tarefa de resposta';
    const {data,error}=await supabase.from('authority_defense_actions').insert({
      user_id:user.id, threat_id:threat.id, action_type:actionType, status:'Sugerida',
      action_title:actionTitle, response_text:responseText
    }).select().single();
    if(error)return setNotice(error.message);
    if(data)setDefenseActions((v)=>[data as DefenseAction,...v]);
  }

  async function deleteRow(table: string, id: string) {
    if (!user) return;
    const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
    if (error) setNotice(error.message);
  }

  async function exportData() {
    const data = { properties, contacts, connections, tasks, contents, opportunities, ledger, leverage, products, commissions, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'risegoat-centro-comando-backup.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    try {
      const json = JSON.parse(await file.text());
      if (!user || !json || !Array.isArray(json.properties)) throw new Error('Arquivo de backup inválido.');
      for (const item of json.properties) await addProperty(item);
      for (const item of json.contacts) await addContact(item);
      setNotice('Backup importado. Os itens principais foram adicionados.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível importar.');
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">Centro de Comando</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Teia de Autoridade</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Conecte propriedades, pessoas, conteúdo, tarefas e oportunidades em uma visão única.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncRiseGoatData} className="flex items-center gap-2 px-3 py-2 border border-cyan-200 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-medium hover:bg-cyan-100">
            <RefreshCw className="w-4 h-4" /> Sincronizar RiseGoat
          </button>
          <button onClick={runRadar} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Target className="w-4 h-4" /> Rodar radar
          </button>
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50">
            <Upload className="w-4 h-4" /> Importar
            <input type="file" accept="application/json" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) importData(file); e.currentTarget.value = ''; }} />
          </label>
          <button onClick={exportData} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"><Download className="w-4 h-4" /> Exportar</button>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50" title="Atualizar"><RefreshCw className={'w-4 h-4 ' + (refreshing ? 'animate-spin' : '')} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-5 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ' + (tab === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <item.icon className="w-3.5 h-3.5" />{item.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {tab === 'overview' && <Overview
        totals={totals} nodes={nodes} todayTasks={todayTasks} overdueTasks={overdueTasks}
        isolated={isolated} stagnant={stagnant} topOpportunities={openOpportunities.slice(0, 5)}
        onTab={setTab}
      />}

      {tab === 'map' && <NetworkMap nodes={filteredNodes} allNodes={nodes} connections={connections} search={search} setSearch={setSearch} />}

      {tab === 'crm' && <CRM
        properties={properties} contacts={contacts} connections={connections} contents={contents}
        nodes={nodes} onAddProperty={addProperty} onAddContact={addContact} onAddConnection={addConnection}
        onRefresh={load} onDelete={async (table, id) => { await deleteRow(table, id); await load(); }}
      />}

      {tab === 'action' && <ActionPanel tasks={tasks} contents={contents} isolated={isolated} today={today} onAddTask={addTask} onUpdateTask={updateTask} nodes={nodes} />}

      {tab === 'opportunities' && <OpportunityPanel opportunities={opportunities} onAdd={addOpportunity} onUpdate={updateOpportunity} />}

      {tab === 'intelligence' && <IntelligencePanel contacts={contacts} properties={properties} dossiers={dossiers} suggestions={suggestions} nodes={nodes} connections={connections} onUpdateContact={updateContactIntelligence} onSaveSuggestion={createSuggestion} />}

      {tab === 'strategy' && <StrategyPanel contacts={contacts} leverage={leverage} ledger={ledger} connections={connections} nodes={nodes} negotiations={negotiations} hiddenConnections={hiddenConnections} crossInfluence={crossInfluence} onRefresh={load} />}

      {tab === 'defense' && <DefensePanel threats={threats} actions={defenseActions} nodes={nodes} onAddThreat={addThreat} onUpdateThreat={updateThreat} onAddAction={addDefenseAction} />}

      {tab === 'finance' && <FinancePanel products={products} commissions={commissions} nodeMonetization={nodeMonetization} nodes={nodes} onAddProduct={addProduct} onAddCommission={addCommission} onRefresh={load} />}
    </div>
  );
}

function Overview(props: {
  totals: { activeProperties:number; warmContacts:number; openValue:number; monthlyRevenue:number };
  nodes: Array<{id:string;type:EntityType;name:string;label:string}>;
  todayTasks: AuthorityTask[]; overdueTasks: AuthorityTask[]; isolated: Array<{id:string;type:EntityType;name:string;label:string}>;
  stagnant: AuthorityOpportunity[]; topOpportunities: AuthorityOpportunity[]; onTab:(tab:Tab)=>void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Propriedades ativas" value={String(props.totals.activeProperties)} icon={Briefcase} />
        <Metric label="Contatos quentes" value={String(props.totals.warmContacts)} icon={Users} />
        <Metric label="Oportunidades abertas" value={money(props.totals.openValue)} icon={Target} />
        <Metric label="Receita mensal pipeline" value={money(props.totals.monthlyRevenue)} icon={Wallet} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionHeader title="Painel de ação" action={() => props.onTab('action')} />
          <div className="space-y-2">
            <AlertLine label="Tarefas para hoje" value={String(props.todayTasks.length)} tone={props.todayTasks.length ? 'warn' : 'ok'} />
            <AlertLine label="Tarefas atrasadas" value={String(props.overdueTasks.length)} tone={props.overdueTasks.length ? 'warn' : 'ok'} />
            <AlertLine label="Nós isolados" value={String(props.isolated.length)} tone={props.isolated.length ? 'warn' : 'ok'} />
            <AlertLine label="Oportunidades paradas +7d" value={String(props.stagnant.length)} tone={props.stagnant.length ? 'warn' : 'ok'} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Top oportunidades" action={() => props.onTab('opportunities')} />
          {props.topOpportunities.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Nenhuma oportunidade aberta.</p>
          ) : (
            <div className="space-y-2">
              {props.topOpportunities.map((op) => (
                <div key={op.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center"><Target className="w-4 h-4 text-cyan-600" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{op.opportunity}</p><p className="text-xs text-slate-400">{op.status}</p></div>
                  <span className="text-sm font-semibold text-slate-700">{money(op.estimated_value)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <SectionHeader title="Tamanho da teia" action={() => props.onTab('map')} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Nós" value={String(props.nodes.length)} />
          <MiniStat label="Propriedades" value={String(props.nodes.filter((x) => x.type === 'property').length)} />
          <MiniStat label="Contatos" value={String(props.nodes.filter((x) => x.type === 'contact').length)} />
          <MiniStat label="Conexões" value="Use o mapa" />
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label:string; value:string; icon: typeof Users }) {
  return <Card className="p-4"><div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-3"><Icon className="w-4 h-4 text-slate-600" /></div><p className="text-xl font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500 mt-1">{label}</p></Card>;
}
function MiniStat({ label, value }: { label:string; value:string }) { return <div className="p-3 rounded-xl border border-slate-200 bg-slate-50"><p className="text-lg font-bold text-slate-800">{value}</p><p className="text-xs text-slate-400">{label}</p></div>; }
function SectionHeader({ title, action }: { title:string; action:()=>void }) { return <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-slate-800">{title}</h2><button onClick={action} className="text-xs text-cyan-600 hover:text-cyan-500">Abrir <ArrowRight className="w-3 h-3 inline ml-1" /></button></div>; }
function AlertLine({ label, value, tone }: { label:string; value:string; tone:'warn'|'ok' }) { return <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><span className="text-sm text-slate-600">{label}</span><span className={'text-sm font-semibold ' + (tone === 'warn' ? 'text-amber-600' : 'text-emerald-600')}>{value}</span></div>; }

function NetworkMap(props: {
  nodes:Array<{id:string;type:EntityType;name:string;label:string}>;
  allNodes:Array<{id:string;type:EntityType;name:string;label:string}>;
  connections:AuthorityConnection[]; search:string; setSearch:(v:string)=>void;
}) {
  const [typeFilter,setTypeFilter]=useState<'all'|'property'|'contact'>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const filtered = props.nodes.filter((n)=>typeFilter==='all'||n.type===typeFilter);
  const visible = filtered.slice(0,50);
  const positions = useMemo(() => visible.map((node,i) => {
    const angle=(i/Math.max(1,visible.length))*Math.PI*2;
    return {...node,x:50+Math.cos(angle)*37,y:50+Math.sin(angle)*34};
  }),[visible.map((x)=>x.id).join('|')]);
  const lookup=new Map(positions.map((n)=>[n.id,n]));
  const lineData=props.connections.filter((c)=>lookup.has(c.origin_id)&&lookup.has(c.destination_id));
  const selected=props.allNodes.find((n)=>n.id===selectedId);
  const selectedConnections=selected?props.connections.filter((c)=>c.origin_id===selected.id||c.destination_id===selected.id):[];
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={props.search} onChange={(e)=>props.setSearch(e.target.value)} placeholder="Buscar um nó..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg" /></div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {(['all','property','contact'] as const).map((t)=><button key={t} onClick={()=>setTypeFilter(t)} className={'px-3 py-1.5 rounded-md text-xs font-medium '+(typeFilter===t?'bg-white text-slate-900 shadow-sm':'text-slate-500')}>{t==='all'?'Todos':t==='property'?'Propriedades':'Contatos'}</button>)}
        </div>
        <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 rounded-lg">{visible.length} nós · {props.connections.length} conexões</div>
      </div>
      <Card className="p-3 overflow-hidden">
        {visible.length===0?<div className="h-[520px] flex items-center justify-center text-sm text-slate-400">Crie propriedades ou contatos para começar.</div>:(
          <div className="relative h-[520px] rounded-xl bg-slate-950 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full">
              {lineData.map((line)=>{const a=lookup.get(line.origin_id)!;const b=lookup.get(line.destination_id)!;return <line key={line.id} x1={a.x+'%'} y1={a.y+'%'} x2={b.x+'%'} y2={b.y+'%'} stroke="rgba(255,255,255,0.16)" strokeWidth="1.3"/>;})}
            </svg>
            {positions.map((node)=><button key={node.id} onClick={()=>setSelectedId(node.id)} className="absolute -translate-x-1/2 -translate-y-1/2 text-left" style={{left:node.x+'%',top:node.y+'%'}}>
              <div className={'w-20 h-20 rounded-full border flex items-center justify-center text-center px-2 shadow-lg transition hover:scale-105 '+(node.type==='property'?'bg-violet-500/20 border-violet-300/40 text-violet-100':'bg-cyan-500/20 border-cyan-300/40 text-cyan-100')}>
                <span className="text-[10px] font-semibold leading-tight">{node.name.slice(0,28)}</span>
              </div>
              <p className="text-[9px] text-center text-white/40 mt-1">{node.label}</p>
            </button>)}
            <div className="absolute left-3 bottom-3 flex gap-2 text-[10px]">
              <span className="px-2 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-300/20">Propriedade</span>
              <span className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-300/20">Contato</span>
            </div>
            {selected && <div className="absolute top-3 right-3 w-72 max-w-[calc(100%-1.5rem)] p-4 rounded-xl bg-white shadow-xl">
              <div className="flex items-start gap-3"><div className="flex-1 min-w-0"><p className="text-xs uppercase tracking-wider text-slate-400">{selected.type==='property'?'Propriedade':'Contato'}</p><h3 className="text-sm font-semibold text-slate-900 mt-1 truncate">{selected.name}</h3><p className="text-xs text-slate-400 mt-0.5">{selected.label}</p></div><button onClick={()=>setSelectedId(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4"/></button></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><MiniStat label="Conexões" value={String(selectedConnections.length)}/><MiniStat label="Tipo" value={selected.type==='property'?'Ativo':'Pessoa'}/></div>
            </div>}
          </div>
        )}
      </Card>
    </div>
  );
}

function CRM(props: {
  properties:AuthorityProperty[]; contacts:AuthorityContact[]; connections:AuthorityConnection[];
  contents:AuthorityContent[]; nodes:Array<{id:string;type:EntityType;name:string;label:string}>;
  onAddProperty:(d:Partial<AuthorityProperty>)=>void; onAddContact:(d:Partial<AuthorityContact>)=>void;
  onAddConnection:(d:{origin_id:string;origin_type:EntityType;destination_id:string;destination_type:EntityType;connection_type:string;strength:string;description:string})=>void;
  onRefresh:()=>void; onDelete:(table:string,id:string)=>void;
}) {
  const [subtab, setSubtab] = useState<'properties'|'contacts'|'connections'|'contents'>('properties');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''); const [type, setType] = useState('Site'); const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState(''); const [status, setStatus] = useState('Ativo'); const [objective, setObjective] = useState('Atrair'); const [tags, setTags] = useState('');
  const [email, setEmail] = useState(''); const [occupation, setOccupation] = useState(''); const [contactStatus, setContactStatus] = useState('Frio'); const [nextAction, setNextAction] = useState('');
  const [origin, setOrigin] = useState(''); const [destination, setDestination] = useState(''); const [connectionType, setConnectionType] = useState('Link'); const [strength, setStrength] = useState('Média'); const [description, setDescription] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (subtab === 'properties') {
      props.onAddProperty({ name, property_type:type, platform, url, status, objective, tags });
    } else if (subtab === 'contacts') {
      props.onAddContact({ name, email, occupation, status:contactStatus, next_action:nextAction, tags });
    } else if (subtab === 'connections') {
      const a = props.nodes.find((x) => x.id === origin); const b = props.nodes.find((x) => x.id === destination);
      if (a && b) props.onAddConnection({ origin_id:a.id, origin_type:a.type, destination_id:b.id, destination_type:b.type, connection_type:connectionType, strength, description });
    }
    setShowForm(false); setName(''); setEmail(''); setOccupation(''); setUrl(''); setPlatform(''); setTags(''); setNextAction(''); setDescription('');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        {(['properties','contacts','connections','contents'] as const).map((id) => <button key={id} onClick={() => setSubtab(id)} className={'px-3 py-2 text-xs font-medium rounded-lg ' + (subtab===id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>{id==='properties'?'Propriedades':id==='contacts'?'Contatos':id==='connections'?'Conexões':'Conteúdos'}</button>)}
        {subtab !== 'contents' && <button onClick={() => setShowForm((v) => !v)} className="ml-auto flex items-center gap-1 px-3 py-2 bg-cyan-600 text-white text-xs font-medium rounded-lg"><Plus className="w-3.5 h-3.5" />Adicionar</button>}
      </div>

      {showForm && (
        <Card className="p-4">
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
            {subtab === 'properties' && <>
              <Input label="Nome" value={name} onChange={setName} required />
              <Select label="Tipo" value={type} onChange={setType} options={propertyTypes} />
              <Input label="Plataforma" value={platform} onChange={setPlatform} placeholder="YouTube, Instagram..." />
              <Input label="URL" value={url} onChange={setUrl} placeholder="https://..." />
              <Select label="Status" value={status} onChange={setStatus} options={propertyStatuses} />
              <Select label="Objetivo" value={objective} onChange={setObjective} options={objectives} />
              <Input label="Tags" value={tags} onChange={setTags} placeholder="música, conteúdo, venda" />
            </>}
            {subtab === 'contacts' && <>
              <Input label="Nome" value={name} onChange={setName} required />
              <Input label="Email" value={email} onChange={setEmail} />
              <Input label="Ocupação" value={occupation} onChange={setOccupation} />
              <Select label="Status" value={contactStatus} onChange={setContactStatus} options={contactStatuses} />
              <Input label="Próxima ação" value={nextAction} onChange={setNextAction} placeholder="Enviar proposta..." />
              <Input label="Tags" value={tags} onChange={setTags} placeholder="creator, afiliado" />
            </>}
            {subtab === 'connections' && <>
              <Select label="Origem" value={origin} onChange={setOrigin} options={props.nodes.map((x) => x.id)} labels={Object.fromEntries(props.nodes.map((x) => [x.id, x.name + ' · ' + x.label]))} />
              <Select label="Destino" value={destination} onChange={setDestination} options={props.nodes.map((x) => x.id)} labels={Object.fromEntries(props.nodes.map((x) => [x.id, x.name + ' · ' + x.label]))} />
              <Select label="Tipo" value={connectionType} onChange={setConnectionType} options={['Link','CTA','Redirecionamento','Indicação']} />
              <Select label="Força" value={strength} onChange={setStrength} options={['Fraca','Média','Forte']} />
              <Input label="Descrição" value={description} onChange={setDescription} />
            </>}
            <div className="sm:col-span-2 flex gap-2 pt-1"><button type="submit" className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg">Salvar</button><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-500 text-sm rounded-lg">Cancelar</button></div>
          </form>
        </Card>
      )}

      {subtab === 'properties' && <Table rows={props.properties} empty="Nenhuma propriedade cadastrada." columns={['Nome','Tipo','Plataforma','Status']} render={(x) => <><Cell strong>{x.name}</Cell><Cell>{x.property_type}</Cell><Cell>{x.platform || '—'}</Cell><Cell>{x.status}</Cell></>} actions={(x) => <button onClick={() => props.onDelete('authority_properties', x.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>} />}
      {subtab === 'contacts' && <Table rows={props.contacts} empty="Nenhum contato cadastrado." columns={['Nome','Ocupação','Status','Próxima ação']} render={(x) => <><Cell strong>{x.name}</Cell><Cell>{x.occupation || '—'}</Cell><Cell>{x.status}</Cell><Cell>{x.next_action || '—'}</Cell></>} actions={(x) => <button onClick={() => props.onDelete('authority_contacts', x.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>} />}
      {subtab === 'connections' && <Table rows={props.connections} empty="Nenhuma conexão cadastrada." columns={['Origem','Tipo','Destino','Força']} render={(x) => {
        const a=props.nodes.find((n)=>n.id===x.origin_id); const b=props.nodes.find((n)=>n.id===x.destination_id);
        return <><Cell strong>{a?.name || '—'}</Cell><Cell>{x.connection_type}</Cell><Cell>{b?.name || '—'}</Cell><Cell>{x.strength}</Cell></>;
      }} actions={(x) => <button onClick={() => props.onDelete('authority_connections', x.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>} />}
      {subtab === 'contents' && <Card className="p-5"><p className="text-sm text-slate-500">O núcleo atual organiza conteúdos existentes do RiseGoat. Aqui você pode usar as propriedades como estrutura estratégica e, nas próximas iterações, sincronizar Posts/Microblog diretamente neste catálogo.</p></Card>}
    </div>
  );
}

function ActionPanel(props: {
  tasks:AuthorityTask[]; contents:AuthorityContent[]; isolated:Array<{id:string;type:EntityType;name:string;label:string}>; today:string;
  onAddTask:(d:Partial<AuthorityTask>)=>void; onUpdateTask:(id:string,status:string)=>void;
  nodes:Array<{id:string;type:EntityType;name:string;label:string}>;
}) {
  const [title,setTitle]=useState(''); const [due,setDue]=useState(props.today); const [priority,setPriority]=useState('Média'); const [taskType,setTaskType]=useState('Analisar'); const [entity,setEntity]=useState('');
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-slate-800">Criar tarefa</h2><CheckSquare className="w-4 h-4 text-slate-400" /></div>
        <form onSubmit={(e)=>{e.preventDefault();props.onAddTask({title,due_date:due,priority,task_type:taskType,entity_id:entity||null,entity_type:entity?(props.nodes.find((n)=>n.id===entity)?.type||null):null,status:due===props.today?'Hoje':'Backlog'});setTitle('')}} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input required value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="O que precisa ser feito?" className="px-3 py-2 border rounded-lg text-sm lg:col-span-2" />
          <input type="date" value={due} onChange={(e)=>setDue(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          <Select value={priority} onChange={setPriority} options={priorities} label="Prioridade" />
          <Select value={taskType} onChange={setTaskType} options={taskTypes} label="Tipo" />
          <div className="lg:col-span-5"><Select value={entity} onChange={setEntity} options={['',...props.nodes.map((n)=>n.id)]} labels={Object.fromEntries(props.nodes.map((n)=>[n.id,n.name]))} label="Vincular a um nó" /><button className="mt-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg">Criar tarefa</button></div>
        </form>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-slate-800">Hoje e próximos follow-ups</h2><span className="text-xs text-slate-400">{props.tasks.filter((t)=>t.status!=='Feito').length} abertas</span></div>
        <div className="space-y-2">
          {props.tasks.filter((t)=>t.status!=='Feito').slice(0,25).map((task)=><div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
            <button onClick={()=>props.onUpdateTask(task.id,'Feito')} className="w-5 h-5 rounded-full border border-slate-300 hover:border-emerald-500" title="Concluir" />
            <div className="flex-1 min-w-0"><p className="text-sm text-slate-700 truncate">{task.title}</p><p className="text-xs text-slate-400">{task.due_date||'sem prazo'} · {task.priority}</p></div>
            <span className="text-[10px] text-slate-400">{task.status}</span>
          </div>)}
        </div>
        {props.isolated.length>0 && <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700"><strong>{props.isolated.length} nós isolados.</strong> Conecte-os a uma propriedade ou contato para incluir no mapa.</div>}
      </Card>
    </div>
  );
}

function OpportunityPanel(props:{opportunities:AuthorityOpportunity[];onAdd:(d:Partial<AuthorityOpportunity>)=>void;onUpdate:(id:string,status:string)=>void}) {
  const [opportunity,setOpportunity]=useState(''); const [value,setValue]=useState(''); const [status,setStatus]=useState('Identificada');
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form className="grid sm:grid-cols-[1fr_160px_180px_auto] gap-2" onSubmit={(e)=>{e.preventDefault();props.onAdd({opportunity,estimated_value:Number(value||0),status});setOpportunity('');setValue('')}}>
          <input required value={opportunity} onChange={(e)=>setOpportunity(e.target.value)} placeholder="Nova oportunidade..." className="px-3 py-2 border rounded-lg text-sm" />
          <input type="number" value={value} onChange={(e)=>setValue(e.target.value)} placeholder="Valor" className="px-3 py-2 border rounded-lg text-sm" />
          <Select value={status} onChange={setStatus} options={opportunityStatuses} label="Etapa" />
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"><Plus className="w-4 h-4 inline mr-1" />Adicionar</button>
        </form>
      </Card>
      <div className="grid lg:grid-cols-5 gap-3">
        {opportunityStatuses.map((stage)=>(
          <Card key={stage} className="p-3 min-h-[260px]">
            <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-slate-600">{stage}</h3><span className="text-[10px] text-slate-400">{props.opportunities.filter((o)=>o.status===stage).length}</span></div>
            <div className="space-y-2">
              {props.opportunities.filter((o)=>o.status===stage).map((op)=><div key={op.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-medium text-slate-800">{op.opportunity}</p><p className="text-sm font-semibold text-slate-700 mt-2">{money(op.estimated_value)}</p>
                <select value={op.status} onChange={(e)=>props.onUpdate(op.id,e.target.value)} className="w-full mt-2 text-[11px] border border-slate-200 rounded-lg bg-white px-2 py-1.5">{opportunityStatuses.map((s)=><option key={s}>{s}</option>)}</select>
              </div>)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StrategyPanel(props:{contacts:AuthorityContact[];leverage:LeverageNode[];ledger:ReciprocityEntry[];connections:AuthorityConnection[];nodes:Array<{id:string;type:EntityType;name:string;label:string}>;onRefresh:()=>void}) {
  const nameMap=new Map(props.nodes.map((x)=>[x.id,x.name]));
  const degreeMap=new Map<string,number>();
  props.connections.forEach((x)=>{degreeMap.set(x.origin_id,(degreeMap.get(x.origin_id)||0)+1);degreeMap.set(x.destination_id,(degreeMap.get(x.destination_id)||0)+1)});
  const maxDegree=Math.max(1,...degreeMap.values());
  const stored=new Map(props.leverage.map((x)=>[x.entity_id,x]));
  const scored=props.nodes.map((node)=>{
    const degree=degreeMap.get(node.id)||0;
    const connectionScore=Math.min(100,(degree/maxDegree)*100);
    const centrality=connectionScore;
    const saved=stored.get(node.id);
    const decision=Number(saved?.decision_power||0);
    const resources=Number(saved?.resources||0);
    const score=(connectionScore*0.3)+(centrality*0.3)+(decision*0.2)+(resources*0.2);
    return { ...node, degree, connectionScore, centrality, decision, resources, score };
  }).sort((a,b)=>b.score-a.score).slice(0,10);

  const totals=new Map<string,number>();
  props.ledger.forEach((e)=>totals.set(e.contact_id,(totals.get(e.contact_id)||0)+Number(e.value_given||0)-Number(e.value_received||0)));
  const [selected,setSelected]=useState(props.contacts[0]?.id||'');
  const [given,setGiven]=useState(''); const [received,setReceived]=useState(''); const [context,setContext]=useState('');
  const [wants,setWants]=useState(''); const [fears,setFears]=useState('');
  async function saveLedger(){
    if(!selected||!props.contacts[0]?.user_id)return;
    const {error}=await supabase.from('reciprocity_ledger').insert({user_id:props.contacts[0].user_id,contact_id:selected,favor_given:given,favor_received:received,value_given:Number(given||0),value_received:Number(received||0),context,entry_date:new Date().toISOString().slice(0,10)});
    if(!error){setGiven('');setReceived('');setContext('');props.onRefresh();}
  }
  async function saveDossier(){
    if(!selected||!props.contacts[0]?.user_id)return;
    const {error}=await supabase.from('contact_dossiers').upsert({user_id:props.contacts[0].user_id,contact_id:selected,wants,fears},{onConflict:'contact_id'});
    if(!error){setWants('');setFears('');props.onRefresh();}
  }
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionHeader title="Mapa de alavancagem" action={()=>{}} />
          <p className="text-xs text-slate-400 mb-3">Score automático: conexão 30% + centralidade 30% + decisão 20% + recursos 20%.</p>
          {scored.length===0?<p className="text-sm text-slate-400">Crie nós e conexões para gerar o ranking.</p>:<div className="space-y-2">{scored.map((x,i)=><div key={x.id} className="flex items-center gap-3"><span className="w-6 text-xs text-slate-400">{i+1}</span><div className="flex-1"><p className="text-sm text-slate-700 truncate">{x.name}</p><div className="h-1.5 bg-slate-100 rounded-full mt-1"><div className="h-1.5 bg-cyan-500 rounded-full" style={{width:Math.min(100,x.score)+'%'}}/></div></div><span className="text-sm font-semibold text-slate-800">{x.score.toFixed(0)}</span></div>)}</div>}
        </Card>
        <Card className="p-5">
          <SectionHeader title="Ledger de reciprocidade" action={()=>{}} />
          <div className="space-y-2 mb-4">{props.contacts.slice(0,6).map((c)=><div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50"><span className="text-sm text-slate-700">{c.name}</span><span className={'text-sm font-semibold '+((totals.get(c.id)||0)>=0?'text-emerald-600':'text-red-500')}>{money(totals.get(c.id)||0)}</span></div>)}</div>
          {props.contacts.length>0?<><div className="grid grid-cols-2 gap-2"><Select label="Contato" value={selected} onChange={setSelected} options={props.contacts.map((c)=>c.id)} labels={Object.fromEntries(props.contacts.map((c)=>[c.id,c.name]))}/><Input label="Contexto" value={context} onChange={setContext}/><Input label="Valor dado" value={given} onChange={setGiven} placeholder="0" type="number"/><Input label="Valor recebido" value={received} onChange={setReceived} placeholder="0" type="number"/></div><button onClick={saveLedger} className="mt-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg">Registrar</button></>:<p className="text-sm text-slate-400">Cadastre contatos para usar o ledger.</p>}
        </Card>
      </div>
      <Card className="p-5">
        <SectionHeader title="Dossiê de interesses e dores" action={()=>{}} />
        {props.contacts.length>0?<><div className="grid sm:grid-cols-3 gap-2"><Select label="Contato" value={selected} onChange={setSelected} options={props.contacts.map((c)=>c.id)} labels={Object.fromEntries(props.contacts.map((c)=>[c.id,c.name]))}/><Input label="O que quer" value={wants} onChange={setWants}/><Input label="O que teme" value={fears} onChange={setFears}/></div><button onClick={saveDossier} className="mt-3 px-3 py-2 bg-cyan-600 text-white text-xs rounded-lg">Salvar dossiê</button></>:<p className="text-sm text-slate-400">Cadastre um contato para criar seu dossiê.</p>}
      </Card>
      <Card className="p-5">
        <SectionHeader title="Sinais de rede" action={()=>{}} />
        <div className="grid sm:grid-cols-4 gap-3"><MiniStat label="Conexões" value={String(props.connections.length)}/><MiniStat label="Contatos" value={String(props.contacts.length)}/><MiniStat label="Saldos negativos" value={String([...totals.values()].filter((v)=>v<0).length)}/><MiniStat label="Nós avaliados" value={String(scored.length)}/></div>
      </Card>
    </div>
  );
}


function dialogGrade(score:number) {
  if (score >= 80) return 'C';
  if (score >= 55) return 'B';
  return 'A';
}

function IntelligencePanel(props:{
  contacts:AuthorityContact[]; properties:AuthorityProperty[]; dossiers:ContactDossier[];
  suggestions:AuthoritySuggestion[]; nodes:Array<{id:string;type:EntityType;name:string;label:string}>;
  connections:AuthorityConnection[];
  onUpdateContact:(id:string,patch:{wealth_score?:number;fame_score?:number;decision_power_score?:number;resources_score?:number;intelligence_notes?:string})=>void;
  onSaveSuggestion:(s:{source_entity_id:string;source_entity_type:EntityType;target_entity_id:string;target_entity_type:EntityType;score:number;reason:string})=>void;
}) {
  const [selected,setSelected]=useState(props.contacts[0]?.id||'');
  const [wealth,setWealth]=useState(''); const [fame,setFame]=useState(''); const [decision,setDecision]=useState(''); const [resources,setResources]=useState(''); const [notes,setNotes]=useState('');
  const current=props.contacts.find((x)=>x.id===selected);
  useEffect(()=>{
    if(!current)return;
    setWealth(String(current.wealth_score||0));setFame(String(current.fame_score||0));setDecision(String(current.decision_power_score||0));setResources(String(current.resources_score||0));setNotes(current.intelligence_notes||'');
  },[selected,current?.id]);
  const score=current?((Number(wealth)||0)+(Number(fame)||0)+(Number(decision)||0))/3:0;
  const grade=dialogGrade(score);

  const existing=new Set(props.connections.map((x)=>[x.origin_id,x.destination_id].sort().join(':')));
  const localSuggestions=useMemo(()=>{
    const result:Array<{source_entity_id:string;source_entity_type:EntityType;target_entity_id:string;target_entity_type:EntityType;score:number;reason:string}>=[];
    const token=(s:string)=>new Set((s||'').toLowerCase().split(/[^a-z0-9à-ÿ]+/).filter((x)=>x.length>=3));
    for(const a of props.contacts){
      for(const b of props.contacts){
        if(a.id===b.id||existing.has([a.id,b.id].sort().join(':')))continue;
        const overlap=[...token(a.tags)].filter((x)=>token(b.tags).has(x));
        const aScore=(Number(a.wealth_score||0)+Number(a.fame_score||0)+Number(a.decision_power_score||0))/3;
        const bScore=(Number(b.wealth_score||0)+Number(b.fame_score||0)+Number(b.decision_power_score||0))/3;
        const base=Math.min(100,overlap.length*20+Math.abs(aScore-bScore)*0.25+30);
        if(overlap.length>0||base>=55){
          result.push({source_entity_id:a.id,source_entity_type:'contact',target_entity_id:b.id,target_entity_type:'contact',score:Math.round(base),reason:overlap.length?'Tags em comum: '+overlap.join(', '):'Potencial complementar pelos perfis estratégicos'});
        }
      }
    }
    for(const contact of props.contacts){
      for(const property of props.properties){
        if(existing.has([contact.id,property.id].sort().join(':')))continue;
        const overlap=[...token(contact.tags)].filter((x)=>token(property.tags+' '+property.name+' '+property.platform).has(x));
        if(overlap.length){
          result.push({source_entity_id:contact.id,source_entity_type:'contact',target_entity_id:property.id,target_entity_type:'property',score:Math.min(100,40+overlap.length*20),reason:'Interseção de contexto: '+overlap.join(', ')});
        }
      }
    }
    return result.sort((a,b)=>b.score-a.score).slice(0,12);
  },[props.contacts,props.properties,props.connections]);

  const suggestionName=(id:string)=>props.nodes.find((n)=>n.id===id)?.name||'Nó';

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4"><div><h2 className="text-sm font-semibold text-slate-800">Dialog Club</h2><p className="text-xs text-slate-400 mt-1">Classificação manual baseada em riqueza, fama e poder de decisão. C representa a faixa mais alta.</p></div><Users className="w-4 h-4 text-slate-400"/></div>
        {props.contacts.length===0?<p className="text-sm text-slate-400">Cadastre contatos para criar perfis dinâmicos.</p>:<div className="grid lg:grid-cols-[240px_1fr] gap-5">
          <div className="space-y-2 max-h-72 overflow-y-auto">{props.contacts.map((c)=>{
            const s=(Number(c.wealth_score||0)+Number(c.fame_score||0)+Number(c.decision_power_score||0))/3;
            return <button key={c.id} onClick={()=>setSelected(c.id)} className={'w-full text-left p-3 rounded-xl border transition '+(selected===c.id?'border-cyan-300 bg-cyan-50':'border-slate-100 hover:bg-slate-50')}><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-slate-800 truncate">{c.name}</span><span className="text-xs font-bold text-slate-600">{dialogGrade(s)}</span></div><span className="text-[11px] text-slate-400">{s.toFixed(0)} / 100</span></button>
          })}</div>
          {current&&<div>
            <div className="flex items-center justify-between mb-3"><div><h3 className="text-lg font-semibold text-slate-900">{current.name}</h3><p className="text-xs text-slate-400">Faixa {grade} · score {score.toFixed(0)}</p></div><div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold">{grade}</div></div>
            <div className="grid sm:grid-cols-4 gap-2">
              <Input label="Riqueza" value={wealth} onChange={setWealth} type="number"/><Input label="Fama" value={fame} onChange={setFame} type="number"/><Input label="Decisão" value={decision} onChange={setDecision} type="number"/><Input label="Recursos" value={resources} onChange={setResources} type="number"/>
            </div>
            <Input label="Notas de inteligência" value={notes} onChange={setNotes} placeholder="Contexto, fontes, observações..."/>
            <button onClick={()=>props.onUpdateContact(current.id,{wealth_score:Number(wealth||0),fame_score:Number(fame||0),decision_power_score:Number(decision||0),resources_score:Number(resources||0),intelligence_notes:notes})} className="mt-3 px-4 py-2 bg-slate-900 text-white text-xs rounded-lg">Salvar avaliação</button>
          </div>}
        </div>}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4"><div><h2 className="text-sm font-semibold text-slate-800">Radar: quem deveria conhecer quem?</h2><p className="text-xs text-slate-400 mt-1">Sugestões baseadas em dados que você cadastrou, como tags e contexto. O sistema não inventa relações.</p></div><ArrowRight className="w-4 h-4 text-slate-400"/></div>
        {localSuggestions.length===0?<p className="text-sm text-slate-400">Adicione tags aos contatos e propriedades para gerar sugestões.</p>:<div className="space-y-2">{localSuggestions.map((s,i)=><div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Link2 className="w-4 h-4 text-slate-500"/></div>
          <div className="flex-1 min-w-0"><p className="text-sm text-slate-800"><strong>{suggestionName(s.source_entity_id)}</strong> <span className="text-slate-400">→</span> <strong>{suggestionName(s.target_entity_id)}</strong></p><p className="text-xs text-slate-400 mt-0.5">{s.reason}</p></div>
          <span className="text-xs font-semibold text-slate-500">{s.score}</span>
          <button onClick={()=>props.onSaveSuggestion(s)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Salvar</button>
        </div>)}</div>}
      </Card>

      {props.suggestions.length>0&&<Card className="p-5"><h2 className="text-sm font-semibold text-slate-800 mb-3">Sugestões salvas</h2><div className="space-y-2">{props.suggestions.slice(0,10).map((s)=><div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><div><p className="text-sm text-slate-700">{suggestionName(s.source_entity_id)} → {suggestionName(s.target_entity_id)}</p><p className="text-xs text-slate-400">{s.reason}</p></div><span className="text-xs font-semibold text-slate-500">{s.score}</span></div>)}</div></Card>}
    </div>
  );
}

function DefensePanel(props:{
  threats:AuthorityThreat[]; actions:DefenseAction[];
  nodes:Array<{id:string;type:EntityType;name:string;label:string}>;
  onAddThreat:(d:Partial<AuthorityThreat>)=>void;
  onUpdateThreat:(id:string,patch:Partial<AuthorityThreat>)=>void;
  onAddAction:(threat:AuthorityThreat,actionType:string,responseText:string)=>void;
}) {
  const [title,setTitle]=useState(''); const [category,setCategory]=useState('Reputação'); const [severity,setSeverity]=useState('Média'); const [source,setSource]=useState(''); const [evidence,setEvidence]=useState('');
  const responseTemplate=(t:AuthorityThreat)=> {
    if(t.category==='Reputação')return 'Registrar os fatos verificáveis, preservar evidências e preparar uma resposta factual e proporcional.';
    if(t.category==='Concorrência')return 'Mapear o contexto, comparar ofertas/posicionamento e reforçar comunicação própria baseada em evidências.';
    if(t.category==='Vazamento')return 'Identificar o alcance, registrar a evidência, revogar acessos quando necessário e comunicar as partes afetadas.';
    return 'Registrar a ocorrência, validar a evidência e definir a próxima ação antes de responder publicamente.';
  };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4"><div><h2 className="text-sm font-semibold text-slate-800">Radar de defesa</h2><p className="text-xs text-slate-400 mt-1">Monitore riscos de reputação, concorrência e segurança. As ações são sugestões para revisão humana.</p></div><Shield className="w-4 h-4 text-slate-400"/></div>
        <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e)=>{e.preventDefault();props.onAddThreat({title,category,severity,source_url:source,evidence});setTitle('');setSource('');setEvidence('')}}>
          <Input label="Ocorrência" value={title} onChange={setTitle} required placeholder="Ex.: menção negativa, concorrência agressiva..." />
          <Select label="Categoria" value={category} onChange={setCategory} options={['Reputação','Concorrência','Vazamento','Conta','Operação']} />
          <Select label="Severidade" value={severity} onChange={setSeverity} options={['Baixa','Média','Alta']} />
          <Input label="Fonte / URL" value={source} onChange={setSource} placeholder="https://..." />
          <div className="sm:col-span-2"><label className="block text-[11px] font-medium text-slate-500 mb-1">Evidência / contexto</label><textarea value={evidence} onChange={(e)=>setEvidence(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" /></div>
          <button className="sm:col-span-2 justify-self-start px-4 py-2 bg-slate-900 text-white text-xs rounded-lg"><Plus className="w-4 h-4 inline mr-1"/>Registrar ocorrência</button>
        </form>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        {props.threats.length===0?<Card className="p-8"><p className="text-sm text-slate-400 text-center">Nenhuma ocorrência registrada. Rode o radar para verificar nós isolados e oportunidades paradas.</p></Card>:props.threats.slice(0,30).map((t)=><Card key={t.id} className="p-5">
          <div className="flex items-start gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-slate-800 truncate">{t.title}</h3><span className="text-xs text-slate-400">{t.severity}</span></div><p className="text-xs text-slate-400 mt-1">{t.category} · {new Date(t.detected_at).toLocaleDateString('pt-BR')}</p>{t.source_url&&<a href={t.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 mt-2 inline-block">Abrir fonte</a>}<p className="text-sm text-slate-600 mt-3">{t.evidence||'Sem evidência adicional.'}</p></div><select value={t.status} onChange={(e)=>props.onUpdateThreat(t.id,{status:e.target.value})} className="w-28 px-2 py-1.5 text-xs border rounded-lg"><option>Aberta</option><option>Em análise</option><option>Resolvida</option></select></div>
          <div className="mt-4 p-3 rounded-xl bg-slate-50"><p className="text-[11px] font-semibold text-slate-500 mb-2">Próximas ações sugeridas</p><div className="flex flex-wrap gap-2"><button onClick={()=>props.onAddAction(t,'Criar conteúdo',responseTemplate(t))} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-white">Criar conteúdo</button><button onClick={()=>props.onAddAction(t,'Notificar aliado',responseTemplate(t))} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-white">Notificar aliado</button><button onClick={()=>props.onAddAction(t,'Criar tarefa',responseTemplate(t))} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-white">Criar tarefa</button></div></div>
        </Card>)}
      </div>
      {props.actions.length>0&&<Card className="p-5"><h2 className="text-sm font-semibold text-slate-800 mb-3">Ações registradas</h2><div className="space-y-2">{props.actions.slice(0,15).map((a)=><div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"><span className="flex-1 text-sm text-slate-700">{a.action_title}</span><span className="text-xs text-slate-400">{a.status}</span></div>)}</div></Card>}
    </div>
  );
}

function FinancePanel(props:{products:ProductPipelineItem[];commissions:Commission[];onAddProduct:(d:Partial<ProductPipelineItem>)=>void;onAddCommission:(d:Partial<Commission>)=>void}) {
  const [product,setProduct]=useState(''); const [status,setStatus]=useState('Ideia'); const [revenue,setRevenue]=useState(''); const [margin,setMargin]=useState('');
  const [business,setBusiness]=useState(''); const [rate,setRate]=useState(''); const [method,setMethod]=useState('');
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-slate-800">Pipeline de produtos</h2><Briefcase className="w-4 h-4 text-slate-400"/></div>
          <form className="space-y-2" onSubmit={(e)=>{e.preventDefault();props.onAddProduct({product,status,monthly_revenue:Number(revenue||0),margin:Number(margin||0)});setProduct('');setRevenue('');setMargin('')}}>
            <Input label="Produto" value={product} onChange={setProduct} required/><Select label="Status" value={status} onChange={setStatus} options={['Ideia','Em criação','Pronto','Vendendo']}/><div className="grid grid-cols-2 gap-2"><Input label="Receita mensal" value={revenue} onChange={setRevenue} type="number"/><Input label="Margem %" value={margin} onChange={setMargin} type="number"/></div><button className="px-3 py-2 bg-slate-900 text-white text-xs rounded-lg"><Plus className="w-4 h-4 inline mr-1"/>Adicionar</button>
          </form>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold text-slate-800">Calculadora de comissão</h2><Wallet className="w-4 h-4 text-slate-400"/></div>
          <form className="space-y-2" onSubmit={(e)=>{e.preventDefault();props.onAddCommission({business_value:Number(business||0),rate:Number(rate||0),payment_method:method});setBusiness('');setRate('');}}>
            <div className="grid grid-cols-2 gap-2"><Input label="Valor do negócio" value={business} onChange={setBusiness} type="number"/><Input label="Taxa %" value={rate} onChange={setRate} type="number"/></div><Input label="Forma de pagamento" value={method} onChange={setMethod} placeholder="Pix, transferência..."/><button className="px-3 py-2 bg-slate-900 text-white text-xs rounded-lg"><Plus className="w-4 h-4 inline mr-1"/>Adicionar</button>
          </form>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Produtos</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">{['Ideia','Em criação','Pronto','Vendendo'].map((s)=><div key={s} className="p-3 rounded-xl bg-slate-50 min-h-[130px]"><p className="text-xs font-semibold text-slate-500 mb-2">{s}</p>{props.products.filter((p)=>p.status===s).map((p)=><div key={p.id} className="p-2 bg-white rounded-lg border mb-2"><p className="text-xs font-medium text-slate-700">{p.product}</p><p className="text-[11px] text-slate-400">{money(p.monthly_revenue)} / mês · {p.margin}% margem</p></div>)}</div>)}</div>
      </Card>
      <Card className="p-5"><h2 className="text-sm font-semibold text-slate-800 mb-3">Comissões</h2><div className="space-y-2">{props.commissions.length===0?<p className="text-sm text-slate-400">Nenhuma comissão.</p>:props.commissions.map((c)=><div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50"><span className="text-sm text-slate-700">{money(c.business_value)}</span><span className="text-sm font-semibold text-slate-800">{money(c.business_value*c.rate/100)}</span><span className="text-xs text-slate-400">{c.status}</span></div>)}</div></Card>
    </div>
  );
}

function Input(props:{label?:string;value:string;onChange:(v:string)=>void;placeholder?:string;required?:boolean;type?:string}) {
  return <label className="block"><span className="block text-[11px] font-medium text-slate-500 mb-1">{props.label}</span><input type={props.type||'text'} required={props.required} value={props.value} onChange={(e)=>props.onChange(e.target.value)} placeholder={props.placeholder} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"/></label>;
}
function Select(props:{label?:string;value:string;onChange:(v:string)=>void;options:string[];labels?:Record<string,string>}) {
  return <label className="block"><span className="block text-[11px] font-medium text-slate-500 mb-1">{props.label}</span><div className="relative"><select value={props.value} onChange={(e)=>props.onChange(e.target.value)} className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-cyan-400">{props.options.map((o)=><option key={o} value={o}>{props.labels?.[o]||o||'Nenhum'}</option>)}</select><ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none"/></div></label>;
}
function Table<T extends { id:string }>(props:{rows:T[];columns:string[];empty:string;render:(row:T)=>React.ReactNode;actions:(row:T)=>React.ReactNode}) {
  return props.rows.length===0?<Card className="p-8"><p className="text-sm text-slate-400 text-center">{props.empty}</p></Card>:<Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-slate-100 bg-slate-50">{props.columns.map((c)=><th key={c} className="px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase">{c}</th>)}<th className="px-4 py-3"/></tr></thead><tbody className="divide-y divide-slate-100">{props.rows.map((row)=><tr key={row.id} className="hover:bg-slate-50/60">{props.render(row)}<td className="px-4 py-3 text-right">{props.actions(row)}</td></tr>)}</tbody></table></div></Card>;
}
function Cell(props:{children:React.ReactNode;strong?:boolean}) { return <td className={'px-4 py-3 text-sm ' + (props.strong?'font-medium text-slate-800':'text-slate-500')}>{props.children}</td>; }

import { supabase } from '@/lib/supabase';
import type {
  Magnate, MagnateCircleNote, MagnateCompany, MagnateConnection, MagnateViewMetric,
  MemberCircle, TabuleiroFilters, TabuleiroResult,
} from '@/types/tabuleiro';

export const TABULEIRO_PAGE_SIZE = 24;

function safeSearchTerm(value: string): string {
  return value.trim().replace(/[%,()]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
}

export async function listMagnates(
  filters: TabuleiroFilters,
  offset = 0,
  limit = TABULEIRO_PAGE_SIZE,
  isMember = false,
): Promise<TabuleiroResult> {
  let request = supabase.from('magnates').select('*', { count: 'exact' }).order('nome', { ascending: true });
  if (!isMember) request = request.eq('visivel_publico', true);
  const query = safeSearchTerm(filters.query);
  if (query) request = request.or('nome.ilike.%' + query + '%,bio_curta.ilike.%' + query + '%');
  if (filters.setor) request = request.eq('setor', filters.setor);
  if (filters.pais) request = request.ilike('pais', '%' + safeSearchTerm(filters.pais) + '%');
  if (filters.regiao) request = request.ilike('regiao', '%' + safeSearchTerm(filters.regiao) + '%');
  if (filters.tipo) request = request.eq('tipo', filters.tipo);
  if (filters.patrimonio_faixa) request = request.eq('patrimonio_faixa', filters.patrimonio_faixa);
  const { data, error, count } = await request.range(offset, offset + limit - 1);
  if (error) throw error;
  return { rows: (data || []) as Magnate[], count: count || 0, offset, limit };
}

export async function getMagnateDetail(slug: string, isMember = false) {
  const { data, error } = await supabase.from('magnates').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data || (!isMember && !data.visivel_publico)) return null;
  const magnate = data as Magnate;
  const [companyResult, connectionResult] = await Promise.all([
    supabase.from('magnate_empresas').select('*').eq('magnate_id', magnate.id).order('nome'),
    supabase.from('magnate_conexoes').select('*')
      .or('origem_id.eq.' + magnate.id + ',destino_id.eq.' + magnate.id)
      .order('criado_em', { ascending: false }).limit(300),
  ]);
  if (companyResult.error) throw companyResult.error;
  if (connectionResult.error) throw connectionResult.error;
  const connections = (connectionResult.data || []) as MagnateConnection[];
  const ids = [...new Set(connections.map(row => row.origem_id === magnate.id ? row.destino_id : row.origem_id))]
    .filter(id => id !== magnate.id);
  let connectedMagnates: Magnate[] = [];
  if (ids.length) {
    const { data: related, error: relatedError } = await supabase.from('magnates').select('*').in('id', ids).order('nome');
    if (relatedError) throw relatedError;
    connectedMagnates = ((related || []) as Magnate[]).filter(row => isMember || row.visivel_publico);
  }
  const visibleIds = new Set(connectedMagnates.map(row => row.id));
  const safeConnections = connections.filter(edge =>
    (edge.origem_id === magnate.id ? visibleIds.has(edge.destino_id) : visibleIds.has(edge.origem_id))
  );
  return {
    magnate,
    companies: (companyResult.data || []) as MagnateCompany[],
    connections: safeConnections,
    connectedMagnates,
  };
}

export async function recordMagnateView(magnateId: string): Promise<void> {
  const { error } = await supabase.rpc('record_magnate_view', { p_magnate_id: magnateId });
  if (error) throw error;
}

export async function getMemberCircles(userId: string): Promise<MemberCircle[]> {
  const { data, error } = await supabase.from('circle_members').select('circle_id,status')
    .eq('user_id', userId).eq('status', 'accepted');
  if (error) throw error;
  const ids = [...new Set((data || []).map(row => row.circle_id as string))];
  if (!ids.length) return [];
  const { data: circles, error: circlesError } = await supabase.from('circles')
    .select('id,name,owner_user_id').in('id', ids).order('name');
  if (circlesError) throw circlesError;
  return (circles || []) as MemberCircle[];
}

export async function getMagnateCircleNotes(magnateId: string, circleIds: string[]): Promise<MagnateCircleNote[]> {
  if (!circleIds.length) return [];
  const { data, error } = await supabase.from('magnate_notas_circulo').select('*')
    .eq('magnate_id', magnateId).in('circle_id', circleIds)
    .order('atualizado_em', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []) as MagnateCircleNote[];
}

export async function addMagnateCircleNote(
  magnateId: string, circleId: string, userId: string, content: string,
): Promise<void> {
  const clean = content.trim();
  if (!clean) throw new Error('Escreva uma nota antes de salvar.');
  const { error } = await supabase.from('magnate_notas_circulo').insert({
    magnate_id: magnateId, circle_id: circleId, autor_id: userId, conteudo: clean,
  });
  if (error) throw error;
}

export async function getTabuleiroMetrics() {
  const { data, error } = await supabase.rpc('get_tabuleiro_metrics');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { total_views: number; authenticated_views: number; unique_members: number; total_magnates: number; public_magnates: number } | null;
}

export async function getTabuleiroMemberMetrics(): Promise<MagnateViewMetric[]> {
  const { data, error } = await supabase.rpc('get_tabuleiro_member_metrics');
  if (error) throw error;
  return (data || []) as MagnateViewMetric[];
}

export async function insertMagnate(payload: Partial<Magnate>): Promise<void> {
  const { error } = await supabase.from('magnates').insert(payload);
  if (error) throw error;
}

export async function updateMagnatePublicVisibility(id: string, visible: boolean): Promise<void> {
  const { error } = await supabase.from('magnates').update({ visivel_publico: visible, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

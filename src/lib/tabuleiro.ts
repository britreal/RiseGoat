import { supabase } from './supabase';
import type {
  CircleOption,
  Magnate,
  MagnateConexao,
  MagnateConexaoDetalhada,
  MagnateEmpresa,
  MagnateNotaCirculo,
  TabuleiroFilterOptions,
  TabuleiroFiltros,
  TabuleiroStats,
} from '@/types/tabuleiro';

const cleanSearch = (value: string) => value.trim().replace(/[,%()\\.*:_"]/g, ' ').replace(/\s+/g, ' ').slice(0, 120);

export async function listarMagnatas(
  filtros: TabuleiroFiltros = {},
  paginacao: { page: number; size: number } = { page: 0, size: 50 },
  publicPreview = false,
) {
  const size = publicPreview ? Math.min(20, Math.max(1, paginacao.size)) : Math.min(500, Math.max(1, paginacao.size));
  const page = publicPreview ? 0 : Math.max(0, paginacao.page);
  let query = supabase.from('magnates').select('*', { count: 'exact' });

  if (filtros.setor?.length) query = query.in('setor', filtros.setor);
  if (filtros.regiao?.length) query = query.in('regiao', filtros.regiao);
  if (filtros.pais?.length) query = query.in('pais', filtros.pais);
  if (filtros.patrimonio_faixa?.length) query = query.in('patrimonio_faixa', filtros.patrimonio_faixa);
  if (filtros.tipo?.length) query = query.in('tipo', filtros.tipo);
  if (filtros.atividade?.length) query = query.in('atividade', filtros.atividade);
  if (filtros.tags?.length) query = query.overlaps('tags', filtros.tags);
  if (filtros.busca?.trim()) {
    const term = cleanSearch(filtros.busca);
    if (term) query = query.or('nome.ilike.%' + term + '%,bio_curta.ilike.%' + term + '%');
  }

  const from = page * size;
  const { data, error, count } = await query
    .order('patrimonio_estimado_musd', { ascending: false, nullsFirst: false })
    .order('nome', { ascending: true })
    .range(from, from + size - 1);

  if (error) throw error;
  return { data: (data ?? []) as Magnate[], count: count ?? 0 };
}

export async function obterOpcoesFiltros(): Promise<TabuleiroFilterOptions> {
  const { data, error } = await supabase.from('magnates').select('setor,regiao,pais,tags').limit(1000);
  if (error) throw error;
  const values = data ?? [];
  const unique = (items: Array<string | null | undefined>) =>
    [...new Set(items.map((item) => (item ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return {
    setor: unique(values.map((row) => row.setor)) as TabuleiroFilterOptions['setor'],
    regiao: unique(values.map((row) => row.regiao)),
    pais: unique(values.map((row) => row.pais)),
    tags: unique(values.flatMap((row) => Array.isArray(row.tags) ? row.tags : [])),
  };
}

export async function buscarMagnataPorSlug(slug: string) {
  const { data, error } = await supabase.from('magnates').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Pessoa não encontrada ou sem permissão de acesso.');
  return data as Magnate;
}

export async function listarEmpresas(magnateId: string) {
  const { data, error } = await supabase.from('magnate_empresas').select('*').eq('magnate_id', magnateId).order('nome');
  if (error) throw error;
  return (data ?? []) as MagnateEmpresa[];
}

export async function listarConexoes(magnateId: string) {
  const { data, error } = await supabase
    .from('magnate_conexoes')
    .select('*, origem:magnates!magnate_conexoes_origem_id_fkey(*), destino:magnates!magnate_conexoes_destino_id_fkey(*)')
    .or('origem_id.eq.' + magnateId + ',destino_id.eq.' + magnateId);
  if (error) throw error;
  return (data ?? []) as unknown as MagnateConexaoDetalhada[];
}

export async function carregarGrafoTabuleiro(filtros: TabuleiroFiltros = {}) {
  const magnates = await listarMagnatas(filtros, { page: 0, size: 500 });
  const ids = magnates.data.map((item) => item.id);
  if (!ids.length) return { nodes: [] as Magnate[], edges: [] as MagnateConexao[] };

  const { data, error } = await supabase
    .from('magnate_conexoes')
    .select('*')
    .in('origem_id', ids)
    .in('destino_id', ids);
  if (error) throw error;
  return { nodes: magnates.data, edges: (data ?? []) as MagnateConexao[] };
}

export async function listarCirculosDoUsuario() {
  const { data, error } = await supabase.from('circles').select('id,name').order('name');
  if (error) throw error;
  return (data ?? []) as CircleOption[];
}

export async function listarNotasCirculo(magnateId: string, circleId: string) {
  const { data, error } = await supabase
    .from('magnate_notas_circulo')
    .select('*')
    .eq('magnate_id', magnateId)
    .eq('circle_id', circleId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MagnateNotaCirculo[];
}

export async function criarNotaCirculo(magnateId: string, circleId: string, conteudo: string) {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) throw new Error('Entre na sua conta para adicionar uma nota ao círculo.');
  const text = conteudo.trim();
  if (!text) throw new Error('Escreva uma nota antes de salvar.');

  const { data, error } = await supabase
    .from('magnate_notas_circulo')
    .insert({ magnate_id: magnateId, circle_id: circleId, autor_id: user.id, conteudo: text })
    .select('*')
    .single();
  if (error) throw error;
  return data as MagnateNotaCirculo;
}

export async function atualizarNotaCirculo(noteId: string, conteudo: string) {
  const text = conteudo.trim();
  if (!text) throw new Error('A nota não pode ficar vazia.');
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error('Não autenticado.');

  const { data, error } = await supabase
    .from('magnate_notas_circulo')
    .update({ conteudo: text })
    .eq('id', noteId)
    .select('*')
    .single();
  if (error) throw error;
  return data as MagnateNotaCirculo;
}

export async function excluirNotaCirculo(noteId: string) {
  const { error } = await supabase.from('magnate_notas_circulo').delete().eq('id', noteId);
  if (error) throw error;
}

export async function registrarView(magnateId: string) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return;
  const { error } = await supabase.from('magnate_views').insert({ magnate_id: magnateId, user_id: authData.user.id });
  if (error) console.warn('Não foi possível registrar a visualização do Tabuleiro.', error.message);
}

export async function estatisticasTabuleiro() {
  const { data, error } = await supabase.rpc('tabuleiro_stats');
  if (error) throw error;
  return data as TabuleiroStats | null;
}

export async function verificarAdmin(userId: string) {
  const { data, error } = await supabase.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

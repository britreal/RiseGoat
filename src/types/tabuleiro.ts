export type MagnateSetor =
  | 'tech' | 'financas' | 'imobiliario' | 'energia' | 'industria'
  | 'midia' | 'saude' | 'varejo' | 'logistica' | 'agro' | 'educacao' | 'outros';

export type MagnatePatrimonioFaixa = '<1B' | '1-10B' | '10-50B' | '50-100B' | '100B+';
export type MagnateTipo = 'self-made' | 'herdeiro' | 'familia' | 'estatal' | 'indefinido';
export type MagnateAtividade = 'ativo' | 'silencioso' | 'aposentado' | 'falecido';
export type ConexaoTipo = 'board' | 'coinvest' | 'fundacao' | 'clube' | 'universidade' | 'familia' | 'politico';

export interface MagnateSource {
  nome: string;
  url: string;
}

export interface Magnate {
  id: string;
  nome: string;
  slug: string;
  foto_url: string | null;
  setor: MagnateSetor;
  sub_setor: string | null;
  pais: string | null;
  regiao: string | null;
  patrimonio_faixa: MagnatePatrimonioFaixa | null;
  patrimonio_estimado_musd: number | null;
  tipo: MagnateTipo;
  atividade: MagnateAtividade;
  bio_curta: string | null;
  fonte_principal: string | null;
  fontes: MagnateSource[];
  tags: string[];
  visivel_publico: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface MagnateEmpresa {
  id: string;
  magnate_id: string;
  nome: string;
  tipo: 'holding' | 'operacional' | 'fundo' | 'family_office' | 'fundacao';
  setor: string | null;
  pais: string | null;
  fonte: string | null;
}

export interface MagnateConexao {
  id: string;
  origem_id: string;
  destino_id: string;
  tipo: ConexaoTipo;
  forca: number | null;
  fonte: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  criado_em: string;
}

export interface MagnateConexaoDetalhada extends MagnateConexao {
  origem: Magnate | null;
  destino: Magnate | null;
}

export interface MagnateNotaCirculo {
  id: string;
  magnate_id: string;
  circle_id: string;
  autor_id: string;
  conteudo: string;
  criado_em: string;
  atualizado_em: string;
}

export interface CircleOption {
  id: string;
  name: string;
}

export interface TabuleiroFiltros {
  setor?: MagnateSetor[];
  regiao?: string[];
  pais?: string[];
  patrimonio_faixa?: MagnatePatrimonioFaixa[];
  tipo?: MagnateTipo[];
  atividade?: MagnateAtividade[];
  tags?: string[];
  busca?: string;
}

export interface TabuleiroFilterOptions {
  setor: MagnateSetor[];
  regiao: string[];
  pais: string[];
  tags: string[];
}

export interface TabuleiroStats {
  total: number;
  por_setor: Array<{ setor: MagnateSetor; total: number }>;
  mais_vistos: Array<{ id: string; nome: string; slug: string; total: number }>;
}

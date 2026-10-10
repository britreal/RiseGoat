export type MagnateSector =
  | 'tech' | 'financas' | 'imobiliario' | 'energia' | 'industria' | 'midia'
  | 'saude' | 'varejo' | 'logistica' | 'agro' | 'educacao' | 'outros';

export type MagnateWealthBand = '<1B' | '1-10B' | '10-50B' | '50-100B' | '100B+';
export type MagnateKind = 'self-made' | 'herdeiro' | 'familia' | 'estatal' | 'indefinido';
export type MagnateActivity = 'ativo' | 'silencioso' | 'aposentado' | 'falecido';

export interface Magnate {
  id: string;
  nome: string;
  slug: string;
  foto_url: string | null;
  setor: MagnateSector;
  sub_setor: string | null;
  pais: string | null;
  regiao: string | null;
  patrimonio_faixa: MagnateWealthBand | null;
  patrimonio_estimado_musd: number | null;
  tipo: MagnateKind;
  atividade: MagnateActivity;
  bio_curta: string | null;
  fonte_principal: string | null;
  fontes: Array<Record<string, unknown> | string>;
  tags: string[];
  visivel_publico: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface MagnateCompany {
  id: string;
  magnate_id: string;
  nome: string;
  tipo: string;
  setor: string | null;
  pais: string | null;
  fonte: string | null;
  criado_em: string;
}

export interface MagnateConnection {
  id: string;
  origem_id: string;
  destino_id: string;
  tipo: string;
  forca: number | null;
  fonte: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  criado_em: string;
}

export interface MagnateCircleNote {
  id: string;
  magnate_id: string;
  circle_id: string;
  autor_id: string;
  conteudo: string;
  criado_em: string;
  atualizado_em: string;
}

export interface MemberCircle {
  id: string;
  name: string;
  owner_user_id: string;
}

export interface MagnateViewMetric {
  user_id: string;
  total_views: number;
  distinct_magnates: number;
  last_view_at: string | null;
}

export interface TabuleiroFilters {
  query: string;
  setor: string;
  pais: string;
  regiao: string;
  tipo: string;
  patrimonio_faixa: string;
}

export interface TabuleiroResult {
  rows: Magnate[];
  count: number;
  offset: number;
  limit: number;
}

export interface MagnateDetailData {
  magnate: Magnate;
  companies: MagnateCompany[];
  connections: MagnateConnection[];
  connectedMagnates: Magnate[];
}

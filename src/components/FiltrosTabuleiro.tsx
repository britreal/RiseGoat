import { Search, X } from 'lucide-react';
import type { TabuleiroFilters } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

type Props={value:TabuleiroFilters;onChange:(next:TabuleiroFilters)=>void;total:number;loading?:boolean};

const sectors=[
  ['tech','Tecnologia'],['financas','Finanças'],['imobiliario','Imobiliário'],['energia','Energia'],
  ['industria','Indústria'],['midia','Mídia'],['saude','Saúde'],['varejo','Varejo'],
  ['logistica','Logística'],['agro','Agronegócio'],['educacao','Educação'],['outros','Outros'],
];
const types=[['self-made','Self-made'],['herdeiro','Herdeiro'],['familia','Família'],['estatal','Estatal'],['indefinido','Não classificado']];
const wealth=[['<1B','Abaixo de US$ 1 bi'],['1-10B','US$ 1–10 bi'],['10-50B','US$ 10–50 bi'],['50-100B','US$ 50–100 bi'],['100B+','US$ 100 bi ou mais']];
export const EMPTY_TABULEIRO_FILTERS:TabuleiroFilters={query:'',setor:'',pais:'',regiao:'',tipo:'',patrimonio_faixa:''};

export function FiltrosTabuleiro({value,onChange,total,loading=false}:Props){
  function set<K extends keyof TabuleiroFilters>(key:K,next:TabuleiroFilters[K]){onChange({...value,[key]:next})}
  const active=Object.values(value).some(v=>v.trim()!=='');
  return <section className="tabuleiro-filters" aria-label="Filtros do Tabuleiro">
    <label className="tabuleiro-search"><Search size={17}/><input value={value.query} maxLength={100} onChange={e=>set('query',e.target.value)} placeholder="Buscar nome ou biografia" aria-label="Buscar nome ou biografia"/>{value.query&&<button onClick={()=>set('query','')} aria-label="Limpar busca"><X size={14}/></button>}</label>
    <div className="tabuleiro-filter-grid">
      <label>Setor<select value={value.setor} onChange={e=>set('setor',e.target.value)}><option value="">Todos os setores</option>{sectors.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>País<input value={value.pais} maxLength={80} onChange={e=>set('pais',e.target.value)} placeholder="Ex.: Brasil"/></label>
      <label>Região<input value={value.regiao} maxLength={80} onChange={e=>set('regiao',e.target.value)} placeholder="Ex.: América Latina"/></label>
      <label>Tipo<select value={value.tipo} onChange={e=>set('tipo',e.target.value)}><option value="">Todos os tipos</option>{types.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Faixa estimada<select value={value.patrimonio_faixa} onChange={e=>set('patrimonio_faixa',e.target.value)}><option value="">Todas as faixas</option>{wealth.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <div className="tabuleiro-filter-summary"><span>{loading?'Atualizando…':total+' perfis encontrados'}</span>{active&&<button onClick={()=>onChange(EMPTY_TABULEIRO_FILTERS)}>Limpar filtros</button>}</div>
  </section>;
}

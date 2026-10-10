import { ArrowUpRight, Building2, ExternalLink, Network, ShieldCheck } from 'lucide-react';
import type { Magnate, MagnateCompany, MagnateConnection } from '@/types/tabuleiro';
import { NotasCirculo } from '@/components/NotasCirculo';
import type { MemberCircle } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

type Props={
  magnate:Magnate;companies:MagnateCompany[];connections:MagnateConnection[];connectedMagnates:Magnate[];
  isMember:boolean;userId?:string;circles:MemberCircle[];onBack:()=>void;onOpen:(slug:string)=>void;onSetVisibility?:(visible:boolean)=>void;
};

const sectors:Record<string,string>={tech:'Tecnologia',financas:'Finanças',imobiliario:'Imobiliário',energia:'Energia',industria:'Indústria',midia:'Mídia',saude:'Saúde',varejo:'Varejo',logistica:'Logística',agro:'Agronegócio',educacao:'Educação',outros:'Outros'};
const wealthLabels:Record<string,string>={'<1B':'Abaixo de US$ 1 bi','1-10B':'US$ 1–10 bi','10-50B':'US$ 10–50 bi','50-100B':'US$ 50–100 bi','100B+':'US$ 100 bi ou mais'};
function sourceLabel(source:unknown):string{
  if(typeof source==='string')return source;
  if(source&&typeof source==='object'){
    const row=source as Record<string,unknown>;
    for(const key of ['title','name','label','url','source'])if(typeof row[key]==='string')return row[key] as string;
  }
  return '';
}
function sourceUrl(source:unknown):string|null{
  if(source&&typeof source==='object'&&typeof (source as Record<string,unknown>).url==='string')return (source as Record<string,string>).url;
  if(typeof source==='string'&&/^https?:\/\//i.test(source))return source;
  return null;
}

export function MagnateDetalhe(props:Props){
  const {magnate,companies,connections,connectedMagnates,isMember,userId,circles,onBack,onOpen,onSetVisibility}=props;
  const sources=[...(magnate.fontes||[])];
  const primary=magnate.fonte_principal;
  return <main className="tabuleiro-detail-shell">
    <button className="tabuleiro-back-link" onClick={onBack}><ArrowLeft size={15}/>Voltar ao Tabuleiro</button>
    <header className="tabuleiro-detail-hero">
      <div className="tabuleiro-detail-photo">{magnate.foto_url?<img src={magnate.foto_url} alt={'Retrato de '+magnate.nome}/>:<span>{magnate.nome.trim().slice(0,1).toUpperCase()}</span>}</div>
      <div className="tabuleiro-detail-heading">
        <div className="tabuleiro-detail-eyebrow"><span>{sectors[magnate.setor]||magnate.setor}</span>{magnate.sub_setor&&<span>{magnate.sub_setor}</span>}{magnate.visivel_publico&&<span><ShieldCheck size={12}/>Público</span>}</div>
        <h1>{magnate.nome}</h1>
        <p className="tabuleiro-detail-locale">{[magnate.pais,magnate.regiao].filter(Boolean).join(' · ')}</p>
        <p className="tabuleiro-detail-bio">{magnate.bio_curta||'Biografia em curadoria. A descrição será atualizada quando houver fontes verificáveis.'}</p>
        <div className="tabuleiro-detail-meta">
          {magnate.patrimonio_faixa&&<span><strong>Faixa estimada</strong>{wealthLabels[magnate.patrimonio_faixa]||magnate.patrimonio_faixa}</span>}
          <span><strong>Tipo</strong>{magnate.tipo}</span>
          <span><strong>Atividade</strong>{magnate.atividade}</span>
        </div>
        {isMember&&onSetVisibility&&<button className="tabuleiro-secondary" onClick={()=>onSetVisibility(!magnate.visivel_publico)}>{magnate.visivel_publico?'Retirar da área pública':'Marcar como público'}</button>}
      </div>
    </header>
    <div className="tabuleiro-detail-columns">
      <div className="tabuleiro-detail-main-column">
        <section className="tabuleiro-detail-section"><div className="tabuleiro-section-heading"><div><span className="tabuleiro-eyebrow">EMPRESAS E ATIVOS OPERACIONAIS</span><h2>Organizações associadas</h2></div><Building2 size={18}/></div>
          {companies.length===0?<p className="tabuleiro-muted">Nenhuma organização verificada foi cadastrada ainda.</p>:<div className="tabuleiro-company-list">{companies.map(company=><article key={company.id}><div><strong>{company.nome}</strong><span>{[company.tipo,company.setor,company.pais].filter(Boolean).join(' · ')}</span></div>{company.fonte&&/^https?:\/\//i.test(company.fonte)&&<a href={company.fonte} target="_blank" rel="noreferrer" aria-label={'Abrir fonte de '+company.nome}><ExternalLink size={14}/></a>}</article>)}</div>}
        </section>
        <section className="tabuleiro-detail-section"><div className="tabuleiro-section-heading"><div><span className="tabuleiro-eyebrow">CONEXÕES VERIFICADAS</span><h2>Relações no grafo</h2></div><Network size={18}/></div>
          {connections.length===0?<p className="tabuleiro-muted">Ainda não há conexões verificadas associadas a este perfil.</p>:<div className="tabuleiro-connection-list">{connections.map(edge=>{const isSource=edge.origem_id===magnate.id;const relatedId=isSource?edge.destino_id:edge.origem_id;const related=connectedMagnates.find(row=>row.id===relatedId);if(!related)return null;return <button key={edge.id} onClick={()=>onOpen(related.slug)}><span className="tabuleiro-connection-direction">{isSource?'→':'←'}</span><span className="tabuleiro-connection-copy"><strong>{related.nome}</strong><small>{edge.tipo}{edge.data_inicio?' · desde '+new Date(edge.data_inicio).toLocaleDateString('pt-BR',{year:'numeric',month:'short'}):''}</small>{edge.fonte&&<em>{edge.fonte}</em>}</span><ArrowUpRight size={14}/></button>})}</div>}
        </section>
        <section className="tabuleiro-detail-section"><div className="tabuleiro-section-heading"><div><span className="tabuleiro-eyebrow">FONTES E RASTREABILIDADE</span><h2>Referências usadas</h2><p>Os dados devem ser tratados como estimativas e hipóteses até a conferência da fonte original.</p></div><ExternalLink size={18}/></div>
          {primary&&<p className="tabuleiro-primary-source">Fonte principal: {/^https?:\/\//i.test(primary)?<a href={primary} target="_blank" rel="noreferrer">{primary}</a>:primary}</p>}
          {sources.length===0&&!primary?<p className="tabuleiro-muted">As fontes ainda não foram adicionadas. O perfil deve passar por curadoria antes de ser marcado como público.</p>:<ul className="tabuleiro-source-list">{sources.map((source,index)=>{const label=sourceLabel(source)||'Fonte '+(index+1);const url=sourceUrl(source);return <li key={index}>{url?<a href={url} target="_blank" rel="noreferrer">{label}<ExternalLink size={12}/></a>:<span>{label}</span>}</li>})}</ul>}
          {magnate.tags?.length>0&&<div className="tabuleiro-tag-list detail-tags">{magnate.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}
          <small className="tabuleiro-updated">Última atualização: {new Date(magnate.atualizado_em).toLocaleDateString('pt-BR')}</small>
        </section>
      </div>
      <aside className="tabuleiro-detail-aside"><NotasCirculo magnateId={magnate.id} userId={userId||''} circles={userId?circles:[]}/></aside>
    </div>
  </main>;
}

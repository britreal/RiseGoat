import { ArrowUpRight, Building2, MapPin, ShieldCheck } from 'lucide-react';
import type { Magnate } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

type Props={magnate:Magnate;onOpen:(slug:string)=>void};

const sectorLabels:Record<string,string>={
  tech:'Tecnologia',financas:'Finanças',imobiliario:'Imobiliário',energia:'Energia',
  industria:'Indústria',midia:'Mídia',saude:'Saúde',varejo:'Varejo',
  logistica:'Logística',agro:'Agronegócio',educacao:'Educação',outros:'Outros',
};

export function MagnateCard({magnate,onOpen}:Props){
  const sources=Array.isArray(magnate.fontes)?magnate.fontes.length:0;
  return <article className="tabuleiro-magnate-card">
    <button className="tabuleiro-magnate-card-main" onClick={()=>onOpen(magnate.slug)} aria-label={'Abrir perfil de '+magnate.nome}>
      <div className="tabuleiro-magnate-photo">
        {magnate.foto_url
          ?<img src={magnate.foto_url} alt="" loading="lazy"/>
          :<span>{(magnate.nome||'?').trim().slice(0,1).toUpperCase()}</span>}
      </div>
      <div className="tabuleiro-magnate-content">
        <div className="tabuleiro-card-title"><h3>{magnate.nome}</h3><ArrowUpRight size={15}/></div>
        <p className="tabuleiro-magnate-bio">{magnate.bio_curta||'Perfil em curadoria. A descrição será atualizada com fontes verificáveis.'}</p>
        <div className="tabuleiro-magnate-meta">
          <span><Building2 size={13}/>{sectorLabels[magnate.setor]||magnate.setor}</span>
          {magnate.pais&&<span><MapPin size={13}/>{magnate.pais}</span>}
        </div>
        <div className="tabuleiro-card-footer">
          {magnate.patrimonio_faixa&&<span className="tabuleiro-wealth-band">{magnate.patrimonio_faixa} USD</span>}
          {magnate.visivel_publico&&<span className="tabuleiro-visibility"><ShieldCheck size={12}/>Visível publicamente</span>}
          {sources>0&&<span className="tabuleiro-source-count">{sources} fonte(s)</span>}
        </div>
        {magnate.tags?.length>0&&<div className="tabuleiro-tag-list">{magnate.tags.slice(0,4).map(tag=><span key={tag}>{tag}</span>)}</div>}
      </div>
    </button>
  </article>;
}

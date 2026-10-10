import { ArrowUpRight, MapPin } from 'lucide-react';
import type { Magnate } from '@/types/tabuleiro';

const setorLabels: Record<string, string> = {
  tech: 'Tecnologia', financas: 'Finanças', imobiliario: 'Imobiliário', energia: 'Energia',
  industria: 'Indústria', midia: 'Mídia', saude: 'Saúde', varejo: 'Varejo',
  logistica: 'Logística', agro: 'Agronegócio', educacao: 'Educação', outros: 'Outros',
};
const patrimonioLabels: Record<string, string> = {
  '<1B': 'Abaixo de US$ 1 bi', '1-10B': 'US$ 1–10 bi', '10-50B': 'US$ 10–50 bi',
  '50-100B': 'US$ 50–100 bi', '100B+': 'US$ 100 bi+',
};

export function MagnateCard({ magnate, onOpen }: { magnate: Magnate; onOpen: (slug: string) => void }) {
  const initials = magnate.nome.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  return (
    <button type="button" className="tabuleiro-person-card" onClick={() => onOpen(magnate.slug)}
      aria-label={'Abrir perfil de ' + magnate.nome}>
      <div className="tabuleiro-card-head">
        {magnate.foto_url
          ? <img className="tabuleiro-avatar" src={magnate.foto_url} alt="" loading="lazy" />
          : <span className="tabuleiro-avatar tabuleiro-avatar-fallback" aria-hidden="true">{initials || '?'}</span>}
        <span className="tabuleiro-card-open"><ArrowUpRight size={16} /></span>
      </div>
      <span className="tabuleiro-sector">{setorLabels[magnate.setor] ?? magnate.setor}</span>
      <h2>{magnate.nome}</h2>
      <p className="tabuleiro-card-bio">{magnate.bio_curta || 'Perfil em construção. Consulte as fontes para mais informações.'}</p>
      <div className="tabuleiro-card-meta">
        {(magnate.pais || magnate.regiao) && <span><MapPin size={13} />{[magnate.pais, magnate.regiao].filter(Boolean).join(' · ')}</span>}
        {magnate.patrimonio_faixa && <span className="tabuleiro-wealth-chip">{patrimonioLabels[magnate.patrimonio_faixa] ?? magnate.patrimonio_faixa}</span>}
      </div>
      {magnate.tags?.length > 0 && <div className="tabuleiro-tags">{magnate.tags.slice(0, 4).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
    </button>
  );
}

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Building2, ExternalLink, Globe2, Loader2, Network, Tag, UsersRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotasCirculo } from '@/components/tabuleiro/NotasCirculo';
import { FEATURES } from '@/lib/features';
import { buscarMagnataPorSlug, listarConexoes, listarEmpresas, registrarView } from '@/lib/tabuleiro';
import { useRouter } from '@/lib/router';
import type { Magnate, MagnateConexaoDetalhada, MagnateEmpresa } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

const moneyLabel: Record<string, string> = {
  '<1B': 'Abaixo de US$ 1 bi', '1-10B': 'US$ 1–10 bi', '10-50B': 'US$ 10–50 bi',
  '50-100B': 'US$ 50–100 bi', '100B+': 'US$ 100 bi+',
};
const sectorLabel: Record<string, string> = {
  tech: 'Tecnologia', financas: 'Finanças', imobiliario: 'Imobiliário', energia: 'Energia', industria: 'Indústria',
  midia: 'Mídia', saude: 'Saúde', varejo: 'Varejo', logistica: 'Logística', agro: 'Agronegócio', educacao: 'Educação', outros: 'Outros',
};
const typeLabel: Record<string, string> = { 'self-made': 'Autoconstruído', herdeiro: 'Herdeiro', familia: 'Família', estatal: 'Estatal', indefinido: 'Não classificado' };
const activityLabel: Record<string, string> = { ativo: 'Ativo', silencioso: 'Silencioso', aposentado: 'Aposentado', falecido: 'Falecido' };

export function MagnateDetalhe() {
  const { route, navigate } = useRouter();
  const { user } = useAuth();
  const slug = route.name === 'tabuleiro-detail' ? route.slug : '';
  const [magnate, setMagnate] = useState<Magnate | null>(null);
  const [companies, setCompanies] = useState<MagnateEmpresa[]>([]);
  const [connections, setConnections] = useState<MagnateConexaoDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!slug) return () => { active = false; };
    setLoading(true);
    setMagnate(null);
    setCompanies([]);
    setConnections([]);
    setError('');
    void buscarMagnataPorSlug(slug).then(async (profile) => {
      const [companyRows, connectionRows] = await Promise.all([listarEmpresas(profile.id), user ? listarConexoes(profile.id) : Promise.resolve([] as MagnateConexaoDetalhada[])]);
      if (!active) return;
      setMagnate(profile);
      setCompanies(companyRows);
      setConnections(connectionRows);
      document.title = profile.nome + ' | Tabuleiro · RiseGoat';
      const description = profile.bio_curta || ('Perfil de ' + profile.nome + ' no Tabuleiro RiseGoat.');
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
      meta.content = description.slice(0, 160);
      void registrarView(profile.id);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir este perfil.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, user?.id]);

  if (loading) return <main className="tabuleiro-shell"><div className="tabuleiro-loading"><Loader2 size={22} className="tabuleiro-spin" /><span>Carregando perfil…</span></div></main>;
  if (error || !magnate) return <main className="tabuleiro-shell"><div className="tabuleiro-detail-back"><button className="tabuleiro-button tabuleiro-button-secondary" onClick={() => navigate('/tabuleiro')}><ArrowLeft size={16} /> Voltar ao Tabuleiro</button></div><div className="tabuleiro-empty"><span><Network size={21} /></span><h2>Perfil indisponível</h2><p>{error || 'Este perfil não está disponível.'}</p></div></main>;

  const initials = magnate.nome.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  const sources = Array.isArray(magnate.fontes) ? magnate.fontes : [];
  const otherMagnate = (connection: MagnateConexaoDetalhada) => connection.origem_id === magnate.id ? connection.destino : connection.origem;
  const navigateToProfile = (target: Magnate | null) => { if (target?.slug) navigate('/tabuleiro/' + encodeURIComponent(target.slug)); };
  return <main className="tabuleiro-shell">
    <header className="tabuleiro-topbar"><button className="tabuleiro-brand" onClick={() => navigate('/tabuleiro')}><span className="tabuleiro-brand-mark">R</span><span>RiseGoat<small>Tabuleiro</small></span></button><button className="tabuleiro-top-link" onClick={() => navigate('/tabuleiro')}>Todos os perfis</button></header>
    <div className="tabuleiro-detail-content">
      <button type="button" className="tabuleiro-back-link" onClick={() => navigate('/tabuleiro')}><ArrowLeft size={16} /> Voltar ao Tabuleiro</button>
      <section className="tabuleiro-profile-hero">
        {magnate.foto_url ? <img src={magnate.foto_url} alt={'Retrato de ' + magnate.nome} /> : <span className="tabuleiro-profile-avatar">{initials || '?'}</span>}
        <div className="tabuleiro-profile-intro"><p className="tabuleiro-eyebrow">{sectorLabel[magnate.setor] ?? magnate.setor}</p><h1>{magnate.nome}</h1>
          <div className="tabuleiro-profile-badges">{magnate.patrimonio_faixa && <span className="tabuleiro-wealth-chip">{moneyLabel[magnate.patrimonio_faixa]}</span>}<span className="tabuleiro-neutral-chip">{typeLabel[magnate.tipo] ?? magnate.tipo}</span><span className="tabuleiro-neutral-chip">{activityLabel[magnate.atividade] ?? magnate.atividade}</span></div>
          <p>{[magnate.pais, magnate.regiao, magnate.sub_setor].filter(Boolean).join(' · ')}</p>
        </div>
      </section>
      <div className="tabuleiro-detail-grid">
        <div className="tabuleiro-detail-main">
          <section className="tabuleiro-detail-section"><p className="tabuleiro-eyebrow">Visão geral</p><h2>Sobre {magnate.nome.split(' ')[0]}</h2><p className="tabuleiro-profile-bio">{magnate.bio_curta || 'Ainda não há uma biografia disponível para este perfil.'}</p>
            {magnate.patrimonio_estimado_musd !== null && <div className="tabuleiro-estimated-worth"><span>Patrimônio estimado</span><strong>US$ {Number(magnate.patrimonio_estimado_musd).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mi</strong><small>Estimativa indicativa, sujeita a atualização e diferenças metodológicas.</small></div>}
            {magnate.tags?.length > 0 && <div className="tabuleiro-tags tabuleiro-detail-tags"><Tag size={14} />{magnate.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          </section>
          <section className="tabuleiro-detail-section"><div className="tabuleiro-section-heading"><div><p className="tabuleiro-eyebrow">Ativos e estruturas</p><h2><Building2 size={19} /> Empresas associadas</h2></div><span className="tabuleiro-count">{companies.length}</span></div>
            {companies.length ? <div className="tabuleiro-company-list">{companies.map((company) => <article key={company.id}><span className="tabuleiro-company-icon"><Building2 size={17} /></span><div><strong>{company.nome}</strong><p>{[company.tipo.replace('_', ' '), company.setor, company.pais].filter(Boolean).join(' · ')}</p>{company.fonte && <a href={company.fonte.startsWith('http') ? company.fonte : undefined} target="_blank" rel="noreferrer">{company.fonte.startsWith('http') ? 'Ver fonte' : company.fonte}<ExternalLink size={12} /></a>}</div></article>)}</div> : <p className="tabuleiro-muted">Nenhuma empresa associada cadastrada.</p>}
          </section>
          <section className="tabuleiro-detail-section"><div className="tabuleiro-section-heading"><div><p className="tabuleiro-eyebrow">Rede de relações</p><h2><Network size={19} /> Conexões</h2></div><span className="tabuleiro-count">{connections.length}</span></div>
            {connections.length ? <div className="tabuleiro-connection-list">{connections.map((connection) => {
              const person = otherMagnate(connection);
              return <article key={connection.id}><button type="button" className="tabuleiro-connection-person" disabled={!person?.slug} onClick={() => navigateToProfile(person)}><span className="tabuleiro-connection-avatar">{person?.nome.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || '?'}</span><span><strong>{person?.nome ?? 'Perfil relacionado indisponível'}</strong><small>{connection.tipo.replace('_', ' ')}{connection.forca ? ' · intensidade ' + connection.forca + '/5' : ''}</small></span><ArrowUpRight size={15} /></button>{connection.fonte && <p className="tabuleiro-connection-source">Fonte: {connection.fonte}</p>}</article>;
            })}</div> : <p className="tabuleiro-muted">Nenhuma conexão documentada. Uma relação só deve ser adicionada quando houver fonte verificável.</p>}
          </section>
          {FEATURES.TABULEIRO_CIRCLE_NOTES && user && <NotasCirculo magnateId={magnate.id} />}
        </div>
        <aside className="tabuleiro-detail-aside">
          <section className="tabuleiro-detail-section"><p className="tabuleiro-eyebrow">Fontes e transparência</p><h2><Globe2 size={18} /> Referências</h2>
            {magnate.fonte_principal && <p className="tabuleiro-primary-source">Fonte principal: {magnate.fonte_principal}</p>}
            {sources.length ? <ul className="tabuleiro-source-list">{sources.map((source, index) => <li key={source.url + index}><a href={source.url} target="_blank" rel="noreferrer">{source.nome || source.url}<ExternalLink size={13} /></a></li>)}</ul> : <p className="tabuleiro-muted">Nenhuma fonte adicional cadastrada.</p>}
            <p className="tabuleiro-source-disclaimer">Patrimônio e relações podem variar conforme a fonte, data e metodologia. Consulte as referências antes de tirar conclusões.</p>
          </section>
          <section className="tabuleiro-detail-section"><p className="tabuleiro-eyebrow">Ficha do perfil</p><div className="tabuleiro-fact-row"><span>Setor</span><strong>{sectorLabel[magnate.setor] ?? magnate.setor}</strong></div><div className="tabuleiro-fact-row"><span>Origem</span><strong>{typeLabel[magnate.tipo] ?? magnate.tipo}</strong></div><div className="tabuleiro-fact-row"><span>Status</span><strong>{activityLabel[magnate.atividade] ?? magnate.atividade}</strong></div><div className="tabuleiro-fact-row"><span>Atualizado</span><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(magnate.atualizado_em))}</strong></div></section>
          {!user && FEATURES.TABULEIRO_PUBLIC_PREVIEW && <section className="tabuleiro-member-cta"><UsersRound size={18} /><h2>Acesse a visão completa</h2><p>Entre como membro para consultar perfis e relações privadas.</p><button className="tabuleiro-button tabuleiro-button-primary" onClick={() => navigate('/auth')}>Acessar conta</button></section>}
        </aside>
      </div>
    </div>
  </main>;
}

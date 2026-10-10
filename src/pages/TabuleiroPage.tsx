import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, Grid2X2, List, Loader2, LockKeyhole, Network, Search, UsersRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MagnateCard } from '@/components/tabuleiro/MagnateCard';
import { FiltrosTabuleiro } from '@/components/tabuleiro/FiltrosTabuleiro';
import { FEATURES } from '@/lib/features';
import { estatisticasTabuleiro, listarMagnatas, obterOpcoesFiltros, verificarAdmin } from '@/lib/tabuleiro';
import { useRouter } from '@/lib/router';
import type { Magnate, TabuleiroFilterOptions, TabuleiroFiltros, TabuleiroStats } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

const EMPTY_OPTIONS: TabuleiroFilterOptions = { setor: [], regiao: [], pais: [], tags: [] };
const listValue = (params: URLSearchParams, key: string) => params.get(key)?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];

function readFiltersFromUrl(): TabuleiroFiltros {
  const params = new URLSearchParams(window.location.search);
  return {
    busca: params.get('q') ?? '',
    setor: listValue(params, 'setor') as TabuleiroFiltros['setor'],
    regiao: listValue(params, 'regiao'),
    pais: listValue(params, 'pais'),
    patrimonio_faixa: listValue(params, 'patrimonio') as TabuleiroFiltros['patrimonio_faixa'],
    tipo: listValue(params, 'tipo') as TabuleiroFiltros['tipo'],
    atividade: listValue(params, 'atividade') as TabuleiroFiltros['atividade'],
    tags: listValue(params, 'tags'),
  };
}

function countFilters(filters: TabuleiroFiltros) {
  return (filters.setor?.length ?? 0) + (filters.regiao?.length ?? 0) + (filters.pais?.length ?? 0)
    + (filters.patrimonio_faixa?.length ?? 0) + (filters.tipo?.length ?? 0) + (filters.atividade?.length ?? 0)
    + (filters.tags?.length ?? 0) + (filters.busca?.trim() ? 1 : 0);
}

function AdminInsights({ stats }: { stats: TabuleiroStats }) {
  const sectors = stats.por_setor ?? [];
  const max = Math.max(1, ...sectors.map((item) => item.total));
  return <section className="tabuleiro-admin-insights">
    <div className="tabuleiro-insight-total"><BarChart3 size={18} /><span><strong>{stats.total.toLocaleString('pt-BR')}</strong><small>perfis cadastrados</small></span></div>
    <div className="tabuleiro-insight-sectors"><strong>Distribuição por setor</strong>{sectors.slice(0, 5).map((item) => <div className="tabuleiro-stat-row" key={item.setor}><span>{item.setor}</span><div><i style={{ width: (item.total / max * 100) + '%' }} /></div><b>{item.total}</b></div>)}</div>
    <div className="tabuleiro-insight-popular"><strong>Mais vistos</strong>{(stats.mais_vistos ?? []).slice(0, 5).map((item, index) => <button key={item.id} onClick={() => { window.history.pushState({}, '', '/tabuleiro/' + item.slug); window.dispatchEvent(new PopStateEvent('popstate')); }}><span>{index + 1}</span><span>{item.nome}</span><small>{item.total} views</small></button>)}</div>
  </section>;
}

export function TabuleiroRestricted() {
  const { navigate } = useRouter();
  useEffect(() => {
    document.title = 'Acesso restrito | Tabuleiro · RiseGoat';
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (meta) meta.content = 'O Tabuleiro é uma área reservada aos membros do RiseGoat.';
  }, []);
  return <main className="tabuleiro-shell">
    <header className="tabuleiro-topbar">
      <button className="tabuleiro-brand" onClick={() => navigate('/notes')} aria-label="Voltar para Notas">
        <span className="tabuleiro-brand-mark">R</span><span>RiseGoat<small>Inteligência de relações</small></span>
      </button>
    </header>
    <section className="tabuleiro-restricted">
      <span className="tabuleiro-restricted-icon"><LockKeyhole size={24} /></span>
      <p className="tabuleiro-eyebrow">Espaço reservado aos membros</p>
      <h1>Acesso restrito</h1>
      <p>O Tabuleiro reúne perfis, empresas e relações documentadas em uma área privada do RiseGoat. Entre na sua conta para continuar.</p>
      <div><button className="tabuleiro-button tabuleiro-button-primary" onClick={() => navigate('/auth')}>Entrar na minha conta</button><button className="tabuleiro-button tabuleiro-button-secondary" onClick={() => navigate('/notes')}>Voltar para Notas</button></div>
    </section>
  </main>;
}

export function TabuleiroPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const preview = !user && FEATURES.TABULEIRO_PUBLIC_PREVIEW;
  const [filters, setFilters] = useState<TabuleiroFiltros>(readFiltersFromUrl);
  const [searchInput, setSearchInput] = useState(filters.busca ?? '');
  const [options, setOptions] = useState<TabuleiroFilterOptions>(EMPTY_OPTIONS);
  const [magnates, setMagnates] = useState<Magnate[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<TabuleiroStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Tabuleiro | RiseGoat';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = 'Explore perfis, empresas, patrimônio estimado e relações documentadas no Tabuleiro do RiseGoat.';
  }, []);

  const changeFilters = useCallback((next: TabuleiroFiltros) => {
    setFilters(next);
    setPage(0);
  }, []);

  useEffect(() => {
    let active = true;
    void obterOpcoesFiltros().then((result) => { if (active) setOptions(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os filtros.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => current.busca === searchInput ? current : { ...current, busca: searchInput });
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.busca?.trim()) params.set('q', filters.busca.trim());
    if (filters.setor?.length) params.set('setor', filters.setor.join(','));
    if (filters.regiao?.length) params.set('regiao', filters.regiao.join(','));
    if (filters.pais?.length) params.set('pais', filters.pais.join(','));
    if (filters.patrimonio_faixa?.length) params.set('patrimonio', filters.patrimonio_faixa.join(','));
    if (filters.tipo?.length) params.set('tipo', filters.tipo.join(','));
    if (filters.atividade?.length) params.set('atividade', filters.atividade.join(','));
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    const query = params.toString();
    window.history.replaceState({}, '', '/tabuleiro' + (query ? '?' + query : ''));
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void listarMagnatas(filters, { page, size: 24 }, preview).then((result) => {
      if (!active) return;
      setMagnates(result.data);
      setCount(result.count);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o Tabuleiro.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page, preview]);

  useEffect(() => {
    let active = true;
    if (!user) return () => { active = false; };
    void verificarAdmin(user.id).then(async (admin) => {
      if (!active || !admin) return;
      setIsAdmin(true);
      const result = await estatisticasTabuleiro();
      if (active && result) setStats(result);
    }).catch((reason: unknown) => {
      if (active) console.warn('As métricas administrativas do Tabuleiro não estão disponíveis.', reason);
    });
    return () => { active = false; };
  }, [user?.id]);

  const activeFilters = countFilters(filters);
  const pages = Math.max(1, Math.ceil(count / 24));
  const resultsLabel = useMemo(() => count.toLocaleString('pt-BR') + (count === 1 ? ' perfil encontrado' : ' perfis encontrados'), [count]);

  function openMagnate(slug: string) { navigate('/tabuleiro/' + encodeURIComponent(slug)); }
  function clearFilters() { setSearchInput(''); setFilters({}); setPage(0); }

  return <main className="tabuleiro-shell">
    <header className="tabuleiro-topbar">
      <button className="tabuleiro-brand" onClick={() => navigate('/notes')} aria-label="Voltar para Notas"><span className="tabuleiro-brand-mark">R</span><span>RiseGoat<small>Inteligência de relações</small></span></button>
      <div className="tabuleiro-topbar-actions">
        <button type="button" className="tabuleiro-top-link" onClick={() => navigate('/notes')}>Notas</button>
        <span className="tabuleiro-access-label">{user ? <><UsersRound size={14} /> Espaço privado</> : 'Prévia pública'}</span>
      </div>
    </header>
    <div className="tabuleiro-page-content">
      <div className="tabuleiro-page-heading">
        <div><p className="tabuleiro-eyebrow">Pessoas · Empresas · Relações</p><h1>Tabuleiro</h1><p>Explore quem concentra patrimônio, onde construiu influência e como as relações se conectam.</p></div>
        <div className="tabuleiro-heading-actions">
          {FEATURES.TABULEIRO_GRAPH_VIEW && <button className="tabuleiro-button tabuleiro-button-secondary" onClick={() => navigate('/tabuleiro/grafo')}><Network size={16} /> Ver grafo</button>}
          <button className="tabuleiro-button tabuleiro-button-secondary tabuleiro-filter-toggle" onClick={() => setFiltersOpen((value) => !value)}><Filter size={16} /> Filtros {activeFilters > 0 && <b>{activeFilters}</b>}</button>
        </div>
      </div>
      {isAdmin && stats && <AdminInsights stats={stats} />}
      {preview && <div className="tabuleiro-preview-notice"><UsersRound size={17} /><span><strong>Prévia pública</strong> — apenas perfis publicados são exibidos.</span><button onClick={() => navigate('/auth')}>Acesso de membro</button></div>}
      <div className="tabuleiro-search-bar"><Search size={17} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar nome ou biografia…" aria-label="Buscar nome ou biografia" /><span>{resultsLabel}</span></div>
      <div className="tabuleiro-layout">
        <div className={'tabuleiro-filter-wrap' + (filtersOpen ? ' is-open' : '')}>
          <FiltrosTabuleiro filtros={filters} options={options} onChange={changeFilters} onClear={clearFilters} onClose={() => setFiltersOpen(false)} />
        </div>
        <section className="tabuleiro-results" aria-live="polite">
          <div className="tabuleiro-results-toolbar"><span>{resultsLabel}</span><div className="tabuleiro-results-tools">
            {activeFilters > 0 && <button type="button" className="tabuleiro-reset-inline" onClick={clearFilters}>Limpar tudo</button>}
            <button type="button" aria-label="Visualização em grade" aria-pressed={view === 'grid'} className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')}><Grid2X2 size={16} /></button>
            <button type="button" aria-label="Visualização em lista" aria-pressed={view === 'list'} className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}><List size={16} /></button>
          </div></div>
          {error && <div className="tabuleiro-error" role="alert">{error}</div>}
          {loading ? <div className="tabuleiro-loading"><Loader2 size={22} className="tabuleiro-spin" /><span>Carregando perfis…</span></div>
            : magnates.length ? <><div className={'tabuleiro-card-grid' + (view === 'list' ? ' is-list' : '')}>{magnates.map((magnate) => <MagnateCard key={magnate.id} magnate={magnate} onOpen={openMagnate} />)}</div>
              {!preview && pages > 1 && <nav className="tabuleiro-pagination" aria-label="Paginação"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Anterior</button><span>Página {page + 1} de {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}>Próxima</button></nav>}
            </>
            : <div className="tabuleiro-empty"><span><Search size={21} /></span><h2>Nenhum perfil encontrado</h2><p>Tente ajustar a busca ou remover algum filtro para ver mais resultados.</p><button className="tabuleiro-button tabuleiro-button-secondary" onClick={clearFilters}>Limpar filtros</button></div>}
        </section>
      </div>
    </div>
  </main>;
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Network, Search } from 'lucide-react';
import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from '@/lib/router';
import { carregarGrafoTabuleiro } from '@/lib/tabuleiro';
import type { ConexaoTipo, Magnate, MagnateConexao, MagnateSetor } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

const sectors: Array<{ value: MagnateSetor; label: string; color: string }> = [
  { value: 'tech', label: 'Tecnologia', color: '#dbeafe' }, { value: 'financas', label: 'Finanças', color: '#dcfce7' },
  { value: 'imobiliario', label: 'Imobiliário', color: '#ffedd5' }, { value: 'energia', label: 'Energia', color: '#fef3c7' },
  { value: 'industria', label: 'Indústria', color: '#e5e7eb' }, { value: 'midia', label: 'Mídia', color: '#fce7f3' },
  { value: 'saude', label: 'Saúde', color: '#ccfbf1' }, { value: 'varejo', label: 'Varejo', color: '#ede9fe' },
  { value: 'logistica', label: 'Logística', color: '#e0f2fe' }, { value: 'agro', label: 'Agronegócio', color: '#ecfccb' },
  { value: 'educacao', label: 'Educação', color: '#f3e8ff' }, { value: 'outros', label: 'Outros', color: '#f3f4f6' },
];
const relationTypes: Array<{ value: ConexaoTipo; label: string }> = [
  { value: 'board', label: 'Conselho de administração' }, { value: 'coinvest', label: 'Coinvestimento' },
  { value: 'fundacao', label: 'Fundação' }, { value: 'clube', label: 'Clube' }, { value: 'universidade', label: 'Universidade' },
  { value: 'familia', label: 'Família' }, { value: 'politico', label: 'Relação política documentada' },
];
type GraphNodeData = { magnateId: string; slug: string; label: string; sector: string; country: string | null; wealth: string | null };
type GraphNode = Node<GraphNodeData>;
const wealthSize = (range: string | null) => range === '100B+' ? 30 : range === '50-100B' ? 26 : range === '10-50B' ? 23 : range === '1-10B' ? 20 : 17;

function withinDepth(nodes: Magnate[], edges: MagnateConexao[], rootId: string, depth: number) {
  if (!rootId) return new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach((node) => adjacency.set(node.id, new Set()));
  edges.forEach((edge) => {
    adjacency.get(edge.origem_id)?.add(edge.destino_id);
    adjacency.get(edge.destino_id)?.add(edge.origem_id);
  });
  const levels = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const level = levels.get(id) ?? 0;
    if (level >= depth) continue;
    for (const next of adjacency.get(id) ?? []) {
      if (!levels.has(next)) { levels.set(next, level + 1); queue.push(next); }
    }
  }
  return new Set(levels.keys());
}

export function TabuleiroGrafo() {
  const { navigate } = useRouter();
  const [magnates, setMagnates] = useState<Magnate[]>([]);
  const [connections, setConnections] = useState<MagnateConexao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');
  const [relation, setRelation] = useState('');
  const [rootId, setRootId] = useState('');
  const [depth, setDepth] = useState(2);

  useEffect(() => {
    let active = true;
    void carregarGrafoTabuleiro().then((graph) => {
      if (!active) return;
      setMagnates(graph.nodes);
      setConnections(graph.edges);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o grafo.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const relationFiltered = useMemo(() => relation ? connections.filter((edge) => edge.tipo === relation) : connections, [connections, relation]);
  const candidateNodes = useMemo(() => magnates.filter((item) => {
    if (sector && item.setor !== sector) return false;
    if (query.trim() && !(item.nome + ' ' + (item.pais ?? '') + ' ' + (item.bio_curta ?? '')).toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))) return false;
    return true;
  }), [magnates, sector, query]);
  const candidateIds = useMemo(() => new Set(candidateNodes.map((item) => item.id)), [candidateNodes]);
  const candidateEdges = useMemo(() => relationFiltered.filter((edge) => candidateIds.has(edge.origem_id) && candidateIds.has(edge.destino_id)), [relationFiltered, candidateIds]);
  const effectiveRootId = rootId && candidateIds.has(rootId) ? rootId : '';
  const visibleIds = useMemo(() => withinDepth(candidateNodes, candidateEdges, effectiveRootId, depth), [candidateNodes, candidateEdges, effectiveRootId, depth]);
  const visibleMagnates = useMemo(() => candidateNodes.filter((item) => visibleIds.has(item.id)), [candidateNodes, visibleIds]);
  const visibleEdges = useMemo(() => candidateEdges.filter((edge) => visibleIds.has(edge.origem_id) && visibleIds.has(edge.destino_id)), [candidateEdges, visibleIds]);

  const nodes = useMemo<GraphNode[]>(() => visibleMagnates.map((item, index) => {
    const x = Math.cos(index * 2.39996) * (180 + Math.sqrt(index + 1) * 50);
    const y = Math.sin(index * 2.39996) * (120 + Math.sqrt(index + 1) * 38);
    const color = sectors.find((entry) => entry.value === item.setor)?.color ?? '#f3f4f6';
    const size = wealthSize(item.patrimonio_faixa);
    return {
      id: item.id,
      position: { x, y },
      data: { magnateId: item.id, slug: item.slug, label: item.nome, sector: item.setor, country: item.pais, wealth: item.patrimonio_faixa },
      style: { background: color, color: '#1f2937', border: '1px solid rgba(31,41,55,.14)', borderRadius: 14, width: 170 + size, minHeight: 64, padding: 12, fontSize: 12, fontWeight: 650, boxShadow: '0 6px 18px rgba(15,23,42,.08)' },
    };
  }), [visibleMagnates]);

  const edges = useMemo<Edge[]>(() => visibleEdges.map((edge) => ({
    id: edge.id, source: edge.origem_id, target: edge.destino_id, label: edge.tipo,
    animated: false, style: { stroke: '#94a3b8', strokeWidth: Math.max(1, edge.forca ?? 1) },
    labelStyle: { fill: '#64748b', fontSize: 10 }, labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
  })), [visibleEdges]);

  return <main className="tabuleiro-shell">
    <header className="tabuleiro-topbar"><button className="tabuleiro-brand" onClick={() => navigate('/tabuleiro')}><span className="tabuleiro-brand-mark">R</span><span>RiseGoat<small>Tabuleiro · Grafo</small></span></button><button className="tabuleiro-top-link" onClick={() => navigate('/tabuleiro')}><ArrowLeft size={15} /> Diretório</button></header>
    <div className="tabuleiro-graph-page">
      <div className="tabuleiro-page-heading"><div><p className="tabuleiro-eyebrow">Visualização de relações</p><h1>Grafo de conexões</h1><p>Explore as conexões documentadas entre pessoas. Cada relação deve ter uma fonte verificável.</p></div></div>
      <div className="tabuleiro-graph-toolbar">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pessoa ou país…" /></label>
        <label><span>Setor</span><select value={sector} onChange={(event) => setSector(event.target.value)}><option value="">Todos os setores</option>{sectors.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Conexão</span><select value={relation} onChange={(event) => setRelation(event.target.value)}><option value="">Todas as conexões</option>{relationTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Centro do grafo</span><select value={rootId} onChange={(event) => setRootId(event.target.value)}><option value="">Todas as pessoas</option>{candidateNodes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        <label><span>Profundidade</span><select value={depth} onChange={(event) => setDepth(Number(event.target.value))}><option value={1}>1 nível</option><option value={2}>2 níveis</option><option value={3}>3 níveis</option></select></label>
      </div>
      <div className="tabuleiro-graph-meta"><span>{visibleMagnates.length} pessoas</span><span>{visibleEdges.length} conexões</span><span>O tamanho do nó indica a faixa de patrimônio estimado.</span></div>
      {error && <p className="tabuleiro-error" role="alert">{error}</p>}
      {loading ? <div className="tabuleiro-loading"><Loader2 size={22} className="tabuleiro-spin" /> Montando relações…</div>
        : visibleMagnates.length ? <div className="tabuleiro-graph-canvas"><ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.1} maxZoom={2.5} onNodeClick={(_, node) => navigate('/tabuleiro/' + encodeURIComponent(node.data.slug))} nodesDraggable nodesConnectable={false} proOptions={{ hideAttribution: true }}>
          <Background color="#d9dee7" gap={22} size={1} /><Controls /><MiniMap pannable zoomable nodeColor={(node) => String(node.style?.background ?? '#cbd5e1')} />
        </ReactFlow></div>
        : <div className="tabuleiro-empty"><span><Network size={21} /></span><h2>Não há relações para mostrar</h2><p>Remova alguns filtros ou adicione conexões verificadas entre perfis.</p><button className="tabuleiro-button tabuleiro-button-secondary" onClick={() => { setQuery(''); setSector(''); setRelation(''); setRootId(''); }}>Limpar filtros</button></div>}
    </div>
  </main>;
}

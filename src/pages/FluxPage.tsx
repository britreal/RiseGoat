import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow, type Connection, type EdgeChange, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Download, FileJson, History, Loader2, Plus, Redo2, Trash2, Undo2, Upload, Workflow, X, Play, AlertTriangle, CheckCircle2, Clock3, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';
import { FluxNodeView } from '@/components/flux/FluxNodeView';
import { createFluxNode, createStarterGraph } from '@/lib/flux/factory';
import { useFluxEditorStore } from '@/lib/flux/store';
import { validateGraph } from '@/lib/engine';
import type { EntradaConfig, ExportFormat, FluxGraph, FluxNode, FluxNodeType, RunInput } from '@/lib/flux/types';

const nodeTypes = { flux: FluxNodeView };
const queryClient = new QueryClient();

interface FluxPageProps { workflowId?: string; navigate: (path: string) => void; }

function FluxHome({ navigate }: { navigate: FluxPageProps['navigate'] }) {
  const { user } = useAuth();
  const workflows = useQuery({
    queryKey: ['flux-workflows', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('workflows').select('id,nome,descricao,versao,updated_at').order('updated_at', { ascending: false });
      if (error) throw error; return data || [];
    },
  });
  const runs = useQuery({
    queryKey: ['flux-runs-home', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('runs').select('id,workflow_id,status,created_at,started_at,finished_at,error').order('created_at', { ascending: false }).limit(12);
      if (error) throw error; return data || [];
    },
  });
  const [creating, setCreating] = useState(false);
  const createWorkflow = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const starter = createStarterGraph();
      const { data, error } = await supabase.from('workflows').insert({ user_id: user.id, nome: 'Novo Fluxo', descricao: 'Fábrica de produtos', graph: starter, versao: 1 }).select('id').single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['flux-workflows', user.id] });
      navigate('/flux/' + data.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Não foi possível criar o fluxo.');
    } finally { setCreating(false); }
  };
  return (
    <div className="min-h-full bg-[#0b0f17] text-white">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Fábrica de Produtos</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Flux</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Monte pipelines visuais para transformar uma ideia em um produto digital. Nesta fase, o fluxo roda localmente com Entrada → Template → Exportar.</p>
          </div>
          <button onClick={() => void createWorkflow()} disabled={creating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-black/20 disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Novo fluxo
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Fluxos</p><p className="mt-2 text-3xl font-black">{workflows.data?.length || 0}</p><p className="mt-1 text-xs text-slate-500">salvos no workspace</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Execuções</p><p className="mt-2 text-3xl font-black">{runs.data?.length || 0}</p><p className="mt-1 text-xs text-slate-500">mais recentes</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">IA</p><p className="mt-2 text-3xl font-black">Fase 2</p><p className="mt-1 text-xs text-slate-500">gateway ainda não conectado</p></div>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Biblioteca</p><h2 className="mt-1 text-lg font-black">Seus fluxos</h2></div></div>
            {workflows.isLoading ? <div className="py-12"><Spinner /></div> : workflows.data?.length ? <div className="space-y-3">{workflows.data.map(workflow => (
              <button key={workflow.id} onClick={() => navigate('/flux/' + workflow.id)} className="group flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Workflow className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{workflow.nome || 'Sem nome'}</p><p className="mt-1 truncate text-xs text-slate-500">{workflow.descricao || 'Sem descrição'}</p></div>
                <div className="text-right"><p className="text-[10px] text-slate-500">v{workflow.versao}</p><ChevronRight className="mt-1 ml-auto h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" /></div>
              </button>
            ))}</div> : <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center"><p className="text-sm font-semibold text-slate-300">Nenhum fluxo ainda.</p><p className="mt-1 text-xs text-slate-500">Crie seu primeiro pipeline para começar.</p></div>}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-slate-500" /><div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Histórico</p><h2 className="mt-1 text-lg font-black">Execuções recentes</h2></div></div>
            <div className="space-y-2">{runs.data?.map(run => <button key={run.id} onClick={() => navigate('/flux/' + run.workflow_id)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left hover:bg-white/[0.05]">{run.status === 'succeeded' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : run.status === 'failed' ? <AlertTriangle className="h-4 w-4 text-red-400" /> : <Clock3 className="h-4 w-4 text-amber-400" />}<div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{run.id.slice(0, 8)}</p><p className="mt-0.5 text-[10px] text-slate-500">{run.status}</p></div><ChevronRight className="h-4 w-4 text-slate-700" /></button>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FluxEditor({ workflowId, navigate }: { workflowId: string; navigate: FluxPageProps['navigate'] }) {
  const { user } = useAuth();
  const { screenToFlowPosition } = useReactFlow();
  const nodes = useFluxEditorStore(state => state.nodes);
  const edges = useFluxEditorStore(state => state.edges);
  const selectedNodeId = useFluxEditorStore(state => state.selectedNodeId);
  const setGraph = useFluxEditorStore(state => state.setGraph);
  const selectNode = useFluxEditorStore(state => state.selectNode);
  const mutate = useFluxEditorStore(state => state.mutate);
  const undo = useFluxEditorStore(state => state.undo);
  const redo = useFluxEditorStore(state => state.redo);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [runDialog, setRunDialog] = useState(false);
  const [inputValues, setInputValues] = useState<RunInput>({});
  const workflow = useQuery({
    queryKey: ['flux-workflow', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase.from('workflows').select('*').eq('id', workflowId).single();
      if (error) throw error; return data;
    },
    enabled: !!user && !!workflowId,
  });
  const history = useQuery({
    queryKey: ['flux-run-history', workflowId],
    queryFn: async () => {
      const { data, error } = await supabase.from('runs').select('id,status,created_at,started_at,finished_at,error').eq('workflow_id', workflowId).order('created_at', { ascending: false }).limit(20);
      if (error) throw error; return data || [];
    },
    enabled: !!user && !!workflowId,
  });
  const activeRun = useQuery({
    queryKey: ['flux-run', activeRunId],
    queryFn: async () => {
      const { data, error } = await supabase.from('runs').select('*').eq('id', activeRunId).single();
      if (error) throw error; return data;
    },
    enabled: !!activeRunId,
  });
  const activeSteps = useQuery({
    queryKey: ['flux-run-steps', activeRunId],
    queryFn: async () => {
      const { data, error } = await supabase.from('run_steps').select('*').eq('run_id', activeRunId).order('started_at', { ascending: true });
      if (error) throw error; return data || [];
    },
    enabled: !!activeRunId,
  });

  useEffect(() => {
    if (!workflow.data) return;
    const graph = workflow.data.graph as FluxGraph;
    setGraph(graph); setName(workflow.data.nome || 'Novo Fluxo'); setDescription(workflow.data.descricao || ''); setLoaded(true);
  }, [workflow.data, setGraph]);

  useEffect(() => {
    if (!loaded || !user) return;
    setSaving(true);
    const timer = window.setTimeout(async () => {
      const graph: FluxGraph = { nodes, edges };
      const next = await supabase.from('workflows').update({ nome: name, descricao: description, graph, updated_at: new Date().toISOString() }).eq('id', workflowId).eq('user_id', user.id);
      setSaving(false); if (next.error) setError(next.error.message);
      else await queryClient.invalidateQueries({ queryKey: ['flux-run-history', workflowId] });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, name, description, loaded, user, workflowId]);

  useEffect(() => {
    if (!activeRunId) return;
    const channel = supabase.channel('flux-run-' + activeRunId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'runs', filter: 'id=eq.' + activeRunId }, () => {
        void queryClient.invalidateQueries({ queryKey: ['flux-run', activeRunId] }); void queryClient.invalidateQueries({ queryKey: ['flux-run-history', workflowId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_steps', filter: 'run_id=eq.' + activeRunId }, () => {
        void queryClient.invalidateQueries({ queryKey: ['flux-run-steps', activeRunId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeRunId, workflowId]);

  const graph: FluxGraph = useMemo(() => ({ nodes, edges }), [nodes, edges]);
  const validation = useMemo(() => validateGraph(graph), [graph]);
  const invalidNodeIds = useMemo(() => new Set(validation.errors.map(item => item.nodeId).filter(Boolean) as string[]), [validation]);
  const selectedNode = nodes.find(node => node.id === selectedNodeId) || null;
  const entrada = nodes.find(node => node.data.nodeType === 'entrada');
  const entradaFields = entrada?.data.nodeType === 'entrada' ? entrada.data.config.fields : [];

  const updateGraph = (next: FluxGraph, previous = graph) => mutate(next, previous);
  const onNodesChange = (changes: NodeChange<FluxNode>[]) => {
    const nextNodes = applyNodeChanges(changes, nodes) as FluxNode[];
    const removed = changes.filter(change => change.type === 'remove').map(change => change.id);
    const nextEdges = removed.length ? edges.filter(edge => !removed.includes(edge.source) && !removed.includes(edge.target)) : edges;
    if (JSON.stringify({ nodes: nextNodes, edges: nextEdges }) !== JSON.stringify(graph)) updateGraph({ nodes: nextNodes, edges: nextEdges }, graph);
  };
  const onEdgesChange = (changes: EdgeChange[]) => {
    const nextEdges = applyEdgeChanges(changes, edges);
    if (JSON.stringify(nextEdges) !== JSON.stringify(edges)) updateGraph({ nodes, edges: nextEdges }, graph);
  };
  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const source = nodes.find(node => node.id === connection.source);
    const target = nodes.find(node => node.id === connection.target);
    if (!source || !target || source.data.nodeType === 'exportar' || target.data.nodeType === 'entrada') return;
    if (edges.some(edge => edge.target === target.id)) return;
    const addedEdges = addEdge({ ...connection, animated: true }, edges);
    const edge = addedEdges[addedEdges.length - 1];
    if (edge) updateGraph({ nodes, edges: addedEdges }, graph);
  };

  const addNode = (type: FluxNodeType, position?: { x: number; y: number }) => {
    const node = createFluxNode(type, position || { x: 250 + nodes.length * 40, y: 160 + nodes.length * 30 }, nodes.map(item => item.data.key));
    updateGraph({ nodes: [...nodes, node], edges }, graph); selectNode(node.id);
  };

  const updateSelected = (updater: (node: FluxNode) => FluxNode) => {
    if (!selectedNode) return;
    const nextNodes = nodes.map(node => node.id === selectedNode.id ? updater(node) : node);
    updateGraph({ nodes: nextNodes, edges }, graph);
  };
  const updateEntradaConfig = (updater: (config: EntradaConfig) => EntradaConfig) => updateSelected(node => {
    if (node.data.nodeType !== 'entrada') return node;
    return { ...node, data: { ...node.data, config: updater(node.data.config) } };
  });

  const updateTemplate = (template: string) => updateSelected(node => {
    if (node.data.nodeType !== 'template') return node;
    return { ...node, data: { ...node.data, config: { template } } };
  });

  const updateExportar = (updater: (config: { format: ExportFormat; name: string }) => { format: ExportFormat; name: string }) => updateSelected(node => {
    if (node.data.nodeType !== 'exportar') return node;
    return { ...node, data: { ...node.data, config: updater(node.data.config) } };
  });

  const removeSelected = () => {
    if (!selectedNode) return;
    updateGraph({ nodes: nodes.filter(node => node.id !== selectedNode.id), edges: edges.filter(edge => edge.source !== selectedNode.id && edge.target !== selectedNode.id) }, graph);
    selectNode(null);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/flux-node') as FluxNodeType;
    if (!type) return;
    addNode(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  const exportGraph = () => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = (name || 'flux') + '.json'; anchor.click(); URL.revokeObjectURL(url);
  };

  const importGraph = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; event.target.value = '';
    try {
      const parsed = JSON.parse(await file.text()) as FluxGraph;
      const check = validateGraph(parsed); if (!check.valid) throw new Error(check.errors.map(item => item.message).join(' '));
      setGraph(parsed); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'JSON de fluxo inválido.'); }
  };

  const openRunDialog = () => {
    if (!validation.valid) { setError(validation.errors.map(item => item.message).join(' ')); return; }
    const initial: RunInput = {}; for (const field of entradaFields) initial[field.id] = field.type === 'list' ? [] : ''; setInputValues(initial); setRunDialog(true);
  };

  const executeRun = async () => {
    if (!user) return;
    try {
      const { data: run, error: runError } = await supabase.from('runs').insert({ user_id: user.id, workflow_id: workflowId, status: 'queued', input: inputValues, graph_snapshot: graph }).select('id').single();
      if (runError) throw runError;
      const steps = graph.nodes.map(node => ({ run_id: run.id, node_id: node.id, node_type: node.data.nodeType, status: 'pending', input: {}, output: {}, attempts: 0 }));
      const { error: stepsError } = await supabase.from('run_steps').insert(steps); if (stepsError) throw stepsError;
      setRunDialog(false); setActiveRunId(run.id);
      const response = await supabase.functions.invoke('execute-run', { body: { run_id: run.id, user_id: user.id } });
      if (response.error) { await supabase.from('runs').update({ status: 'failed', error: response.error.message, finished_at: new Date().toISOString() }).eq('id', run.id); setError(response.error.message); }
      await queryClient.invalidateQueries({ queryKey: ['flux-run-history', workflowId] });
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível iniciar a execução.'); }
  };

  const cancelRun = async () => { if (!activeRunId) return; await supabase.from('runs').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('id', activeRunId).eq('user_id', user?.id); };
  const downloadExport = () => {
    const step = activeSteps.data?.find(item => item.node_type === 'exportar' && item.status === 'succeeded');
    const output = step?.output as { format?: string; name?: string; content?: string } | undefined;
    if (!output || typeof output.content !== 'string') return;
    const mime = output.format === 'html' ? 'text/html;charset=utf-8' : output.format === 'json' ? 'application/json;charset=utf-8' : 'text/markdown;charset=utf-8';
    const blob = new Blob([output.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = output.name || ('flux-export.' + (output.format || 'md'));
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (workflow.isLoading || !loaded) return <div className="min-h-full bg-[#0b0f17]"><Spinner /></div>;
  if (workflow.error) return <div className="min-h-full bg-[#0b0f17] p-8 text-white">Não foi possível carregar o fluxo.</div>;

  const viewNodes = nodes.map(node => ({ ...node, className: invalidNodeIds.has(node.id) ? 'flux-node-invalid' : '' }));

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[720px] flex-col bg-[#0b0f17] text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d121d] px-3 py-2.5">
        <button onClick={() => navigate('/flux')} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Voltar"><ChevronRight className="h-4 w-4 rotate-180" /></button>
        <div className="min-w-0 flex-1"><input value={name} onChange={e => setName(e.target.value)} className="w-full max-w-md bg-transparent text-sm font-black outline-none" /><div className="text-[10px] text-slate-500">{saving ? 'Salvando…' : 'Salvo automaticamente'}</div></div>
        <button onClick={undo} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Desfazer"><Undo2 className="h-4 w-4" /></button>
        <button onClick={redo} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Refazer"><Redo2 className="h-4 w-4" /></button>
        <label className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Importar JSON"><Upload className="h-4 w-4" /><input type="file" accept="application/json,.json" className="hidden" onChange={e => void importGraph(e)} /></label>
        <button onClick={exportGraph} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Exportar JSON"><Download className="h-4 w-4" /></button>
        <button onClick={() => setShowHistory(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Histórico"><History className="h-4 w-4" /></button>
        <button onClick={openRunDialog} className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-slate-950"><Play className="h-3.5 w-3.5" /> Executar</button>
      </header>

      {error && <div className="flex items-center justify-between border-b border-red-400/20 bg-red-500/10 px-4 py-2 text-xs text-red-200"><span>{error}</span><button onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[190px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#0d121d] p-3">
          <div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Nós</p><p className="mt-1 text-xs text-slate-500">Arraste para o canvas</p></div>
          {(['entrada','template','exportar'] as FluxNodeType[]).map(type => <button key={type} draggable onDragStart={e => e.dataTransfer.setData('application/flux-node', type)} onClick={() => addNode(type)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-white/20 hover:bg-white/[0.05]"><Workflow className="h-4 w-4 text-cyan-300" /><span className="text-xs font-bold capitalize">{type}</span></button>)}
          <div className="mt-5 border-t border-white/10 pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Validação</p><p className={validation.valid ? 'mt-2 text-xs text-emerald-400' : 'mt-2 text-xs text-red-300'}>{validation.valid ? 'Fluxo válido' : validation.errors.length + ' problema(s)'}</p></div>
        </aside>

        <div className="relative min-w-0 flex-1" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
          <ReactFlow
            nodes={viewNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            fitView
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#263244" />
            <MiniMap nodeStrokeColor="#64748b" nodeColor="#111827" maskColor="rgba(3,7,18,0.65)" />
            <Controls />
          </ReactFlow>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[10px] text-slate-500 backdrop-blur">Conecte Entrada → Template → Exportar</div>
        </div>

        <aside className="w-[330px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#0d121d] p-4">
          <div className="mb-4 flex items-center gap-2"><FileJson className="h-4 w-4 text-slate-400" /><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Inspector</p><h2 className="mt-1 text-sm font-black">Configuração</h2></div></div>
          {!selectedNode ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-slate-500">Selecione um nó para editar.</div> : <div className="space-y-4">
            <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Título</label><input value={selectedNode.data.title} onChange={e => updateSelected(node => ({ ...node, data: { ...node.data, title: e.target.value } }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/30" /></div>
            <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Chave</label><input value={selectedNode.data.key} onChange={e => updateSelected(node => ({ ...node, data: { ...node.data, key: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') } }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" /></div>
            {selectedNode.data.nodeType === 'template' && <div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Template</label><textarea rows={9} value={selectedNode.data.config.template} onChange={e => updateTemplate(e.target.value)} className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs leading-5 text-white outline-none" /><p className="mt-2 text-[10px] text-slate-500">Use {'{{entrada.campo}}'} para substituir valores. Nunca executa código.</p></div>}
            {selectedNode.data.nodeType === 'entrada' && <div className="space-y-3">
              {selectedNode.data.config.fields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={field.id} onChange={e => updateEntradaConfig(config => ({ ...config, fields: config.fields.map((item, i) => i === index ? { ...item, id: e.target.value } : item) }))} placeholder="id" className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs" />
                    <input value={field.label} onChange={e => updateEntradaConfig(config => ({ ...config, fields: config.fields.map((item, i) => i === index ? { ...item, label: e.target.value } : item) }))} placeholder="rótulo" className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs" />
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <select value={field.type} onChange={e => updateEntradaConfig(config => ({ ...config, fields: config.fields.map((item, i) => i === index ? { ...item, type: e.target.value as typeof item.type } : item) }))} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs">
                      <option value="text">Texto</option><option value="textarea">Texto longo</option><option value="number">Número</option><option value="list">Lista</option>
                    </select>
                    <button onClick={() => updateEntradaConfig(config => ({ ...config, fields: config.fields.filter((_, i) => i !== index) }))} className="rounded-lg border border-red-400/20 px-2.5 text-red-300 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-[10px] text-slate-400"><input type="checkbox" checked={!!field.required} onChange={e => updateEntradaConfig(config => ({ ...config, fields: config.fields.map((item, i) => i === index ? { ...item, required: e.target.checked } : item) }))} /> obrigatório</label>
                </div>
              ))}
              <button onClick={() => updateEntradaConfig(config => ({ ...config, fields: [...config.fields, { id: 'campo' + (config.fields.length + 1), label: 'Novo campo', type: 'text' }] }))} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"><Plus className="h-3.5 w-3.5" /> campo</button>
            </div>}
            {selectedNode.data.nodeType === 'exportar' && <div className="space-y-3"><div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Formato</label><select value={selectedNode.data.config.format} onChange={e => updateExportar(config => ({ ...config, format: e.target.value as ExportFormat }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs"><option value="md">Markdown</option><option value="html">HTML</option><option value="json">JSON</option></select></div><div><label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Nome do arquivo</label><input value={selectedNode.data.config.name} onChange={e => updateExportar(config => ({ ...config, name: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs" /></div></div>}
            {selectedNode.data.nodeType === 'template' && <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">Variáveis disponíveis</p><div className="mt-2 space-y-1 text-[10px] font-mono text-slate-400">{entradaFields.map(field => <div key={field.id}>{'{{entrada.' + field.id + '}}'}</div>)}<div>{'{{template.text}}'}</div></div></div>}
            <button onClick={removeSelected} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 py-2.5 text-xs font-bold text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /> Excluir nó</button>
          </div>}
        </aside>
      </div>

      {activeRunId && <div className="border-t border-white/10 bg-[#0d121d] px-4 py-3">
        <div className="flex items-center gap-3"><div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" /><p className="text-xs font-bold">Execução {activeRunId.slice(0, 8)}</p><span className="text-[10px] text-slate-500">{activeRun.data?.status || 'queued'}</span><div className="ml-auto flex items-center gap-2">{activeRun.data?.status === 'succeeded' && <button onClick={downloadExport} className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-950">Baixar exportação</button>}{!['succeeded','failed','cancelled'].includes(activeRun.data?.status || '') && <button onClick={() => void cancelRun()} className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-[10px] font-bold text-red-300">Cancelar</button>}</div></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">{activeSteps.data?.map(step => <div key={step.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"><p className="text-[10px] font-bold text-slate-300">{step.node_type}</p><p className="mt-1 text-[10px] text-slate-500">{step.status}</p></div>)}</div>
      </div>}

      {showHistory && <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60" onMouseDown={e => { if (e.target === e.currentTarget) setShowHistory(false); }}><div className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0d121d] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Histórico</p><h2 className="mt-1 text-lg font-black">Execuções</h2></div><button onClick={() => setShowHistory(false)}><X className="h-5 w-5 text-slate-500" /></button></div><div className="mt-5 space-y-2">{history.data?.map(run => <button key={run.id} onClick={() => { setActiveRunId(run.id); setShowHistory(false); }} className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.05]"><div className="flex items-center justify-between"><span className="text-xs font-bold">{run.id.slice(0, 8)}</span><span className="text-[10px] text-slate-500">{run.status}</span></div>{run.error && <p className="mt-1 text-[10px] text-red-300">{run.error}</p>}</button>)}</div></div></div>}

      {runDialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-cyan-400">Entrada</p><h2 className="mt-1 text-lg font-black">Executar fluxo</h2></div><button onClick={() => setRunDialog(false)}><X className="h-5 w-5 text-slate-500" /></button></div><div className="mt-5 space-y-4">{entradaFields.map(field => <label key={field.id} className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-300">{field.label}{field.required ? ' *' : ''}</span>{field.type === 'textarea' || field.type === 'list' ? <textarea rows={field.type === 'list' ? 5 : 4} value={Array.isArray(inputValues[field.id]) ? (inputValues[field.id] as unknown[]).join('\n') : String(inputValues[field.id] ?? '')} onChange={e => setInputValues(prev => ({ ...prev, [field.id]: field.type === 'list' ? e.target.value.split('\n').map(item => item.trim()).filter(Boolean) : e.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" /> : <input type={field.type === 'number' ? 'number' : 'text'} value={String(inputValues[field.id] ?? '')} onChange={e => setInputValues(prev => ({ ...prev, [field.id]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))} placeholder={field.placeholder} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none" />}</label>)}</div><button onClick={() => void executeRun()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950"><Play className="h-4 w-4" /> Iniciar execução</button></div></div>}
    </div>
  );
}

export function FluxPage(props: FluxPageProps) {
  return <QueryClientProvider client={queryClient}><ReactFlowProvider>{props.workflowId ? <FluxEditor workflowId={props.workflowId} navigate={props.navigate} /> : <FluxHome navigate={props.navigate} />}</ReactFlowProvider></QueryClientProvider>;
}

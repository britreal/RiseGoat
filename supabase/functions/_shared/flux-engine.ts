import { z } from 'npm:zod@4.6.5';

const EntradaFieldSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  type: z.enum(['text', 'textarea', 'number', 'list']),
  required: z.boolean().optional().default(false),
  placeholder: z.string().max(240).optional(),
});
const EntradaConfigSchema = z.object({ fields: z.array(EntradaFieldSchema).min(1).max(30) });
const TemplateConfigSchema = z.object({ template: z.string().min(1).max(50000) });
const ExportarConfigSchema = z.object({ format: z.enum(['md', 'html', 'json']), name: z.string().min(1).max(120) });

type FluxNode = { id: string; data: { nodeType: 'entrada' | 'template' | 'exportar'; key: string; config: unknown } };
type FluxEdge = { id: string; source: string; target: string };
type FluxGraph = { nodes: FluxNode[]; edges: FluxEdge[] };

function parseConfig(node: FluxNode) {
  if (node.data.nodeType === 'entrada') return { nodeType: node.data.nodeType, config: EntradaConfigSchema.parse(node.data.config) };
  if (node.data.nodeType === 'template') return { nodeType: node.data.nodeType, config: TemplateConfigSchema.parse(node.data.config) };
  return { nodeType: node.data.nodeType, config: ExportarConfigSchema.parse(node.data.config) };
}

export function topologicalOrder(graph: FluxGraph) {
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  graph.nodes.forEach(node => { indegree.set(node.id, 0); outgoing.set(node.id, []); });
  graph.edges.forEach(edge => {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) throw new Error('Conexão com nó inexistente.');
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    outgoing.get(edge.source)!.push(edge.target);
  });
  const queue = graph.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!; order.push(id);
    for (const next of outgoing.get(id) || []) { const value = (indegree.get(next) || 0) - 1; indegree.set(next, value); if (value === 0) queue.push(next); }
  }
  if (order.length !== graph.nodes.length) throw new Error('O fluxo contém um ciclo.');
  return order;
}

export function validateGraph(graph: FluxGraph) {
  if (!graph.nodes.length) throw new Error('Fluxo vazio.');
  const ids = new Set<string>();
  for (const node of graph.nodes) { if (ids.has(node.id)) throw new Error('IDs de nós duplicados.'); ids.add(node.id); parseConfig(node); }
  const inputs = graph.nodes.filter(node => node.data.nodeType === 'entrada');
  const exports = graph.nodes.filter(node => node.data.nodeType === 'exportar');
  if (!inputs.length) throw new Error('O fluxo precisa de Entrada.');
  if (!exports.length) throw new Error('O fluxo precisa de Exportar.');
  for (const edge of graph.edges) { if (!ids.has(edge.source) || !ids.has(edge.target)) throw new Error('Conexão com nó inexistente.'); }
  topologicalOrder(graph);
}

function getByPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, value);
}

function resolveTemplate(template: string, context: Record<string, unknown>) {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match, path: string) => {
    const value = getByPath(context, path);
    if (value === undefined) throw new Error('Variável ausente: {{' + path + '}}');
    if (value === null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  });
}

export function executeNode(node: FluxNode, upstreamInput: unknown, runInput: Record<string, unknown>, context: Record<string, unknown>) {
  const parsed = parseConfig(node);
  if (parsed.nodeType === 'entrada') return runInput;
  if (parsed.nodeType === 'template') return { text: resolveTemplate(parsed.config.template, context) };
  const upstream = typeof upstreamInput === 'object' && upstreamInput !== null && 'text' in upstreamInput
    ? String((upstreamInput as Record<string, unknown>).text || '')
    : upstreamInput;
  const content = parsed.config.format === 'json' ? JSON.stringify(upstreamInput ?? {}, null, 2) : String(upstream || '');
  return {
    format: parsed.config.format,
    name: parsed.config.name,
    content: parsed.config.format === 'html'
      ? '<article>' + content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />') + '</article>'
      : content,
  };
}

export function assertInput(graph: FluxGraph, input: Record<string, unknown>) {
  for (const node of graph.nodes.filter(node => node.data.nodeType === 'entrada')) {
    const config = EntradaConfigSchema.parse(node.data.config);
    for (const field of config.fields) {
      const value = input[field.id];
      if (field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) throw new Error('Preencha o campo obrigatório: ' + field.label);
    }
  }
}

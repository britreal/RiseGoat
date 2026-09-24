import type { FluxGraph, FluxNode, ExecutionResult, RunInput } from '../flux/types';
import { EntradaConfigSchema, ExportarConfigSchema, TemplateConfigSchema, validateNodeConfig } from '../flux/schemas';

export interface GraphValidationResult {
  valid: boolean;
  errors: Array<{ message: string; nodeId?: string; edgeId?: string }>;
}

function nodeLabel(node: FluxNode) { return node.data?.title || node.id; }

export function topologicalOrder(graph: FluxGraph): string[] {
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  graph.nodes.forEach(node => { indegree.set(node.id, 0); outgoing.set(node.id, []); });
  graph.edges.forEach(edge => {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) throw new Error('O grafo possui uma conexão apontando para um nó inexistente.');
    indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    outgoing.get(edge.source)!.push(edge.target);
  });
  const queue = graph.nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of outgoing.get(id) || []) {
      const nextDegree = (indegree.get(next) || 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }
  if (order.length !== graph.nodes.length) throw new Error('O fluxo contém um ciclo. Remova a conexão que fecha o caminho.');
  return order;
}

export function validateGraph(graph: FluxGraph): GraphValidationResult {
  const errors: GraphValidationResult['errors'] = [];
  const ids = new Set<string>();
  if (!graph.nodes.length) return { valid: false, errors: [{ message: 'Adicione pelo menos um nó de Entrada.' }] };
  for (const node of graph.nodes) {
    if (ids.has(node.id)) errors.push({ message: 'Existem nós com IDs duplicados.', nodeId: node.id });
    ids.add(node.id);
    if (!node.data?.nodeType) { errors.push({ message: 'Nó sem tipo definido.', nodeId: node.id }); continue; }
    if (!validateNodeConfig(node)?.success) errors.push({ message: 'Configuração inválida em ' + nodeLabel(node) + '.', nodeId: node.id });
  }
  for (const edge of graph.edges) {
    if (edge.source === edge.target) errors.push({ message: 'Uma conexão não pode voltar para o próprio nó.', edgeId: edge.id });
    if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push({ message: 'Existe uma conexão com nó inexistente.', edgeId: edge.id });
  }
  try { topologicalOrder(graph); } catch (error) { errors.push({ message: error instanceof Error ? error.message : 'Fluxo inválido.' }); }
  const indegree = new Map<string, number>();
  const outdegree = new Map<string, number>();
  graph.nodes.forEach(node => { indegree.set(node.id, 0); outdegree.set(node.id, 0); });
  graph.edges.forEach(edge => {
    if (indegree.has(edge.target)) indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1);
    if (outdegree.has(edge.source)) outdegree.set(edge.source, (outdegree.get(edge.source) || 0) + 1);
  });
  const entradas = graph.nodes.filter(node => node.data.nodeType === 'entrada');
  const exportadores = graph.nodes.filter(node => node.data.nodeType === 'exportar');
  if (!entradas.length) errors.push({ message: 'O fluxo precisa de pelo menos um nó Entrada.' });
  if (!exportadores.length) errors.push({ message: 'O fluxo precisa de pelo menos um nó Exportar.' });
  const reachable = new Set<string>();
  const queue = entradas.map(node => node.id);
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    graph.edges.filter(edge => edge.source === id).forEach(edge => queue.push(edge.target));
  }
  for (const node of graph.nodes) {
    const incoming = indegree.get(node.id) || 0;
    const outgoing = outdegree.get(node.id) || 0;
    if (node.data.nodeType === 'entrada') {
      if (incoming !== 0) errors.push({ message: 'Entrada não pode receber conexões.', nodeId: node.id });
      if (outgoing === 0 && graph.nodes.length > 1) errors.push({ message: 'Entrada precisa estar conectada ao próximo nó.', nodeId: node.id });
    }
    if (node.data.nodeType === 'template') {
      if (incoming !== 1) errors.push({ message: 'Template precisa receber exatamente uma conexão.', nodeId: node.id });
      if (outgoing !== 1) errors.push({ message: 'Template precisa apontar para o próximo nó.', nodeId: node.id });
    }
    if (node.data.nodeType === 'exportar') {
      if (incoming !== 1) errors.push({ message: 'Exportar precisa receber exatamente uma conexão.', nodeId: node.id });
      if (outgoing !== 0) errors.push({ message: 'Exportar é um nó terminal e não pode apontar para outro.', nodeId: node.id });
    }
    if (!reachable.has(node.id)) errors.push({ message: 'Nó órfão: conecte este nó ao fluxo principal.', nodeId: node.id });
  }
  return { valid: errors.length === 0, errors };
}

function getByPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) return (current as Record<string, unknown>)[key];
    return undefined;
  }, value);
}

export function resolveVariables(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (full, path: string) => {
    const value = getByPath(context, path);
    if (value === undefined) throw new Error('Variável ausente: {{' + path + '}}');
    if (value === null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  });
}

export function validateRunInput(graph: FluxGraph, input: RunInput) {
  for (const node of graph.nodes.filter(node => node.data.nodeType === 'entrada')) {
    const config = EntradaConfigSchema.parse(node.data.config);
    for (const field of config.fields) {
      const value = input[field.id];
      if (field.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
        throw new Error('Preencha o campo obrigatório: ' + field.label);
      }
    }
  }
}

export async function executeGraph(graph: FluxGraph, input: RunInput, options: {
  onStepStart?: (node: FluxNode, input: unknown) => Promise<void> | void;
  onStepSuccess?: (node: FluxNode, input: unknown, output: unknown) => Promise<void> | void;
} = {}): Promise<ExecutionResult> {
  const validation = validateGraph(graph);
  if (!validation.valid) throw new Error(validation.errors.map(item => item.message).join(' '));
  validateRunInput(graph, input);
  const order = topologicalOrder(graph);
  const nodeMap = new Map(graph.nodes.map(node => [node.id, node]));
  const outputs: Record<string, unknown> = {};
  const context: Record<string, unknown> = { entrada: input, nodes: outputs };
  const steps = [];
  for (const id of order) {
    const node = nodeMap.get(id)!;
    const incoming = graph.edges.find(edge => edge.target === id);
    const upstreamOutput = incoming ? outputs[incoming.source] : input;
    await options.onStepStart?.(node, upstreamOutput);
    let output: unknown;
    const nodeType = node.data.nodeType;
    if (nodeType === 'entrada') {
      output = input;
      context.entrada = output;
    } else if (nodeType === 'template') {
      const config = TemplateConfigSchema.parse(node.data.config);
      output = { text: resolveVariables(config.template, context) };
    } else {
      const upstreamText = typeof upstreamOutput === 'object' && upstreamOutput !== null && 'text' in upstreamOutput
        ? String((upstreamOutput as Record<string, unknown>).text || '')
        : upstreamOutput;
      const config = ExportarConfigSchema.parse(node.data.config);
      const content = config.format === 'json' ? JSON.stringify(upstreamOutput ?? {}, null, 2) : String(upstreamText ?? '');
      output = {
        format: config.format,
        name: config.name,
        content: config.format === 'html'
          ? '<article>' + content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />') + '</article>'
          : content,
      };
    }
    outputs[node.id] = output;
    if (node.data.key) context[node.data.key] = output;
    steps.push({ nodeId: node.id, nodeType, input: upstreamOutput, output });
    await options.onStepSuccess?.(node, upstreamOutput, output);
  }
  return { outputs, steps };
}

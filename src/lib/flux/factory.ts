import type { FluxNode, FluxNodeType } from './types';

let sequence = 0;
function nodeId(type: FluxNodeType) { sequence += 1; return type + '-' + Date.now() + '-' + sequence; }
function keyFor(type: FluxNodeType) { return type === 'entrada' ? 'entrada' : type === 'template' ? 'template' : 'exportar'; }

export function createFluxNode(type: FluxNodeType, position: { x: number; y: number }, existingKeys: string[] = []): FluxNode {
  const baseKey = keyFor(type);
  let key = baseKey; let suffix = 2;
  while (existingKeys.includes(key)) key = baseKey + suffix++;
  return {
    id: nodeId(type), position, type: 'flux',
    data: {
      nodeType: type,
      title: type === 'entrada' ? 'Entrada' : type === 'template' ? 'Template' : 'Exportar',
      description: type === 'entrada' ? 'Recebe os dados iniciais do produto.' : type === 'template' ? 'Monta texto com variáveis seguras.' : 'Gera um arquivo a partir da saída anterior.',
      key,
      config: type === 'entrada'
        ? { fields: [
            { id: 'nicho', label: 'Nicho', type: 'text', required: true, placeholder: 'Ex.: carreira, fitness, história' },
            { id: 'publico', label: 'Público', type: 'text', required: true, placeholder: 'Ex.: iniciantes' },
            { id: 'tom', label: 'Tom', type: 'text', required: false, placeholder: 'Ex.: direto e didático' },
          ] }
        : type === 'template'
          ? { template: 'Crie um título e uma estrutura para um produto no nicho {{entrada.nicho}}, destinado a {{entrada.publico}}, usando um tom {{entrada.tom}}.' }
          : { format: 'md', name: 'produto.md' },
    },
  } as FluxNode;
}

export function createStarterGraph() {
  const entrada = createFluxNode('entrada', { x: 80, y: 160 });
  const template = createFluxNode('template', { x: 420, y: 160 }, [entrada.data.key]);
  const exportar = createFluxNode('exportar', { x: 760, y: 160 }, [entrada.data.key, template.data.key]);
  return {
    nodes: [entrada, template, exportar],
    edges: [
      { id: entrada.id + '->' + template.id, source: entrada.id, target: template.id, sourceHandle: 'output', targetHandle: 'input', animated: true },
      { id: template.id + '->' + exportar.id, source: template.id, target: exportar.id, sourceHandle: 'output', targetHandle: 'input', animated: true },
    ],
  };
}

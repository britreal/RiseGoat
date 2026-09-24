import assert from 'node:assert/strict';
import { createStarterGraph } from '../src/lib/flux/factory';
import { executeGraph, resolveVariables, topologicalOrder, validateGraph } from '../src/lib/engine';
import type { FluxGraph } from '../src/lib/flux/types';

function expectThrow(fn: () => unknown, expected: string) {
  assert.throws(fn, new RegExp(expected));
}

const starter = createStarterGraph();
assert.equal(validateGraph(starter).valid, true);
assert.deepEqual(topologicalOrder(starter), starter.nodes.map(node => node.id));

const executed = await executeGraph(starter, { nicho: 'história', publico: 'iniciantes', tom: 'didático' });
assert.equal(executed.steps.length, 3);
assert.equal((executed.outputs[starter.nodes[1].id] as { text: string }).text.includes('história'), true);
assert.equal((executed.outputs[starter.nodes[2].id] as { format: string }).format, 'md');

assert.equal(resolveVariables('Olá {{entrada.nome}}', { entrada: { nome: 'João' } }), 'Olá João');
expectThrow(() => resolveVariables('Olá {{entrada.inexistente}}', { entrada: {} }), 'Variável ausente');

const cycle: FluxGraph = {
  nodes: starter.nodes,
  edges: [...starter.edges, { id: 'cycle', source: starter.nodes[2].id, target: starter.nodes[0].id }],
};
assert.equal(validateGraph(cycle).valid, false);
expectThrow(() => topologicalOrder(cycle), 'ciclo');

const orphan = { ...starter, nodes: [...starter.nodes, { ...starter.nodes[1], id: 'orphan', position: { x: 900, y: 400 } }] };
assert.equal(validateGraph(orphan).valid, false);

const missingInput = await executeGraph(starter, { publico: 'iniciantes', tom: 'direto' }).catch(error => error);
assert.match(String(missingInput?.message || missingInput), /Nicho/);

console.log('Flux engine tests: OK');
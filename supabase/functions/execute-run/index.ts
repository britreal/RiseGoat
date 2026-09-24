import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { assertInput, executeNode, validateGraph, topologicalOrder } from '../_shared/flux-engine.ts';

const MAX_OUTPUT_BYTES = 1024 * 1024;
const BUDGET_MS = 20_000;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowed = origin === 'https://risegoat.com' || origin === 'https://www.risegoat.com' || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.endsWith('.vercel.app');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://risegoat.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-flux-internal',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
}

function sizeLimit(value: unknown) {
  const serialized = JSON.stringify(value ?? null);
  if (new TextEncoder().encode(serialized).byteLength <= MAX_OUTPUT_BYTES) return value;
  return { truncated: true, warning: 'Saída do nó ultrapassou 1 MB e foi truncada.', content: serialized.slice(0, MAX_OUTPUT_BYTES) };
}

async function backoff(attempt: number) { await new Promise(resolve => setTimeout(resolve, 250 * attempt)); }

async function continueRun(req: Request, runId: string, userId: string, token: string) {
  const internalSecret = Deno.env.get('INTERNAL_SECRET') || '';
  if (!internalSecret) throw new Error('INTERNAL_SECRET não configurado.');
  const url = Deno.env.get('SUPABASE_URL')! + '/functions/v1/execute-run';
  const promise = fetch(url, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'x-flux-internal': internalSecret },
    body: JSON.stringify({ run_id: runId, user_id: userId }),
  });
  const runtime = (globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(promise); else await promise;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  try {
    const body = await req.json();
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json(req, { ok: false, error: 'Não autenticado.' }, 401);
    const userId = String(body.user_id || '');
    const runId = String(body.run_id || '');
    if (!userId || !runId) return json(req, { ok: false, error: 'user_id e run_id são obrigatórios.' }, 400);

    const internalHeader = req.headers.get('x-flux-internal');
    if (internalHeader) {
      const secret = Deno.env.get('INTERNAL_SECRET') || '';
      if (!secret || internalHeader !== secret) return json(req, { ok: false, error: 'Continuação interna não autorizada.' }, 401);
    }

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: 'Bearer ' + token } } });
    const auth = await userClient.auth.getUser(token);
    if (auth.error || !auth.data.user || auth.data.user.id !== userId) return json(req, { ok: false, error: 'Usuário inválido.' }, 401);

    const { data: run, error: runError } = await userClient.from('runs').select('*').eq('id', runId).eq('user_id', userId).single();
    if (runError) throw runError;
    if (['succeeded','failed','cancelled'].includes(run.status)) return json(req, { ok: true, run_id: runId, status: run.status });

    const graph = run.graph_snapshot as { nodes: Array<any>; edges: Array<any> };
    validateGraph(graph);
    const order = topologicalOrder(graph);
    assertInput(graph, run.input || {});

    const { data: stepRows, error: stepsError } = await userClient.from('run_steps').select('*').eq('run_id', runId);
    if (stepsError) throw stepsError;
    const stepMap = new Map((stepRows || []).map(step => [step.node_id, step]));
    const outputs: Record<string, unknown> = {};
    const context: Record<string, unknown> = { entrada: run.input || {}, nodes: outputs };
    for (const node of graph.nodes) {
      const step = stepMap.get(node.id);
      if (step?.status === 'succeeded') { outputs[node.id] = step.output; if (node.data.key) context[node.data.key] = step.output; }
    }

    await userClient.from('runs').update({ status: 'running', started_at: run.started_at || new Date().toISOString(), error: null }).eq('id', runId).eq('user_id', userId);
    const startedAt = Date.now();

    for (const nodeId of order) {
      if (Date.now() - startedAt >= BUDGET_MS) {
        await continueRun(req, runId, userId, token);
        return json(req, { ok: true, run_id: runId, continued: true, status: 'running' });
      }

      const node = graph.nodes.find(item => item.id === nodeId)!;
      const current = stepMap.get(node.id);
      if (current?.status === 'succeeded') continue;

      const incoming = graph.edges.find(edge => edge.target === node.id);
      const upstreamInput = incoming ? outputs[incoming.source] : (run.input || {});
      const previousAttempts = Number(current?.attempts || 0);
      let success = false;
      let lastError = '';

      for (let attempt = previousAttempts + 1; attempt <= 2; attempt += 1) {
        await userClient.from('run_steps').upsert({
          run_id: runId, node_id: node.id, node_type: node.data.nodeType, status: 'running',
          input: upstreamInput ?? {}, output: {}, error: null, attempts: attempt, started_at: new Date().toISOString(), finished_at: null,
        }, { onConflict: 'run_id,node_id' });
        try {
          const rawOutput = executeNode(node, upstreamInput, run.input || {}, context);
          const output = sizeLimit(rawOutput);
          outputs[node.id] = output;
          if (node.data.key) context[node.data.key] = output;
          await userClient.from('run_steps').update({ status: 'succeeded', output, error: null, finished_at: new Date().toISOString() }).eq('run_id', runId).eq('node_id', node.id);
          stepMap.set(node.id, { ...(current || {}), id: current?.id || node.id, run_id: runId, node_id: node.id, status: 'succeeded', attempts: attempt, output });
          success = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Falha ao executar o nó.';
          await userClient.from('run_steps').update({ status: 'failed', error: lastError, attempts: attempt, finished_at: attempt >= 2 ? new Date().toISOString() : null }).eq('run_id', runId).eq('node_id', node.id);
          if (attempt < 2) await backoff(attempt);
        }
      }

      if (!success) {
        await userClient.from('runs').update({ status: 'failed', error: lastError || 'Falha ao executar o nó.', finished_at: new Date().toISOString() }).eq('id', runId).eq('user_id', userId);
        return json(req, { ok: false, run_id: runId, status: 'failed', error: lastError || 'Falha ao executar o nó.' }, 200);
      }
      const { data: state } = await userClient.from('runs').select('status').eq('id', runId).eq('user_id', userId).single();
      if (state?.status === 'cancelled') return json(req, { ok: true, run_id: runId, status: 'cancelled' });
    }

    await userClient.from('runs').update({ status: 'succeeded', finished_at: new Date().toISOString(), error: null }).eq('id', runId).eq('user_id', userId);
    return json(req, { ok: true, run_id: runId, status: 'succeeded' });
  } catch (error) {
    return json(req, { ok: false, error: error instanceof Error ? error.message : 'Falha na execução.' }, 400);
  }
});

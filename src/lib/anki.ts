export const DEFAULT_ANKI_CONNECT_URL = 'http://127.0.0.1:8765';

export interface AnkiConnection {
  permission: 'granted' | 'denied';
  requireApiKey: boolean;
  version?: number;
}

export interface AnkiDeckStats {
  name: string;
  id: number;
  total: number;
  due: number;
  new: number;
  learning: number;
  review: number;
}

interface AnkiResponse<T> {
  result: T;
  error: string | null;
}

type FetchInit = RequestInit & {
  targetAddressSpace?: 'local' | 'loopback' | 'public' | 'unknown';
};

function requestInit(body: unknown, targetAddressSpace?: FetchInit['targetAddressSpace']): FetchInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    body: JSON.stringify(body),
    ...(targetAddressSpace ? { targetAddressSpace } : {}),
  };
}

function targetAddressSpace(url: string): FetchInit['targetAddressSpace'] {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1') return 'loopback';
    if (/^(10|127)\\./.test(host) || /^192\\.168\\./.test(host) || /^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(host)) return 'local';
  } catch {
    return undefined;
  }
  return undefined;
}

async function post<T>(baseUrl: string, body: Record<string, unknown>, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(baseUrl, {
      ...requestInit(body, targetAddressSpace(baseUrl)),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AnkiConnect respondeu com HTTP ${response.status}.`);
    const payload = await response.json() as AnkiResponse<T>;
    if (payload.error) throw new Error(payload.error);
    return payload.result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('A conexão com o Anki expirou. Verifique se o Anki está aberto.');
    }
    if (error instanceof TypeError) {
      throw new Error('Não foi possível acessar o AnkiConnect. Verifique o Anki aberto e a permissão de conexão do navegador.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function normalizeAnkiUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_ANKI_CONNECT_URL;
  return trimmed.replace(/\\/+$|\\/+$/g, '').replace(/\\/+$/, '');
}

export async function requestPermission(url: string): Promise<AnkiConnection> {
  return post<AnkiConnection>(normalizeAnkiUrl(url), {
    action: 'requestPermission',
    version: 6,
  });
}

export async function invokeAnki<T>(
  url: string,
  action: string,
  params: Record<string, unknown> = {},
  apiKey = '',
): Promise<T> {
  const body: Record<string, unknown> = {
    action,
    version: 6,
    params,
  };
  if (apiKey.trim()) body.key = apiKey.trim();
  return post<T>(normalizeAnkiUrl(url), body);
}

export async function invokeAnkiMulti<T extends unknown[]>(
  url: string,
  actions: Array<{ action: string; params?: Record<string, unknown> }>,
  apiKey = '',
): Promise<T> {
  const nested = actions.map(item => {
    const body: Record<string, unknown> = {
      action: item.action,
      version: 6,
      params: item.params || {},
    };
    if (apiKey.trim()) body.key = apiKey.trim();
    return body;
  });
  return invokeAnki<T>(url, 'multi', { actions: nested }, '');
}

export function deckQuery(deckName: string, suffix = '') {
  const safe = deckName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `deck:"${safe}"${suffix ? ` ${suffix}` : ''}`;
}

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateReviewStreak(days: Array<[string, number]>) {
  const positive = new Set(days.filter(([, count]) => Number(count) > 0).map(([date]) => date));
  let cursor = new Date();
  let streak = 0;

  if (!positive.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!positive.has(dayKey(cursor))) return 0;
  }

  while (positive.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

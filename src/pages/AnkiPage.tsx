import { useMemo, useState } from 'react';
import {
  AlertCircle, BarChart3, Brain, Check, ChevronDown, CircleHelp, ExternalLink,
  Flame, KeyRound, Link2, Loader2, RefreshCw, Server, Sparkles, Wifi, X,
} from 'lucide-react';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { DEFAULT_ANKI_CONNECT_URL, calculateReviewStreak, dayKey, deckQuery, invokeAnkiMulti, normalizeAnkiUrl, requestPermission, type AnkiConnection, type AnkiDeckStats } from '@/lib/anki';

interface DashboardData {
  reviewedToday: number;
  reviewedByDay: Array<[string, number]>;
  due: number;
  newCards: number;
  learning: number;
  review: number;
  decks: AnkiDeckStats[];
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const STORAGE_KEY = 'risegoat-anki-connect-url';

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function lastSevenDays(series: Array<[string, number]>) {
  const map = new Map(series);
  const days: Array<{ key: string; label: string; value: number }> = [];
  const cursor = new Date();

  cursor.setDate(cursor.getDate() - 6);
  for (let index = 0; index < 7; index += 1) {
    const key = dayKey(cursor);
    days.push({
      key,
      label: cursor.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      value: Number(map.get(key) || 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function StatCard({ icon: Icon, label, value, note }: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">{label}</p>
          <p className="text-3xl font-black tracking-tight text-slate-950 mt-2">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1">{note}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
    </Card>
  );
}

export function AnkiPage() {
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_ANKI_CONNECT_URL);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connection, setConnection] = useState<AnkiConnection | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDeck, setSelectedDeck] = useState('all');
  const [error, setError] = useState('');
  const [setupOpen, setSetupOpen] = useState(true);

  const summary = useMemo(() => {
    if (!data) return null;
    const streak = calculateReviewStreak(data.reviewedByDay);
    const total = data.decks.reduce((sum, deck) => sum + deck.total, 0);
    const maxDay = Math.max(1, ...lastSevenDays(data.reviewedByDay).map(item => item.value));
    return { streak, total, maxDay };
  }, [data]);

  async function connect() {
    setStatus('connecting');
    setError('');
    try {
      const url = normalizeAnkiUrl(endpoint);
      const permission = await requestPermission(url);
      if (permission.permission !== 'granted') {
        throw new Error('O Anki negou a permissão de conexão. Autorize o RiseGoat na janela do Anki e tente novamente.');
      }
      localStorage.setItem(STORAGE_KEY, url);
      setEndpoint(url);
      setConnection(permission);

      if (permission.requireApiKey && !apiKey.trim()) {
        setStatus('connected');
        setData(null);
        setError('Seu AnkiConnect exige uma API key. Informe a chave para carregar os analytics.');
        return;
      }

      await loadAnalytics(url, apiKey);
      setStatus('connected');
    } catch (e) {
      setStatus('disconnected');
      setError(e instanceof Error ? e.message : 'Não foi possível conectar ao Anki.');
    }
  }

  async function loadAnalytics(url = endpoint, key = apiKey) {
    setError('');
    const baseActions = [
      { action: 'getNumCardsReviewedToday' },
      { action: 'getNumCardsReviewedByDay' },
      { action: 'findCards', params: { query: 'is:due' } },
      { action: 'findCards', params: { query: 'is:new' } },
      { action: 'findCards', params: { query: 'is:learn' } },
      { action: 'findCards', params: { query: 'is:review' } },
      { action: 'deckNamesAndIds' },
    ];

    const [reviewedToday, reviewedByDay, dueIds, newIds, learningIds, reviewIds, deckMap] =
      await invokeAnkiMulti<[number, Array<[string, number]>, number[], number[], number[], number[], Record<string, number>]>(
        url,
        baseActions,
        key,
      );

    const names = Object.entries(deckMap).slice(0, 30);
    const deckActions = names.flatMap(([name]) => ([
      { action: 'findCards', params: { query: deckQuery(name) } },
      { action: 'findCards', params: { query: deckQuery(name, 'is:due') } },
      { action: 'findCards', params: { query: deckQuery(name, 'is:new') } },
      { action: 'findCards', params: { query: deckQuery(name, 'is:learn') } },
      { action: 'findCards', params: { query: deckQuery(name, 'is:review') } },
    ]));

    const deckResults = deckActions.length
      ? await invokeAnkiMulti<Array<number[]>>(url, deckActions, key)
      : [];

    const decks = names.map(([name, id], index) => {
      const offset = index * 5;
      return {
        name,
        id,
        total: deckResults[offset]?.length || 0,
        due: deckResults[offset + 1]?.length || 0,
        new: deckResults[offset + 2]?.length || 0,
        learning: deckResults[offset + 3]?.length || 0,
        review: deckResults[offset + 4]?.length || 0,
      };
    }).sort((a, b) => b.due - a.due || b.total - a.total);

    setData({
      reviewedToday: Number(reviewedToday || 0),
      reviewedByDay: reviewedByDay || [],
      due: dueIds?.length || 0,
      newCards: newIds?.length || 0,
      learning: learningIds?.length || 0,
      review: reviewIds?.length || 0,
      decks,
    });
  }

  async function refresh() {
    if (!connection || (connection.requireApiKey && !apiKey.trim())) return;
    try {
      setStatus('connecting');
      await loadAnalytics(endpoint, apiKey);
      setStatus('connected');
    } catch (e) {
      setStatus('disconnected');
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar os analytics.');
    }
  }

  const chart = data ? lastSevenDays(data.reviewedByDay) : [];
  const visibleDecks = selectedDeck === 'all' ? data?.decks || [] : (data?.decks || []).filter(deck => deck.name === selectedDeck);

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        <PageHeader
          title="Anki"
          subtitle="Conecte o seu Anki ao RiseGoat e transforme seus estudos em dados: revisões, carga de estudo, decks e consistência."
          action={
            <div className="flex items-center gap-2">
              {status === 'connected' && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <Wifi className="w-3.5 h-3.5" /> Conectado
                </span>
              )}
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={status === 'connecting' || !connection}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${status === 'connecting' ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          }
        />

        {error && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">{error}</div>
            <button type="button" onClick={() => setError('')} className="p-1 rounded-lg hover:bg-amber-100" aria-label="Fechar aviso">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Card className="p-5 sm:p-6 mb-5">
          <div className="flex flex-col xl:flex-row gap-5 xl:items-end">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center"><Link2 className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Integração local</p>
                  <h2 className="text-base font-black text-slate-950">AnkiConnect</h2>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl">
                O RiseGoat fala diretamente com o Anki aberto no seu computador. O endereço padrão do AnkiConnect é <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-600">127.0.0.1:8765</code>.
              </p>
            </div>

            <div className="grid sm:grid-cols-[minmax(250px,1fr)_minmax(200px,0.8fr)_auto] gap-2 w-full xl:w-auto xl:min-w-[720px]">
              <label>
                <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1.5">Endpoint</span>
                <input
                  value={endpoint}
                  onChange={e => setEndpoint(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  placeholder={DEFAULT_ANKI_CONNECT_URL}
                />
              </label>
              <label>
                <span className="block text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400 mb-1.5">API key <span className="normal-case font-normal">(opcional)</span></span>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowKey(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" aria-label="Mostrar ou ocultar API key">
                    <KeyRound className="w-4 h-4" />
                  </button>
                </div>
              </label>
              <button
                type="button"
                onClick={() => void connect()}
                disabled={status === 'connecting'}
                className="h-11 px-5 rounded-xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {status === 'connecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                {status === 'connecting' ? 'Conectando…' : 'Conectar Anki'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSetupOpen(open => !open)}
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <CircleHelp className="w-4 h-4" />
            Como conectar o AnkiConnect
            <ChevronDown className={`w-4 h-4 transition-transform ${setupOpen ? 'rotate-180' : ''}`} />
          </button>

          {setupOpen && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-5">
              <div className="grid lg:grid-cols-3 gap-4">
                <div>
                  <p className="font-bold text-slate-800">1. Instale o AnkiConnect</p>
                  <p className="mt-1">No Anki Desktop, instale o add-on AnkiConnect e deixe o Anki aberto.</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">2. Autorize o RiseGoat</p>
                  <p className="mt-1">Na primeira conexão, o Anki pode pedir autorização para o endereço do RiseGoat. Aceite a permissão.</p>
                </div>
                <div>
                  <p className="font-bold text-slate-800">3. API key</p>
                  <p className="mt-1">Caso você tenha configurado uma API key no AnkiConnect, informe-a aqui. Ela não é salva pelo RiseGoat.</p>
                </div>
              </div>
              <a
                href="https://github.com/amikey/anki-connect"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-slate-700 font-semibold hover:underline"
              >
                Documentação do AnkiConnect <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </Card>

        {!data ? (
          <Card className="p-8 sm:p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <Brain className="w-6 h-6 text-slate-500" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Seu painel de estudos começa aqui.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 max-w-xl mx-auto">
              Conecte o Anki para trazer os dados reais da sua coleção. O painel foi pensado como leitura/analytics: ele consulta o Anki e não altera seus cartões.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
              <StatCard icon={Check} label="Revisões hoje" value={formatNumber(data.reviewedToday)} note="cards revisados hoje" />
              <StatCard icon={Flame} label="Sequência" value={`${summary?.streak || 0} dias`} note="dias consecutivos com revisão" />
              <StatCard icon={AlertCircle} label="Pendentes" value={formatNumber(data.due)} note="cards marcados como due" />
              <StatCard icon={Brain} label="Cards na coleção" value={formatNumber(summary?.total || 0)} note={`${data.decks.length} decks carregados`} />
            </div>

            <div className="grid xl:grid-cols-[1.35fr_0.65fr] gap-5 mb-5">
              <Card className="p-5 sm:p-6">
                <div className="flex items-end justify-between gap-3 mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Ritmo</p>
                    <h2 className="text-lg font-black text-slate-950 mt-1">Revisões nos últimos 7 dias</h2>
                  </div>
                  <span className="text-[11px] text-slate-400">Atualizado direto do Anki</span>
                </div>
                <div className="grid grid-cols-7 gap-2 h-48 items-end">
                  {chart.map(item => (
                    <div key={item.key} className="h-full flex flex-col items-center justify-end gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">{item.value ? formatNumber(item.value) : '—'}</span>
                      <div className="w-full max-w-12 h-32 bg-slate-100 rounded-xl flex items-end overflow-hidden">
                        <div
                          className="w-full rounded-xl bg-slate-950 transition-all"
                          style={{ height: `${Math.max(5, Math.round((item.value / summary!.maxDay) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] capitalize text-slate-400">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center"><BarChart3 className="w-4 h-4" /></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Carga atual</p>
                    <h2 className="text-lg font-black text-slate-950 mt-1">Estado da coleção</h2>
                  </div>
                </div>
                <div className="space-y-4 mt-6">
                  {[
                    ['Novos', data.newCards, 'Ainda não revisados'],
                    ['Aprendendo', data.learning, 'Em processo de aprendizagem'],
                    ['Revisão', data.review, 'Cards em revisão'],
                    ['Due', data.due, 'Pendentes neste momento'],
                  ].map(([label, value, note]) => (
                    <div key={String(label)}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-700">{label}</span>
                        <span className="text-xs font-bold text-slate-950">{formatNumber(Number(value))}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.min(100, (Number(value) / Math.max(1, summary!.total)) * 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{note}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Coleção</p>
                  <h2 className="text-lg font-black text-slate-950 mt-1">Decks</h2>
                  <p className="text-xs text-slate-400 mt-1">Até 30 decks são detalhados por conexão.</p>
                </div>
                <select
                  value={selectedDeck}
                  onChange={e => setSelectedDeck(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="all">Todos os decks</option>
                  {data.decks.map(deck => <option key={deck.id} value={deck.name}>{deck.name}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Deck</th>
                      <th className="px-5 py-3 text-right">Total</th>
                      <th className="px-5 py-3 text-right">Due</th>
                      <th className="px-5 py-3 text-right">Novos</th>
                      <th className="px-5 py-3 text-right">Aprendendo</th>
                      <th className="px-5 py-3 text-right">Revisão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleDecks.map(deck => (
                      <tr key={deck.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-semibold text-slate-800">{deck.name}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-700">{formatNumber(deck.total)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-950">{formatNumber(deck.due)}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatNumber(deck.new)}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatNumber(deck.learning)}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatNumber(deck.review)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {visibleDecks.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">Nenhum deck disponível.</div>
              )}
            </Card>

            <div className="mt-5 grid md:grid-cols-2 gap-5">
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Conexão</p>
                    <p className="text-sm font-bold text-slate-800">{normalizeAnkiUrl(endpoint)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">AnkiConnect v{connection?.version || 6} · API key {connection?.requireApiKey ? 'ativada' : 'não exigida'}</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Próxima camada</p>
                    <p className="text-sm font-bold text-slate-800">Retenção, dificuldade e evolução por deck</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">A base de integração já está preparada para ampliar os analytics sem alterar seus cartões.</p>
              </Card>
            </div>
          </>
        )}

        <div className="mt-5 text-[11px] leading-5 text-slate-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>O AnkiConnect roda localmente no seu computador e, por padrão, atende em 127.0.0.1:8765. Para um app web chamar esse serviço, o AnkiConnect precisa permitir a origem do RiseGoat via CORS/permissão.</span>
        </div>
      </div>
    </div>
  );
}

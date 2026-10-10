#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const providerIndex = args.indexOf('--provider');
const providerArg = args.find((arg) => arg.startsWith('--provider='))?.split('=')[1]
  ?? (providerIndex >= 0 ? args[providerIndex + 1] : 'all');
const dryRun = args.includes('--dry-run');
const providers = new Set(['forbes', 'wikidata', 'sec', 'opensecrets', 'propublica', 'conexoes', 'all']);
if (!providers.has(providerArg)) throw new Error('Provider inválido: ' + providerArg);

const rateLimitMs = Math.max(350, Number(process.env.TABULEIRO_RATE_LIMIT_MS || 900));
const checkpointPath = resolve(process.env.TABULEIRO_CHECKPOINT || '.cache/tabuleiro-checkpoint.json');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourceNames = {
  wikidata: 'Wikidata',
  sec: 'SEC EDGAR',
  opensecrets: 'OpenSecrets',
  propublica: 'ProPublica Nonprofit Explorer',
};
let supabase = null;
let checkpoint = {};

const wait = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
const normalize = (value) => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110);
const source = (name, url) => ({ nome: String(name || 'Fonte'), url: String(url || '') });

function db() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY apenas no ambiente local. Nunca use a chave service role no frontend.');
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

async function loadCheckpoint() {
  try {
    checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'));
  } catch {
    checkpoint = {};
  }
}

async function saveCheckpoint() {
  await mkdir(dirname(checkpointPath), { recursive: true });
  await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

async function requestJson(url, extraHeaders = {}) {
  const headers = {
    'User-Agent': process.env.SEC_USER_AGENT || 'RiseGoat Tabuleiro contact: admin@risegoat.com',
    Accept: 'application/json',
    ...extraHeaders,
  };
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('HTTP ' + response.status + ' na fonte ' + new URL(url).origin);
  }
  return response.json();
}

async function listMagnates() {
  const { data, error } = await db().from('magnates')
    .select('id,nome,slug,pais,regiao,setor,sub_setor,patrimonio_faixa,patrimonio_estimado_musd,bio_curta,fonte_principal,fontes,tags,visivel_publico,tipo,atividade,foto_url')
    .order('nome').limit(1000);
  if (error) throw error;
  return data ?? [];
}

async function updateMagnate(id, changes, label) {
  if (dryRun) {
    console.log('[dry-run] Atualização planejada: ' + label);
    return;
  }
  const { error } = await db().from('magnates').update(changes).eq('id', id);
  if (error) throw error;
  console.log('Atualizado: ' + label);
}

async function upsertMagnate(record) {
  const name = String(record.nome || record.name || '').trim();
  const slug = slugify(record.slug || name);
  if (!name || !slug) {
    console.warn('Ignorando registro sem nome ou slug.');
    return;
  }
  const row = {
    nome: name,
    slug,
    foto_url: record.foto_url || record.photo || null,
    setor: record.setor || record.sector || 'outros',
    sub_setor: record.sub_setor || record.subsector || null,
    pais: record.pais || record.country || null,
    regiao: record.regiao || record.region || null,
    patrimonio_faixa: record.patrimonio_faixa || record.wealth_range || null,
    patrimonio_estimado_musd: record.patrimonio_estimado_musd ?? record.net_worth_musd ?? null,
    tipo: record.tipo || record.type || 'indefinido',
    atividade: record.atividade || record.activity || 'ativo',
    bio_curta: record.bio_curta || record.bio || null,
    fonte_principal: record.fonte_principal || record.primary_source || null,
    fontes: Array.isArray(record.fontes) ? record.fontes : (Array.isArray(record.sources) ? record.sources : []),
    tags: Array.isArray(record.tags) ? record.tags : [],
    visivel_publico: record.visivel_publico === true,
  };
  if (dryRun) {
    console.log('[dry-run] Importação planejada: ' + row.nome + ' (' + row.slug + ')');
    return;
  }
  const { error } = await db().from('magnates').upsert(row, { onConflict: 'slug' });
  if (error) throw error;
}

async function importForbes() {
  const inputFile = process.env.FORBES_DATA_FILE;
  let records;
  if (inputFile) {
    records = JSON.parse(await readFile(resolve(inputFile), 'utf8'));
  } else if (process.env.FORBES_DATA_URL) {
    records = await requestJson(process.env.FORBES_DATA_URL);
  } else {
    throw new Error('Configure FORBES_DATA_FILE com um export autorizado em JSON ou FORBES_DATA_URL com uma fonte autorizada. Este script não faz scraping de páginas protegidas.');
  }
  if (!Array.isArray(records)) throw new Error('O input da Forbes precisa ser um array JSON.');
  for (const record of records) {
    await upsertMagnate(record);
    await wait(rateLimitMs);
  }
  console.log('Fonte Forbes: processados ' + records.length + ' registros.');
}

async function enrichWikidata() {
  const people = await listMagnates();
  for (const person of people) {
    const key = 'wikidata:' + person.id;
    if (checkpoint[key]?.done) continue;
    const query = [
      'SELECT ?item ?itemLabel ?countryLabel WHERE {',
      '?item rdfs:label ' + JSON.stringify(person.nome) + '@en .',
      'OPTIONAL { ?item wdt:P27 ?country . }',
      'SERVICE wikibase:label { bd:serviceParam wikibase:language "en,pt". }',
      '} LIMIT 5',
    ].join(' ');
    try {
      const result = await requestJson(
        'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query) + '&format=json',
        { Accept: 'application/sparql-results+json' },
      );
      const rows = result?.results?.bindings ?? [];
      const match = rows.find((row) => normalize(row.itemLabel?.value) === normalize(person.nome));
      if (match?.item?.value) {
        const itemUrl = match.item.value;
        const references = Array.isArray(person.fontes) ? [...person.fontes] : [];
        if (!references.some((item) => item.url === itemUrl)) {
          references.push(source(sourceNames.wikidata, itemUrl));
        }
        const changes = { fontes: references };
        if (!person.pais && match.countryLabel?.value) changes.pais = match.countryLabel.value;
        await updateMagnate(person.id, changes, person.nome + ' / Wikidata');
      }
      checkpoint[key] = { done: true, at: new Date().toISOString() };
      await saveCheckpoint();
    } catch (error) {
      console.warn('Wikidata não concluído para ' + person.nome + ': ' + (error instanceof Error ? error.message : 'erro'));
    }
    await wait(rateLimitMs);
  }
}

async function enrichSec() {
  const { data: companies, error } = await db().from('magnate_empresas')
    .select('id,nome,magnate_id,tipo,fonte').limit(1000);
  if (error) throw error;
  const directory = await requestJson('https://www.sec.gov/files/company_tickers.json');
  const tickers = Object.values(directory);
  for (const company of companies ?? []) {
    const match = tickers.find((item) => normalize(item.title) === normalize(company.nome));
    if (!match) continue;
    const cik = String(match.cik_str).padStart(10, '0');
    const url = 'https://www.sec.gov/edgar/browse/?CIK=' + encodeURIComponent(cik);
    if (dryRun) {
      console.log('[dry-run] Correspondência SEC candidata: ' + company.nome);
    } else {
      const { error: updateError } = await db().from('magnate_empresas').update({ fonte: url }).eq('id', company.id);
      if (updateError) throw updateError;
      console.log('Fonte SEC associada: ' + company.nome);
    }
    await wait(rateLimitMs);
  }
}

async function enrichOpenSecrets() {
  const endpoint = process.env.OPENSECRETS_API_URL;
  const apiKey = process.env.OPENSECRETS_API_KEY;
  if (!endpoint || !apiKey) {
    throw new Error('Configure OPENSECRETS_API_URL e OPENSECRETS_API_KEY conforme a documentação/credenciais da sua conta OpenSecrets.');
  }
  for (const person of await listMagnates()) {
    const url = new URL(endpoint);
    url.searchParams.set('name', person.nome);
    url.searchParams.set('apikey', apiKey);
    const result = await requestJson(url.toString());
    const publicUrl = typeof result?.url === 'string' ? result.url : '';
    if (publicUrl) {
      const references = Array.isArray(person.fontes) ? [...person.fontes] : [];
      if (!references.some((item) => item.url === publicUrl)) {
        references.push(source(sourceNames.opensecrets, publicUrl));
        await updateMagnate(person.id, { fontes: references }, person.nome + ' / OpenSecrets');
      }
    }
    await wait(rateLimitMs);
  }
}

async function enrichPropublica() {
  const people = await listMagnates();
  for (const person of people) {
    const url = 'https://projects.propublica.org/nonprofits/api/v2/search.json?q=' + encodeURIComponent(person.nome);
    try {
      const result = await requestJson(url);
      const orgs = Array.isArray(result?.organizations) ? result.organizations : [];
      for (const organization of orgs.slice(0, 5)) {
        const name = String(organization.name || '').trim();
        const ein = String(organization.ein || '').trim();
        if (!name || !ein) continue;
        const sourceUrl = 'https://projects.propublica.org/nonprofits/organizations/' + encodeURIComponent(ein);
        if (dryRun) {
          console.log('[dry-run] Fundação candidata: ' + name + ' (' + person.nome + ')');
          continue;
        }
        const { error } = await db().from('magnate_empresas').upsert({
          magnate_id: person.id,
          nome: name,
          tipo: 'fundacao',
          fonte: sourceUrl,
        }, { onConflict: 'magnate_id,nome,tipo' });
        if (error) throw error;
      }
    } catch (error) {
      console.warn('ProPublica não concluiu ' + person.nome + ': ' + (error instanceof Error ? error.message : 'erro'));
    }
    await wait(rateLimitMs);
  }
}

async function importConnections() {
  const inputFile = process.env.TABULEIRO_INTERLOCKS_FILE;
  if (!inputFile) {
    throw new Error('Configure TABULEIRO_INTERLOCKS_FILE com JSON revisado: origemSlug, destinoSlug, tipo, fonte e campos opcionais forca, dataInicio e dataFim.');
  }
  const records = JSON.parse(await readFile(resolve(inputFile), 'utf8'));
  if (!Array.isArray(records)) throw new Error('O arquivo de conexões precisa ser um array JSON.');
  const people = await listMagnates();
  const bySlug = new Map(people.map((person) => [person.slug, person.id]));
  for (const item of records) {
    const origin = bySlug.get(item.origemSlug);
    const target = bySlug.get(item.destinoSlug);
    if (!origin || !target || origin === target || !item.fonte || !item.tipo) {
      console.warn('Ignorando conexão sem pessoas válidas, sem tipo ou sem fonte verificável.');
      continue;
    }
    const row = {
      origem_id: origin,
      destino_id: target,
      tipo: item.tipo,
      fonte: item.fonte,
      forca: item.forca ?? null,
      data_inicio: item.dataInicio ?? null,
      data_fim: item.dataFim ?? null,
    };
    if (dryRun) {
      console.log('[dry-run] Conexão planejada: ' + item.origemSlug + ' -> ' + item.destinoSlug);
    } else {
      const { error } = await db().from('magnate_conexoes').upsert(row, { onConflict: 'origem_id,destino_id,tipo' });
      if (error) throw error;
    }
    await wait(rateLimitMs);
  }
}

async function main() {
  await loadCheckpoint();
  const selected = providerArg === 'all'
    ? ['forbes', 'wikidata', 'sec', 'opensecrets', 'propublica', 'conexoes']
    : [providerArg];
  const handlers = {
    forbes: importForbes,
    wikidata: enrichWikidata,
    sec: enrichSec,
    opensecrets: enrichOpenSecrets,
    propublica: enrichPropublica,
    conexoes: importConnections,
  };
  const failures = [];
  for (const provider of selected) {
    console.log('\n[' + provider + '] Iniciando' + (dryRun ? ' (dry-run)' : '') + '…');
    try {
      if (provider !== 'forbes' || !(process.env.FORBES_DATA_FILE || process.env.FORBES_DATA_URL)) {
        // DB-backed providers need the admin-only key; import preview data can be checked without it.
        db();
      }
      await handlers[provider]();
    } catch (error) {
      failures.push(provider);
      console.error('[' + provider + '] ' + (error instanceof Error ? error.message : 'falha desconhecida'));
    }
  }
  await saveCheckpoint();
  console.log('\nTabuleiro finalizado. Falhas: ' + (failures.length ? failures.join(', ') : 'nenhuma') + '.');
  if (failures.length) process.exitCode = 1;
}

await main();

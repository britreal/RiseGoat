#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createOfflineAdminClient } from './_lib/admin-client.mjs';
import { parseCsv,getField,cleanSlug } from './_lib/csv.mjs';

const file=process.argv[2];
if(!file){console.error('Uso: node scripts/tabuleiro/import-forbes-csv.mjs <csv-autorizado> [--publish-approved]');process.exit(2)}
const allowPublish=process.argv.includes('--publish-approved');
const sectorAliases={
  technology:'tech',technology:'tech',tech:'tech',finance:'financas',financial:'financas',financas:'financas',financeiro:'financas',
  realestate:'imobiliario',real_estate:'imobiliario',imobiliario:'imobiliario',energy:'energia',energia:'energia',
  industrial:'industria',industry:'industria',industria:'industria',media:'midia',midia:'midia',healthcare:'saude',saude:'saude',
  retail:'varejo',varejo:'varejo',logistics:'logistica',logistica:'logistica',agriculture:'agro',agro:'agro',education:'educacao',educacao:'educacao',
};
const wealthBands=new Set(['<1B','1-10B','10-50B','50-100B','100B+']);
const validTypes=new Set(['self-made','herdeiro','familia','estatal','indefinido']);
function numericMillions(value){
  if(!value)return null;
  const digits=value.replace(/[$,\s]/g,'').replace(/usd/ig,'');
  const number=Number(digits);
  if(!Number.isFinite(number)||number<=0)return null;
  return number>1000000?number/1000000:number;
}
const rows=parseCsv(readFileSync(file,'utf8'));
if(!rows.length){console.error('O CSV não contém registros.');process.exit(2)}
const payload=[];
for(const row of rows){
  const nome=getField(row,['name','nome','person']);
  if(!nome)continue;
  const slug=cleanSlug(getField(row,['slug'])||nome);
  const sectorRaw=getField(row,['sector','setor']).toLowerCase().replace(/[\s-]+/g,'');
  const setor=sectorAliases[sectorRaw]||'outros';
  const sourceUrl=getField(row,['source_url','fonte_principal','url']);
  if(sourceUrl&&!/^https?:\/\//i.test(sourceUrl)){console.warn('Pulando fonte inválida para '+nome);continue}
  const wealthRaw=getField(row,['wealth_band','patrimonio_faixa']);
  const band=wealthBands.has(wealthRaw)?wealthRaw:null;
  const sources=sourceUrl?[{title:getField(row,['source_title','fonte_nome'])||'Fonte importada',url:sourceUrl,review_status:'pending'}]:[];
  const reviewed=getField(row,['curadoria_aprovada','reviewed','approved']).toLowerCase();
  payload.push({
    nome,slug,foto_url:getField(row,['photo_url','foto_url'])||null,setor,
    sub_setor:getField(row,['subsector','sub_setor'])||null,
    pais:getField(row,['country','pais','país'])||null,
    regiao:getField(row,['region','regiao'])||null,
    patrimonio_faixa:band,
    patrimonio_estimado_musd:numericMillions(getField(row,['net_worth_usd','patrimonio_usd','wealth_usd'])),
    tipo:validTypes.has(getField(row,['type','tipo']))?getField(row,['type','tipo']):'indefinido',
    atividade:'ativo',
    bio_curta:getField(row,['bio','bio_curta','biography'])||null,
    fonte_principal:sourceUrl||null,fontes:sources,
    tags:getField(row,['tags']).split(/[;|]/).map(tag=>tag.trim()).filter(Boolean).slice(0,30),
    visivel_publico:Boolean(allowPublish&&['true','yes','sim','1'].includes(reviewed)),
  });
}
if(!payload.length){console.error('Nenhum nome válido foi encontrado.');process.exit(2)}
const db=createOfflineAdminClient();
for(let start=0;start<payload.length;start+=50){
  const batch=payload.slice(start,start+50);
  const {error}=await db.from('magnates').upsert(batch,{onConflict:'slug'});
  if(error)throw error;
  console.log('Importados '+Math.min(start+batch.length,payload.length)+' / '+payload.length+' perfis');
}
console.log('Importação concluída. Perfis públicos: '+payload.filter(row=>row.visivel_publico).length+'. Os demais ficam privados até curadoria.');

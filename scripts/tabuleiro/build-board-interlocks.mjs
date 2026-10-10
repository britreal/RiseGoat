#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createOfflineAdminClient } from './_lib/admin-client.mjs';
import { parseCsv,getField,normalizeName } from './_lib/csv.mjs';

const file=process.argv[2];
if(!file){console.error('Uso: node scripts/tabuleiro/build-board-interlocks.mjs <board-memberships.csv> [--approve-reviewed]');process.exit(2)}
const approveReviewed=process.argv.includes('--approve-reviewed');
const rows=parseCsv(readFileSync(file,'utf8'));
const db=createOfflineAdminClient();
const [{data:people,error:peopleError},{data:existingEdges,error:edgesError}]=await Promise.all([
  db.from('magnates').select('id,slug,nome').limit(5000),
  db.from('magnate_conexoes').select('origem_id,destino_id,tipo').eq('tipo','board_interlock').limit(10000),
]);
if(peopleError)throw peopleError;if(edgesError)throw edgesError;
const peopleBySlug=new Map((people||[]).map(person=>[person.slug,person]));
const seats=[];
for(const row of rows){
  const slug=getField(row,['person_slug','slug']);
  const person=peopleBySlug.get(slug);
  const company=getField(row,['company_name','empresa','company']);
  const source=getField(row,['source_url','fonte_url','source']);
  if(!person||!company||!/^https?:\/\//i.test(source)){
    console.warn('Linha ignorada: perfil não encontrado, empresa vazia ou fonte inválida. Slug='+slug);
    continue;
  }
  const start=getField(row,['start_date','data_inicio'])||null;
  const end=getField(row,['end_date','data_fim'])||null;
  const reviewed=getField(row,['reviewed','curadoria_aprovada','status']).toLowerCase();
  const status=approveReviewed&&['true','yes','sim','verified','verificado'].includes(reviewed)?'verificado':'sugerido';
  seats.push({
    empresa_nome:company.trim(),
    empresa_slug:normalizeName(company).replace(/\s+/g,'-'),
    magnate_id:person.id,
    cargo:getField(row,['role','cargo'])||'conselheiro',
    fonte_url:source,
    data_inicio:start,
    data_fim:end,
    curadoria_status:status,
    revisado_em:status==='verificado'?new Date().toISOString():null,
  });
}
for(let start=0;start<seats.length;start+=50){
  const batch=seats.slice(start,start+50);
  const {error}=await db.from('magnate_empresa_conselheiros').upsert(batch,{onConflict:'empresa_slug,magnate_id,cargo'});
  if(error)throw error;
}
const {data:verified,error:verifiedError}=await db.from('magnate_empresa_conselheiros')
  .select('id,empresa_nome,empresa_slug,magnate_id,cargo,fonte_url,data_inicio,data_fim')
  .eq('curadoria_status','verificado').limit(10000);
if(verifiedError)throw verifiedError;
const groups=new Map();
for(const seat of verified||[]){
  if(!seat.data_inicio)continue;
  const group=groups.get(seat.empresa_slug)||[];group.push(seat);groups.set(seat.empresa_slug,group);
}
function overlap(a,b){
  const startA=new Date(a.data_inicio),startB=new Date(b.data_inicio);
  const endA=a.data_fim?new Date(a.data_fim):new Date('9999-12-31');
  const endB=b.data_fim?new Date(b.data_fim):new Date('9999-12-31');
  const start=startA>startB?startA:startB;
  const end=endA<endB?endA:endB;
  return start<=end?{start:start.toISOString().slice(0,10),end:end.getUTCFullYear()===9999?null:end.toISOString().slice(0,10)}:null;
}
const existing=new Set((existingEdges||[]).map(edge=>[edge.origem_id,edge.destino_id].sort().join(':')));
let created=0,possible=0;
for(const [companySlug,group] of groups){
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
    const a=group[i],b=group[j];if(a.magnate_id===b.magnate_id)continue;
    const interval=overlap(a,b);if(!interval)continue;
    const pair=[a.magnate_id,b.magnate_id].sort(),key=pair.join(':');
    if(existing.has(key))continue;
    possible++;
    const {error}=await db.from('magnate_conexoes').insert({
      origem_id:pair[0],destino_id:pair[1],tipo:'board_interlock',forca:1,
      fonte:a.fonte_url+' | '+b.fonte_url,data_inicio:interval.start,data_fim:interval.end,
    });
    if(error)throw error;
    existing.add(key);created++;
  }
}
console.log('Assentos revisados/verificados: '+seats.length+'; novas conexões por interlock verificadas: '+created+'. Registros sugeridos nunca criam conexões automaticamente.');

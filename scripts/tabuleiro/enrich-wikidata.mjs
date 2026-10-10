#!/usr/bin/env node
import { createOfflineAdminClient } from './_lib/admin-client.mjs';
import { writePrivateReport } from './_lib/private-report.mjs';

const contact=process.env.RESEARCH_CONTACT;
if(!contact){console.error('Defina RESEARCH_CONTACT (e-mail/URL de contato) para o User-Agent do Wikidata.');process.exit(2)}
const db=createOfflineAdminClient();
const {data:people,error}=await db.from('magnates').select('id,nome,fontes').order('nome').limit(1000);
if(error)throw error;
const report={generated_at:new Date().toISOString(),provider:'Wikidata',matched:[],suggestions:[],errors:[]};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const person of people||[]){
  try{
    const url=new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action','wbsearchentities');url.searchParams.set('search',person.nome);
    url.searchParams.set('language','en');url.searchParams.set('uselang','en');url.searchParams.set('type','item');
    url.searchParams.set('limit','5');url.searchParams.set('format','json');
    const response=await fetch(url,{headers:{'User-Agent':'RiseGoatTabuleiroResearch/1.0 ('+contact+')','Accept':'application/json'}});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const body=await response.json();
    const candidates=(body.search||[]).map(row=>({id:row.id,label:row.label,description:row.description,url:'https://www.wikidata.org/wiki/'+row.id}));
    const exact=candidates.find(row=>row.label?.trim().toLowerCase()===person.nome.trim().toLowerCase());
    if(!exact){report.suggestions.push({id:person.id,nome:person.nome,candidates});await wait(950);continue}
    const sources=Array.isArray(person.fontes)?person.fontes:[];
    if(!sources.some(source=>typeof source==='object'&&source&&source.url===exact.url)){
      sources.push({title:'Wikidata · '+exact.label,url:exact.url,review_status:'suggested',retrieved_at:new Date().toISOString()});
      const {error:updateError}=await db.from('magnates').update({fontes:sources,atualizado_em:new Date().toISOString()}).eq('id',person.id);
      if(updateError)throw updateError;
    }
    report.matched.push({id:person.id,nome:person.nome,item:exact.url,description:exact.description||'',status:'source-added-for-review'});
  }catch(error){report.errors.push({id:person.id,nome:person.nome,error:String(error)})}
  await wait(950);
}
const output=writePrivateReport('wikidata-candidates-'+new Date().toISOString().slice(0,10)+'.json',report);
console.log('Matches com fonte sugerida: '+report.matched.length+'; candidatos para revisão: '+report.suggestions.length+'; erros: '+report.errors.length+'. Relatório local: '+output);

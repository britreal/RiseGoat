#!/usr/bin/env node
import { createOfflineAdminClient } from './_lib/admin-client.mjs';
import { normalizeName } from './_lib/csv.mjs';
import { writePrivateReport } from './_lib/private-report.mjs';

const contact=process.env.SEC_USER_AGENT||process.env.RESEARCH_CONTACT;
if(!contact||!contact.includes('@')){console.error('Defina SEC_USER_AGENT com nome do projeto e e-mail de contato válido.');process.exit(2)}
const db=createOfflineAdminClient();
const response=await fetch('https://www.sec.gov/files/company_tickers.json',{headers:{'User-Agent':contact,'Accept':'application/json'}});
if(!response.ok)throw new Error('SEC EDGAR retornou HTTP '+response.status);
const raw=await response.json();
const tickers=Object.values(raw).map(row=>({cik:String(row.cik_str).padStart(10,'0'),ticker:row.ticker,title:row.title,normalized:normalizeName(row.title)}));
const [{data:companies,error:companiesError},{data:people,error:peopleError}]=await Promise.all([
  db.from('magnate_empresas').select('id,magnate_id,nome,fonte').limit(5000),
  db.from('magnates').select('id,nome,fontes').limit(1000),
]);
if(companiesError)throw companiesError;if(peopleError)throw peopleError;
const peopleById=new Map((people||[]).map(person=>[person.id,person]));
const report={generated_at:new Date().toISOString(),matched:[],candidates:[],unmatched:[]};
for(const company of companies||[]){
  const normalized=normalizeName(company.nome);
  const exact=tickers.find(row=>row.normalized===normalized);
  if(!exact){report.unmatched.push({company_id:company.id,name:company.nome});continue}
  const url='https://www.sec.gov/edgar/browse/?CIK='+exact.cik;
  report.matched.push({company_id:company.id,company:company.nome,ticker:exact.ticker,cik:exact.cik,url});
  if(!company.fonte){
    const {error:updateError}=await db.from('magnate_empresas').update({fonte:url}).eq('id',company.id);
    if(updateError)throw updateError;
  }
  const person=peopleById.get(company.magnate_id);
  if(person){
    const sources=Array.isArray(person.fontes)?person.fontes:[];
    if(!sources.some(source=>typeof source==='object'&&source&&source.url===url)){
      sources.push({title:'SEC EDGAR · '+exact.title,url,review_status:'suggested',retrieved_at:new Date().toISOString()});
      const {error:updateError}=await db.from('magnates').update({fontes:sources,atualizado_em:new Date().toISOString()}).eq('id',person.id);
      if(updateError)throw updateError;
    }
  }
}
for(const person of people||[]){
  const normalized=normalizeName(person.nome);
  const candidates=tickers.filter(row=>row.normalized.includes(normalized)||normalized.includes(row.normalized)).slice(0,5);
  if(candidates.length)report.candidates.push({magnate_id:person.id,name:person.nome,candidates:candidates.map(row=>({title:row.title,ticker:row.ticker,cik:row.cik,url:'https://www.sec.gov/edgar/browse/?CIK='+row.cik}))});
}
const output=writePrivateReport('sec-edgar-review-'+new Date().toISOString().slice(0,10)+'.json',report);
console.log('Correspondências exatas: '+report.matched.length+'; candidatos para revisão manual: '+report.candidates.length+'. Não foram extraídos nomes de conselheiros automaticamente. Relatório: '+output);

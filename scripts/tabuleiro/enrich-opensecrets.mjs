#!/usr/bin/env node
import { createOfflineAdminClient } from './_lib/admin-client.mjs';
import { normalizeName } from './_lib/csv.mjs';
import { writePrivateReport } from './_lib/private-report.mjs';

const apiKey=process.env.OPEN_SECRETS_API_KEY;
if(!apiKey){console.error('Defina OPEN_SECRETS_API_KEY no gerenciador de segredos local. Nenhum dado foi consultado.');process.exit(2)}
const db=createOfflineAdminClient();
const [{data:companies,error:companyError},{data:people,error:peopleError}]=await Promise.all([
  db.from('magnate_empresas').select('id,magnate_id,nome').limit(500),
  db.from('magnates').select('id,nome').limit(500),
]);
if(companyError)throw companyError;if(peopleError)throw peopleError;
const companyNameSet=new Set((companies||[]).map(row=>normalizeName(row.nome)));
const report={generated_at:new Date().toISOString(),provider:'OpenSecrets API',matched_organizations:[],person_searches:[],errors:[]};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function attr(tag,key){const match=tag.match(new RegExp(key+'="([^"]*)"','i'));return match?match[1].replace(/&amp;/g,'&').replace(/&quot;/g,'"'):''}
async function call(method,params){
  const url=new URL('https://www.opensecrets.org/api/');
  url.searchParams.set('method',method);url.searchParams.set('apikey',apiKey);url.searchParams.set('output','xml');
  Object.entries(params).forEach(([key,value])=>url.searchParams.set(key,value));
  const response=await fetch(url,{headers:{'User-Agent':'RiseGoatTabuleiroResearch/1.0','Accept':'application/xml,text/xml,*/*'}});
  if(!response.ok)throw new Error('OpenSecrets HTTP '+response.status);
  return response.text();
}
for(const company of companies||[]){
  try{
    const xml=await call('getOrgs',{org:company.nome});
    const candidates=[...xml.matchAll(/<organization\b[^>]*\/?>/gi)].map(match=>({id:attr(match[0],'orgid'),name:attr(match[0],'orgname')}));
    const exact=candidates.find(row=>normalizeName(row.name)===normalizeName(company.nome));
    if(exact){
      const summary=await call('orgSummary',{org:exact.id,cycle:process.env.OPENSECRETS_CYCLE||'2024'});
      report.matched_organizations.push({
        company_id:company.id,magnate_id:company.magnate_id,company:company.nome,
        organization_id:exact.id,organization_name:exact.name,
        cycle:process.env.OPENSECRETS_CYCLE||'2024',
        review_status:'suggested',
        source_url:'https://www.opensecrets.org/api/?method=orgSummary&org='+encodeURIComponent(exact.id)+'&cycle='+(process.env.OPENSECRETS_CYCLE||'2024')+'&output=xml',
        api_result_summary:summary.slice(0,20000),
      });
    }
    await wait(800);
  }catch(error){report.errors.push({company:company.nome,error:String(error)})}
}
for(const person of people||[]){
  report.person_searches.push({magnate_id:person.id,name:person.nome,review_url:'https://www.opensecrets.org/search?q='+encodeURIComponent(person.nome),note:'Busca sugerida; não associar contribuições a uma pessoa sem validação por ID e período.'});
}
const output=writePrivateReport('opensecrets-review-'+new Date().toISOString().slice(0,10)+'.json',report);
console.log('Organizações com correspondência exata: '+report.matched_organizations.length+'; nomes para revisão: '+report.person_searches.length+'. Relatório local com status sugerido: '+output);

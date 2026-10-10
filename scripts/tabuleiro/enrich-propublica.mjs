#!/usr/bin/env node
import { createOfflineAdminClient } from './_lib/admin-client.mjs';
import { writePrivateReport } from './_lib/private-report.mjs';

const db=createOfflineAdminClient();
const {data:people,error}=await db.from('magnates').select('id,nome,pais').order('nome').limit(500);
if(error)throw error;
const report={generated_at:new Date().toISOString(),provider:'ProPublica Nonprofit Explorer API v2',candidates:[],errors:[]};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,400));
for(const person of people||[]){
  for(const term of [person.nome+' Foundation',person.nome+' philanthropy']){
    try{
      const url='https://projects.propublica.org/nonprofits/api/v2/search.json?q='+encodeURIComponent(term);
      const response=await fetch(url,{headers:{'Accept':'application/json'}});
      if(!response.ok)throw new Error('ProPublica HTTP '+response.status);
      const data=await response.json();
      for(const org of data.organizations||[]){
        report.candidates.push({
          magnate_id:person.id,person:person.nome,search_term:term,
          ein:String(org.ein||''),name:org.name,city:org.city,state:org.state,ntee_code:org.ntee_code,
          source_url:'https://projects.propublica.org/nonprofits/organizations/'+String(org.ein||''),
          review_status:'suggested',
          caution:'Nome semelhante não comprova vínculo de fundação ou controle; validar EIN, Form 990 e relação societária antes de importar.',
        });
      }
      await wait(400);
    }catch(error){report.errors.push({magnate_id:person.id,term,error:String(error)})}
  }
}
const unique=[...new Map(report.candidates.map(row=>[row.magnate_id+':'+row.ein,row])).values()];
report.candidates=unique;
const output=writePrivateReport('propublica-foundation-candidates-'+new Date().toISOString().slice(0,10)+'.json',report);
console.log('Candidatos encontrados: '+unique.length+'; relatório de revisão: '+output+'. Nenhuma organização foi automaticamente vinculada a um perfil.');

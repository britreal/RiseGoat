import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-cron-secret","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
async function send(apiKey:string,from:string,to:string,subject:string,html:string){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,html})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error('resend_http_'+response.status);
 return typeof result.id==='string'?result.id:null;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!serviceKey)return json(503,{error:'Serviço transacional não configurado.'});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:valid,error:tokenError}=await db.rpc('validate_purge_cron_secret',{p_candidate:req.headers.get('x-cron-secret')||''});
 if(tokenError||valid!==true)return json(401,{error:'Não autorizado.'});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return json(400,{error:'Pedido inválido.'})}
 if(body.action!=='member-invite-accepted'||typeof body.invite_id!=='string')return json(400,{error:'Evento inválido.'});
 const {data:invite,error:inviteError}=await db.from('member_access_invites').select('id,email,status,created_by,accepted_by,accepted_at').eq('id',body.invite_id).eq('status','accepted').maybeSingle();
 if(inviteError||!invite)return json(404,{error:'Convite aceito não encontrado.'});
 const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
 const recipients:Array<{kind:'welcome'|'accepted';to:string;subject:string;html:string}>=[];
 recipients.push({kind:'welcome',to:invite.email,subject:'Bem-vindo à RiseGoat',html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><h2>Bem-vindo à RiseGoat</h2><p>Seu convite foi aceito e seu acesso está ativo.</p><p>Comece pelo seu perfil na Rede. A visibilidade é opt-in, e suas notas pessoais continuam privadas até que você escolha compartilhá-las.</p><p><a href="https://risegoat.com/network">Abrir sua rede privada</a></p><hr><small>RiseGoat · Uma sala menor. Mais contexto.</small></div>'});
 if(invite.created_by){
  const {data:creator}=await db.auth.admin.getUserById(invite.created_by);
  if(creator.user?.email)recipients.push({kind:'accepted',to:creator.user.email,subject:'Seu convite RiseGoat foi aceito',html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><h2>Convite aceito</h2><p>O convite enviado para <strong>'+invite.email.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</strong> foi aceito.</p><p>Você pode continuar a curadoria e as apresentações diretamente na Rede.</p><p><a href="https://risegoat.com/network">Abrir a Rede</a></p><hr><small>RiseGoat · Mensagem automática</small></div>'});
 }
 if(!apiKey||!from){
  for(const recipient of recipients)await db.from('transactional_email_events').upsert({event_key:invite.id+':'+recipient.kind,invite_id:invite.id,email_type:recipient.kind,status:'failed',error_code:'provider_not_configured',metadata:{to_hash:null}},{onConflict:'event_key'});
  return json(503,{error:'RESEND_API_KEY e RESEND_FROM_EMAIL precisam estar configurados.'});
 }
 const results=[];
 for(const recipient of recipients){
  const eventKey=invite.id+':'+recipient.kind;
  const {data:existing}=await db.from('transactional_email_events').select('status').eq('event_key',eventKey).maybeSingle();
  if(existing?.status==='sent'){results.push({kind:recipient.kind,status:'already_sent'});continue}
  const {error:logError}=await db.from('transactional_email_events').upsert({event_key:eventKey,invite_id:invite.id,email_type:recipient.kind,status:'sending',error_code:null,metadata:{}},{onConflict:'event_key'});
  if(logError){results.push({kind:recipient.kind,status:'log_failed'});continue}
  try{
   const id=await send(apiKey,from,recipient.to,recipient.subject,recipient.html);
   await db.from('transactional_email_events').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:id,error_code:null}).eq('event_key',eventKey);
   results.push({kind:recipient.kind,status:'sent'});
  }catch(error){
   await db.from('transactional_email_events').update({status:'failed',error_code:String(error).slice(0,80)}).eq('event_key',eventKey);
   results.push({kind:recipient.kind,status:'failed'});
  }
 }
 return json(results.some(x=>x.status==='failed'||x.status==='log_failed')?502:200,{invite_id:invite.id,emails:results});
});

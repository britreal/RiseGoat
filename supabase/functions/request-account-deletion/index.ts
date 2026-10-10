import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"https://risegoat.com","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Vary":"Origin"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const resendKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!url||!serviceKey)return json(503,{error:'Serviço de exclusão não configurado.'});
 if(!resendKey||!from)return json(503,{error:'O e-mail transacional ainda não está configurado. Nenhuma solicitação foi registrada.'});
 const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();
 if(!jwt)return json(401,{error:'Entre na conta para continuar.'});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userResult,error:userError}=await db.auth.getUser(jwt);
 if(userError||!userResult.user)return json(401,{error:'Sessão inválida ou expirada.'});
 const user=userResult.user;
 let body:Record<string,unknown>;try{body=await req.json()}catch{return json(400,{error:'Pedido inválido.'})}
 if(body.confirmation!=='EXCLUIR MINHA CONTA')return json(400,{error:'A confirmação em duas etapas não foi concluída.'});
 const email=(user.email||'').trim().toLowerCase();
 if(!email)return json(400,{error:'A conta não tem um e-mail para confirmação.'});
 const {data:existing,error:existingError}=await db.from('account_deletion_requests').select('id,status,scheduled_delete_at').eq('user_id',user.id).in('status',['pending','processing']).order('requested_at',{ascending:false}).limit(1).maybeSingle();
 if(existingError)return json(500,{error:'Não foi possível verificar solicitações anteriores.'});
 if(existing?.status==='pending')return json(200,{request_id:existing.id,scheduled_delete_at:existing.scheduled_delete_at,already_pending:true});
 if(existing?.status==='processing')return json(409,{error:'A exclusão já está sendo processada.'});
 const {data:adminRow,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
 if(adminError)return json(500,{error:'Não foi possível verificar as permissões administrativas.'});
 if(adminRow){
   const {count,error:countError}=await db.from('admin_users').select('user_id',{count:'exact',head:true});
   if(countError)return json(500,{error:'Não foi possível validar administradores.'});
   if((count||0)<=1)return json(409,{error:'Esta é a última conta administrativa. Promova outro administrador antes de excluí-la.'});
 }
 const now=new Date(),due=new Date(now.getTime()+30*24*60*60*1000);
 const {data:request,error:insertError}=await db.from('account_deletion_requests').insert({user_id:user.id,email,status:'pending',requested_at:now.toISOString(),scheduled_delete_at:due.toISOString(),metadata:{source:'settings',confirmation:'two_step'}}).select('id,scheduled_delete_at').single();
 if(insertError)return json(500,{error:'Não foi possível registrar a solicitação.'});
 const date=due.toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short',timeZone:'America/Sao_Paulo'});
 const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><h2>Solicitação de exclusão registrada</h2><p>Recebemos sua solicitação de exclusão da conta RiseGoat. O acesso aos dados pessoais fica bloqueado e a exclusão definitiva está prevista para <strong>'+esc(date)+'</strong>.</p><p>Você pode cancelar dentro do período de carência em <a href="https://risegoat.com/settings/delete-account">risegoat.com/settings/delete-account</a>.</p><p>Se não reconhece esta solicitação, entre na conta e cancele imediatamente.</p><hr><small>RiseGoat · Mensagem automática de segurança</small></div>';
 try{
   const mail=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Confirmação de exclusão da conta RiseGoat',html})});
   if(!mail.ok){await db.from('account_deletion_requests').delete().eq('id',request.id).eq('status','pending');return json(502,{error:'O provedor de e-mail não confirmou o envio. Sua solicitação foi revertida; a conta continua ativa.'})}
 }catch{
   await db.from('account_deletion_requests').delete().eq('id',request.id).eq('status','pending');
   return json(502,{error:'O e-mail de confirmação falhou. Sua solicitação foi revertida; a conta continua ativa.'});
 }
 await db.from('account_deletion_requests').update({request_email_sent_at:new Date().toISOString()}).eq('id',request.id);
 return json(200,{request_id:request.id,scheduled_delete_at:request.scheduled_delete_at});
});

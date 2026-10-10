import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers={"Access-Control-Allow-Origin":"https://risegoat.com","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Vary":"Origin"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
  const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey=Deno.env.get('RESEND_API_KEY'),fromEmail=Deno.env.get('RESEND_FROM_EMAIL');
  if(!url||!serviceKey)return json(503,{error:'Serviço de compartilhamento não configurado.'});
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!jwt)return json(401,{error:'Entre na conta para compartilhar uma nota.'});
  const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:authData,error:authError}=await db.auth.getUser(jwt);
  if(authError||!authData.user)return json(401,{error:'Sessão inválida ou expirada.'});
  let body:Record<string,unknown>;try{body=await req.json()}catch{return json(400,{error:'Pedido inválido.'})}
  if(typeof body.invite_id!=='string')return json(400,{error:'Convite inválido.'});

  const {data:invite,error:inviteError}=await db.from('note_share_invites')
    .select('id,note_id,email,role,token,expires_at,accepted_at,inviter_id')
    .eq('id',body.invite_id).eq('inviter_id',authData.user.id).is('accepted_at',null).maybeSingle();
  if(inviteError||!invite)return json(404,{error:'Convite pendente não encontrado.'});
  if(new Date(invite.expires_at).getTime()<=Date.now()){
    return json(410,{error:'Este convite expirou. Crie outro convite para compartilhar a nota.'});
  }
  const {data:note,error:noteError}=await db.from('notes').select('id,user_id').eq('id',invite.note_id).maybeSingle();
  if(noteError||!note||note.user_id!==authData.user.id)return json(403,{error:'Você não pode enviar convite para esta nota.'});
  const {error:logError}=await db.from('note_share_email_events').upsert({event_key:invite.id,status:'sending',error_code:null,provider_message_id:null,updated_at:new Date().toISOString()},{onConflict:'event_key'});
  if(logError){
    await db.from('note_share_invites').update({expires_at:new Date(0).toISOString()}).eq('id',invite.id).eq('inviter_id',authData.user.id);
    return json(500,{error:'Não foi possível registrar o envio. O convite foi expirado.'});
  }

  if(!resendKey||!fromEmail){
    await db.from('note_share_email_events').update({status:'failed',error_code:'provider_not_configured',updated_at:new Date().toISOString()}).eq('event_key',invite.id);
    await db.from('note_share_invites').update({expires_at:new Date(0).toISOString()}).eq('id',invite.id).eq('inviter_id',authData.user.id);
    return json(503,{error:'RESEND_API_KEY e RESEND_FROM_EMAIL precisam estar configurados. O convite foi expirado para não ficar pendente sem entrega.'});
  }
  const {data:registered,error:registeredError}=await db.rpc('auth_email_exists',{p_email:invite.email});
  if(registeredError){
    await db.from('note_share_email_events').update({status:'failed',error_code:'auth_email_lookup_failed',updated_at:new Date().toISOString()}).eq('event_key',invite.id);
    await db.from('note_share_invites').update({expires_at:new Date(0).toISOString()}).eq('id',invite.id).eq('inviter_id',authData.user.id);
    return json(500,{error:'Não foi possível preparar o link seguro. O convite foi expirado.'});
  }
  const redirectTo='https://risegoat.com/notes?invite='+encodeURIComponent(invite.token);
  const {data:linkData,error:linkError}=await db.auth.admin.generateLink({
    type:registered?'magiclink':'invite',
    email:invite.email,
    options:{redirectTo}
  });
  const actionLink=linkData?.properties?.action_link;
  if(linkError||!actionLink){
    await db.from('note_share_email_events').update({status:'failed',error_code:'auth_link_generation_failed',updated_at:new Date().toISOString()}).eq('event_key',invite.id);
    await db.from('note_share_invites').update({expires_at:new Date(0).toISOString()}).eq('id',invite.id).eq('inviter_id',authData.user.id);
    return json(502,{error:'Não foi possível gerar o link de autenticação. O convite foi expirado.'});
  }
  const permission=invite.role==='editor'?'pode editar a nota':'pode ler a nota';
  const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><p style="color:#777;font-size:11px;letter-spacing:2px">RISEGOAT · NOTAS</p><h2>Uma nota foi compartilhada com você</h2><p>Um membro da RiseGoat convidou este e-mail para acessar uma nota pessoal. Você '+permission+'.</p><p>Use o link seguro para entrar e aceitar o convite. O título e o conteúdo da nota não são incluídos neste e-mail.</p><p><a href="'+esc(actionLink)+'" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#191a17;color:#fff;text-decoration:none;font-weight:bold">Abrir convite</a></p><p>O convite é válido até '+new Date(invite.expires_at).toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short',timeZone:'America/Sao_Paulo'})+'. O link de autenticação pode expirar antes, conforme a configuração do Auth.</p><hr><small>RiseGoat · Conteúdo privado por padrão</small></div>';
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},
      body:JSON.stringify({from:fromEmail,to:[invite.email],subject:'Você recebeu um convite para uma nota RiseGoat',html})
    });
    if(!response.ok){
      await db.from('note_share_email_events').update({status:'failed',error_code:'resend_delivery_failed',updated_at:new Date().toISOString()}).eq('event_key',invite.id);
      await db.from('note_share_invites').update({expires_at:new Date(0).toISOString()}).eq('id',invite.id).eq('inviter_id',authData.user.id);
      return json(502,{error:'O provedor não confirmou o envio. O convite foi expirado.'});
    }
    const delivery=await response.json().catch(()=>({}));
    await db.from('note_share_email_events').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:typeof delivery.id==='string'?delivery.id:null,error_code:null,updated_at:new Date().toISOString()}).eq('event_key',invite.id);
  }catch{
    await db.from('note_share_email_events').update({status:'failed',error_code:'resend_network_error',updated_at:new Date().toISOString()}).eq('event_key',invite.id);
    await db.from('note_share_invites').update({expires_at:new Date(0).toISOString()}).eq('id',invite.id).eq('inviter_id',authData.user.id);
    return json(502,{error:'Falha no envio do e-mail. O convite foi expirado.'});
  }
  return json(200,{sent:true,role:invite.role,expires_at:invite.expires_at});
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers={
  "Access-Control-Allow-Origin":"https://risegoat.com",
  "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Vary":"Origin"
};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function hashHex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(value=>value.toString(16).padStart(2,'0')).join('')}
async function revokeInvite(db:ReturnType<typeof createClient>,inviteId:string,signupId:string){
  await db.from('member_access_invites').update({status:'revoked'}).eq('id',inviteId).eq('status','sent');
  await db.from('waitlist_signups').update({status:'approved'}).eq('id',signupId).eq('status','invited');
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
  const url=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey=Deno.env.get('RESEND_API_KEY');
  const fromEmail=Deno.env.get('RESEND_FROM_EMAIL');
  if(!url||!serviceKey)return json(503,{error:'Serviço de convites não configurado.'});

  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!jwt)return json(401,{error:'Entre com uma conta administradora.'});
  const db=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:authData,error:authError}=await db.auth.getUser(jwt);
  if(authError||!authData.user)return json(401,{error:'Sessão inválida ou expirada.'});
  const userId=authData.user.id;
  const [{data:admin},{data:legacyAdmin}]=await Promise.all([
    db.from('admin_users').select('user_id').eq('user_id',userId).maybeSingle(),
    db.from('app_admins').select('user_id').eq('user_id',userId).maybeSingle(),
  ]);
  if(!admin&&!legacyAdmin)return json(403,{error:'Acesso restrito ao administrador.'});

  let body:Record<string,unknown>;
  try{body=await req.json()}catch{return json(400,{error:'Pedido inválido.'})}
  if(typeof body.invite_id!=='string'||typeof body.invite_token!=='string'||body.invite_token.length<32)
    return json(400,{error:'Convite inválido.'});

  const {data:invite,error:inviteError}=await db.from('member_access_invites')
    .select('id,waitlist_signup_id,email,token_hash,status,expires_at')
    .eq('id',body.invite_id).eq('status','sent').maybeSingle();
  if(inviteError||!invite)return json(404,{error:'Convite pendente não encontrado.'});
  if(new Date(invite.expires_at).getTime()<=Date.now()){
    await db.from('member_access_invites').update({status:'expired'}).eq('id',invite.id);
    await db.from('waitlist_signups').update({status:'approved'}).eq('id',invite.waitlist_signup_id).eq('status','invited');
    return json(410,{error:'Este convite expirou. Emita um novo convite.'});
  }
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.invite_token));
  if(hashHex(digest)!==invite.token_hash)return json(403,{error:'O token não corresponde ao convite.'});

  if(!resendKey||!fromEmail){
    await revokeInvite(db,invite.id,invite.waitlist_signup_id);
    return json(503,{error:'RESEND_API_KEY e RESEND_FROM_EMAIL precisam estar configurados. O convite foi revogado e a solicitação voltou à fila.'});
  }

  const {data:registered,error:registeredError}=await db.rpc('auth_email_exists',{p_email:invite.email});
  if(registeredError){
    await revokeInvite(db,invite.id,invite.waitlist_signup_id);
    return json(500,{error:'Não foi possível preparar o link seguro. O convite foi revogado.'});
  }
  const redirectTo='https://risegoat.com/notes?membership_invite='+encodeURIComponent(body.invite_token);
  const {data:linkData,error:linkError}=await db.auth.admin.generateLink({
    type:registered?'magiclink':'invite',
    email:invite.email,
    options:{redirectTo}
  });
  const actionLink=linkData?.properties?.action_link;
  if(linkError||!actionLink){
    await revokeInvite(db,invite.id,invite.waitlist_signup_id);
    return json(502,{error:'Não foi possível gerar o link de autenticação. O convite foi revogado.'});
  }

  const {data:signup}=await db.from('waitlist_signups').select('name').eq('id',invite.waitlist_signup_id).maybeSingle();
  const displayName=typeof signup?.name==='string'?signup.name:'';
  const safeName=esc(displayName||'');
  const subject=registered?'Seu link seguro de acesso à RiseGoat':'Seu convite para a RiseGoat';
  const html='<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><p style="color:#777;font-size:11px;letter-spacing:2px">RISEGOAT · REDE PRIVADA</p><h2>'+(registered?'Entre na sua rede privada':'Você recebeu um convite')+'</h2><p>Olá'+(safeName?', '+safeName:'')+'.</p><p>'+(registered?'Use este link seguro para entrar na RiseGoat.':'Sua solicitação foi aprovada. Este link confirma seu convite e ativa seu acesso à RiseGoat.')+'</p><p><a href="'+esc(actionLink)+'" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#191a17;color:#fff;text-decoration:none;font-weight:bold">Entrar na RiseGoat</a></p><p>O convite expira em '+new Date(invite.expires_at).toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short',timeZone:'America/Sao_Paulo'})+'. O link de autenticação pode expirar antes, conforme as configurações de autenticação.</p><p>Se você não esperava esta mensagem, ignore o e-mail. Nenhuma nota pessoal é compartilhada automaticamente.</p><hr><small>RiseGoat · Uma sala menor. Mais contexto.</small></div>';

  try{
    const mail=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},
      body:JSON.stringify({from:fromEmail,to:[invite.email],subject,html})
    });
    if(!mail.ok){
      await revokeInvite(db,invite.id,invite.waitlist_signup_id);
      return json(502,{error:'O provedor de e-mail não confirmou o envio. O convite foi revogado e a solicitação voltou à fila.'});
    }
  }catch{
    await revokeInvite(db,invite.id,invite.waitlist_signup_id);
    return json(502,{error:'Não foi possível enviar o e-mail. O convite foi revogado e a solicitação voltou à fila.'});
  }
  return json(200,{sent:true,registered:Boolean(registered),expires_at:invite.expires_at});
});

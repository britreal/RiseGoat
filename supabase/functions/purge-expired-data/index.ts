import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-cron-secret","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers});
const chunks=<T,>(items:T[],size:number)=>Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,(i+1)*size));
type FileRow={file_path:string|null};
async function pathsForUser(db:SupabaseClient,userId:string,noteIds:string[]){
 const paths:string[]=[];
 for(let offset=0;offset<10000;offset+=500){const {data,error}=await db.from('note_attachments').select('file_path').eq('user_id',userId).range(offset,offset+499);if(error)throw error;paths.push(...((data||[]) as FileRow[]).map(x=>x.file_path).filter((x):x is string=>Boolean(x)));if(!data||data.length<500)break}
 for(const ids of chunks(noteIds,100))for(let offset=0;offset<10000;offset+=500){const {data,error}=await db.from('note_attachments').select('file_path').in('note_id',ids).range(offset,offset+499);if(error)throw error;paths.push(...((data||[]) as FileRow[]).map(x=>x.file_path).filter((x):x is string=>Boolean(x)));if(!data||data.length<500)break}
 return [...new Set(paths)];
}
async function removeFiles(db:SupabaseClient,paths:string[]){
 for(const part of chunks(paths,100)){if(!part.length)continue;const {error}=await db.storage.from('notes-media').remove(part);if(error)throw new Error('Storage removal failed: '+error.message)}
}
async function emailCompleted(email:string|null,requestedAt:string){
 if(!email)return 'not_applicable';
 const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!key||!from)return 'not_configured';
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Exclusão da conta RiseGoat concluída',html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222"><h2>Exclusão concluída</h2><p>A conta e os dados pessoais associados foram removidos conforme a solicitação iniciada em '+new Date(requestedAt).toLocaleDateString('pt-BR')+'. Registros de auditoria podem permanecer apenas como metadados de segurança, sem conteúdo de notas.</p><hr><small>RiseGoat</small></div>'})});
  return response.ok?'sent':'failed';
 }catch{return 'failed'}
}
async function purgeTrash(db:SupabaseClient){
 let deleted=0,failed=0;
 for(let batch=0;batch<10;batch++){
  const {data,error}=await db.from('notes').select('id,user_id').eq('is_deleted',true).lt('deleted_at',new Date(Date.now()-30*86400000).toISOString()).order('deleted_at').limit(100);
  if(error)throw error;
  if(!data?.length)break;
  for(const note of data){
   try{const paths=await pathsForUser(db,note.user_id,[note.id]);await removeFiles(db,paths);const {error:delError}=await db.from('notes').delete().eq('id',note.id);if(delError)throw delError;deleted++}
   catch(e){failed++;console.error('expired_note_cleanup_failed',String(e).slice(0,180))}
  }
 }
 return {deleted,failed};
}
async function purgeAccount(db:SupabaseClient,r:{id:string;user_id:string|null;email:string|null;requested_at:string}){
 const {data:claimed,error:claimError}=await db.from('account_deletion_requests').update({status:'processing',last_error_code:null}).eq('id',r.id).eq('status','pending').select('id,user_id,email').maybeSingle();
 if(claimError)throw claimError;if(!claimed)return {deleted:false,failed:false};
 const uid=claimed.user_id;
 if(!uid){await db.from('account_deletion_requests').update({status:'completed',completed_at:new Date().toISOString(),email:null,completion_email_status:'not_applicable'}).eq('id',r.id);return {deleted:true,failed:false}}
 try{
  const {data:userResult,error:userError}=await db.auth.admin.getUserById(uid);
  if(userError||!userResult.user){await db.from('account_deletion_requests').update({status:'completed',completed_at:new Date().toISOString(),user_id:null,email:null,completion_email_status:'not_applicable'}).eq('id',r.id);return {deleted:true,failed:false}}
  const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',uid).maybeSingle();if(adminError)throw adminError;
  if(admin){const {count,error:countError}=await db.from('admin_users').select('user_id',{count:'exact',head:true});if(countError)throw countError;if((count||0)<=1){await db.from('account_deletion_requests').update({status:'blocked',last_error_code:'last_admin_protection'}).eq('id',r.id);return {deleted:false,failed:false}}}
  const noteIds:string[]=[];
  for(let offset=0;offset<10000;offset+=500){const {data,error}=await db.from('notes').select('id').eq('user_id',uid).range(offset,offset+499);if(error)throw error;noteIds.push(...(data||[]).map((n:{id:string})=>n.id));if(!data||data.length<500)break}
  await removeFiles(db,await pathsForUser(db,uid,noteIds));
  const {error:circleError}=await db.from('circle_notes').delete().eq('created_by',uid);if(circleError)throw circleError;
  const {error:roomError}=await db.from('network_room_notes').delete().eq('created_by',uid);if(roomError)throw roomError;
  for(const table of ['time_sessions','words']){const result=await db.from(table).delete().eq('user_id',uid);if(result.error&&!/does not exist|schema cache/i.test(result.error.message))throw result.error}
  const {error:deleteError}=await db.auth.admin.deleteUser(uid);if(deleteError)throw deleteError;
  const mailStatus=await emailCompleted(claimed.email,r.requested_at);
  const {error:completeError}=await db.from('account_deletion_requests').update({status:'completed',completed_at:new Date().toISOString(),user_id:null,email:null,completion_email_status:mailStatus,last_error_code:null}).eq('id',r.id);
  if(completeError)throw completeError;
  return {deleted:true,failed:false};
 }catch(e){
  console.error('account_purge_failed',JSON.stringify({request_id:r.id,error:String(e).slice(0,200)}));
  await db.from('account_deletion_requests').update({status:'pending',last_error_code:'purge_failed'}).eq('id',r.id);
  return {deleted:false,failed:true};
 }
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return json(405,{error:'Método não permitido.'});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return json(503,{error:'Serviço de manutenção não configurado.'});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:valid,error:authError}=await db.rpc('validate_purge_cron_secret',{p_candidate:req.headers.get('x-cron-secret')||''});
 if(authError||valid!==true)return json(401,{error:'Não autorizado.'});
 const {data:log,error:logError}=await db.from('maintenance_job_logs').insert({job_name:'daily-purge',status:'running'}).select('id').single();
 if(logError)return json(500,{error:'Não foi possível registrar a execução.'});
 let deletedNotes=0,deletedAccounts=0,failed=0;
 try{
  const trash=await purgeTrash(db);deletedNotes=trash.deleted;failed+=trash.failed;
  const {data:requests,error:requestError}=await db.from('account_deletion_requests').select('id,user_id,email,requested_at').eq('status','pending').lte('scheduled_delete_at',new Date().toISOString()).order('scheduled_delete_at').limit(25);
  if(requestError)throw requestError;
  for(const item of requests||[]){const result=await purgeAccount(db,item);if(result.deleted)deletedAccounts++;if(result.failed)failed++}
  const {error:updateError}=await db.from('maintenance_job_logs').update({status:failed?'partial':'completed',completed_at:new Date().toISOString(),deleted_notes:deletedNotes,deleted_accounts:deletedAccounts,failed_items:failed,detail:{account_requests_checked:(requests||[]).length}}).eq('id',log.id);
  if(updateError)throw updateError;
  return json(200,{ok:true,job_id:log.id,deleted_notes:deletedNotes,deleted_accounts:deletedAccounts,failed_items:failed});
 }catch(e){
  await db.from('maintenance_job_logs').update({status:'failed',completed_at:new Date().toISOString(),deleted_notes:deletedNotes,deleted_accounts:deletedAccounts,failed_items:failed+1,detail:{error_code:'maintenance_failed'}}).eq('id',log.id);
  console.error('daily_purge_failed',String(e).slice(0,250));
  return json(500,{error:'A manutenção falhou; o log foi registrado.',job_id:log.id});
 }
});

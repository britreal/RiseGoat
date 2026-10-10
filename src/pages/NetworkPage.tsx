import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft, Bell, BookOpen, Check, CheckCircle2, CirclePlus, Compass, Copy, FileText, Flame,
  LockKeyhole, MessageSquare, Network, Plus, RefreshCw, Send, ShieldCheck, UserRound,
  Users, X, Loader2, CalendarDays, ArrowUpRight, Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/lib/features';
import '@/lib/network.css';

type Tab='profile'|'people'|'circles'|'rooms'|'admin';
type MemberProfile={user_id:string;display_name:string;city:string;industry:string;current_focus:string;contact_topic:string;accepts_introductions:boolean;discoverable:boolean;collective_streak_opt_in:boolean;onboarding_completed:boolean};
type Circle={id:string;owner_user_id:string;name:string;purpose:string;created_at:string};
type CircleMember={circle_id:string;user_id:string;role:string;status:string;invited_by:string|null;invited_at:string;accepted_at:string|null};
type CircleNote={id:string;circle_id:string;created_by:string;title:string;content:string;is_pinned:boolean;created_at:string;updated_at:string};
type Room={id:string;slug:string;name:string;description:string;is_active:boolean;created_at:string};
type RoomMember={room_id:string;user_id:string;role:string;joined_at:string};
type RoomNote={id:string;room_id:string;created_by:string;title:string;content:string;status:string;is_pinned:boolean;created_at:string;updated_at:string};
type Notice={id:string;user_id:string;notification_type:string;title:string;body:string;href:string;read_at:string|null;created_at:string};
type NoteInvite={id:string;note_id:string;email:string;role:string;token:string;expires_at:string;created_at:string};
type WaitlistRow={id:string;name:string;email:string;status:string;created_at:string;activity_context:string;referral_inviter_id:string|null;referral_code_id:string|null};
type Activity={id:number;user_id:string;event_type:string;entity_type:string;occurred_at:string;metadata:Record<string,unknown>};
type Introduction={id:string;requester_id:string;target_user_id:string;topic:string;status:string;created_at:string};
type Onboarding={id:string;user_id:string;status:string;note:string;created_at:string};
type AdminAudit={id:number;actor_id:string|null;action_key:string;entity_type:string|null;entity_id:string|null;metadata:Record<string,unknown>;occurred_at:string};
type CircleStreak={opted_in_members:number;active_members_7d:number;group_active_days_7d:number};
type MemberMapNode=MemberProfile&{x:number;y:number;label:string};
type MemberMapEdge={source:string;target:string;circles:string[]};
const blankProfile=(id:string):MemberProfile=>({user_id:id,display_name:'',city:'',industry:'',current_focus:'',contact_topic:'',accepts_introductions:false,discoverable:false,collective_streak_opt_in:false,onboarding_completed:false});

export function NetworkPage(){
  const {user}=useAuth();
  const [tab,setTab]=useState<Tab>('profile');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [profile,setProfile]=useState<MemberProfile|null>(null);
  const [directory,setDirectory]=useState<MemberProfile[]>([]);
  const [circles,setCircles]=useState<Circle[]>([]);
  const [circleMembers,setCircleMembers]=useState<CircleMember[]>([]);
  const [circleNotes,setCircleNotes]=useState<CircleNote[]>([]);
  const [circleStreaks,setCircleStreaks]=useState<Record<string,CircleStreak>>({});
  const [rooms,setRooms]=useState<Room[]>([]);
  const [roomMembers,setRoomMembers]=useState<RoomMember[]>([]);
  const [roomNotes,setRoomNotes]=useState<RoomNote[]>([]);
  const [notices,setNotices]=useState<Notice[]>([]);
  const [shareInvites,setShareInvites]=useState<NoteInvite[]>([]);
  const [isAdmin,setIsAdmin]=useState(false);
  const [waitlist,setWaitlist]=useState<WaitlistRow[]>([]);
  const [activity,setActivity]=useState<Activity[]>([]);
  const [introductions,setIntroductions]=useState<Introduction[]>([]);
  const [onboardingRequests,setOnboardingRequests]=useState<Onboarding[]>([]);
  const [auditLog,setAuditLog]=useState<AdminAudit[]>([]);
  const [referralCode,setReferralCode]=useState('');
  const [circleName,setCircleName]=useState('');
  const [circlePurpose,setCirclePurpose]=useState('');
  const [circleNoteCircle,setCircleNoteCircle]=useState('');
  const [circleNoteTitle,setCircleNoteTitle]=useState('');
  const [circleNoteContent,setCircleNoteContent]=useState('');
  const [editingCircleNoteId,setEditingCircleNoteId]=useState<string|null>(null);
  const [circleInviteSelections,setCircleInviteSelections]=useState<Record<string,string>>({});
  const [activeRoom,setActiveRoom]=useState('');
  const [roomModeratorSelection,setRoomModeratorSelection]=useState<Record<string,string>>({});
  const [roomNoteTitle,setRoomNoteTitle]=useState('');
  const [roomNoteContent,setRoomNoteContent]=useState('');
  const [introTopic,setIntroTopic]=useState<Record<string,string>>({});
  const [inviteBusy,setInviteBusy]=useState<string|null>(null);

  const load=async()=>{
    if(!user)return;
    setLoading(true);setError('');
    const email=(user.email||'').trim().toLowerCase();
    const [profileResult,directoryResult,circleResult,circleMemberResult,circleNoteResult,roomResult,roomMemberResult,roomNoteResult,noticeResult,shareInviteResult,adminResult]=await Promise.all([
      supabase.from('member_profiles').select('*').eq('user_id',user.id).maybeSingle(),
      supabase.from('member_profiles').select('user_id,display_name,city,industry,current_focus,contact_topic,accepts_introductions,discoverable,onboarding_completed').order('display_name'),
      supabase.from('circles').select('id,owner_user_id,name,purpose,created_at').order('created_at',{ascending:false}),
      supabase.from('circle_members').select('circle_id,user_id,role,status,invited_by,invited_at,accepted_at'),
      supabase.from('circle_notes').select('id,circle_id,created_by,title,content,is_pinned,created_at,updated_at').order('updated_at',{ascending:false}),
      supabase.from('network_rooms').select('id,slug,name,description,is_active,created_at').eq('is_active',true).order('name'),
      supabase.from('network_room_members').select('room_id,user_id,role,joined_at'),
      supabase.from('network_room_notes').select('id,room_id,created_by,title,content,status,is_pinned,created_at,updated_at').order('is_pinned',{ascending:false}).order('created_at',{ascending:false}),
      supabase.from('member_notifications').select('*').order('created_at',{ascending:false}).limit(50),
      email?supabase.from('note_share_invites').select('id,note_id,email,role,token,expires_at,created_at').eq('email',email).is('accepted_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
      supabase.from('app_admins').select('user_id').eq('user_id',user.id).maybeSingle()
    ]);
    let nextProfile=(profileResult.data as MemberProfile|null);
    if(!nextProfile){
      const created=await supabase.from('member_profiles').insert(blankProfile(user.id)).select('*').single();
      if(!created.error)nextProfile=created.data as MemberProfile;
    }
    if(nextProfile)setProfile(nextProfile);
    if(directoryResult.data)setDirectory(directoryResult.data as MemberProfile[]);
    if(circleResult.data)setCircles(circleResult.data as Circle[]);
    if(circleMemberResult.data)setCircleMembers(circleMemberResult.data as CircleMember[]);
    const loadedCircles=(circleResult.data??[]) as Circle[];
    const loadedCircleMembers=(circleMemberResult.data??[]) as CircleMember[];
    const accessibleCircleIds=loadedCircles.filter(circle=>circle.owner_user_id===user.id||loadedCircleMembers.some(member=>member.circle_id===circle.id&&member.user_id===user.id&&member.status==='accepted')).map(circle=>circle.id);
    const streakResults=await Promise.all(accessibleCircleIds.map(async id=>({id,result:await supabase.rpc('get_circle_streak_summary',{p_circle_id:id})})));
    const streakMap:Record<string,CircleStreak>={};
    for(const item of streakResults){const row=Array.isArray(item.result.data)?item.result.data[0]:item.result.data;if(!item.result.error&&row)streakMap[item.id]=row as CircleStreak;}
    setCircleStreaks(streakMap);
    if(circleNoteResult.data)setCircleNotes(circleNoteResult.data as CircleNote[]);
    if(roomResult.data){const available=roomResult.data as Room[];setRooms(available);setActiveRoom(current=>current&&available.some(r=>r.id===current)?current:(available[0]?.id||''))}
    if(roomMemberResult.data)setRoomMembers(roomMemberResult.data as RoomMember[]);
    if(roomNoteResult.data)setRoomNotes(roomNoteResult.data as RoomNote[]);
    if(noticeResult.data)setNotices(noticeResult.data as Notice[]);
    if(shareInviteResult.data)setShareInvites(shareInviteResult.data as NoteInvite[]);
    const admin=Boolean(adminResult.data);setIsAdmin(admin);
    if(admin){
      const [w,a,i,o,log]=await Promise.all([
        supabase.from('waitlist_signups').select('id,name,email,status,created_at,activity_context,referral_inviter_id,referral_code_id').order('created_at',{ascending:false}).limit(250),
        supabase.from('member_activity_events').select('id,user_id,event_type,entity_type,occurred_at,metadata').order('occurred_at',{ascending:false}).limit(200),
        supabase.from('introduction_requests').select('*').order('created_at',{ascending:false}).limit(100),
        supabase.from('onboarding_requests').select('*').order('created_at',{ascending:false}).limit(100),
        supabase.from('admin_audit_log').select('id,actor_id,action_key,entity_type,entity_id,metadata,occurred_at').order('occurred_at',{ascending:false}).limit(100)
      ]);
      if(w.data)setWaitlist(w.data as WaitlistRow[]);
      if(a.data)setActivity(a.data as Activity[]);
      if(i.data)setIntroductions(i.data as Introduction[]);
      if(o.data)setOnboardingRequests(o.data as Onboarding[]);
      if(log.data)setAuditLog(log.data as AdminAudit[]);
    }
    setLoading(false);
  };

  useEffect(()=>{void load()},[user?.id]);
  useEffect(()=>{if(isAdmin&&tab==='admin')void supabase.rpc('log_admin_access',{p_section:'network_dashboard'})},[isAdmin,tab]);

  const people=useMemo(()=>directory.filter(p=>p.discoverable&&p.user_id!==user?.id),[directory,user?.id]);
  const myCircles=useMemo(()=>circles.filter(c=>c.owner_user_id===user?.id||circleMembers.some(m=>m.circle_id===c.id&&m.user_id===user?.id&&m.status==='accepted')),[circles,circleMembers,user?.id]);
  const pendingCircleInvites=useMemo(()=>circleMembers.filter(m=>m.user_id===user?.id&&m.status==='pending'),[circleMembers,user?.id]);
  const joinedRooms=useMemo(()=>roomMembers.filter(m=>m.user_id===user?.id),[roomMembers,user?.id]);
  const pendingNotices=notices.filter(n=>!n.read_at).length+shareInvites.length+pendingCircleInvites.length;
  const profileById=useMemo(()=>new Map(directory.map(p=>[p.user_id,p])),[directory]);
  const memberMap=useMemo(()=>{
    const acceptedCircles=circles.filter(circle=>circle.owner_user_id===user?.id||circleMembers.some(member=>member.circle_id===circle.id&&member.user_id===user?.id&&member.status==='accepted'));
    const circleIds=new Set(acceptedCircles.map(circle=>circle.id));
    const visibleProfiles=directory.filter(person=>person.discoverable||person.user_id===user?.id);
    const visibleIds=new Set(visibleProfiles.map(person=>person.user_id));
    const includedIds=new Set(circleMembers.filter(member=>circleIds.has(member.circle_id)&&member.status==='accepted'&&visibleIds.has(member.user_id)).map(member=>member.user_id));
    const sorted=visibleProfiles.filter(person=>includedIds.has(person.user_id)).sort((a,b)=>a.user_id===user?.id?-1:b.user_id===user?.id?1:(a.display_name||'').localeCompare(b.display_name||'')).slice(0,36);
    const nodes:MemberMapNode[]=sorted.map((person,index)=>{
      const angle=(-Math.PI/2)+(index/Math.max(1,sorted.length))*Math.PI*2;
      return {...person,x:360+235*Math.cos(angle),y:160+112*Math.sin(angle),label:person.user_id===user?.id?'Você':person.display_name||'Membro'};
    });
    const nodeIds=new Set(nodes.map(node=>node.user_id));
    const edgeMap=new Map<string,MemberMapEdge>();
    for(const circle of acceptedCircles){
      const members=circleMembers.filter(member=>member.circle_id===circle.id&&member.status==='accepted'&&nodeIds.has(member.user_id));
      for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
        const pair=[members[i].user_id,members[j].user_id].sort();
        const key=pair.join(':');
        const edge=edgeMap.get(key)||{source:pair[0],target:pair[1],circles:[]};
        if(!edge.circles.includes(circle.name))edge.circles.push(circle.name);
        edgeMap.set(key,edge);
      }
    }
    return {nodes,edges:[...edgeMap.values()]};
  },[circles,circleMembers,directory,user?.id]);
  const activeRoomNotes=roomNotes.filter(n=>n.room_id===activeRoom);
  const activeRoomMember=isAdmin||roomMembers.some(m=>m.room_id===activeRoom&&m.user_id===user?.id);
  const canModerateActiveRoom=isAdmin||roomMembers.some(m=>m.room_id===activeRoom&&m.user_id===user?.id&&m.role==='moderator');
  const adminActiveMembers=new Set(activity.filter(a=>Date.parse(a.occurred_at)>Date.now()-30*24*60*60*1000).map(a=>a.user_id)).size;
  const lastActivityByMember=useMemo(()=>{
    const latest=new Map<string,Activity>();
    for(const event of activity){
      const existing=latest.get(event.user_id);
      if(!existing||Date.parse(event.occurred_at)>Date.parse(existing.occurred_at))latest.set(event.user_id,event);
    }
    return latest;
  },[activity]);

  function feedback(text:string){setMessage(text);setError('');window.setTimeout(()=>setMessage(''),4000)}
  async function saveProfile(e:FormEvent){
    e.preventDefault();if(!user||!profile)return;setSaving(true);setError('');
    const payload={...profile,display_name:profile.display_name.trim(),city:profile.city.trim(),industry:profile.industry.trim(),current_focus:profile.current_focus.trim(),contact_topic:profile.contact_topic.trim(),onboarding_completed:true,updated_at:new Date().toISOString()};
    const {error:saveError}=await supabase.from('member_profiles').upsert(payload,{onConflict:'user_id'});
    if(saveError)setError('Não foi possível salvar seu perfil. '+saveError.message);
    else{setProfile(payload);feedback('Perfil salvo. Sua visibilidade só muda quando você ativa “Aparecer no diretório”.')}
    setSaving(false);
  }
  async function createReferral(){
    setInviteBusy('referral');setError('');
    const {data,error:createError}=await supabase.rpc('create_my_referral_code');
    if(createError){setError('Não foi possível gerar seu código. '+createError.message);}
    else{const row=Array.isArray(data)?data[0]:data;setReferralCode(row?.invite_code||'');feedback('Este é seu único código de indicação. Quem usá-lo entrará na lista para avaliação manual.')}
    setInviteBusy(null);
  }
  async function createCircle(e:FormEvent){
    e.preventDefault();if(!circleName.trim())return;setInviteBusy('circle');setError('');
    const {error:createError}=await supabase.rpc('create_circle',{p_name:circleName.trim(),p_purpose:circlePurpose.trim()});
    if(createError)setError(createError.message);else{setCircleName('');setCirclePurpose('');feedback('Círculo criado. Convide de 2 a 11 membros para começar.');await load();}
    setInviteBusy(null);
  }
  async function inviteToCircle(circleId:string){
    const target=circleInviteSelections[circleId];if(!target)return;setInviteBusy(circleId);setError('');
    const {error:inviteError}=await supabase.rpc('add_circle_member',{p_circle_id:circleId,p_user_id:target});
    if(inviteError)setError(inviteError.message);else{setCircleInviteSelections(v=>({...v,[circleId]:''}));feedback('Convite registrado. O membro verá a solicitação dentro do aplicativo.');await load();}
    setInviteBusy(null);
  }
  async function acceptCircleInvite(invite:CircleMember){
    setInviteBusy(invite.circle_id);const {error:acceptError}=await supabase.from('circle_members').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('circle_id',invite.circle_id).eq('user_id',user?.id);
    if(acceptError)setError(acceptError.message);else{feedback('Você entrou no círculo.');await load()}setInviteBusy(null);
  }
  async function addCircleNote(e:FormEvent){
    e.preventDefault();if(!user||!circleNoteCircle||!circleNoteContent.trim())return;setInviteBusy('circle-note');
    const payload={title:circleNoteTitle.trim(),content:circleNoteContent.trim(),updated_at:new Date().toISOString()};
    const result=editingCircleNoteId
      ?await supabase.from('circle_notes').update(payload).eq('id',editingCircleNoteId).eq('circle_id',circleNoteCircle)
      :await supabase.from('circle_notes').insert({circle_id:circleNoteCircle,created_by:user.id,...payload});
    if(result.error)setError('Não foi possível salvar a nota do círculo. '+result.error.message);
    else{setCircleNoteTitle('');setCircleNoteContent('');setEditingCircleNoteId(null);feedback(editingCircleNoteId?'Nota colaborativa atualizada.':'Nota publicada para os membros aceitos do círculo.');await load()}
    setInviteBusy(null);
  }
  function startEditingCircleNote(note:CircleNote){setCircleNoteCircle(note.circle_id);setCircleNoteTitle(note.title);setCircleNoteContent(note.content);setEditingCircleNoteId(note.id)}
  async function toggleCircleNotePin(note:CircleNote){const {error:pinError}=await supabase.from('circle_notes').update({is_pinned:!note.is_pinned,updated_at:new Date().toISOString()}).eq('id',note.id);if(pinError)setError('Não foi possível atualizar a nota. '+pinError.message);else{feedback(note.is_pinned?'Nota desafixada.':'Nota fixada para o círculo.');await load()}}
  async function joinRoom(roomId:string){
    if(!user)return;setInviteBusy(roomId);const {error:joinError}=await supabase.from('network_room_members').insert({room_id:roomId,user_id:user.id,role:'member'});
    if(joinError&& !joinError.message.toLowerCase().includes('duplicate'))setError(joinError.message);else feedback('Você entrou na sala.');
    await load();setInviteBusy(null);
  }
  async function addRoomNote(e:FormEvent){
    e.preventDefault();if(!user||!activeRoom||!roomNoteContent.trim())return;setInviteBusy('room-note');
    const status=canModerateActiveRoom?'published':'draft';
    const {error:addError}=await supabase.from('network_room_notes').insert({room_id:activeRoom,created_by:user.id,title:roomNoteTitle.trim(),content:roomNoteContent.trim(),status});
    if(addError)setError('Não foi possível enviar a contribuição. '+addError.message);else{setRoomNoteTitle('');setRoomNoteContent('');feedback(status==='published'?'Contribuição publicada na sala.':'Contribuição enviada para moderação.');await load()}setInviteBusy(null);
  }
  async function updateRoomNote(note:RoomNote,patch:Partial<RoomNote>){
    const {error:updateError}=await supabase.from('network_room_notes').update({...patch,updated_at:new Date().toISOString()}).eq('id',note.id);
    if(updateError)setError('Não foi possível moderar a contribuição. '+updateError.message);
    else{feedback(patch.status==='published'?'Contribuição publicada.':patch.is_pinned!==undefined?(patch.is_pinned?'Contribuição fixada.':'Contribuição desafixada.'):'Contribuição atualizada.');await load();}
  }
  async function deleteRoomNote(note:RoomNote){
    if(!window.confirm('Excluir esta contribuição da sala?'))return;
    const {error:deleteError}=await supabase.from('network_room_notes').delete().eq('id',note.id);
    if(deleteError)setError('Não foi possível excluir a contribuição. '+deleteError.message);else{feedback('Contribuição excluída.');await load();}
  }
  async function setRoomModerator(roomId:string,userId:string,role:'member'|'moderator'){
    const {error:updateError}=await supabase.from('network_room_members').update({role}).eq('room_id',roomId).eq('user_id',userId);
    if(updateError)setError('Não foi possível atualizar o moderador. '+updateError.message);else{feedback(role==='moderator'?'Moderador designado.':'Permissão de moderação removida.');await load();}
  }
  async function acceptShareInvite(invite:NoteInvite){
    setInviteBusy(invite.id);const {data,error:acceptError}=await supabase.rpc('accept_note_share_invite',{p_token:invite.token});
    if(acceptError)setError('Não foi possível aceitar o convite. '+acceptError.message);
    else{await supabase.from('member_notifications').update({read_at:new Date().toISOString()}).eq('user_id',user?.id).eq('notification_type','note_share_invite');feedback('Convite aceito. A nota compartilhada agora aparece em seu espaço.');await load();}
    setInviteBusy(null);
  }
  async function markNoticeRead(id:string){await supabase.from('member_notifications').update({read_at:new Date().toISOString()}).eq('id',id);setNotices(v=>v.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n))}
  async function requestIntroduction(target:MemberProfile){
    if(!user)return;const topic=(introTopic[target.user_id]||target.contact_topic||target.current_focus||'Introdução').trim();
    const {error:requestError}=await supabase.from('introduction_requests').insert({requester_id:user.id,target_user_id:target.user_id,topic});
    if(requestError)setError('Não foi possível registrar o pedido. '+requestError.message);
    else{setIntroTopic(v=>({...v,[target.user_id]:''}));feedback('Pedido registrado. A equipe fará a ponte, sem compartilhar seu texto privado.')}
  }
  async function requestOnboarding(){
    if(!user)return;
    const {error:reqError}=await supabase.from('onboarding_requests').insert({user_id:user.id,note:''});
    if(reqError)setError('Não foi possível solicitar a conversa de onboarding. '+reqError.message);
    else{feedback('Solicitação enviada. A equipe combinará uma conversa de onboarding de aproximadamente 1 hora.');await load();}
  }
  async function reviewApplicant(row:WaitlistRow,approved:boolean){
    setInviteBusy(row.id);setError('');
    const {error:reviewError}=await supabase.rpc('review_waitlist_signup',{p_signup_id:row.id,p_status:approved?'approved':'declined'});
    if(reviewError){setError(reviewError.message);setInviteBusy(null);return;}
    if(approved){
      const {data:inviteData,error:issueError}=await supabase.rpc('issue_member_access_invite',{p_signup_id:row.id});
      const invite=Array.isArray(inviteData)?inviteData[0]:inviteData;
      if(issueError||!invite){setError('Solicitação aprovada, mas não foi possível emitir o convite. '+(issueError?.message||''));await load();setInviteBusy(null);return;}
      const {error:mailError}=await supabase.auth.signInWithOtp({email:invite.invite_email,options:{shouldCreateUser:true,emailRedirectTo:window.location.origin+'/notes?membership_invite='+encodeURIComponent(invite.invite_token)}});
      if(mailError){await supabase.rpc('revoke_member_access_invite',{p_invite_id:invite.invite_id});setError('Acesso aprovado, mas o e-mail mágico não foi enviado. Verifique o SMTP transacional do Supabase. '+mailError.message);}
      else feedback('Acesso aprovado e magic link enviado para '+invite.invite_email+'.');
    }else feedback('Solicitação recusada.');
    await load();setInviteBusy(null);
  }
  async function startAccessInvite(row:WaitlistRow){
    setInviteBusy(row.id);setError('');
    const {data:inviteData,error:issueError}=await supabase.rpc('issue_member_access_invite',{p_signup_id:row.id});
    const invite=Array.isArray(inviteData)?inviteData[0]:inviteData;
    if(issueError||!invite){setError(issueError?.message||'Não foi possível emitir o convite.');setInviteBusy(null);return;}
    const {error:mailError}=await supabase.auth.signInWithOtp({email:invite.invite_email,options:{shouldCreateUser:true,emailRedirectTo:window.location.origin+'/notes?membership_invite='+encodeURIComponent(invite.invite_token)}});
    if(mailError){await supabase.rpc('revoke_member_access_invite',{p_invite_id:invite.invite_id});setError('Não foi possível enviar o magic link. Verifique o SMTP transacional do Supabase. '+mailError.message);}
    else feedback('Magic link enviado para '+invite.invite_email+'.');
    await load();setInviteBusy(null);
  }

  if(loading)return <div className="network-loading"><Loader2 size={20} className="network-spin"/>Carregando sua rede privada…</div>;
  if(!user)return null;

  return <main className="network-shell">
    <header className="network-header">
      <a className="network-back" href="/notes"><ArrowLeft size={16}/> Notas</a>
      <div className="network-brand"><div className="network-mark">R</div><div><strong>RiseGoat</strong><span>Rede privada de membros</span></div></div>
      <div className="network-header-status"><LockKeyhole size={14}/> Por convite · visibilidade opt-in</div>
    </header>
    <section className="network-intro">
      <div><span className="network-kicker">CÍRCULOS · SALAS · INTRODUÇÕES</span><h1>Construa relações com intenção.</h1><p>Seu perfil é privado por padrão. Você escolhe se aparece no diretório e o que deseja compartilhar com outros membros.</p></div>
      <div className="network-intro-stats"><span><Users size={15}/>{people.length} perfis visíveis</span><span><Bell size={15}/>{pendingNotices} pendentes</span></div>
    </section>
    <nav className="network-tabs" aria-label="Seções da rede">
      {([{id:'profile',label:'Meu perfil',icon:UserRound},{id:'people',label:'Membros',icon:Users},...(FEATURES.circles?[{id:'circles',label:'Círculos',icon:Network} as const]:[]),{id:'rooms',label:'Salas',icon:MessageSquare},...(isAdmin?[{id:'admin',label:'Administração',icon:ShieldCheck} as const]:[])] as {id:Tab;label:string;icon:any}[]).map(item=><button key={item.id} className={cn(tab===item.id&&'active')} onClick={()=>setTab(item.id)}><item.icon size={16}/>{item.label}{item.id==='admin'&&waitlist.filter(w=>w.status==='pending').length>0&&<span className="network-tab-count">{waitlist.filter(w=>w.status==='pending').length}</span>}</button>)}
    </nav>
    {error&&<div className="network-alert" role="alert">{error}<button onClick={()=>setError('')} aria-label="Fechar aviso"><X size={15}/></button></div>}
    {message&&<div className="network-success" role="status"><CheckCircle2 size={16}/>{message}</div>}

    {tab==='profile'&&profile&&<div className="network-grid profile-grid">
      <section className="network-panel">
        <div className="network-panel-heading"><div><span className="network-eyebrow">IDENTIDADE MÍNIMA</span><h2>Seu cartão de membro</h2><p>Nome, cidade, setor e no que está trabalhando. Nada é publicado automaticamente.</p></div><UserRound size={21}/></div>
        <form className="network-form" onSubmit={saveProfile}>
          <label>Nome de exibição<input maxLength={100} value={profile.display_name} onChange={e=>setProfile({...profile,display_name:e.target.value})} placeholder="Como os membros devem chamar você" required/></label>
          <div className="network-form-pair"><label>Cidade<input maxLength={100} value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="Cidade"/></label><label>Setor / indústria<input maxLength={120} value={profile.industry} onChange={e=>setProfile({...profile,industry:e.target.value})} placeholder="Ex.: tecnologia"/></label></div>
          <label>No que está trabalhando agora?<input maxLength={180} value={profile.current_focus} onChange={e=>setProfile({...profile,current_focus:e.target.value})} placeholder="Uma linha, sem apresentação longa"/></label>
          <label>Sobre o que aceita conversar?<input maxLength={180} value={profile.contact_topic} onChange={e=>setProfile({...profile,contact_topic:e.target.value})} placeholder="Ex.: IA aplicada a operações"/></label>
          <label className="network-toggle"><input type="checkbox" checked={profile.accepts_introductions} onChange={e=>setProfile({...profile,accepts_introductions:e.target.checked})}/><span><strong>Aceito pedidos de introdução</strong><small>A equipe fará a ponte. Seu e-mail não aparece no diretório.</small></span></label>
          <label className="network-toggle network-toggle-emphasis"><input type="checkbox" checked={profile.discoverable} onChange={e=>setProfile({...profile,discoverable:e.target.checked})}/><span><strong>Aparecer no diretório de membros</strong><small>Desativado por padrão. Ao ativar, os campos do cartão ficam visíveis para membros logados.</small></span></label>
          <label className="network-toggle"><input type="checkbox" checked={profile.collective_streak_opt_in} onChange={e=>setProfile({...profile,collective_streak_opt_in:e.target.checked})}/><span><strong>Compartilhar minha atividade coletiva</strong><small>Opcional. O grupo vê somente contagens agregadas de dias ativos e checklists concluídos, sem títulos, texto ou nomes individuais.</small></span></label>
          <button className="network-primary" type="submit" disabled={saving}>{saving?<Loader2 size={15} className="network-spin"/>:<Check size={15}/>}Salvar perfil</button>
        </form>
      </section>
      <section className="network-panel network-onboarding-card">
        <div className="network-panel-heading"><div><span className="network-eyebrow">PRIMEIRO RITUAL</span><h2>Conversa de onboarding</h2></div><CalendarDays size={22}/></div>
        <p>Uma conversa de aproximadamente 1 hora para entender quem você é, o que procura, o que pode oferecer e quais membros valem uma apresentação.</p>
        <ol><li>Mapear contexto e objetivos.</li><li>Documentar interesses e contribuição.</li><li>Selecionar até três apresentações relevantes.</li></ol>
        <button className="network-secondary" onClick={()=>void requestOnboarding()}><CalendarDays size={15}/>Solicitar conversa</button>
        <div className="network-privacy-note"><LockKeyhole size={14}/>A equipe vê o pedido de onboarding e os campos estruturais. Suas notas pessoais não são compartilhadas.</div>
        <div className="network-referral">
          <div><span className="network-eyebrow">INDICAÇÃO PESSOAL</span><h3>Um código por membro</h3><p>Seu código leva alguém à lista de espera. A entrada continua sujeita à aprovação manual.</p></div>
          {referralCode?<div className="network-code"><code>{referralCode}</code><button onClick={()=>{void navigator.clipboard?.writeText(referralCode);feedback('Código copiado.')}} aria-label="Copiar código"><Copy size={15}/></button></div>:<button className="network-secondary" onClick={()=>void createReferral()} disabled={inviteBusy==='referral'}>{inviteBusy==='referral'?<Loader2 size={14} className="network-spin"/>:<CirclePlus size={15}/>}Gerar meu código</button>}
        </div>
      </section>
    </div>}

    {tab==='people'&&<section className="network-stack">
      {notices.length>0&&<section className="network-panel network-notices"><div className="network-panel-heading"><div><span className="network-eyebrow">CENTRAL DE NOTIFICAÇÕES</span><h2>Atividade e convites</h2><p>Convites e atualizações administrativas. Conteúdo privado de notas não aparece nesta lista.</p></div><Bell size={19}/></div>{notices.map(notice=><div className="network-invite-row" key={notice.id}><div><strong>{notice.title}</strong><small>{notice.body||'Você recebeu uma atualização.'} · {new Date(notice.created_at).toLocaleString('pt-BR')}{notice.read_at?' · Lida':' · Não lida'}</small></div>{!notice.read_at&&<button className="network-secondary compact" onClick={()=>void markNoticeRead(notice.id)}>Marcar como lida</button>}</div>)}</section>}
      <div className="network-panel-heading network-directory-heading"><div><span className="network-eyebrow">DIRETÓRIO COM OPT-IN</span><h2>Membros disponíveis</h2><p>Somente quem ativou a visibilidade aparece aqui. Pedidos de introdução passam pela equipe.</p></div><Compass size={22}/></div>
      <section className="network-panel network-member-map-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">MAPA DE RELAÇÕES</span><h2>Conexões explícitas</h2><p>As linhas representam participação no mesmo círculo aceito. Não inferimos relações por notas privadas ou atividade individual.</p></div><Network size={21}/></div>{memberMap.nodes.length===0?<div className="network-empty"><Network size={22}/><strong>O mapa começa com relações consentidas</strong><p>Entre em um círculo e ative a visibilidade de perfil para aparecer no mapa. Só conexões dos seus círculos aceitos são mostradas.</p></div>:<div className="network-member-map-scroll"><svg className="network-member-map-svg" viewBox="0 0 720 320" role="img" aria-label="Mapa de relações entre membros visíveis dos seus círculos"><g className="network-member-map-edges">{memberMap.edges.map(edge=>{const from=memberMap.nodes.find(node=>node.user_id===edge.source);const to=memberMap.nodes.find(node=>node.user_id===edge.target);if(!from||!to)return null;return <line key={edge.source+'-'+edge.target} x1={from.x} y1={from.y} x2={to.x} y2={to.y}><title>{edge.circles.join(', ')}</title></line>})}</g><g className="network-member-map-nodes">{memberMap.nodes.map(node=><g key={node.user_id} transform={'translate('+node.x+' '+node.y+')'}><circle r={node.user_id===user?.id?22:18} className={node.user_id===user?.id?'self':'member'}/><text y={34} textAnchor="middle">{node.label.length>19?node.label.slice(0,18)+'…':node.label}</text><title>{[node.display_name,node.industry,node.city].filter(Boolean).join(' · ')||node.label}</title></g>)}</g></svg><div className="network-map-legend"><span><i className="self"/>Você</span><span><i className="member"/>Membro visível</span><span>{memberMap.edges.length} conexões entre {memberMap.nodes.length} perfis</span></div></div>}</section>
      {shareInvites.length>0&&<section className="network-panel network-notices"><div className="network-panel-heading"><div><span className="network-eyebrow">CONVITES DE NOTA</span><h2>Você tem {shareInvites.length} convite(s) pendente(s)</h2></div><Bell size={19}/></div>{shareInvites.map(inv=><div className="network-invite-row" key={inv.id}><div><strong>Nota compartilhada com você</strong><small>Permissão: {inv.role==='editor'?'pode editar':'somente leitura'} · expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}</small></div><button className="network-primary compact" disabled={inviteBusy===inv.id} onClick={()=>void acceptShareInvite(inv)}>{inviteBusy===inv.id?<Loader2 size={14} className="network-spin"/>:<Check size={14}/>}Aceitar</button></div>)}</section>}
      {pendingCircleInvites.length>0&&<section className="network-panel network-notices"><div className="network-panel-heading"><div><span className="network-eyebrow">CÍRCULOS</span><h2>Convites de círculo</h2></div><Bell size={19}/></div>{pendingCircleInvites.map(inv=>{const circle=circles.find(c=>c.id===inv.circle_id);return <div className="network-invite-row" key={inv.circle_id+inv.user_id}><div><strong>{circle?.name||'Círculo privado'}</strong><small>{circle?.purpose||'Um membro convidou você para um grupo fechado.'}</small></div><button className="network-primary compact" disabled={inviteBusy===inv.circle_id} onClick={()=>void acceptCircleInvite(inv)}><Check size={14}/>Aceitar</button></div>})}</section>}
      {people.length===0?<div className="network-empty"><Users size={24}/><strong>A rede ainda está começando</strong><p>Quando os membros ativarem a visibilidade do perfil, você os encontrará aqui.</p></div>:<div className="network-people-grid">{people.map(person=><article className="network-person-card" key={person.user_id}><div className="network-person-top"><div className="network-avatar">{(person.display_name||'R').trim().slice(0,1).toUpperCase()}</div><div><h3>{person.display_name||'Membro'}</h3><p>{[person.industry,person.city].filter(Boolean).join(' · ')||'Membro RiseGoat'}</p></div><span className="network-optin-dot" title="Perfil visível"/></div>{person.current_focus&&<div className="network-person-focus"><span>No momento</span><p>{person.current_focus}</p></div>}{person.accepts_introductions&&<span className="network-person-badge"><CheckCircle2 size={13}/>Aceita introduções</span>}{person.accepts_introductions&&<div className="network-intro-form"><input maxLength={180} value={introTopic[person.user_id]||''} onChange={e=>setIntroTopic(v=>({...v,[person.user_id]:e.target.value}))} placeholder={person.contact_topic||'Tema para a introdução'}/><button className="network-secondary" onClick={()=>void requestIntroduction(person)}><ArrowUpRight size={14}/>Pedir introdução</button></div>}</article>)}</div>}
      <div className="network-panel network-optin-explainer"><ShieldCheck size={19}/><div><strong>Visibilidade não significa acesso às notas</strong><p>O diretório mostra apenas o cartão de membro. Notas privadas, pastas e conexões pessoais continuam isoladas até o próprio membro compartilhá-las.</p></div></div>
    </section>}

    {FEATURES.circles&&tab==='circles'&&<div className="network-grid">
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">3 A 12 MEMBROS</span><h2>Círculos privados</h2><p>Grupos pequenos para relações recorrentes e trabalho compartilhado.</p></div><Network size={22}/></div>
        <form className="network-form" onSubmit={createCircle}><label>Nome do círculo<input value={circleName} onChange={e=>setCircleName(e.target.value)} maxLength={80} placeholder="Ex.: Círculo de confiança" required/></label><label>Objetivo<input value={circlePurpose} onChange={e=>setCirclePurpose(e.target.value)} maxLength={500} placeholder="O que este grupo pretende fazer"/></label><button className="network-primary" disabled={inviteBusy==='circle'}><Plus size={15}/>Criar círculo</button></form>
        <div className="network-callout"><LockKeyhole size={15}/>As notas do círculo são uma área colaborativa separada. Nada é copiado das notas pessoais.</div>
        {myCircles.map(circle=>{const members=circleMembers.filter(m=>m.circle_id===circle.id);const isOwner=circle.owner_user_id===user.id;const streak=circleStreaks[circle.id];return <article className="network-circle-card" key={circle.id}><div className="network-circle-title"><div><h3>{circle.name}</h3><p>{circle.purpose||'Círculo privado'}</p></div><span>{members.filter(m=>m.status==='accepted').length}/12</span></div>{streak&&<div className="network-circle-streak"><span><Flame size={14}/>Ritmo coletivo · últimos 7 dias</span>{streak.opted_in_members===0?<small>O resumo coletivo só aparece quando ao menos três membros aceitos ativam o compartilhamento de atividade.</small>:<><strong>{streak.active_members_7d} de {streak.opted_in_members} membros ativos</strong><small>{streak.group_active_days_7d} dias ativos combinados · somente dados agregados</small></>}</div>}<div className="network-member-chips">{members.filter(m=>m.status==='accepted').map(m=><span key={m.user_id}>{profileById.get(m.user_id)?.display_name||'Membro'}</span>)}</div>{members.filter(m=>m.status==='pending').length>0&&<small className="network-muted">{members.filter(m=>m.status==='pending').length} convite(s) aguardando resposta.</small>}{isOwner&&<div className="network-add-member"><select value={circleInviteSelections[circle.id]||''} onChange={e=>setCircleInviteSelections(v=>({...v,[circle.id]:e.target.value}))}><option value="">Convidar membro visível…</option>{people.filter(p=>!members.some(m=>m.user_id===p.user_id)).map(p=><option value={p.user_id} key={p.user_id}>{p.display_name}</option>)}</select><button className="network-secondary" disabled={!circleInviteSelections[circle.id]||inviteBusy===circle.id} onClick={()=>void inviteToCircle(circle.id)}><Plus size={14}/>Convidar</button></div>}</article>})}
      </section>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">MEMÓRIA COMPARTILHADA</span><h2>Notas dos círculos</h2><p>Uma nota colaborativa visível apenas aos membros que aceitaram o convite.</p></div><BookOpen size={22}/></div>
        <form className="network-form" onSubmit={addCircleNote}><label>Círculo<select value={circleNoteCircle} onChange={e=>setCircleNoteCircle(e.target.value)} required disabled={Boolean(editingCircleNoteId)}><option value="">Selecione um círculo</option>{myCircles.filter(c=>circleMembers.some(m=>m.circle_id===c.id&&m.user_id===user.id&&m.status==='accepted')).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Título<input value={circleNoteTitle} onChange={e=>setCircleNoteTitle(e.target.value)} maxLength={180} placeholder="Assunto da nota"/></label><label>Conteúdo<textarea value={circleNoteContent} onChange={e=>setCircleNoteContent(e.target.value)} rows={4} maxLength={12000} placeholder="Contexto, decisões, próximos passos…" required/></label><div className="network-form-actions"><button className="network-primary" disabled={inviteBusy==='circle-note'}>{editingCircleNoteId?<Check size={15}/>:<Plus size={15}/>} {editingCircleNoteId?'Salvar alterações':'Publicar no círculo'}</button>{editingCircleNoteId&&<button type="button" className="network-secondary" onClick={()=>{setEditingCircleNoteId(null);setCircleNoteTitle('');setCircleNoteContent('')}}>Cancelar edição</button>}</div></form>
        <div className="network-shared-notes">{circleNotes.filter(n=>myCircles.some(c=>c.id===n.circle_id)).map(n=><article className="network-shared-note" key={n.id}><small>{myCircles.find(c=>c.id===n.circle_id)?.name} · {new Date(n.updated_at).toLocaleDateString('pt-BR')}</small><h3>{n.title||'Nota sem título'}</h3><p>{n.content}</p><span>Compartilhada por {profileById.get(n.created_by)?.display_name||'membro'}</span><div className="network-shared-note-actions"><button className="network-secondary compact" onClick={()=>startEditingCircleNote(n)}><FileText size={13}/>Editar em conjunto</button><button className="network-secondary compact" onClick={()=>void toggleCircleNotePin(n)}>{n.is_pinned?'Desafixar':'Fixar'}</button></div>{n.is_pinned&&<span className="network-person-badge"><CheckCircle2 size={13}/>Fixada no círculo</span>}</article>)}</div>
      </section>
    </div>}

    {tab==='rooms'&&<section className="network-stack">
      <div className="network-panel-heading"><div><span className="network-eyebrow">SALAS TEMÁTICAS</span><h2>Contexto por tema</h2><p>Entre nas salas que fazem sentido. O histórico permanece para construir contexto; participantes e moderadores colaboram nas notas.</p></div><MessageSquare size={22}/></div>
      <div className="network-room-grid">{rooms.map(room=>{const joined=isAdmin||joinedRooms.some(m=>m.room_id===room.id);return <article className={cn('network-room-card',activeRoom===room.id&&'selected')} key={room.id}><div className="network-room-icon"><MessageSquare size={19}/></div><h3>{room.name}</h3><p>{room.description}</p><div className="network-room-footer">{joined?<span><CheckCircle2 size={14}/>Membro</span>:<button className="network-secondary compact" disabled={inviteBusy===room.id} onClick={()=>void joinRoom(room.id)}><Plus size={14}/>Entrar na sala</button>}{joined&&<button className="network-secondary compact" onClick={()=>setActiveRoom(room.id)}>Abrir</button>}</div></article>})}</div>
      {activeRoom&&activeRoomMember&&<section className="network-panel network-room-workspace"><div className="network-panel-heading"><div><span className="network-eyebrow">SALA</span><h2>{rooms.find(r=>r.id===activeRoom)?.name}</h2><p>{canModerateActiveRoom?'Você pode revisar e publicar contribuições.':'Suas contribuições aguardam revisão antes de aparecer para toda a sala.'}</p></div><MessageSquare size={20}/></div><form className="network-form" onSubmit={addRoomNote}><label>Título<input value={roomNoteTitle} onChange={e=>setRoomNoteTitle(e.target.value)} maxLength={180} placeholder="Título da contribuição"/></label><label>Nota colaborativa<textarea value={roomNoteContent} onChange={e=>setRoomNoteContent(e.target.value)} rows={4} maxLength={12000} placeholder="Compartilhe contexto, pergunta ou proposta para a sala…" required/></label><button className="network-primary" disabled={inviteBusy==='room-note'}><Send size={14}/>Enviar para revisão</button></form><div className="network-shared-notes">{activeRoomNotes.map(n=><article className="network-shared-note" key={n.id}><small>{new Date(n.created_at).toLocaleString('pt-BR')} · {profileById.get(n.created_by)?.display_name||'Membro'}{n.status==='draft'?' · Aguardando moderação':''}</small><h3>{n.title||'Contribuição'}</h3><p>{n.content}</p>{n.is_pinned&&<span className="network-person-badge"><CheckCircle2 size={13}/>Fixada pela moderação</span>}{canModerateActiveRoom&&<div className="network-room-moderation-tools">{n.status==='draft'&&<button className="network-secondary compact" onClick={()=>void updateRoomNote(n,{status:'published'})}><Check size={13}/>Publicar</button>}<button className="network-secondary compact" onClick={()=>void updateRoomNote(n,{is_pinned:!n.is_pinned})}>{n.is_pinned?'Desafixar':'Fixar'}</button><button className="network-danger compact" onClick={()=>void deleteRoomNote(n)}><Trash2 size={13}/>Excluir</button></div>}</article>)}{activeRoomNotes.length===0&&<div className="network-empty"><FileText size={23}/><strong>Comece o histórico</strong><p>A primeira contribuição ficará visível depois da revisão.</p></div>}</div></section>}
    </section>}

    {tab==='admin'&&isAdmin&&<section className="network-stack">
      <div className="network-panel-heading"><div><span className="network-eyebrow">VISÃO ADMINISTRATIVA</span><h2>Estrutura da rede</h2><p>O painel registra relações e atividade estrutural. Não coleta nem exibe conteúdo de notas pessoais.</p></div><ShieldCheck size={22}/></div>
      <div className="network-admin-stats"><article><span>Membros ativos (30 dias)</span><strong>{adminActiveMembers}</strong></article><article><span>Perfis com opt-in</span><strong>{directory.filter(p=>p.discoverable).length}</strong></article><article><span>Círculos</span><strong>{circles.length}</strong></article><article><span>Pedidos na espera</span><strong>{waitlist.filter(w=>w.status==='pending').length}</strong></article></div>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">RELAÇÕES EXPLÍCITAS</span><h2>Mapa estrutural da rede</h2><p>Quem está conectado com quem por meio de círculos aceitos. Exibe apenas metadados e perfis visíveis; nenhum conteúdo de nota é mostrado.</p></div><Network size={20}/></div>{circles.length===0?<p className="network-muted">Ainda não há círculos.</p>:circles.map(circle=>{const members=circleMembers.filter(member=>member.circle_id===circle.id);return <article className="network-admin-row" key={circle.id}><strong>{circle.name}</strong><span>Dono: {profileById.get(circle.owner_user_id)?.display_name||'Membro'} · {members.filter(member=>member.status==='accepted').length} aceitos · {members.filter(member=>member.status==='pending').length} convites pendentes</span><div className="network-member-chips">{members.map(member=><span key={member.user_id}>{profileById.get(member.user_id)?.display_name||'Membro'} · {member.status==='accepted'?'aceito':'pendente'}</span>)}</div></article>})}</section>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">PRESENÇA ESTRUTURAL</span><h2>Atividade dos membros</h2><p>Baseada em eventos estruturais registrados no período recente, não em tempo de tela. Ausência de evento não prova ausência do membro.</p></div><Users size={20}/></div>{directory.length===0?<p className="network-muted">Nenhum perfil disponível para resumir.</p>:<div className="network-activity-list">{directory.slice().sort((a,b)=>{const ta=Date.parse(lastActivityByMember.get(a.user_id)?.occurred_at||'');const tb=Date.parse(lastActivityByMember.get(b.user_id)?.occurred_at||'');return tb-ta}).map(person=>{const latest=lastActivityByMember.get(person.user_id);const active=latest&&Date.parse(latest.occurred_at)>Date.now()-30*24*60*60*1000;return <div className="network-activity-row" key={person.user_id}><span>{person.display_name||'Membro'}</span><strong>{active?'Atividade recente':latest?'Sem evento estrutural nos últimos 30 dias':'Sem eventos registrados'}</strong><small>{latest?latest.event_type.replace(/_/g,' ')+' · '+new Date(latest.occurred_at).toLocaleString('pt-BR'):'Aguardando primeiro evento de nota ou organização'}</small></div>})}</div>}</section>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">CURADORIA MANUAL</span><h2>Lista de espera</h2><p>A aprovação é manual. A pessoa aprovada recebe magic link por e-mail, não acesso público.</p></div><Users size={21}/></div>{waitlist.length===0?<p className="network-muted">Nenhuma solicitação encontrada.</p>:waitlist.map(row=><article className="network-applicant" key={row.id}><div><strong>{row.name}</strong><span>{row.email}</span><small>{new Date(row.created_at).toLocaleDateString('pt-BR')} · {row.status}{row.referral_inviter_id?' · indicação rastreada':''}</small>{row.activity_context&&<p className="network-applicant-context">Atuação: {row.activity_context}</p>}</div><div className="network-applicant-actions">{row.status==='pending'&&<><button className="network-primary compact" disabled={inviteBusy===row.id} onClick={()=>void reviewApplicant(row,true)}><Check size={14}/>Aprovar e enviar link</button><button className="network-danger compact" disabled={inviteBusy===row.id} onClick={()=>void reviewApplicant(row,false)}><X size={14}/>Recusar</button></>}{row.status==='approved'&&<button className="network-secondary compact" disabled={inviteBusy===row.id} onClick={()=>void startAccessInvite(row)}><Send size={14}/>Enviar magic link</button>}</div></article>)}</section>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">MODERAÇÃO DE SALAS</span><h2>Moderadores</h2><p>Escolha entre membros que já entraram em cada sala.</p></div><ShieldCheck size={20}/></div>{rooms.map(room=>{const members=roomMembers.filter(member=>member.room_id===room.id);return <article className="network-admin-row" key={room.id}><strong>{room.name}</strong>{members.length===0?<small>Nenhum membro entrou na sala.</small>:<><select className="network-moderator-select" value={roomModeratorSelection[room.id]||''} onChange={e=>setRoomModeratorSelection(v=>({...v,[room.id]:e.target.value}))}><option value="">Selecionar membro…</option>{members.map(member=><option value={member.user_id} key={member.user_id}>{profileById.get(member.user_id)?.display_name||member.user_id.slice(0,8)} · {member.role==='moderator'?'moderador':'membro'}</option>)}</select><div className="network-applicant-actions"><button className="network-secondary compact" disabled={!roomModeratorSelection[room.id]} onClick={()=>void setRoomModerator(room.id,roomModeratorSelection[room.id],'moderator')}>Tornar moderador</button><button className="network-secondary compact" disabled={!roomModeratorSelection[room.id]} onClick={()=>void setRoomModerator(room.id,roomModeratorSelection[room.id],'member')}>Remover permissão</button></div></>}</article>})}</section>
      <section className="network-grid"><div className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">INTRODUÇÕES</span><h2>Pontes solicitadas</h2></div><ArrowUpRight size={20}/></div>{introductions.length===0?<p className="network-muted">Nenhuma solicitação de introdução.</p>:introductions.map(item=><article className="network-admin-row" key={item.id}><strong>{profileById.get(item.requester_id)?.display_name||'Membro'} → {profileById.get(item.target_user_id)?.display_name||'Membro'}</strong><span>{item.topic||'Introdução'} · {item.status}</span><small>{new Date(item.created_at).toLocaleDateString('pt-BR')}</small><button className="network-secondary compact" onClick={async()=>{await supabase.from('introduction_requests').update({status:'introduced',reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',item.id);feedback('Introdução marcada como realizada.');await load()}}>Marcar como apresentado</button></article>)}</div><div className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">ONBOARDING</span><h2>Conversas pendentes</h2></div><CalendarDays size={20}/></div>{onboardingRequests.length===0?<p className="network-muted">Nenhuma conversa solicitada.</p>:onboardingRequests.map(item=><article className="network-admin-row" key={item.id}><strong>{profileById.get(item.user_id)?.display_name||'Membro'}</strong><span>{item.status}</span><small>{new Date(item.created_at).toLocaleDateString('pt-BR')}</small><button className="network-secondary compact" onClick={async()=>{await supabase.from('onboarding_requests').update({status:'scheduled',reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',item.id);feedback('Conversa marcada como agendada. Combine o horário por contato direto.');await load()}}>Marcar agendada</button></article>)}</div></section>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">AUDITORIA ADMINISTRATIVA</span><h2>Acessos e ações</h2><p>Registro de entrada no painel e mudanças operacionais. Não armazena conteúdo de notas.</p></div><ShieldCheck size={20}/></div>{auditLog.length===0?<p className="network-muted">Ainda não há eventos registrados.</p>:<div className="network-activity-list">{auditLog.map(entry=><div className="network-activity-row" key={entry.id}><span>{profileById.get(entry.actor_id||'')?.display_name||'Admin'}</span><strong>{entry.action_key.replace(/_/g,' ')}</strong><small>{entry.entity_type||'painel'}{entry.metadata?.section?' · '+String(entry.metadata.section):''} · {new Date(entry.occurred_at).toLocaleString('pt-BR')}</small></div>)}</div>}</section>
      <section className="network-panel"><div className="network-panel-heading"><div><span className="network-eyebrow">METADADOS SOMENTE</span><h2>Atividade recente</h2><p>Eventos como criação de nota, fixação e arquivamento, sem título ou conteúdo.</p></div><LockKeyhole size={20}/></div><div className="network-activity-list">{activity.slice(0,80).map(event=><div className="network-activity-row" key={event.id}><span>{profileById.get(event.user_id)?.display_name||'Membro'}</span><strong>{event.event_type.replace(/_/g,' ')}</strong><small>{typeof event.metadata?.folder_id==='string'?'Pasta vinculada':'Sem detalhe de pasta'} · {new Date(event.occurred_at).toLocaleString('pt-BR')}</small></div>)}</div></section>
    </section>}
    <footer className="network-footer"><span><LockKeyhole size={14}/> Dados privados por padrão</span><button onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>Atualizar</button></footer>
  </main>;
}

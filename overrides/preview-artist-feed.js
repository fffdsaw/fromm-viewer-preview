/* Preview-only official Artist feed source discovery.
 * This DOES NOT claim to implement the separate feed's undocumented list API.
 * Never persist feed URLs or expose account credentials. */
(()=>{
'use strict';
if(!location.pathname.startsWith('/fromm-viewer-preview/'))return;
const cache=new Map(),pending=new Map();
let observer=null,previousScope='';

function channelId(){
  return String(channelVideoState?.channelId||'').trim();
}
function enabled(){
  return !!window.FrommPreviewArtist
    &&state?.filter==='live'
    &&state.live?.centerMode==='channel'
    &&!channelVideoState?.selected
    &&window.FrommPreviewArtist.state.category==='artist';
}
function candidate(room=state?.room,selectedChannel=channelId()){
  // A selected member must never open the previously selected chat artist's feed.
  const selectedMember=window.FrommPreviewArtist?.state?.member||'';
  if(selectedMember){
    const rooms=Array.isArray(state?.rooms)?state.rooms:[];
    const matching=rooms.find(r=>String(r?.host?.artiId??r?.host?.id??r?.artiId??'')===selectedMember);
    if(matching)room=matching;
    else if(String(room?.host?.artiId??room?.host?.id??room?.artiId??'')!==selectedMember)return null;
  }
  if(!room||!room.host)return null;
  const declared=room.channelId??room.host?.channelId??room.channel?.id??'';
  if(declared&&selectedChannel&&String(declared)!==selectedChannel)return null;
  const id=room.host.artiId??room.host.id??room.artiId;
  if(id===undefined||id===null||!String(id).trim())return null;
  const name=String(room.host.nick||room.host.name||room.chatRoomName||'선택된 아티스트').trim();
  return {id:String(id),name,channel:String(selectedChannel||'')};
}
function safeUrl(value){
  if(typeof value!=='string'||!value.trim()||value.length>4096)return '';
  try{
    const url=new URL(value);
    // Prevent untrusted target origins, credentials, scripts, fragments containing secrets.
    const host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.username||url.password||!(/(^|\.)frommyarti\.com$/.test(host)))return '';
    if(!['443',''].includes(url.port))return '';
    return url.href;
  }catch{return '';}
}
function feedUrl(response){
  const objects=[
    response?.data?.channel,response?.data?.channelInfo,
    response?.data,response?.result?.channel,response?.result,
    response?.channel,response?.channelInfo,response
  ];
  for(const obj of objects){
    if(!obj||typeof obj!=='object'||Array.isArray(obj))continue;
    const raw=obj.channelFeedUrl;
    if(typeof raw==='string'&&raw.trim())return safeUrl(raw);
  }
  return '';
}
// Keep a short-lived result isolated by the current viewer account as well as artist.
function sourceKey(info){
  const account=typeof currentAccountScope==='function'?currentAccountScope():'preview-session';
  return account+':'+info.channel+':'+info.id;
}
function clearScope(){
  previousScope='';
  for(const controller of pending.values())controller.abort();
  pending.clear();
}
async function resolve(info){
  const key=sourceKey(info);
  if(cache.has(key))return cache.get(key);
  if(pending.has(key))return null;
  if(typeof frommApiRequest!=='function'||typeof FROMM_CHANNEL_API_BASE!=='string'){
    cache.set(key,{url:'',state:'no-client'});return cache.get(key);
  }
  const controller=new AbortController();
  pending.set(key,controller);
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const result=await frommApiRequest('/channels/arti',{
      method:'GET',base:FROMM_CHANNEL_API_BASE,query:{artiId:info.id},signal:controller.signal
    });
    if(controller.signal.aborted)return null;
    const url=feedUrl(result);
    const data={url,state:url?'linked':'no-feed-url'};
    cache.set(key,data);return data;
  }catch{
    // A read-only endpoint may not accept this account or cross-origin context.
    const data={url:'',state:'unavailable'};cache.set(key,data);return data;
  }finally{
    clearTimeout(timeout);pending.delete(key);
  }
}
function renderNote(){
  const host=document.querySelector('.channel-list-shell .channel-media-tabs');
  if(!host)return;
  const noteId='fromm-preview-artist-feed-note';
  let note=document.getElementById(noteId);
  if(!enabled()){note?.remove();return;}
  if(!note){
    note=document.createElement('div');
    note.id=noteId;note.className='preview-artist-feed-note';
    note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    host.insertAdjacentElement('afterend',note);
  }
  const info=candidate();
  if(!info){
    const message='공식 Artist 피드: 현재 채팅방의 아티스트 ID를 확인할 수 없습니다.';
    if(note.textContent!==message)note.textContent=message;
    return;
  }
  const scope=sourceKey(info);
  if(scope!==previousScope){
    previousScope=scope;
    // Do not fetch until selected Artist category and authenticated room context exist.
    void resolve(info).then(()=>{if(enabled()&&scope===previousScope)paint();});
  }
  paint();
}
function paint(){
  const node=document.getElementById('fromm-preview-artist-feed-note');
  if(!node||!enabled())return;
  const info=candidate();
  if(!info)return;
  const record=cache.get(sourceKey(info));
  const text={
    'no-client':'공식 Artist 피드 연결 도구를 초기화할 수 없습니다.',
    'no-feed-url':'공식 Artist 피드 주소가 응답에 없거나 안전하게 확인되지 않았습니다.',
    'unavailable':'공식 Artist 피드 정보 조회에 실패했습니다. 계정 권한 또는 API 응답을 확인해야 합니다.'
  };
  if(!record){
    const label='공식 Artist 피드 주소를 확인 중…';
    if(node.textContent!==label)node.textContent=label;
    return;
  }
  if(record.url){
    // Link opens official site; separate list API remains unverified.
    if(node.dataset.feedUrl===record.url)return;
    node.dataset.feedUrl=record.url;
    node.replaceChildren();
    const label=document.createElement('span');
    label.textContent='공식 피드 연결 확인 · ';
    const link=document.createElement('a');
    link.href=record.url;link.target='_blank';link.rel='noopener noreferrer';
    link.referrerPolicy='no-referrer';link.textContent=info.name+' 피드 열기';
    link.setAttribute('aria-label',info.name+' 공식 Artist 피드 새 창에서 열기');
    const note=document.createElement('small');
    note.textContent='사진·영상 목록을 웹 안에 표시하는 기능은 아직 검증되지 않았습니다.';
    node.append(label,link,note);
  }else{
    const msg=text[record.state]||'공식 Artist 피드 정보를 아직 확인하지 못했습니다.';
    if(node.textContent!==msg)node.textContent=msg;
  }
}
function tick(){
  if(!enabled()){document.getElementById('fromm-preview-artist-feed-note')?.remove();previousScope='';return;}
  const current=candidate();
  const scope=current?sourceKey(current):'';
  if(previousScope&&scope!==previousScope)previousScope='';
  renderNote();
}
function boot(){
  const timeline=document.querySelector('#timeline');
  if(!timeline)return;
  observer=new MutationObserver(tick);
  observer.observe(timeline,{childList:true,subtree:true});
  tick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pagehide',()=>{clearScope();observer?.disconnect();cache.clear();});
window.FrommPreviewArtistFeed=Object.freeze({
  candidate,safeUrl,feedUrl,
  get snapshot(){return {mounted:true,checkedSources:cache.size,pendingSources:pending.size};}
});
})();
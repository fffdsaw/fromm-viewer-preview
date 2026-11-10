/* Fromm Viewer Preview: locally observed new messages and reliable quote navigation.
 * Operates only in the independent preview deployment. No credentials/messages persisted. */
(function(){
'use strict';
const quoteOriginal=getQuotedMessage;
const renderOriginal=renderMessage;
const SAMPLE=50, POLL_MS=120000;
const observations=new Map();
let account='', lastPoll=0, polling=false, cooldown=0;
const labelTime=m=>{
 const n=new Date(m?.createdAt).getTime();
 return Number.isFinite(n)&&n>0?n:0;
};
const roomId=r=>String(r?.hostChatRoomId||'');
const currentAccount=()=>{
 const auth=currentAuth();
 return auth?.token && document.getElementById('loginGate')?.classList.contains('hidden')
  ?String(currentAccountScope()||''):'';
};
const storageKey=(a,id)=>'fromm.preview.unread.v1:'+JSON.stringify([a,id]);
function watermark(id){
 if(!account||!id)return null;
 try{const n=JSON.parse(localStorage.getItem(storageKey(account,id))||'null');
  return Number.isFinite(n)&&n>=0?n:null;
 }catch{return null;}
}
function saveWatermark(id,time){
 if(!account||!id||!Number.isFinite(time)||time<=0)return;
 const previous=watermark(id);
 if(previous!=null&&time<=previous)return;
 try{localStorage.setItem(storageKey(account,id),JSON.stringify(time));}catch{}
}
function quoteCandidate(value){
 const q=normalizeQuotedValue(value);
 return q&&q.messageId?q:null;
}
getQuotedMessage=function(message){
 const primary=quoteOriginal(message);
 if(!primary)return null;
 if(primary.messageId)return primary;
 // Some payloads split the display text from the canonical original ID.
 for(const key of ['mentionedMessage','embeddedMentionedMessage','mentionDetailMessage','replyMessage','embeddedReplyMessage','quotedMessage','mentionDetail']){
  const candidate=quoteCandidate(message?.[key]);
  if(candidate&&candidate.content&&String(candidate.content).trim()===String(primary.content||'').trim()){
   return {...primary,messageId:candidate.messageId,userId:primary.userId||candidate.userId};
  }
 }
 for(const key of ['mentionedMessageId','replyMessageId','quotedMessageId','originalMessageId']){
  const id=message?.[key];
  if((typeof id==='string'&&id.trim())||(Number.isSafeInteger(id)&&id>0)){
   return {...primary,messageId:String(id)};
  }
 }
 return primary;
};
function quoteAuthor(message,quoted){
 const self=currentReplyUserId();
 const original=quoted?.messageId?state.chatMessages?.find(m=>messageStableKey(m)===String(quoted.messageId)):null;
 if(original){
  if(isArtist(original))return '아티스트';
  const originalId=String(original.userId||'');
  if(self&&originalId===self)return '나';
  if(originalId&&self&&originalId!==self)return '팬';
  return '인용';
 }
 if(self&&quoted?.userId===self)return '나';
 if(self&&quoted?.userId&&quoted.userId!==self&&isArtist(message))return '팬';
 return '인용';
}
function notify(message){
 let node=document.getElementById('previewChatNotice');
 if(!node){
  node=document.createElement('div');node.id='previewChatNotice';node.setAttribute('role','status');
  document.body.append(node);
 }
 node.textContent=message;
 clearTimeout(notify.timer);
 notify.timer=setTimeout(()=>{if(node.isConnected)node.remove();},3200);
}
function quoteMarkup(quote,message){
 const quoted=getQuotedMessage(message);
 if(!quoted)return;
 const kind=quoteAuthor(message,quoted);
 quote.classList.add('preview-quote');
 quote.classList.toggle('preview-quote-mine',kind==='나');
 quote.classList.toggle('preview-quote-fan',kind==='팬');
 quote.dataset.quotedId=String(quoted.messageId||'');
 const label=quote.querySelector('.reply-label');
 if(label)label.textContent='↳ '+kind;
 const available=!!quoted.messageId;
 quote.tabIndex=0;quote.setAttribute('role','button');
 quote.setAttribute('aria-label',available?'인용 원문으로 이동':'인용 원문 ID 없음');
 quote.title=available?'원문 메시지로 이동':'원문의 식별 정보가 없어 이동할 수 없습니다.';
 const open=()=>available?void scrollToOriginalMessage(quoted.messageId):notify('원문의 식별 정보가 없어 이동할 수 없습니다.');
 quote.onclick=open;
 quote.onkeydown=event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}
 };
}
renderMessage=function(message){
 const node=renderOriginal(message);
 const quote=node.querySelector('.reply-quote');
 if(quote)quoteMarkup(quote,message);
 return node;
};
syncVisibleReplyLabels=function(){
 const byId=new Map((state.chatMessages||[]).map(m=>[messageStableKey(m),m]));
 document.querySelectorAll('#timeline .msg').forEach(node=>{
  const message=byId.get(node.dataset.messageId);
  const quote=node.querySelector('.reply-quote');
  if(message&&quote)quoteMarkup(quote,message);
 });
};
const resetOriginal=resetReplyIdentity;
resetReplyIdentity=function(){
 const result=resetOriginal.apply(this,arguments);
 document.querySelectorAll('#timeline .preview-quote').forEach(quote=>{
  quote.classList.remove('preview-quote-mine','preview-quote-fan');
  const label=quote.querySelector('.reply-label');
  if(label)label.textContent='↳ 인용';
 });
 return result;
};
scrollToOriginalMessage=async function(messageId){
 const targetId=String(messageId||'');
 if(!targetId){notify('원문의 식별 정보가 없어 이동할 수 없습니다.');return false;}
 const generation=state.scanGeneration;
 window.FrommViewState?.cancel();
 state.onlyMyReplies=false;state.chatQuery='';state.chatMatchKey='';
 const search=document.getElementById('chatSearchInput');
 if(search)search.value='';
 syncMyReplyTools();
 if(state.filter!=='all')await setFilter('all',{autoTop:false});
 const loaded=await ensureFullChatHistory();
 if(generation!==state.scanGeneration)return false;
 if(!loaded){notify('대화 기록을 끝까지 불러오지 못했습니다. 다시 시도해 주세요.');return false;}
 const list=filteredMessages(),index=list.findIndex(m=>messageStableKey(m)===targetId);
 if(index<0){notify('서버에서 제공한 대화 기록에 원문이 없습니다.');return false;}
 window.FrommViewState?.cancel();
 state.chatAutoTopPending=false;
 const result=renderChatWindow(list,index);
 const selector='.msg[data-message-id="'+CSS.escape(targetId)+'"]';
 const target=document.querySelector(selector);
 if(!result||!target){notify('원문 위치를 표시하지 못했습니다.');return false;}
 const version=result.version;
 requestAnimationFrame(()=>{
  if(generation!==state.scanGeneration||version!==state.infiniteVersion||!target.isConnected)return;
  scrollElementBelowToolbar(target,'instant');
  target.classList.add('reply-target-flash');
  window.FrommViewState?.settleAnchor(target,chatHeaderInset,
   ()=>generation===state.scanGeneration&&version===state.infiniteVersion,1200);
  setTimeout(()=>target.classList.remove('reply-target-flash'),1800);
 });
 return true;
};
function visibleLatest(){
 if(document.hidden||state.filter!=='all'||state.chatAutoTopPending||!state.chatHistoryComplete)return false;
 const dock=document.getElementById('conversationDock');
 if(!dock||dock.hidden)return false;
 const rows=document.querySelectorAll('#timeline .msg');
 const last=rows[rows.length-1],list=state.infiniteList||[];
 if(!last||!list.length||state.infiniteRendered<list.length||last.dataset.messageId!==messageStableKey(list[list.length-1]))return false;
 return document.documentElement.scrollHeight-(scrollY+innerHeight)<Math.max(220,(dock?.offsetHeight||0)+60);
}
function artistRows(rows){return(rows||[]).filter(m=>isArtist(m)&&labelTime(m)>0);}
function observe(id,rows,full=false){
 if(!id||!Array.isArray(rows)||!rows.length)return;
 const latest=artistRows(rows),most=latest.reduce((n,m)=>Math.max(n,labelTime(m)),0);
 if(!most)return;
 if(watermark(id)==null)saveWatermark(id,most); // First observation creates a local baseline, not retroactive unread.
 const state=observations.get(id)||{rows:[],complete:false};
 if(full||!state.complete){state.rows=rows;state.complete=!!full;}
 else if(!state.rows.length||labelTime(rows.at(-1))>labelTime(state.rows.at(-1))){state.rows=rows;}
 observations.set(id,state);
 paintBadges();
}
function unread(id){
 const s=observations.get(id),mark=watermark(id);
 if(mark==null||!s?.rows?.length)return{count:0,capped:false};
 const count=artistRows(s.rows).filter(m=>labelTime(m)>mark).length;
 const earliest=Math.min(...s.rows.map(labelTime).filter(Boolean));
 return{count,capped:!s.complete&&s.rows.length>=SAMPLE&&earliest>mark};
}
function paintBadges(){
 const rooms=document.querySelectorAll('#rooms .room');
 rooms.forEach((button,index)=>{
  const id=roomId(state.rooms[index]),item=unread(id);
  let badge=button.querySelector('.preview-unread-badge');
  if(!id||!item.count){badge?.remove();return;}
  if(!badge){badge=document.createElement('span');badge.className='preview-unread-badge';button.append(badge);}
  badge.textContent=item.count>99?'99+':item.capped?String(item.count)+'+':String(item.count);
  badge.title='이 브라우저에서 확인한 이후 새 메시지 (공식 읽음 아님)';
  badge.setAttribute('aria-label',badge.title+' '+item.count+'개');
 });
}
function tick(){
 const a=currentAccount();
 if(a!==account){account=a;observations.clear();lastPoll=0;cooldown=0;}
 if(!a){document.querySelectorAll('.preview-unread-badge').forEach(b=>b.remove());return;}
 const room=state.room,id=roomId(room);
 if(id&&state.filter==='all'&&state.chatMessages?.length){
  const rows=state.chatMessages;
  observe(id,rows,true);
  if(visibleLatest()){
   const highest=artistRows(rows).reduce((n,m)=>Math.max(n,labelTime(m)),0);
   if(highest>0){saveWatermark(id,highest);paintBadges();}
  }
 }
 paintBadges();
 if(!polling&&Date.now()-lastPoll>POLL_MS&&Date.now()>=cooldown&&state.rooms?.length){
  lastPoll=Date.now();
  void pollOnce();
 }
}
async function pollOnce(){
 if(polling||!currentAccount()||document.hidden)return;
 const startScope=currentAccount(),token=currentAuth().token;
 polling=true;
 try{
  const rooms=(state.rooms||[]).filter(r=>roomId(r)&&roomId(r)!==roomId(state.room)).slice(0,12);
  for(const room of rooms){
   if(document.hidden||currentAccount()!==startScope||currentAuth().token!==token)break;
   try{
    const result=await frommApiJson(FROMM_COMPAT.endpoints.messages(roomId(room)),
     {findStartAt:'2000-01-01T00:00:00.000Z',findEndAt:new Date().toISOString(),limit:String(SAMPLE)});
    const rows=extractMessages(result);
    if(currentAccount()!==startScope)break;
    observe(roomId(room),rows,false);
   }catch(error){
    if(error?.status===429){cooldown=Date.now()+300000;break;}
    if(error?.status===401||error?.status===403)break;
   }
   await new Promise(resolve=>setTimeout(resolve,750));
  }
 }finally{polling=false;}
}
const styles=document.createElement('style');
styles.textContent=[
 '.room{display:flex;align-items:center;justify-content:space-between;gap:8px}',
 '.preview-unread-badge{display:inline-grid;place-items:center;flex-shrink:0;min-width:21px;height:21px;padding:0 5px;border-radius:999px;background:#359e86;color:#fff;font:700 11px/1 system-ui;box-sizing:border-box;box-shadow:0 1px 4px #16534425}',
 '.reply-quote.preview-quote{display:flex;align-items:flex-start;gap:8px;border-left:3px solid #62b9a7;background:#e4f2edbf;padding:9px 11px;outline-offset:2px}',
 '.preview-quote .reply-label{flex:0 0 auto;white-space:nowrap;font-size:12px;font-weight:750;color:#397e70;margin:0}',
 '.preview-quote .reply-content{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;-webkit-line-clamp:unset;color:#355c52;font-size:12px}',
 '.reply-quote.preview-quote-mine{border-left-color:#55bca4}',
 '.reply-quote.preview-quote-fan{border-left-color:#8ca9c9}',
 '#previewChatNotice{position:fixed;left:50%;bottom:calc(var(--conversation-height,50px) + var(--conversation-keyboard,0px) + 30px);transform:translateX(-50%);max-width:min(90vw,460px);background:#173d35ee;color:white;padding:10px 14px;border-radius:12px;font:13px/1.4 system-ui;z-index:1000;box-shadow:0 5px 24px #143b3140}',
 'body.conversation-open .main{padding-bottom:calc(var(--conversation-height,50px) + var(--conversation-keyboard,0px) + 18px)}',
 'body.conversation-open #scrollTopBtn{bottom:calc(var(--conversation-height,50px) + var(--conversation-keyboard,0px) + 18px)}',
 '@media(prefers-reduced-motion:reduce){.reply-target-flash .bubble{animation:none!important}}'
].join('\n');
document.head.append(styles);
window.FrommPreviewUnread={tick,pollOnce,unread,observe};
setInterval(tick,1200);
window.addEventListener('pageshow',tick);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
tick();
})();
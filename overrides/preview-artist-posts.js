/* Preview-only read-only Artist posts experiment.
 * Evidence: official channel web JS GET /posts and GET /posts/{postId},
 * channel-id header, author / mediaType / media fields.
 * Query cursor and authenticated response have NOT been verified in a live account.
 * No credentials, signed URLs, media or response bodies are persisted/logged.
 */
(()=>{'use strict';
if(!location.pathname.startsWith('/fromm-viewer-preview/'))return;
const SOURCE='official-artist-posts';
let key='',controller=null,version=0,revision=0,status='idle',error='',allPosts=[],isLast=null,modal=null;
const scope=()=>String(channelVideoState?.channelId||'')+'|'+
  (typeof currentAccountScope==='function'?currentAccountScope():'');
const active=()=>state?.filter==='live'&&state.live?.centerMode==='channel'&&
  !channelVideoState?.selected&&window.FrommPreviewArtist?.state?.category==='artist'&&
  !!channelVideoState.channelId;
const sameSession=()=>typeof channelVideoSession==='function'?channelVideoSession():()=>false;
const safeUrl=value=>{
  if(typeof value!=='string'||value.length>4096)return '';
  try{
    const u=new URL(value);
    return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';
  }catch{return '';}
};
const mediaArray=post=>{
  const fromArray=Array.isArray(post?.media)?post.media:[];
  const t=post?.mediaType;
  const files=fromArray.filter(m=>m&&typeof m==='object'&&safeUrl(m.url)&&
    (!['image','video'].includes(t)||!m.mediaType||m.mediaType===t))
    .map(m=>({url:safeUrl(m.url),thumbnailUrl:safeUrl(m.thumbnailUrl)||safeUrl(m.url),
      mediaType:m.mediaType||t,runningTime:Number(m.runningTime)||0}));
  if(files.length)return files;
  const direct=safeUrl(post?.mediaUrl);
  return direct?[{url:direct,thumbnailUrl:safeUrl(post.thumbnailUrl)||direct,
    mediaType:t,runningTime:Number(post.mediaRunningTime)||0}]:[];
};
function normalize(raw){
  const p=raw?.post||raw;
  if(!p||typeof p!=='object'||p.id==null||p.isVisible!==true)return null;
  const files=mediaArray(p),type=['image','video'].includes(p.mediaType)
    ?p.mediaType:files.find(m=>['image','video'].includes(m.mediaType))?.mediaType;
  if(!['image','video'].includes(type)||!files.some(m=>m.mediaType===type))return null;
  const author=p.author;
  if(!author||typeof author!=='object')return null;
  const authorId=author.id??author.artiId;
  const name=String(author.name||author.nickname||'').trim();
  if(authorId==null&&!name)return null;
  const createdAt=p.createdAt??p.updatedAt??null;
  return {id:String(p.id),type,media:files.filter(m=>m.mediaType===type),
    artist:{id:String(authorId??'name:'+name),name:name||'아티스트'},
    title:String(p.content||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,100)||(
      type==='image'?'Artist 사진':'Artist 영상'),
    createdAt,displayStartAt:typeof createdAt==='number'?createdAt:
      Number(new Date(createdAt))||0,
    isMembershipOnly:p.isMembershipOnly===true,isOfficialPost:p.isOfficialPost===true,
    _source:SOURCE};
}
function parsePage(raw){
  const wrappers=[raw?.data,raw?.result,raw];
  const root=wrappers.find(x=>x&&typeof x==='object'&&Array.isArray(x.posts));
  if(!root)throw Object.assign(new Error('Artist 게시물 목록 응답 형식을 확인하지 못했습니다.'),{code:'SCHEMA'});
  const seen=new Set();
  const posts=[];
  for(const item of root.posts){
    const p=normalize(item);
    if(p&&!seen.has(p.id)){seen.add(p.id);posts.push(p);}
  }
  return {posts,isLast:typeof root.isLast==='boolean'?root.isLast:null,
    rawCount:root.posts.length};
}
function memberPosts(){return status==='ready'?allPosts:[];}
function visiblePosts(){
  const member=window.FrommPreviewArtist?.state?.member||'';
  return allPosts.filter(p=>!member||p.artist.id===member);
}
function dispose(){
  version++;
  controller?.abort();controller=null;
  key='';status='idle';error='';allPosts=[];isLast=null;revision++;
  modal?.close();modal?.remove();modal=null;
}
async function load(force=false){
  if(!active()){dispose();return;}
  const next=scope();
  if(next===key&&!force&&status!=='idle')return;
  controller?.abort();const request=new AbortController(),id=++version,verify=sameSession();
  controller=request;key=next;status='loading';error='';allPosts=[];isLast=null;revision++;paint();
  try{
    if(typeof frommApiRequest!=='function'||typeof FROMM_CHANNEL_API_BASE!=='string')throw new Error('NO_CLIENT');
    if(!verify())throw Object.assign(new Error('NO_AUTH'),{status:401});
    // No guessed query parameters or pagination: first page only.
    const result=await frommApiRequest('/posts',{
      base:FROMM_CHANNEL_API_BASE,channelId:channelVideoState.channelId,signal:request.signal
    });
    if(id!==version||!verify()||scope()!==next||!active())return;
    const data=parsePage(result);
    allPosts=data.posts;isLast=data.isLast;status='ready';
  }catch(e){
    if(id!==version||request.signal.aborted||scope()!==next||!active())return;
    status='error';
    const http=Number(e?.status||0);
    error=http===401||http===403?'auth':http===400?'query':
      http===404?'endpoint':e?.code==='SCHEMA'?'schema':'network';
  }finally{
    if(id===version){controller=null;revision++;paint();window.FrommPreviewArtist?.syncUI?.();}
  }
}
function rootNode(){
  const host=document.querySelector('.channel-list-shell .video-list-content');
  if(!host)return null;
  if(host.firstElementChild?.dataset?.previewArtistPosts===key+':'+revision)return null;
  host.replaceChildren();
  const root=document.createElement('div');
  root.className='preview-artist-posts';
  root.dataset.previewArtistPosts=key+':'+revision;
  host.append(root);
  return root;
}
function make(tag,className,textValue){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(textValue!==undefined)el.textContent=String(textValue);
  return el;
}
function emptyText(){
  if(status==='loading')return '공식 Artist 게시물을 불러오는 중…';
  if(status==='error'){
    return ({auth:'Artist 피드 인증이 거부됐습니다(401/403). 현재 계정의 접근 권한을 확인해야 합니다.',
      query:'Artist 피드 조회 조건이 아직 확인되지 않아 서버가 요청을 거부했습니다(400).',
      endpoint:'Artist 목록 경로가 이 계정/API에서 확인되지 않았습니다(404).',
      schema:'Artist 목록의 응답 형식이 예상과 달라 데이터를 표시하지 않았습니다.',
      network:'Artist 피드 연결에 실패했습니다. CORS 또는 네트워크 상태를 확인해주세요.'})[error];
  }
  return status==='ready'?'이 첫 페이지에 표시 가능한 Artist 사진·영상이 없습니다.':'Artist 목록을 준비 중입니다.';
}
function card(p){
  const item=make('article','replay-card channel-video-card preview-artist-card');
  const top=make('div','replay-thumb');
  const thumb=safeUrl(p.media[0]?.thumbnailUrl);
  if(thumb){const image=make('img');image.alt='';image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.src=thumb;top.append(image);}
  else top.append(make('span','replay-thumb-empty',p.type==='image'?'Artist 사진':'Artist 영상'));
  const btn=make('button','replay-play',p.type==='image'?'▣':'▶');
  btn.type='button';btn.dataset.previewArtistOpen=p.id;
  btn.setAttribute('aria-label',(p.artist.name||'아티스트')+' '+(p.type==='image'?'사진':'영상')+' 보기');
  top.append(btn);item.append(top);
  const body=make('div','replay-body');
  body.append(make('div','replay-title',p.title));
  const date=p.displayStartAt?new Date(p.displayStartAt).toLocaleDateString('ko-KR'):'';
  body.append(make('div','replay-meta',p.artist.name+(date?' · '+date:'')+
    (p.isMembershipOnly?' · 멤버십':'')+(p.type==='image'?' · 사진 '+p.media.length+'장':' · 영상')));
  item.append(body);return item;
}
function paint(){
  if(!active())return;
  if(scope()!==key){void load();return;}
  const root=rootNode();
  if(root){
    if(status==='ready'&&visiblePosts().length){
      const grid=make('div','replay-grid');
      for(const p of visiblePosts())grid.append(card(p));
      root.append(grid);
      if(isLast===false)root.append(make('p','preview-artist-posts-note','첫 페이지까지만 표시 중 · 다음 페이지 조회 조건 확인 필요'));
    }else root.append(make('p','replay-empty preview-artist-posts-empty',emptyText()));
  }
  // The copied Channel renderer may retain or repaint the toolbar without
  // replacing our grid. Always reconcile the counter and footer independently.
  const counter=document.querySelector('.channel-list-shell .replay-count');
  if(counter){const label=status==='ready'?'Artist '+visiblePosts().length+'개':'Artist · '+(status==='loading'?'불러오는 중':status==='error'?'연결 실패':'확인 중');if(counter.textContent!==label)counter.textContent=label;}
  const footer=document.querySelector('.channel-list-shell .video-list-footer');
  if(footer)footer.hidden=true;
}
function sync(){
  if(!active()){
    if(key||status!=='idle')dispose();
    return;
  }
  if(scope()!==key){void load();return;}
  paint();
}
async function openPost(id){
  const item=allPosts.find(p=>p.id===id);
  if(!active()||!item||modal)return;
  const verify=sameSession(),selectedKey=key;
  const dialog=make('dialog','preview-artist-post-dialog');
  const bar=make('header','preview-artist-post-bar');
  bar.append(make('strong','',item.artist.name+' · '+(item.type==='image'?'사진':'영상')));
  const close=make('button','btn','닫기');close.type='button';close.addEventListener('click',()=>dialog.close());
  bar.append(close);
  const statusEl=make('p','preview-artist-post-status','게시물 미디어 확인 중…');
  const stage=make('div','preview-artist-post-stage');dialog.append(bar,statusEl,stage);
  dialog.addEventListener('close',()=>{dialog.querySelector('video')?.pause();dialog.remove();if(modal===dialog)modal=null;});
  document.body.append(dialog);modal=dialog;dialog.showModal();
  let detail=item;
  const abort=new AbortController();
  dialog.addEventListener('close',()=>abort.abort(),{once:true});
  try{
    const data=await frommApiRequest('/posts/'+encodeURIComponent(id),{
      base:FROMM_CHANNEL_API_BASE,channelId:channelVideoState.channelId,signal:abort.signal
    });
    if(!verify()||selectedKey!==key||!dialog.open||!active())return;
    const source=data?.data?.post||data?.result?.post||data?.post;
    const parsed=normalize(source);
    if(!parsed||parsed.id!==id)throw new Error('DETAIL_MISMATCH');
    detail=parsed;
  }catch{
    if(!verify()||selectedKey!==key||!dialog.open)return;
    // Never use possibly expired list URLs to bypass a failed detail check.
    statusEl.textContent='게시물 상세 조회 또는 접근 권한을 확인하지 못했습니다.';
    return;
  }
  if(!dialog.open)return;
  const files=detail.media.filter(m=>safeUrl(m.url));
  if(!files.length){statusEl.textContent='표시할 미디어 주소가 없습니다.';return;}
  let index=0;statusEl.textContent='';
  const show=()=>{
    stage.replaceChildren();
    const f=files[index];
    if(detail.type==='image'){
      const img=make('img');img.src=f.url;img.alt='Artist 사진 '+(index+1);
      img.referrerPolicy='no-referrer';stage.append(img);
      if(files.length>1){
        const nav=make('nav','preview-artist-post-nav');
        const prev=make('button','btn','이전');prev.type='button';prev.onclick=()=>{index=(index-1+files.length)%files.length;show();};
        const label=make('span','',(index+1)+' / '+files.length);
        const next=make('button','btn','다음');next.type='button';next.onclick=()=>{index=(index+1)%files.length;show();};
        nav.append(prev,label,next);stage.append(nav);
      }
    }else{
      const video=make('video');video.controls=true;video.playsInline=true;video.preload='metadata';
      video.referrerPolicy='no-referrer';video.src=f.url;stage.append(video);
      if(/\.m3u8(?:\?|$)/i.test(f.url)&&!video.canPlayType('application/vnd.apple.mpegurl')){
        stage.append(make('p','preview-artist-post-status','이 브라우저는 HLS 영상 직접 재생을 지원하지 않을 수 있습니다.'));
      }
    }
  };
  show();
}
document.addEventListener('click',e=>{
  if(!active())return;
  const open=e.target.closest?.('[data-preview-artist-open]');
  if(open){e.preventDefault();e.stopImmediatePropagation();void openPost(open.dataset.previewArtistOpen);return;}
  const reload=e.target.closest?.('#channelRefresh');
  if(reload){e.preventDefault();e.stopImmediatePropagation();void load(true);}
},true);
function boot(){
  const timeline=document.querySelector('#timeline');if(!timeline)return;
  const observer=new MutationObserver(sync);
  observer.observe(timeline,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{observer.disconnect();dispose();});
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.FrommPreviewArtistPosts=Object.freeze({
  normalize,parsePage,safeUrl,memberPosts,
  sync,reload:()=>load(true),
  get snapshot(){return {active:active(),status,error,count:allPosts.length,isLast};}
});
})();

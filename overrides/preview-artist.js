/* Preview-only Artist filter experiment. It never modifies the source repository.
 * The existing mixed Channel media list is the only verified post source.
 * Artist authorship must be explicit: never invent an Artist feed API or author. */
(()=>{'use strict';
 if(!location.pathname.startsWith('/fromm-viewer-preview/'))return;
 let category='all',member='',lastChannel='',observer=null;
 const LABELS={all:'전체',video:'영상',image:'사진',artist:'Artist'};
 const channelActive=()=>typeof state!=='undefined'&&state.filter==='live'&&state.live.centerMode==='channel'&&!channelVideoState.selected;
 const channelPosts=()=>{const page=typeof channelVideoPage==='function'?channelVideoPage():null;return Array.isArray(page?.posts)?page.posts:[];};
 function attribution(post){
   // Both uploaded photos and uploaded videos may carry explicit artist metadata.
   if(!post||!['image','video'].includes(post.type))return null;
   const person=post.artist&&typeof post.artist==='object'?post.artist:null;
   const identifier=person?.id??post.artistId??post.memberId;
   const name=person?.nick||person?.name||post.artistName||post.memberName||'';
   // Only explicit member/artist fields count; generic authors may be channel staff.
   if(identifier==null&&!String(name).trim())return null;
   const id=identifier!=null?String(identifier):'name:'+String(name).trim();
   return {id,name:String(name).trim()||'아티스트'};
 }
 function collectMembers(posts=channelPosts()){
   const map=new Map();
   for(const p of posts){const a=attribution(p);if(a&&!map.has(a.id))map.set(a.id,a);}
   return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 }
 function filterPosts(posts){
   if(category!=='artist')return posts;
   return posts.filter(p=>{const a=attribution(p);return a&&(!member||a.id===member);});
 }
 // The copied preview HTML invokes filterPosts directly from
 // visibleChannelPosts(). Avoid monkey-patching a global that the original
 // renderer may capture before this script loads.
 function syncScope(){
   if(!channelActive())return;
   const id=String(channelVideoState.channelId||'');
   if(lastChannel!==id){member='';lastChannel=id;}
 }
 function update(){
   if(!channelActive())return;
   syncScope();
   const trigger=document.querySelector('.channel-list-shell [data-channel-content-menu]');
   if(!trigger)return;
   const label=LABELS[category]||LABELS.all;
   // The upstream renderer still uses its underlying media type. Do not
   // let subsequent "사진" renders replace the independent Artist selection.
   const text=trigger.firstChild;
   if(text?.nodeType===Node.TEXT_NODE&&text.textContent!==label+' ')text.textContent=label+' ';
   if(trigger.dataset.previewArtistCategory!==category)trigger.dataset.previewArtistCategory=category;
   const accessibleLabel='채널 콘텐츠: '+label;
   if(trigger.getAttribute('aria-label')!==accessibleLabel)trigger.setAttribute('aria-label',accessibleLabel);
   let memberButton=document.querySelector('[data-preview-artist-member]');
   const host=trigger.closest('.channel-media-tabs');
   if(category==='artist'&&host){
     if(!memberButton){
       memberButton=document.createElement('button');
       memberButton.type='button';memberButton.className='btn channel-content-trigger preview-artist-member';
       memberButton.dataset.previewArtistMember='';
       memberButton.setAttribute('aria-haspopup','menu');
       memberButton.setAttribute('aria-expanded','false');
       host.append(memberButton);
     }
     const selected=collectMembers().find(m=>m.id===member);
     const text=selected?.name||'전체 멤버';
     if(memberButton.dataset.label!==text){
       memberButton.dataset.label=text;
       memberButton.replaceChildren(document.createTextNode(text+' ▾'));
     }
   }else memberButton?.remove();
   const count=document.querySelector('.channel-list-shell .replay-count');
   if(count&&category==='artist'){
     const n=filterPosts(channelPosts()).length;
     const message='Artist '+n+'개';
     if(count.textContent!==message)count.textContent=message;
   }
   const empty=document.querySelector('.channel-list-shell .replay-empty');
   if(empty&&category==='artist'&&!channelVideoState.loading){
     const message=collectMembers().length
       ?'선택한 멤버가 올린 것으로 확인되는 사진·영상이 없습니다.'
       :'이 채널의 미디어 중 아티스트 작성자를 확인할 수 있는 사진·영상이 없습니다. 공식 Artist 피드 전체 목록은 아직 연결되지 않았습니다.';
     if(empty.textContent!==message)empty.textContent=message;
   }
 }
 function refresh(){if(channelActive()&&typeof renderLiveView==='function')renderLiveView();queueMicrotask(update);}
 async function choose(value){
   const next=Object.hasOwn(LABELS,value)?value:'all',changed=category!==next;
   category=next;
   if(next!=='artist')member='';
   // Request the verified mixed media feed for Artist. 'image' silently drops
   // every artist video, but 'artist' itself is not a supported API mediaType.
   const underlyingType=next==='artist'?'all':next;
   try{
     if(channelVideoState.mediaType!==underlyingType)await selectChannelMediaType(underlyingType);
     else if(changed)refresh();
   }finally{
     update();
   }
 }
 function menu(trigger,items,onSelect,label){
   const morph=window.FrommMorphMenus;
   if(morph?.open){
     void morph.open(trigger,{items,onSelect,label});
     return;
   }
   // Fallback if the optional optics module failed: functional native select.
   const native=document.createElement('select');
   native.className='preview-artist-native';
   native.setAttribute('aria-label',label);
   for(const option of items){const o=document.createElement('option');o.value=option.value;o.textContent=option.label;o.selected=!!option.selected;native.append(o);}
   const rect=trigger.getBoundingClientRect();
   native.style.cssText='position:fixed;z-index:2147483000;left:'+Math.max(8,Math.min(rect.left,innerWidth-190))+'px;top:'+Math.min(rect.bottom+6,innerHeight-50)+'px';
   document.body.append(native);native.focus();native.onchange=()=>{void onSelect(native.value);native.remove();};native.onblur=()=>native.remove();
 }
 function openCategory(trigger){
   menu(trigger,['all','video','image','artist'].map(value=>({value,label:LABELS[value],selected:category===value})),choose,'채널 콘텐츠 선택');
 }
 function openMember(trigger){
   const available=collectMembers();
   menu(trigger,[{value:'',label:'전체 멤버',selected:!member},...available.map(a=>({value:a.id,label:a.name,selected:member===a.id}))],value=>{
     member=value;refresh();
   },'Artist 멤버 선택');
 }
 // Select preview items in capture phase rather than relying on the upstream
 // morph menu's delayed callback; its owner/trigger can change before onclick.
 document.addEventListener('click',event=>{
   const item=event.target.closest?.('[data-morph-value]');
   if(!item||!item.closest('.morph-menu-content[aria-label="채널 콘텐츠 선택"]')||!channelActive())return;
   event.preventDefault();event.stopImmediatePropagation();
   window.FrommMorphMenus?.close?.(true,true);
   void choose(item.dataset.morphValue).catch(update);
 },true);
 document.addEventListener('click',event=>{
   const trigger=event.target.closest?.('[data-channel-content-menu],[data-preview-artist-member]');
   if(!trigger||!channelActive())return;
   event.preventDefault();event.stopPropagation();
   if(trigger.hasAttribute('data-preview-artist-member'))openMember(trigger);
   else openCategory(trigger);
 },true);
 document.addEventListener('keydown',event=>{
   if(!['ArrowDown','ArrowUp'].includes(event.key))return;
   const trigger=event.target.closest?.('[data-channel-content-menu],[data-preview-artist-member]');
   if(!trigger||!channelActive())return;
   event.preventDefault();event.stopPropagation();
   if(trigger.hasAttribute('data-preview-artist-member'))openMember(trigger);
   else openCategory(trigger);
 },true);
 const boot=()=>{
   const timeline=document.querySelector('#timeline');
   if(!timeline)return;
   observer=new MutationObserver(update);
   observer.observe(timeline,{childList:true,characterData:true,subtree:true});
   update();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.addEventListener('pagehide',()=>observer?.disconnect());
 window.FrommPreviewArtist=Object.freeze({
   attribution,collectMembers,filterPosts,
   get state(){return {category,member,channel:lastChannel};},
   choose
 });
})();
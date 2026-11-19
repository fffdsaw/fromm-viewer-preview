/* Preview-only fan nickname rendering.
 * Main Fromm Viewer code and persisted message objects are never modified. */
(()=>{
  'use strict';
  if(!location.pathname.startsWith('/fromm-viewer-preview/'))return;

  const nickByRoom=new Map();
  const checkedRooms=new Set();
  const pendingRooms=new Set();

  const cleanNick=value=>typeof value==='string'&&value.trim()&&value.trim().length<=80?value.trim():'';
  const activeRoom=()=>typeof state==='object'&&state?state.room:null;
  const roomKey=room=>String(room?.fanChatRoomId??room?.fanChatRoom?.id??room?.id??'').trim();

  function nickFor(message,room=activeRoom()){
    // A room-specific fan nickname is not the artist's display name.
    return cleanNick(room?.nick)
      ||cleanNick(room?.fanChatRoom?.nick)
      ||cleanNick(nickByRoom.get(roomKey(room)))
      ||cleanNick(message?.fanNick)
      ||'';
  }
  function nickRequested(message){
    return message?.hasNick===true||message?.hasNick===1||message?.hasNick==='true'
      ||(typeof message?.content==='string'&&message.content.includes('@@@'));
  }
  function isArtistText(message){
    return String(message?.userType||'').toLowerCase()==='star'
      &&String(message?.type||'').toLowerCase()==='text'
      &&typeof message?.content==='string';
  }
  function format(message,nick){
    const original=message?.content;
    if(!isArtistText(message)||!nick||!nickRequested(message))return original;
    // Official messages use two formats: an explicit @@@ token, or hasNick
    // with the prefix omitted from the original network message.
    if(original.includes('@@@'))return original.split('@@@').join(nick);
    if(message.hasNick===true||message.hasNick===1||message.hasNick==='true'){
      return original.startsWith(nick)?original:nick+original;
    }
    return original;
  }

  function refreshVisibleMessages(room){
    if(activeRoom()!==room)return;
    if(typeof messageStableKey!=='function'||typeof highlightText!=='function')return;
    const source=Array.isArray(state?.infiniteList)&&state.infiniteList.length
      ?state.infiniteList:state?.messages;
    if(!Array.isArray(source))return;
    const byKey=new Map();
    for(const message of source){
      if(!isArtistText(message)||!nickRequested(message))continue;
      const key=messageStableKey(message);
      if(key)byKey.set(key,message);
    }
    for(const node of document.querySelectorAll('#timeline .msg.star[data-message-id]')){
      const message=byKey.get(node.dataset.messageId);
      if(!message)continue;
      const displayed=format(message,nickFor(message,room));
      if(displayed===message.content)continue;
      const text=node.querySelector('.bubble > .text');
      if(text)text.innerHTML=highlightText(displayed,state.filter==='all'?state.chatQuery:'');
    }
  }

  function fetchRoomNick(room){
    const id=roomKey(room);
    // Do not guess a room ID from the host ID or use credentials outside the
    // app's existing authenticated API helper.
    if(!room||!id||checkedRooms.has(id)||pendingRooms.has(id)
      ||typeof frommApiJson!=='function')return;
    pendingRooms.add(id);
    Promise.resolve().then(()=>frommApiJson('/v2/chat/fanChatRooms/'+encodeURIComponent(id))).then(payload=>{
      const candidates=[
        payload?.data?.fanChatRoom,payload?.data?.chatRoom,
        payload?.data,payload?.result?.fanChatRoom,payload?.result,
        payload?.fanChatRoom,payload
      ];
      const nick=candidates.map(x=>cleanNick(x?.nick)).find(Boolean)||'';
      if(nick){
        nickByRoom.set(id,nick);
        refreshVisibleMessages(room);
      }
    }).catch(()=>{/* The original message stays visible if details are unavailable. */})
      .finally(()=>{pendingRooms.delete(id);checkedRooms.add(id);});
  }

  const original=window.renderMessage;
  if(typeof original!=='function')return;
  window.renderMessage=function(message,...args){
    if(!isArtistText(message)||!nickRequested(message))return original.call(this,message,...args);
    const room=activeRoom(),nick=nickFor(message,room);
    if(!nick)fetchRoomNick(room);
    const displayed=format(message,nick);
    // Temporary shallow copy: never change cached, downloaded or quoted originals.
    return original.call(this,displayed===message.content?message:{...message,content:displayed},...args);
  };

  window.FrommPreviewNickname=Object.freeze({
    format,
    nickFor,
    get status(){return {installed:true,roomNickAvailable:!!nickFor(null),checkedRoomCount:checkedRooms.size};}
  });
})();
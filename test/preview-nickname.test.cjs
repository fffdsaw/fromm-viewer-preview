'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../overrides/preview-nickname.js'),'utf8');

function mount(room={id:'room-a',nick:'명근'},site='/fromm-viewer-preview/'){
  const apiCalls=[],rendered=[];
  const state={room,messages:[],infiniteList:[],filter:'all',chatQuery:''};
  const window={renderMessage:msg=>{rendered.push(msg);return msg;}};
  const nodes=[];
  const document={querySelectorAll:()=>nodes};
  const request=async url=>{apiCalls.push(url);return {data:{fanChatRoom:{nick:'애칭'}}};};
  new Function('window','location','state','document','messageStableKey','highlightText','frommApiJson',source)(
    window,{pathname:site},state,document,
    m=>m.messageId||m.id||'',text=>text,request
  );
  return {window,state,apiCalls,rendered,nodes};
}

test('only installs on isolated preview path',()=>{
  const a=mount({id:'x',nick:'명근'},'/fromm-viewer/');
  assert.equal(a.window.FrommPreviewNickname,undefined);
  assert.equal(a.window.renderMessage({content:'그대로'}).content,'그대로');
});

test('hasNick prefix, @@@ substitution, and immutable original',()=>{
  const {window}=mount();
  const messages=[
    [{userType:'star',type:'text',hasNick:true,content:'이시원섭섭아쉽'},'명근이시원섭섭아쉽'],
    [{userType:'star',type:'text',hasNick:false,content:'@@@ 오늘도 @@@'},'명근 오늘도 명근'],
    [{userType:'star',type:'text',hasNick:1,content:'명근 안녕'},'명근 안녕'],
    [{userType:'star',type:'text',hasNick:false,content:'평범한 메시지'},'평범한 메시지'],
    [{userType:'fan',type:'text',hasNick:true,content:'안녕'},'안녕'],
    [{userType:'star',type:'image',hasNick:true,content:'사진'},'사진']
  ];
  for(const [m,want] of messages){
    const before=JSON.stringify(m);
    assert.equal(window.renderMessage(m).content,want);
    assert.equal(JSON.stringify(m),before,'original message remains untouched');
  }
});

test('unavailable nickname leaves the message intact',async()=>{
  const {window,apiCalls}=mount({id:'',nick:''});
  const original={userType:'star',type:'text',hasNick:true,content:'이시원섭섭아쉽'};
  assert.equal(window.renderMessage(original).content,original.content);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(apiCalls.length,0,'do not guess a room identifier');
});

test('detail nickname fetched once per room and updates text in place',async()=>{
  const {window,state,apiCalls,nodes}=mount({id:'room-test',nick:''});
  const message={messageId:'m1',userType:'star',type:'text',hasNick:true,content:'반가워'};
  state.messages=[message];
  const el={innerHTML:'반가워'};
  const node={dataset:{messageId:'m1'},querySelector:()=>el};
  nodes.push(node);
  assert.equal(window.renderMessage(message).content,'반가워');
  assert.equal(window.renderMessage(message).content,'반가워');
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(apiCalls,['/v2/chat/fanChatRooms/room-test']);
  assert.equal(el.innerHTML,'애칭반가워');
  assert.equal(message.content,'반가워');
  assert.equal(window.renderMessage(message).content,'애칭반가워');
});

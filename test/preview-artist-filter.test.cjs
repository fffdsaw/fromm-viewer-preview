'use strict';
// Regression for preview-only Artist selection; no login, tokens, or live API.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../overrides/preview-artist.js'),'utf8');

function mount(pathname='/fromm-viewer-preview/'){
  const handlers={},calls=[];
  const label={nodeType:3,textContent:'사진 '};
  const trigger={
    firstChild:label,dataset:{},
    closest(){return null;},
    getAttribute(name){return name==='aria-label'?this.ariaLabel||null:null;},
    setAttribute(name,value){if(name==='aria-label')this.ariaLabel=value;}
  };
  const count={textContent:'사진 게시물 0개'};
  const empty={textContent:'이 페이지에 업로드된 사진이 없습니다.'};
  const document={
    readyState:'loading',
    addEventListener(type,fn){(handlers[type]??=[]).push(fn);},
    querySelector(selector){
      if(selector==='.channel-list-shell [data-channel-content-menu]')return trigger;
      if(selector==='.channel-list-shell .replay-count')return count;
      if(selector==='.channel-list-shell .replay-empty')return empty;
      return null;
    }
  };
  const window={
    addEventListener(){},
    FrommMorphMenus:{close(){calls.push('close');}}
  };
  const state={filter:'live',live:{centerMode:'channel'}};
  const channelVideoState={channelId:'group-a',mediaType:'image',selected:null,loading:false};
  const selectChannelMediaType=async type=>{
    calls.push(type);channelVideoState.mediaType=type;
    label.textContent=({all:'전체 ',image:'사진 ',video:'영상 '})[type];
  };
  const renderLiveView=()=>{
    calls.push('render');label.textContent='사진 ';
  };
  new Function('window','location','document','state','channelVideoState',
    'Node','MutationObserver','selectChannelMediaType','renderLiveView',
    'channelVideoPage','queueMicrotask',code)(
    window,{pathname},document,state,channelVideoState,
    {TEXT_NODE:3},class{},selectChannelMediaType,renderLiveView,
    ()=>({posts:[]}),queueMicrotask
  );
  return {window,handlers,label,trigger,count,empty,calls,channelVideoState};
}

test('Artist menu item is selected even when MorphMenus callback does not execute',async()=>{
  const app=mount();
  const item={dataset:{morphValue:'artist'},closest(selector){
    if(selector==='[data-morph-value]')return this;
    if(selector==='.morph-menu-content[aria-label="채널 콘텐츠 선택"]')return {};
    return null;
  }};
  let stopped=false,prevented=false;
  const event={
    target:item,preventDefault(){prevented=true;},
    stopImmediatePropagation(){stopped=true;},
    stopPropagation(){}
  };
  for(const cb of app.handlers.click){
    cb(event);
    if(stopped)break;
  }
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(prevented,true);
  assert.equal(app.window.FrommPreviewArtist.state.category,'artist');
  assert.equal(app.label.textContent,'Artist ');
  assert.equal(app.trigger.ariaLabel,'채널 콘텐츠: Artist');
  assert.equal(app.count.textContent,'Artist 0개');
  assert.match(app.empty.textContent,/Artist/);
  assert.deepEqual(app.calls.slice(0,2),['close','render']);
});

test('upstream photo type does not overwrite Artist label, and normal types still work',async()=>{
  const app=mount();
  await app.window.FrommPreviewArtist.choose('artist');
  assert.equal(app.channelVideoState.mediaType,'image');
  assert.equal(app.label.textContent,'Artist ');
  await app.window.FrommPreviewArtist.choose('video');
  assert.equal(app.channelVideoState.mediaType,'video');
  assert.equal(app.label.textContent,'영상 ');
  await app.window.FrommPreviewArtist.choose('artist');
  assert.equal(app.channelVideoState.mediaType,'image');
  assert.equal(app.label.textContent,'Artist ');
});

test('preview filter is not installed on operating web path',()=>{
  assert.equal(mount('/fromm-viewer/').window.FrommPreviewArtist,undefined);
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../overrides/preview-artist-feed.js'),'utf8');

function mount({room=null,pathname='/fromm-viewer-preview/'}={}){
 const state={room,filter:'live',live:{centerMode:'channel'}};
 const channelVideoState={channelId:'group-a',selected:null};
 const window={FrommPreviewArtist:{state:{category:'artist'}},addEventListener(){}};
 const document={readyState:'loading',addEventListener(){}};
 const requests=[];
 const api=async (route,options)=>{requests.push({route,options});return {data:{channel:{channelFeedUrl:'https://channel.frommyarti.com/feed/public'}}};};
 new Function('window','location','document','state','channelVideoState','MutationObserver','frommApiRequest','FROMM_CHANNEL_API_BASE',code)(
   window,{pathname},document,state,channelVideoState,class {},api,'https://channel-api.frommyarti.com');
 return {window,state,channelVideoState,requests};
}

test('preview-only install guard',()=>{
 const app=mount({pathname:'/fromm-viewer/'});
 assert.equal(app.window.FrommPreviewArtistFeed,undefined);
});

test('only confirmed artist ID can be used and channel mismatch is rejected',()=>{
 const {window}=mount({room:{host:{id:'a123',nick:'이채영'},channelId:'group-a'}});
 const api=window.FrommPreviewArtistFeed;
 assert.deepEqual(api.candidate(),{id:'a123',name:'이채영',channel:'group-a'});
 assert.equal(api.candidate({host:{id:'not-this-channel'},channelId:'group-b'},'group-a'),null);
 assert.equal(api.candidate({host:{nick:'no verified artist id'},channelId:'group-a'},'group-a'),null);
});

test('source accepts only verified https frommyarti domains',()=>{
 const f=mount().window.FrommPreviewArtistFeed.safeUrl;
 assert.equal(f('https://channel.frommyarti.com/feed/1'),'https://channel.frommyarti.com/feed/1');
 assert.equal(f('https://pages.frommyarti.com/post'), 'https://pages.frommyarti.com/post');
 for(const v of [
  'http://channel.frommyarti.com/x','javascript:alert(1)',
  'https://channel.frommyarti.com.evil.example/test',
  'https://frommyarti.com.evil.example/a',
  'https://user:password@channel.frommyarti.com/feed',
  'https://other.example/feed','',
  '//channel.frommyarti.com/feed'
 ])assert.equal(f(v),'',v);
});

test('only channelFeedUrl from known API response wrapper is accepted',()=>{
 const feed=mount().window.FrommPreviewArtistFeed.feedUrl;
 assert.equal(feed({data:{channel:{channelFeedUrl:'https://channel.frommyarti.com/my-feed'}}}),
   'https://channel.frommyarti.com/my-feed');
 assert.equal(feed({result:{channelFeedUrl:'https://pages.frommyarti.com/artist'}}),
   'https://pages.frommyarti.com/artist');
 assert.equal(feed({data:{channel:{channelFeedUrl:'https://evil.example'}}}),'');
 assert.equal(feed({data:{foo:'bar'}}),'');
});

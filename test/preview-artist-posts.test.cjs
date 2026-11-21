'use strict';
/* Synthetic schema/auth regression. Uses no real Fromm account or live requests. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../overrides/preview-artist-posts.js'),'utf8');
function mount({response={data:{posts:[],isLast:true}},failure=null,category='artist',sessionValid=true}={}){
 const calls=[],state={filter:'live',live:{centerMode:'channel'}};
 const channelVideoState={channelId:'channel-a',selected:null};
 const window={FrommPreviewArtist:{state:{category,member:''},syncUI(){}},addEventListener(){}};
 const document={readyState:'loading',addEventListener(){},querySelector(){return null;}};
 let account='user-a',validSession=sessionValid;
 const frommApiRequest=async(route,options)=>{
   calls.push({route,options});
   if(failure)throw failure;
   return response;
 };
 new Function('window','document','location','state','channelVideoState','currentAccountScope',
   'channelVideoSession','frommApiRequest','FROMM_CHANNEL_API_BASE','MutationObserver',code)(
   window,document,{pathname:'/fromm-viewer-preview/'},state,channelVideoState,
   ()=>account,()=>()=>validSession,frommApiRequest,
   'https://channel-api.frommyarti.com',class{}
 );
 return {window,state,channelVideoState,calls,setAccount:value=>account=value,setSessionValid:value=>validSession=value};
}
const img={id:'1',mediaType:'image',isVisible:true,createdAt:'2026-11-21T03:00:00Z',
 author:{id:'member-a',name:'멤버 A'},content:'사진을 올렸어요',
 media:[{mediaType:'image',url:'https://channel-contents.frommyarti.com/a.jpg',thumbnailUrl:'https://channel-contents.frommyarti.com/a-small.jpg'}]};
const vid={id:'2',mediaType:'video',isVisible:true,
 author:{id:'member-b',name:'멤버 B'},content:'영상',
 media:[{mediaType:'video',url:'https://channel-contents.frommyarti.com/a.m3u8',runningTime:30}]};

test('official Artist image/video normalized with explicit author and media',()=>{
 const api=mount().window.FrommPreviewArtistPosts;
 const result=api.parsePage({data:{posts:[img,vid],isLast:false}});
 assert.equal(result.isLast,false);
 assert.equal(result.posts.length,2);
 assert.deepEqual(result.posts.map(p=>p.type),['image','video']);
 assert.deepEqual(result.posts.map(p=>p.artist.name),['멤버 A','멤버 B']);
 assert.equal(result.posts[0].media.length,1);
 assert.equal(result.posts[1].media[0].runningTime,30);
});

test('locked, hidden, text-only, unauthored and bad URL items never enter grid',()=>{
 const api=mount().window.FrommPreviewArtistPosts;
 const posts=[
  img,{...img,id:'hidden',isVisible:false},
  {...img,id:'text',mediaType:'text',media:[]},
  {...img,id:'unauthored',author:null},
  {...img,id:'badurl',media:[{mediaType:'image',url:'javascript:alert(1)'}]},
  {...img,id:'relative',media:[{mediaType:'image',url:'//attacker.example/x.jpg'}]}
 ];
 assert.deepEqual(api.parsePage({posts,isLast:true}).posts.map(p=>p.id),['1']);
 assert.equal(api.safeUrl('https://user:password@frommyarti.com/x'),'');
 assert.equal(api.safeUrl('http://frommyarti.com/x'),'');
});

test('unexpected response schema fails closed rather than presenting false 0 items',()=>{
 const api=mount().window.FrommPreviewArtistPosts;
 assert.throws(()=>api.parsePage({data:{items:[img]}}),/응답 형식/);
});

test('read-only first page uses verified channel-id and no invented cursor',async()=>{
 const app=mount({response:{data:{posts:[img,vid],isLast:true}}});
 await app.window.FrommPreviewArtistPosts.reload();
 assert.equal(app.calls.length,1);
 assert.equal(app.calls[0].route,'/posts');
 assert.equal(app.calls[0].options.channelId,'channel-a');
 assert.equal(app.calls[0].options.base,'https://channel-api.frommyarti.com');
 assert.equal(app.calls[0].options.query,undefined);
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.status,'ready');
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.count,2);
 assert.equal(app.window.FrommPreviewArtistPosts.memberPosts().length,2);
});

test('missing local session is not mislabeled as an HTTP 401 and sends no request',async()=>{
 const app=mount({sessionValid:false});
 await app.window.FrommPreviewArtistPosts.reload();
 assert.equal(app.calls.length,0);
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.status,'error');
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.error,'no-session');
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.httpStatus,0);
});

test('session change clears a ready Artist list before attempting another request',async()=>{
 const app=mount({response:{data:{posts:[img],isLast:true}}});
 const api=app.window.FrommPreviewArtistPosts;
 await api.reload();
 assert.equal(api.snapshot.count,1);
 app.setSessionValid(false);
 api.sync();
 for(let attempt=0;attempt<10&&api.snapshot.status==='loading';attempt++){
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 assert.equal(app.calls.length,1);
 assert.equal(api.snapshot.status,'error');
 assert.equal(api.snapshot.error,'no-session');
 assert.equal(api.snapshot.count,0);
});

test('HTTP authentication, authorization, query, and endpoint errors remain distinct',async()=>{
 for(const [status,error] of [[401,'http-401'],[403,'http-403'],[400,'http-400'],[404,'http-404'],[503,'http-server']]){
  const app=mount({failure:Object.assign(new Error('HTTP failure'),{status})});
  await app.window.FrommPreviewArtistPosts.reload();
  assert.equal(app.window.FrommPreviewArtistPosts.snapshot.status,'error');
  assert.equal(app.window.FrommPreviewArtistPosts.snapshot.error,error);
  assert.equal(app.window.FrommPreviewArtistPosts.snapshot.httpStatus,status);
 }
});

test('fetch failure without an HTTP response stays a network/CORS possibility, not an HTTP status',async()=>{
 const app=mount({failure:new TypeError('Failed to fetch')});
 await app.window.FrommPreviewArtistPosts.reload();
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.error,'network');
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.httpStatus,0);
});

test('a confirmed empty first page is ready and preserves its last-page flag',async()=>{
 const app=mount({response:{data:{posts:[],isLast:true}}});
 await app.window.FrommPreviewArtistPosts.reload();
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.status,'ready');
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.count,0);
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.isLast,true);
});

test('module is preview-only and independent of original Channel media endpoint',()=>{
 const app=mount({category:'all'});
 assert.equal(app.window.FrommPreviewArtistPosts.snapshot.active,false);
 const builder=fs.readFileSync(path.join(__dirname,'../scripts/build-pr123-preview.py'),'utf8');
 assert.match(builder,/preview-artist-posts\.js/);
 assert.match(builder,/window\.FrommPreviewArtistPosts\?\.sync\?\.\(\)/);
 assert.ok(!code.includes("frommApiRequest('/media/posts'"));
 assert.ok(!code.includes('localStorage.setItem'));
});

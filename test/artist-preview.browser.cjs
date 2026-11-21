'use strict';
/* Synthetic preview-only smoke: no Fromm login, credentials or media API. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(process.env.PREVIEW_SITE_ROOT||path.join(__dirname,'../../_site'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
(async()=>{
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(!u.pathname.startsWith('/fromm-viewer-preview/')){res.writeHead(404).end();return;}
  const name=decodeURIComponent(u.pathname.slice('/fromm-viewer-preview/'.length))||'index.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port+'/fromm-viewer-preview/';
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:860},serviceWorkers:'block'});
  await context.addInitScript(()=>{
   localStorage.setItem('production-sentinel','do-not-change');
   window.__rawPreviewTestGet=Storage.prototype.getItem.bind(localStorage);
  });
  const page=await context.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.goto(base,{waitUntil:'load'});
  assert.equal(await page.title(),'Fromm Viewer · 실험용 · Artist');
  assert.equal(await page.locator('#fromm-preview-artist-banner').textContent(),'실험용 · Artist');
  const build=await page.evaluate(async()=>await (await fetch('pr123-build.json')).json());
  assert.equal(build.sourceCommit,'a21ced8d34bab7b4d3d7662babb106cbd144cad3');
  assert.equal(build.indexedDB,'fromm-preview-conversations-v1');
  assert.equal(build.storageNamespace,'fromm.preview.v1::');
  assert.equal(build.previewArtist,'attributed-channel-mixed-media-filter');
  const check=await page.evaluate(()=>{
   const api=window.FrommPreviewArtist;
   if(!api)return {mounted:false};
   const posts=[
    {type:'image',id:'i1',artist:{id:10,name:'멤버 A'}},
    {type:'image',id:'i2',artist:{id:11,name:'멤버 B'}},
    {type:'image',id:'i3',title:'출처 미상'},
    {type:'video',id:'v1',artist:{id:10,name:'멤버 A'}}
   ];
   localStorage.setItem('preview-artist-probe','isolated');
   return {
    mounted:true,
    members:api.collectMembers(posts).map(x=>x.name),
    explicit:api.attribution(posts[0])?.id,
    unknown:api.attribution(posts[2]),
    includeVideo:api.attribution(posts[3])?.id,
    visibleDefault:api.filterPosts(posts).length,
    storagePrefix:window.FrommPreviewStorage?.prefix,
    previewStored:window.__rawPreviewTestGet('fromm.preview.v1::preview-artist-probe'),
    productionUnchanged:window.__rawPreviewTestGet('production-sentinel'),
    seesProduction:localStorage.getItem('production-sentinel')
   };
  });
  assert.equal(check.mounted,true);
  assert.deepEqual(check.members,['멤버 A','멤버 B']);
  assert.equal(check.explicit,'10');
  assert.equal(check.unknown,null);
  assert.equal(check.includeVideo,'10');
  assert.equal(check.visibleDefault,4);
  assert.equal(check.storagePrefix,'fromm.preview.v1::');
  assert.equal(check.previewStored,'isolated');
  assert.equal(check.productionUnchanged,'do-not-change');
  assert.equal(check.seesProduction,null);

  // End-to-end rendering proof: the Artist UI must NOT silently fall back to
  // the photo category, and explicitly attributed artist videos must remain.
  const rendered=await page.evaluate(async()=>{
    const post=(id,type,artist)=>({
      id,type,title:id,displayStartAt:1730000000000,
      ...(artist?{artist:{id:'artist-a',name:'멤버 A'}}:{})
    });
    state.filter='live';state.live.centerMode='channel';
    state.live.channelsLoaded=true;
    state.live.channels=[{id:'test-channel',channelName:'테스트 채널'}];
    channelVideoState.channelId='test-channel';
    channelVideoState.mediaType='all';
    channelVideoState.selected=null;
    channelVideoState.pages.set('test-channel',{
      loaded:true,isLast:true,posts:[
        post('artist-photo','image',true),
        post('artist-video','video',true),
        post('channel-video','video',false)
      ]
    });
    renderLiveView();
    await window.FrommPreviewArtist.choose('artist');
    await Promise.resolve();
    const label=document.querySelector('[data-channel-content-menu]');
    const cards=[...document.querySelectorAll('[data-channel-video-card]')];
    return {
      category:window.FrommPreviewArtist.state.category,
      mediaType:channelVideoState.mediaType,
      label:label?.textContent||'',
      aria:label?.getAttribute('aria-label')||'',
      count:document.querySelector('.replay-count')?.textContent||'',
      ids:cards.map(c=>c.dataset.channelVideoCard).sort(),
      hasMemberControl:!!document.querySelector('[data-preview-artist-member]')
    };
  });
  assert.equal(rendered.category,'artist');
  assert.equal(rendered.mediaType,'all');
  assert.match(rendered.label,/Artist/);
  assert.match(rendered.aria,/Artist/);
  assert.equal(rendered.count,'Artist 2개');
  assert.deepEqual(rendered.ids,['artist-photo','artist-video']);
  assert.equal(rendered.hasMemberControl,true);

  for(const file of ['web-channel-photos.js','web-morph-menu.js','preview-artist.js','preview-artist.css','preview-artist-banner.js']){
   const r=await page.request.get(new URL(file,base).href);
   assert.equal(r.status(),200,file);
  }
  console.log('PASS: copied latest source, preview storage boundary, Artist attribution, and assets');
  await context.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(error=>{console.error(error);process.exitCode=1;});
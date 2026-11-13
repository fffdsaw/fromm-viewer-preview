'use strict';
// Synthetic-only browser regression: Meapri optics exist on voice toggles
// before hovering, and pointer exit does not leave a dark/pressed background.
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(process.env.PR121_SITE_ROOT||path.join(__dirname,'../../_site'));
const types={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.html':'text/html'};
const html=`<!doctype html><html class="glowme-phase3 pc-layout" lang="ko">
<head><meta charset="utf-8">
<link rel="stylesheet" href="/fromm-viewer-preview/glowme.css">
<link rel="stylesheet" href="/fromm-viewer-preview/conversation.css">
<link rel="stylesheet" href="/fromm-viewer-preview/pr121-audio-glass.css"></head>
<body style="padding:24px">
<div id="loginGate" class="hidden" hidden></div>
<div id="timeline"><div class="chat-sound-bubble">
<div class="chat-audio-player">
<button type="button" class="chat-audio-play" aria-label="음성 재생">▶</button>
<div class="media-actions"><a class="chat-sound-download" href="#" aria-label="음성 다운로드">↓</a></div>
</div></div></div>
<script type="module" src="/fromm-viewer-preview/web-glass-controls.js"></script>
</body></html>`;
(async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/fromm-viewer-preview/voice-hover-test'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
  if(!pathname.startsWith('/fromm-viewer-preview/')){res.writeHead(404);return res.end();}
  const relative=decodeURIComponent(pathname.slice('/fromm-viewer-preview/'.length));
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1240,height:820}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/fromm-viewer-preview/voice-hover-test`);
  const selectors=['.chat-audio-play','.chat-sound-download'];
  await page.waitForFunction(()=>{
    const buttons=[document.querySelector('.chat-audio-play'),document.querySelector('.chat-sound-download')];
    return Boolean(window.FrommControlGlass&&buttons.every(el=>el?.classList.contains('glass-control')&&el.querySelector('.control-glass-surface')));
  },null,{timeout:10000});
  // The real glass engine must be prioritized for visible voice controls, not
  // constructed only on a late mouseover.
  await page.waitForFunction(()=>document.querySelectorAll('#timeline [data-control-optics="engine"]').length===2,null,{timeout:10000});
  const state=async selector=>page.locator(selector).evaluate(el=>{
   const s=getComputedStyle(el),f=el.querySelector('.control-glass-surface'),v=getComputedStyle(f);
   return {background:s.backgroundImage,backgroundColor:s.backgroundColor,
     shadow:s.boxShadow,faceBackground:v.backgroundImage,faceShadow:v.boxShadow};
  });
  for(const selector of selectors){
   const before=await state(selector);
   await page.locator(selector).hover();
   await page.waitForTimeout(150);
   await page.mouse.move(1150,700);
   await page.waitForTimeout(500);
   const after=await state(selector);
   assert.deepEqual(after,before,`${selector} appearance must return after pointer exit`);
   assert.equal(await page.locator(selector).evaluate(el=>el.classList.contains('glass-control')),true);
  }
  assert.deepEqual(errors,[],`Browser script errors: ${errors.join('; ')}`);
  console.log('Voice glass optics prewarm, visible 3D lens and reversible hover PASS');
  await page.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

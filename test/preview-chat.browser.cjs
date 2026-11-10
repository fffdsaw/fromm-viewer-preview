'use strict';
/* All conversations and authentication below are synthetic browser fixtures. */
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
const {serve,open}=require('../../upstream/test/helpers/phase3-fixture.cjs');

(async()=>{
 const server=await serve(path.resolve(__dirname,'../../_site'));
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const {page,context,errors}=await open(browser,server.url,viewport);
   await page.evaluate(()=>{
    Object.assign(replyIdentity,{context:replyAuthContext(),status:'ready',id:'synthetic-fan'});
    const base=Date.now()-1800000;
    const messages=Array.from({length:1800},(_,i)=>({
     messageId:'m'+i,userType:'star',type:'text',content:'합성 대화 '+i,createdAt:base+i*1000
    }));
    messages[200].userType='fan';messages[200].userId='synthetic-fan';
    messages[250].userType='fan';messages[250].userId='other-fan';messages[250].content='다른 팬 원문';
    messages[1700].embeddedMentionedMessage='원문으로 이동 테스트';
    messages[1700].mentionedMessage={messageId:'m200',userId:'synthetic-fan',content:'원문으로 이동 테스트'};
    messages[1701].embeddedMentionedMessage='ID 없는 인용';
    messages[1750].embeddedMentionedMessage='다른 팬 원문';
    messages[1750].mentionedMessage={messageId:'m250',userId:'other-fan',content:'다른 팬 원문'};
    messages[1751].embeddedMentionedMessage='두 번째 내 글 인용';
    messages[1751].mentionedMessage={messageId:'m200',userId:'synthetic-fan',content:'두 번째 내 글 인용'};
    state.messages=messages;state.chatMessages=messages;state.chatHistoryComplete=true;
    state.chatAutoTopPending=false;state.filter='all';
    renderChatWindow(filteredMessages(),1700);
    state.onlyMyReplies=true;state.chatMatchKey='m1700';syncMyReplyTools();
   });
   const targetQuote=page.locator('.msg[data-message-id="m1700"] .reply-quote');
   await targetQuote.waitFor();
   assert.equal(await targetQuote.getAttribute('data-quoted-id'),'m200','recovered original ID from matching quote payload');
   await targetQuote.scrollIntoViewIfNeeded();
   assert.equal(await targetQuote.locator('.reply-label').textContent(),'↳ 나','my author label');
   await page.waitForFunction(()=>!document.querySelector('#chatMatchNav').hidden);
   // The stationary outer capsule is never an engine target. Each arrow owns
   // an individual surface and hit box (PC only; mobile retains lightweight CSS).
   if(viewport.width>700){
    await page.waitForFunction(()=>{
     const up=document.querySelector('#chatMatchPrev'),down=document.querySelector('#chatMatchNext');
     return up?.classList.contains('glass-control')&&down?.classList.contains('glass-control');
    },null,{timeout:8000});
    assert.equal(await page.locator('#chatMatchNav').evaluate(el=>el.classList.contains('glass-control')),false,'outer pill does not receive glass tilt');
    assert.equal(await page.locator('#chatMatchNav > .control-glass-surface').count(),0,'outer pill has no glass face');
    assert.equal(await page.locator('#chatMatchPrev > .control-glass-surface').count(),1,'up arrow owns a separate glass face');
    assert.equal(await page.locator('#chatMatchNext > .control-glass-surface').count(),1,'down arrow owns a separate glass face');
    const position=await page.locator('#chatMatchNav').boundingBox();
    await page.locator('#chatMatchPrev').hover();
    await page.waitForTimeout(100);
    const hovered=await page.locator('#chatMatchNav').boundingBox();
    for(const prop of ['x','y','width','height'])
     assert.ok(Math.abs(position[prop]-hovered[prop])<=0.5,'outer pill must not move on up hover '+prop);
   }
   assert.match(await page.locator('#chatMatchPosition').textContent(),/1\s*\/\s*2/,'two personal replies remain navigable');
   await targetQuote.click();
   await page.waitForFunction(()=>!!document.querySelector('.msg[data-message-id="m200"].reply-target-flash'));
   await page.waitForTimeout(280); // Let the bounded anchor settle after virtual rows lay out.
   const position=await page.locator('.msg[data-message-id="m200"]').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return{top:r.top,bottom:r.bottom};
   });
   assert.ok(position.top>=-6&&position.top<viewport.height-40,JSON.stringify(position));
   assert.ok(position.bottom>0,JSON.stringify(position));
   assert.equal(await page.locator('#chatMatchNav').isVisible(),true,'reply navigation capsule stays visible after opening original');
   assert.match(await page.locator('#chatMatchPosition').textContent(),/1\s*\/\s*2/,'reply index stays unchanged after opening original');
   assert.equal(await page.evaluate(()=>state.onlyMyReplies),true,'personal-reply filter is retained');
   await page.locator('#chatMatchNext').click();
   await page.waitForFunction(()=>state.chatMatchKey==='m1751');
   assert.match(await page.locator('#chatMatchPosition').textContent(),/2\s*\/\s*2/,'next arrow remains functional after viewing original');

   await page.evaluate(()=>renderChatWindow(filteredMessages(),1750));
   const fan=page.locator('.msg[data-message-id="m1750"] .reply-quote');
   await fan.waitFor();
   assert.equal(await fan.locator('.reply-label').innerText(),'↳ 팬','confirmed other-fan quote');
   await fan.click();
   await page.waitForFunction(()=>!!document.querySelector('.msg[data-message-id="m250"].reply-target-flash'));
   assert.equal(await page.locator('#chatMatchNav').isVisible(),true,'other-fan original does not clear reply navigation');

   await page.evaluate(()=>renderChatWindow(filteredMessages(),1701));
   const unknown=page.locator('.msg[data-message-id="m1701"] .reply-quote');
   await unknown.waitFor();await unknown.click();
   await page.locator('#previewChatNotice').waitFor();
   assert.match(await page.locator('#previewChatNotice').innerText(),/식별 정보/);

   await page.evaluate(()=>{
    FrommPreviewUnread.tick();
    const id='room-1',past=Date.now()-20000;
    FrommPreviewUnread.observe(id,[{messageId:'initial',createdAt:past,userType:'star',content:'old'}],true);
    FrommPreviewUnread.observe(id,[
      {messageId:'initial',createdAt:past,userType:'star',content:'old'},
      {messageId:'fresh',createdAt:past+10000,userType:'star',content:'new'}
    ],true);
   });
   await page.waitForFunction(()=>document.querySelectorAll('#rooms .room')[1]?.querySelector('.preview-unread-badge')?.textContent==='1');
   const badge=page.locator('#rooms .room').nth(1).locator('.preview-unread-badge');
   assert.equal(await badge.getAttribute('aria-label'),'이 브라우저에서 확인한 이후 새 메시지 (공식 읽음 아님) 1개');
   await page.evaluate(()=>window.FrommGlowME.setRailOpen(false));
   const before=await page.locator('#rooms .room').nth(1).locator('.rail-avatar').evaluate(el=>el.getBoundingClientRect().top);
   const collapsed=await badge.evaluate(el=>({font:getComputedStyle(el).fontSize,size:el.getBoundingClientRect().width,color:getComputedStyle(el).backgroundColor}));
   assert.equal(collapsed.font,'0px','collapsed badge is a dot, not a count');
   assert.ok(collapsed.size<=14,JSON.stringify(collapsed));
   assert.equal(collapsed.color,'rgb(244, 81, 30)','notification uses the requested warm red');
   await page.evaluate(()=>window.FrommGlowME.setRailOpen(true));
   await page.waitForTimeout(240);
   const after=await page.locator('#rooms .room').nth(1).locator('.rail-avatar').evaluate(el=>el.getBoundingClientRect().top);
   assert.ok(Math.abs(after-before)<=1.5,'artist Y position must not jump during rail expansion: '+before+' -> '+after);
   assert.equal(await badge.innerText(),'1','expanded badge displays the count');
   assert.ok((await badge.evaluate(el=>el.getBoundingClientRect().width))>=20,'expanded badge is a number capsule');
   assert.equal(await page.locator('#sidebar .rail-artists > strong').evaluate(el=>getComputedStyle(el).display),'none','artist section header stays hidden');
   const namePositions=await page.locator('#rooms .room').evaluateAll(nodes=>nodes.slice(1,3).map(el=>el.querySelector('.rail-artist-name')?.getBoundingClientRect().left));
   assert.ok(Math.abs(namePositions[0]-namePositions[1])<=1.5,'names stay in the same column regardless of badge');
   await page.evaluate(()=>window.FrommGlowME.setRailOpen(false));
   assert.deepEqual(errors,[],JSON.stringify(errors));
   await context.close();
   console.log(viewport.width+': preview local-unread and quoted-original navigation PASS');
  }
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

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
    messages[1700].embeddedMentionedMessage='원문으로 이동 테스트';
    messages[1700].mentionedMessage={messageId:'m200',userId:'synthetic-fan',content:'원문으로 이동 테스트'};
    messages[1701].embeddedMentionedMessage='ID 없는 인용';
    state.messages=messages;state.chatMessages=messages;state.chatHistoryComplete=true;
    state.chatAutoTopPending=false;state.filter='all';
    renderChatWindow(filteredMessages(),1700);
   });
   const targetQuote=page.locator('.msg[data-message-id="m1700"] .reply-quote');
   await targetQuote.waitFor();
   assert.equal(await targetQuote.getAttribute('data-quoted-id'),'m200','recovered original ID from matching quote payload');
   await targetQuote.scrollIntoViewIfNeeded();
   assert.equal(await targetQuote.locator('.reply-label').textContent(),'↳ 나','my author label');
   await targetQuote.click();
   await page.waitForFunction(()=>!!document.querySelector('.msg[data-message-id="m200"].reply-target-flash'));
   await page.waitForTimeout(280); // Let the bounded anchor settle after virtual rows lay out.
   const position=await page.locator('.msg[data-message-id="m200"]').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return{top:r.top,bottom:r.bottom};
   });
   assert.ok(position.top>=-6&&position.top<viewport.height-40,JSON.stringify(position));
   assert.ok(position.bottom>0,JSON.stringify(position));

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
   assert.deepEqual(errors,[],JSON.stringify(errors));
   await context.close();
   console.log(viewport.width+': preview local-unread and quoted-original navigation PASS');
  }
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

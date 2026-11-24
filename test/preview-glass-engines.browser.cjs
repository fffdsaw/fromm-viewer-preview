'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(process.env.PREVIEW_SITE_ROOT || '_site');
const screenshots = process.env.PREVIEW_GLASS_DIR;
const prefix = '/fromm-viewer-preview/';
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const mediaSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="400"><rect width="1000" height="400" fill="#94bcca"/><path d="M0 280L200 70L490 320L720 20L1000 270V400H0Z" fill="#386577"/><rect x="220" width="8" height="400" fill="#edf9f6"/></svg>';

async function serve() {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) return res.writeHead(404).end();
    const name = decodeURIComponent(pathname.slice(prefix.length)) || 'index.html';
    if (name === 'optics-fixture.svg') return res.writeHead(200, {'Content-Type':'image/svg+xml'}).end(mediaSvg);
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, resolve));
  return {url:`http://127.0.0.1:${server.address().port}${prefix}`, close:() => new Promise(resolve => server.close(resolve))};
}
async function open(browser, url, width) {
  const context = await browser.newContext({viewport:{width,height:900},hasTouch:width<700,isMobile:width<700,serviceWorkers:'block'});
  await context.addInitScript(() => {window.readRawPreference = Storage.prototype.getItem.bind(localStorage);});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const target = new URL(route.request().url());
    return target.port === new URL(url).port ? route.continue() : route.abort();
  });
  await page.goto(url);
  await page.evaluate(() => {setActiveAuth('synthetic','synthetic','synthetic');hideLoginGate();});
  return {page,context,errors};
}
async function settings(page) {
  await page.evaluate(() => FrommGlowME.setRailOpen(true));
  await page.locator('#glassSettingsBtn').click();
  await page.locator('[data-settings-tab="glass"]').click();
}
async function shot(page, name) {
  if (!screenshots) return;
  fs.mkdirSync(screenshots,{recursive:true});
  await page.screenshot({path:path.join(screenshots,`${name}.png`)});
}
const canvasSelector = '.glass-preview-lens .preview-webgl-face';
async function nativeLens(page) {
  await page.waitForFunction(() => {
    const preview = document.querySelector('.glass-preview-lens');
    return (preview?.querySelector('.control-glass-surface') || preview)?.style.backdropFilter.includes('url(');
  });
}
async function pixels(canvas) {
  return canvas.evaluate(el => {
    const c = el.getContext('2d'), {width,height} = el;
    return {edge:[...c.getImageData(12,0,width-24,14).data], centre:[...c.getImageData(35,18,width-70,8).data]};
  });
}
(async () => {
  const server = await serve();
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const width of [1440,390]) {
      const {page,context,errors} = await open(browser, server.url, width);
      await settings(page);
      const choice = page.getByLabel('광학 엔진');
      assert.equal(await choice.inputValue(),'meapri');
      await nativeLens(page);
      await shot(page,`${width}-meapri`);
      await choice.selectOption('ybouane');
      const output = page.locator(canvasSelector);
      await output.waitFor();
      assert.equal(await output.evaluate(el=>el.parentElement.dataset.previewBackdrop),'settings');
      assert.equal(await output.evaluate(el=>getComputedStyle(el.parentElement).backdropFilter),'none');
      const bent = await pixels(output);
      await page.locator('#preview-glass-refraction').fill('0');
      await page.waitForFunction(() => FrommPreviewGlassEngine.value.settings.refraction===0);
      await page.waitForTimeout(135);
      const flat = await pixels(output);
      assert.deepEqual(flat.centre,bent.centre,'the live flat centre is uncovered');
      assert.ok(bent.centre.every(v=>v===0),'the WebGL canvas leaves the centre transparent');
      assert.ok(bent.edge.some((v,i)=>Math.abs(v-flat.edge[i])>3),'actual WebGL rendering bends pixels in the edge');
      await page.locator('#preview-glass-refraction').fill('0.46');await page.waitForTimeout(135);
      await shot(page,`${width}-ybouane`);
      await choice.selectOption('meapri');
      await output.waitFor({state:'detached'});
      await nativeLens(page);
      await choice.selectOption('ybouane');
      await output.waitFor();
      await page.reload();
      await page.evaluate(() => {setActiveAuth('synthetic','synthetic','synthetic');hideLoginGate();});
      await settings(page);
      assert.equal(await choice.inputValue(),'ybouane');
      assert.match(await page.evaluate(()=>readRawPreference('fromm.preview.v1::fromm.previewGlassEngine.v1')),/ybouane/);
      assert.equal(await page.evaluate(()=>readRawPreference('fromm.previewGlassEngine.v1')),null);
      await output.waitFor();
      await page.locator('#glassSettingsDialog .glass-settings-done').click();

      await page.evaluate(async () => {
        setFilter('image');
        const img = document.createElement('img');img.id='optics-fixture';img.src='optics-fixture.svg';
        Object.assign(img.style,{position:'fixed',inset:'auto 0 0',width:'100vw',height:'45vh',objectFit:'cover',zIndex:1700});
        document.body.append(img);await img.decode();
        showSaveNotice('저장 완료 · 2개');
      });
      const card = page.locator('.save-result-card');
      await page.waitForFunction(()=>document.querySelector('.save-result-card')?.dataset.previewBackdrop==='media');
      await shot(page,`${width}-save-ybouane`);
      await page.evaluate(async () => {
        const img=document.querySelector('#optics-fixture');img.src=img.src.replace('127.0.0.1','localhost');await img.decode();
      });
      await card.locator('.preview-webgl-face').waitFor({state:'detached'});
      await page.waitForFunction(()=>document.querySelector('.save-result-card').style.backdropFilter.includes('url('));
      assert.equal(await page.evaluate(()=>FrommPreviewGlassEngine.value.engine),'ybouane','an unreadable photo uses per-surface fallback');
      await page.locator('#saveResultOkBtn').click();
      await page.locator('#saveResultModal').waitFor({state:'hidden'});
      await page.evaluate(() => {
        document.querySelector('#optics-fixture').remove();
        state.filter='live';state.live.centerMode='channel';state.live.channelsLoaded=true;
        state.live.channels=[{id:'fixture-channel',channelName:'합성 채널'}];
        channelVideoState.channelId='fixture-channel';channelVideoState.selected=null;channelVideoState.mediaType='all';
        channelVideoState.pages.set('fixture-channel',{loaded:true,isLast:true,posts:[{id:'photo',type:'image',title:'합성 사진',displayStartAt:1791534600000,thumbnail:{url:new URL('optics-fixture.svg',location.href).href}}]});
        renderLiveView();
      });
      await page.locator('[data-channel-content-menu]').click();
      const menu=page.locator('.morph-menu-glass');
      await menu.locator('.preview-webgl-face').waitFor();
      await shot(page,`${width}-menu-ybouane`);
      await page.locator('[data-morph-value="image"]').click();
      await menu.waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>channelVideoState.mediaType),'image');
      await settings(page);
      await output.waitFor();
      await page.emulateMedia({forcedColors:'active'});
      await output.waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>FrommPreviewGlassEngine.snapshot.available),false);
      assert.deepEqual(errors,[]);
      console.log(`${width}: engine switch, actual WebGL edge pixels, clear centre, persistent isolation, save sheet, CORS fallback and native filter menu PASS`);
      await context.close();
    }
    const unsupported = await open(browser, server.url, 1440);
    await unsupported.page.evaluate(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args) {
        return type.startsWith('webgl') ? null : getContext.call(this,type,...args);
      };
    });
    await settings(unsupported.page);
    await unsupported.page.getByLabel('광학 엔진').selectOption('ybouane');
    await unsupported.page.waitForFunction(()=>FrommPreviewGlassEngine.snapshot.failed);
    await nativeLens(unsupported.page);
    assert.deepEqual(unsupported.errors,[]);
    await unsupported.context.close();
    console.log('Missing WebGL: original Meapri preview and controls remain usable');
  } finally { await browser.close();await server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

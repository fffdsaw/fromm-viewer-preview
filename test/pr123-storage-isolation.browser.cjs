'use strict';

// Synthetic only: verifies the GitHub Pages sibling path does not share app data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(process.env.PR123_SITE_ROOT || path.join(__dirname, '../../_site'));
const contentTypes = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

async function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/fromm-viewer-preview/')) {
      response.writeHead(404).end();
      return;
    }
    const relative = decodeURIComponent(url.pathname.slice('/fromm-viewer-preview/'.length)) || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader('Content-Type', contentTypes[path.extname(file)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return {
    server,
    url: `http://127.0.0.1:${address.port}/fromm-viewer-preview/`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function seedV1(page, name, content) {
  await page.evaluate(({ name, content }) => new Promise((resolve, reject) => {
    const account = 'synthetic-account';
    const room = 'synthetic-room';
    const scope = [account, room];
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const messages = db.createObjectStore('messages', { keyPath: 'key' });
      messages.createIndex('scope', 'scope');
      db.createObjectStore('rooms', { keyPath: 'scope' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['rooms', 'messages'], 'readwrite');
      tx.objectStore('rooms').put({ scope, count: 1, complete: true, cursorEnd: new Date(0).toISOString() });
      tx.objectStore('messages').put({
        key: [...scope, 'synthetic-message'],
        scope,
        message: { messageId: 'synthetic-message', userType: 'star', type: 'text', content, createdAt: 1791534600000 },
      });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { const error = tx.error; db.close(); reject(error); };
      tx.onabort = () => { const error = tx.error; db.close(); reject(error); };
    };
  }), { name, content });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  let context;
  try {
    context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    await context.addInitScript(() => {
      localStorage.setItem('production-sentinel', 'preserve-this-synthetic-value');
      window.__pr123RawGet = Storage.prototype.getItem.bind(localStorage);
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', route => {
      const requestUrl = new URL(route.request().url());
      return requestUrl.origin === new URL(server.url).origin ? route.continue() : route.abort();
    });
    await page.goto(server.url, { waitUntil: 'load' });

    assert.equal(await page.locator('#fromm-preview-pr123-banner').textContent(), '실험용 · PR #123');
    assert.equal(await page.title(), 'Fromm Viewer · 실험용 · PR #123');
    assert.ok(await page.evaluate(() => typeof FrommConversationCore?.createStore === 'function'), 'PR conversation core loaded');
    const build = await page.evaluate(async () => {
      const result = await fetch('pr123-build.json', { cache: 'no-store' });
      return result.json();
    });
    assert.equal(build.sourceCommit, '1c7bb5019180d37549abb6b12cfc09c729de1dc5');
    assert.equal(build.storageNamespace, 'fromm.preview.v1::');
    assert.equal(build.indexedDB, 'fromm-preview-conversations-v1');
    assert.equal(build.containsExperimentalOptics124or125, false);
    assert.equal(build.galleryPlayerMode, 'video-style-audio-native-video', 'audio gallery controls match video while videos remain native');
    assert.ok((await page.locator('link[href*="themes.css"]').count()) > 0, 'theme stylesheet linked');
    assert.ok((await page.locator('link[href*="settings-panel.css"]').count()) > 0, 'settings stylesheet linked');
    assert.ok((await page.locator('link[href*="compact-player.css"]').count()) > 0, 'compact player linked');
    assert.ok((await page.locator('script[src*="web-themes.js"]').count()) > 0, 'theme controller linked');
    assert.equal(await page.locator('script[src*="web-compact-player.js"]').count(), 0, 'gallery video keeps original browser controls');
    assert.ok((await page.locator('link[href*="pr123-legacy-media.css"]').count()) > 0, 'gallery audio bottom overlay stylesheet linked');
    assert.ok((await page.locator('script[src*="pr123-gallery-audio-controls.js"]').count()) > 0, 'gallery audio overlay controller linked');
    assert.ok(await page.evaluate(() => typeof window.FrommGalleryAudioControls?.enhance === 'function'), 'video-style audio enhancer is available');
    for (const file of ['themes.css', 'settings-panel.css', 'compact-player.css', 'web-themes.js', 'web-compact-player.js', 'pr123-legacy-media.css', 'pr123-gallery-audio-controls.js']) {
      const response = await page.request.get(new URL(file, server.url).href);
      assert.equal(response.status(), 200, file + ' included in deployed build');
    }

    const audioLayout = await page.evaluate(() => {
      const fixture = document.createElement('article');
      fixture.className = 'media-card';
      fixture.id = 'gav-test-card';
      fixture.style.width = '320px';
      fixture.innerHTML = '<div class="thumb audio-thumb media-ready"><div class="audio-icon">🎧</div><div class="audio-player-overlay"><audio controls preload="none"></audio></div></div><div class="thumb"><video controls preload="none"></video></div>';
      document.body.appendChild(fixture);
      const audio = fixture.querySelector('audio'), video = fixture.querySelector('video');
      window.FrommGalleryAudioControls.enhance(audio);
      const thumb = fixture.querySelector('.audio-thumb');
      const row = fixture.querySelector('.gav-row');
      const seek = fixture.querySelector('.gav-seek');
      const outer = thumb.getBoundingClientRect();
      const rowBounds = row.getBoundingClientRect(), seekBounds = seek.getBoundingClientRect();
      return {
        audioControls: audio.controls, videoControls: video.controls,
        audioHeight: outer.height, width: outer.width,
        hasVideoStyleOverlay: !!fixture.querySelector('.gav-controls'),
        hasDownloadOutside: !thumb.querySelector('.card-download'),
        iconHidden: getComputedStyle(fixture.querySelector('.audio-icon')).display === 'none',
        nativeAudioHidden: getComputedStyle(audio).display === 'none',
        rowBottom: outer.bottom - rowBounds.bottom,
        seekBottom: outer.bottom - seekBounds.bottom
      };
    });
    assert.equal(audioLayout.audioControls, false, 'gallery audio has controllable video-like overlay');
    assert.equal(audioLayout.videoControls, true, 'gallery videos still use native Chrome controls');
    assert.equal(audioLayout.hasVideoStyleOverlay, true, 'custom audio toolbar mounts');
    assert.equal(audioLayout.iconHidden, true);
    assert.equal(audioLayout.nativeAudioHidden, true, 'no duplicate native audio pill');
    assert.ok(Math.abs(audioLayout.audioHeight - audioLayout.width / 1.45) < 12,
      'audio thumb shares the video gallery card ratio: ' + JSON.stringify(audioLayout));
    assert.ok(audioLayout.rowBottom > 8 && audioLayout.rowBottom < 70,
      'play/time/volume row sits near bottom like native video: ' + JSON.stringify(audioLayout));
    assert.ok(audioLayout.seekBottom >= 0 && audioLayout.seekBottom < 28,
      'scrubber sits at the bottom of the card: ' + JSON.stringify(audioLayout));

    // Synthetic local WAV: exercise real HTMLAudioElement control events without
    // contacting Fromm or using a personal account or message.
    await page.evaluate(() => {
      const sampleRate = 8000, count = sampleRate * 4;
      const bytes = new ArrayBuffer(44 + count * 2), view = new DataView(bytes);
      const put = (offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };
      put(0,'RIFF');view.setUint32(4,36 + count * 2,true);put(8,'WAVE');put(12,'fmt ');
      view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
      view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);
      view.setUint16(32,2,true);view.setUint16(34,16,true);
      put(36,'data');view.setUint32(40,count*2,true);
      const audio = document.querySelector('#gav-test-card audio');
      audio.src = URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));
    });
    await page.locator('#gav-test-card .gav-play').click();
    await page.waitForFunction(() => {
      const audio = document.querySelector('#gav-test-card audio');
      return !audio.paused && Number.isFinite(audio.duration) && audio.duration > 3;
    }, null, { timeout: 8000 });
    assert.equal(await page.locator('#gav-test-card .gav-play').getAttribute('aria-label'), '음성 일시정지');
    await page.locator('#gav-test-card .gav-mute').click();
    assert.equal(await page.locator('#gav-test-card audio').evaluate(el => el.muted), true);
    await page.locator('#gav-test-card .gav-more').click();
    assert.equal(await page.locator('#gav-test-card .gav-settings').evaluate(el => el.open), true);
    await page.locator('#gav-test-card .gav-rate').selectOption('1.25');
    assert.equal(await page.locator('#gav-test-card audio').evaluate(el => el.playbackRate), 1.25);
    await page.locator('#gav-test-card .gav-seek').evaluate(seek => {
      seek.value = '1';
      seek.dispatchEvent(new Event('input',{bubbles:true}));
    });
    assert.ok(await page.locator('#gav-test-card audio').evaluate(el => el.currentTime >= 0.9), 'audio seek is functional');
    await page.locator('#gav-test-card .gav-play').click();
    assert.equal(await page.locator('#gav-test-card audio').evaluate(el => el.paused), true);
    await page.locator('#gav-test-card audio').evaluate(el => {
      el.pause();
      URL.revokeObjectURL(el.src);
    });
    await page.locator('#gav-test-card').evaluate(el => el.remove());

    const localStorageResult = await page.evaluate(() => {
      localStorage.setItem('pr123-synthetic-probe', 'preview-value');
      const rawKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
      const visibleProductionValue = localStorage.getItem('production-sentinel');
      const rawProductionValue = window.__pr123RawGet('production-sentinel');
      const previewValue = localStorage.getItem('pr123-synthetic-probe');
      localStorage.clear();
      return {
        prefix: window.FrommPreviewStorage?.prefix,
        rawPreviewKey: rawKeys.includes('fromm.preview.v1::pr123-synthetic-probe'),
        visibleProductionValue,
        rawProductionValue,
        previewValue,
        productionSurvivesClear: window.__pr123RawGet('production-sentinel'),
      };
    });
    assert.deepEqual(localStorageResult, {
      prefix: 'fromm.preview.v1::',
      rawPreviewKey: true,
      visibleProductionValue: null,
      rawProductionValue: 'preserve-this-synthetic-value',
      previewValue: 'preview-value',
      productionSurvivesClear: 'preserve-this-synthetic-value',
    }, 'preview localStorage reads/writes/clear stay inside the preview namespace');

    await seedV1(page, 'fromm-preview-conversations-v1', 'preview synthetic v1 record');
    await seedV1(page, 'fromm-conversations-v1', 'production synthetic v1 record');
    const migration = await page.evaluate(async () => {
      const store = FrommConversationCore.createStore();
      try {
        const restored = await store.read('synthetic-account', 'synthetic-room');
        const legacyProduction = await new Promise((resolve, reject) => {
          const request = indexedDB.open('fromm-conversations-v1', 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(['rooms', 'messages'], 'readonly');
            const rowRequest = tx.objectStore('messages').get(['synthetic-account', 'synthetic-room', 'synthetic-message']);
            rowRequest.onsuccess = () => resolve({ version: db.version, content: rowRequest.result?.message?.content });
            rowRequest.onerror = () => reject(rowRequest.error);
            tx.oncomplete = () => db.close();
            tx.onerror = () => reject(tx.error);
          };
        });
        const previewVersion = await new Promise((resolve, reject) => {
          const request = indexedDB.open('fromm-preview-conversations-v1');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => { const db = request.result; resolve(db.version); db.close(); };
        });
        return {
          messages: restored.messages.map(message => message.content),
          complete: restored.meta.complete,
          previewVersion,
          productionVersion: legacyProduction.version,
          productionContent: legacyProduction.content,
        };
      } finally {
        await store.close();
      }
    });
    assert.deepEqual(migration, {
      messages: ['preview synthetic v1 record'],
      complete: true,
      previewVersion: 2,
      productionVersion: 1,
      productionContent: 'production synthetic v1 record',
    }, 'preview v1 cache migrates to schema v2 without opening or changing the production database');

    await page.waitForFunction(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.some(registration => registration.scope.endsWith('/fromm-viewer-preview/'));
    }, null, { timeout: 8000 });
    const serviceWorker = await page.evaluate(async () => ({
      registrations: (await navigator.serviceWorker.getRegistrations()).map(registration => ({
        scope: registration.scope,
        scriptURL: registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL,
      })),
      caches: await caches.keys(),
    }));
    assert.equal(serviceWorker.registrations.length, 1);
    assert.ok(serviceWorker.registrations[0].scope.endsWith('/fromm-viewer-preview/'));
    assert.ok(serviceWorker.registrations[0].scriptURL.endsWith('/fromm-viewer-preview/sw.js'));
    assert.ok(serviceWorker.caches.length > 0);
    assert.ok(serviceWorker.caches.every(name => name.startsWith('fromm-viewer-preview-public-art-')));

    assert.deepEqual(pageErrors, [], JSON.stringify(pageErrors));
    console.log('PR #123 preview localStorage isolation, IndexedDB v1→v2 migration, service-worker scope/cache namespace, and visible label PASS');
  } finally {
    if (context) await context.close();
    await browser.close();
    await server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

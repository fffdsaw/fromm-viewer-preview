'use strict';

// Synthetic only: verifies the GitHub Pages sibling path does not share app data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(process.env.PR121_SITE_ROOT || path.join(__dirname, '../../_site'));
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
      window.__pr121RawGet = Storage.prototype.getItem.bind(localStorage);
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', route => {
      const requestUrl = new URL(route.request().url());
      return requestUrl.origin === new URL(server.url).origin ? route.continue() : route.abort();
    });
    await page.goto(server.url, { waitUntil: 'load' });

    assert.equal(await page.locator('#fromm-preview-pr121-banner').textContent(), '실험용 · PR #121');
    assert.equal(await page.title(), 'Fromm Viewer · 실험용 · PR #121');
    assert.ok(await page.evaluate(() => typeof FrommConversationCore?.createStore === 'function'), 'PR conversation core loaded');

    const localStorageResult = await page.evaluate(() => {
      localStorage.setItem('pr121-synthetic-probe', 'preview-value');
      const rawKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
      const visibleProductionValue = localStorage.getItem('production-sentinel');
      const rawProductionValue = window.__pr121RawGet('production-sentinel');
      const previewValue = localStorage.getItem('pr121-synthetic-probe');
      localStorage.clear();
      return {
        prefix: window.FrommPreviewStorage?.prefix,
        rawPreviewKey: rawKeys.includes('fromm.preview.v1::pr121-synthetic-probe'),
        visibleProductionValue,
        rawProductionValue,
        previewValue,
        productionSurvivesClear: window.__pr121RawGet('production-sentinel'),
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
    console.log('PR #121 preview localStorage isolation, IndexedDB v1→v2 migration, service-worker scope/cache namespace, and visible label PASS');
  } finally {
    if (context) await context.close();
    await browser.close();
    await server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

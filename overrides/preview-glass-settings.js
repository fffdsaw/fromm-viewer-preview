import {glassEngine, schedule} from './preview-glass-optics.js';

const labels = {refraction: '굴절 강도', zRadius: '가장자리 폭', edgeHighlight: '가장자리 반사광', blurAmount: '가장자리 흐림', chromAberration: '색수차'};
let panel, select, nativeControls, webglControls, status, pattern, saveGlass, loading;

function drawPattern() {
  const bounds = pattern.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const dpr = Math.min(devicePixelRatio, 2);
  pattern.width = Math.round(bounds.width * dpr);
  pattern.height = Math.round(bounds.height * dpr);
  const context = pattern.getContext('2d');
  const theme = getComputedStyle(document.documentElement);
  context.scale(dpr, dpr);
  context.fillStyle = theme.getPropertyValue('--theme-card').trim();
  context.fillRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = theme.getPropertyValue('--theme-line').trim();
  for (let x = 0; x < bounds.width; x += 12) context.fillRect(x, 0, 1, bounds.height);
  for (let y = 0; y < bounds.height; y += 12) context.fillRect(0, y, bounds.width, 1);
  context.textAlign = 'center';context.textBaseline = 'middle';
  context.font = '20px system-ui';context.fillStyle = theme.getPropertyValue('--theme-text').trim();
  context.fillText('Aa · Fromm · 123', bounds.width / 2, bounds.height / 2);
  pattern.dataset.previewPaint = String(Number(pattern.dataset.previewPaint || 0) + 1);
  schedule();
}

function syncSettings() {
  if (!panel) return;
  const value = glassEngine.value, ybouane = value.engine === 'ybouane';
  select.value = value.engine;
  nativeControls.hidden = ybouane;
  panel.querySelector('.glass-settings-note').hidden = ybouane;
  webglControls.hidden = !ybouane;
  webglControls.disabled = !window.FrommGlassSettings.value.enabled;
  for (const input of webglControls.querySelectorAll('input')) {
    const key = input.name, v = value.settings[key];
    const [min, max] = glassEngine.ranges[key];
    if (input.value !== String(v)) input.value = v;
    input.style.setProperty('--glass-range-fill', `${(v - min) / (max - min) * 100}%`);
    input.previousElementSibling.value = String(Number(v.toFixed(2))) + (key === 'zRadius' ? ' px' : '');
  }
  const {failed, active} = glassEngine.snapshot;
  const text = !ybouane ? '' : !window.FrommGlassSettings.value.enabled ? '유리 효과가 꺼져 있습니다.' : failed ? 'WebGL을 사용할 수 없어 기존 유리 효과를 사용합니다.' : active ? 'ybouane 적용 중 · 지원되지 않는 배경에는 기존 효과가 적용됩니다.' : '미리보기나 메뉴를 열면 ybouane 적용 상태를 확인할 수 있습니다.';
  if (status.textContent !== text) status.textContent = text;
}

function mountSettings() {
  if (panel) return;
  panel = document.querySelector('#settings-panel-glass');
  if (!panel) return;
  const label = document.createElement('label');label.className = 'preview-engine-choice';
  label.append('광학 엔진');
  select = document.createElement('select');
  select.add(new Option('Meapri Liquid Glass', 'meapri'));
  select.add(new Option('ybouane LiquidGlass', 'ybouane'));
  label.append(select);
  select.onchange = () => glassEngine.set({engine: select.value});
  nativeControls = panel.querySelector('fieldset');
  panel.insertBefore(label, panel.querySelector('.glass-settings-preview'));
  webglControls = document.createElement('fieldset');
  webglControls.setAttribute('aria-label', 'ybouane 유리 효과 조절');
  for (const [key, text] of Object.entries(labels)) {
    const row = document.createElement('div');row.className = 'glass-setting';
    const name = document.createElement('label');name.htmlFor = `preview-glass-${key}`;name.textContent = text;
    const value = document.createElement('output');value.htmlFor = name.htmlFor;
    const input = document.createElement('input');input.type = 'range';input.name = key;input.id = name.htmlFor;
    [input.min, input.max] = glassEngine.ranges[key];input.step = key === 'zRadius' ? '1' : '.01';
    input.oninput = () => glassEngine.set({settings: {[key]: Number(input.value)}});
    row.append(name, value, input);webglControls.append(row);
  }
  nativeControls.after(webglControls);
  status = document.createElement('p');status.className = 'preview-engine-status';status.setAttribute('role', 'status');
  webglControls.after(status);
  const stage = panel.querySelector('.glass-settings-preview');
  pattern = document.createElement('canvas');pattern.dataset.previewGlassScene = '';pattern.setAttribute('aria-hidden', 'true');
  stage.prepend(pattern);stage.querySelector('.glass-preview-pattern').hidden = true;
  new ResizeObserver(drawPattern).observe(stage);
  window.addEventListener('fromm-theme-change', drawPattern);
  panel.closest('dialog').querySelector('.glass-settings-reset').addEventListener('click', () => glassEngine.reset());
  window.FrommGlassSettings.subscribe(syncSettings);
  glassEngine.subscribe(syncSettings);
  syncSettings();
}

const sheet = document.querySelector('#saveResultModal');
const card = sheet?.querySelector('.save-result-card');
const restrictions = ['prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce', 'forced-colors: active'].map(query => matchMedia(`(${query})`));
const canPaintSheet = () => card && !sheet.hidden && !document.hidden && window.FrommGlassSettings?.value.enabled && !restrictions.some(query => query.matches);
function releaseSaveGlass() {
  saveGlass?.destroy();saveGlass = null;
  if (card) delete card.dataset.previewSaveGlass;
}
async function syncSaveGlass() {
  if (!canPaintSheet()) { releaseSaveGlass();return; }
  if (!loading) loading = Promise.all([import('./vendor/meapri/liquid-glass.js?v=live-optics-20261116'), import('./web-glass-material.js?PREVIEW_MATERIAL_VERSION')]).catch(() => null);
  const modules = await loading;
  if (!modules || !canPaintSheet()) return;
  const [{LiquidGlass}, {createGlass, materialOptions}] = modules;
  const options = materialOptions(window.FrommGlassSettings.value);
  if (saveGlass) saveGlass.update(options);
  else {
    try { saveGlass = createGlass(LiquidGlass, card, {variant: 'clear', profile: 'panel', radius: 'auto', applyRadius: false, edges: false, fallbackFilter: 'blur(16px)', ...options}); }
    catch { return; }
  }
  if (!saveGlass.resolved.usesFallback) card.dataset.previewSaveGlass = '';
}

function start() {
  mountSettings();
  if (!sheet || !window.FrommGlassSettings) return;
  new MutationObserver(syncSaveGlass).observe(sheet, {attributes: true, attributeFilter: ['hidden']});
  window.FrommGlassSettings.subscribe(syncSaveGlass);
  for (const query of restrictions) query.addEventListener('change', syncSaveGlass);
  document.addEventListener('visibilitychange', syncSaveGlass);
  window.addEventListener('fromm-theme-change', syncSaveGlass);
  window.addEventListener('pagehide', releaseSaveGlass);
  window.addEventListener('pageshow', syncSaveGlass);
  syncSaveGlass();
}
if (document.readyState === 'complete') start();
else window.addEventListener('load', start, {once: true});

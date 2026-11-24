import {captureBackdrop} from './preview-glass-backdrop.js';

const STORAGE_KEY = 'fromm.previewGlassEngine.v1';
const SETTINGS = Object.freeze({refraction: .46, zRadius: 11, edgeHighlight: .11, blurAmount: 0, chromAberration: 0});
const RANGES = {refraction: [0, 1], zRadius: [3, 24], edgeHighlight: [0, .3], blurAmount: [0, .3], chromAberration: [0, .15]};
function preferences(value) {
  return {engine: value?.engine === 'ybouane' ? 'ybouane' : 'meapri', settings: Object.fromEntries(Object.entries(SETTINGS).map(([key, fallback]) => {
    const n = value?.settings?.[key];
    const [min, max] = RANGES[key];
    return [key, typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback];
  }))};
}
let selected = preferences();
try { selected = preferences(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { /* Private mode. */ }
const subscribers = new Set();
export const glassEngine = {
  get value() { return {engine: selected.engine, settings: {...selected.settings}}; },
  ranges: RANGES,
  set(patch) {
    selected = preferences({...selected, ...patch, settings: {...selected.settings, ...patch.settings}});
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(selected)); } catch { /* Session selection still works. */ }
    refreshSelection();
  },
  reset() { this.set({engine: 'meapri', settings: SETTINGS}); },
  subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
  get snapshot() {
    const live = [...surfaces].filter(surface => surface.output?.isConnected);
    return {engine: selected.engine, active: live.length, available: !!renderer, failed, surfaces: surfaces.size};
  },
};

const surfaces = new Set();
const mediaQueries = ['prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce', 'forced-colors: active'].map(value => matchMedia(`(${value})`));
const source = document.createElement('canvas');
const sample = source.getContext('2d');
let modulePromise, renderer, rendererModule, failed = false, timer = 0, frame = 0, observer;
const active = () => selected.engine === 'ybouane' && !document.hidden && !mediaQueries.some(query => query.matches);
const announce = () => { for (const listener of subscribers) listener(); };

function freeRenderer() {
  if (!renderer) return;
  const retired = renderer;
  renderer = null;
  const context = retired.gl;
  retired.destroy();
  if (!context.isContextLost()) context.getExtension('WEBGL_lose_context')?.loseContext();
  source.width = source.height = 0;
}

function refreshSelection() {
  if (active() && !observer) {
    observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof HTMLElement && !node.matches('.preview-webgl-face')))) schedule();
    });
    observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open']});
  }
  if (!active()) {
    observer?.disconnect();observer = null;
    clearTimeout(timer);cancelAnimationFrame(frame);timer = frame = 0;
    for (const surface of surfaces) surface.useNative();
    freeRenderer();
  } else schedule();
  announce();
}

export function schedule() {
  if (timer || frame || !active()) return;
  timer = setTimeout(() => {
    timer = 0;
    frame = requestAnimationFrame(() => { frame = 0; paint(); });
  }, 45);
}

function readySurfaces() {
  const visible = [];
  for (const surface of surfaces) {
    const {element} = surface;
    if (surface.suspended || !element.isConnected || !element.checkVisibility()) continue;
    const bounds = element.getBoundingClientRect();
    if (bounds.width > 1 && bounds.height > 1 && bounds.right > 0 && bounds.bottom > 0 && bounds.top < innerHeight && bounds.left < innerWidth) visible.push({surface, bounds});
  }
  return visible.sort((a, b) => b.surface.priority - a.surface.priority).slice(0, 8);
}

function paint() {
  if (!active() || failed) return;
  const visible = readySurfaces();
  if (!visible.length) { freeRenderer(); return; }
  if (!rendererModule) {
    if (!modulePromise) modulePromise = Promise.all([import('./vendor/ybouane/GlassRenderer.js'), import('./vendor/ybouane/defaults.js')]).then(([display, defaults]) => {
      rendererModule = {...display, ...defaults};
      schedule();
    }).catch(() => { failed = true; announce(); });
    return;
  }
  if (!renderer) {
    try {
      const current = renderer = new rendererModule.GlassRenderer();
      current.canvas.addEventListener('webglcontextlost', () => {
        if (renderer !== current) return;
        for (const surface of surfaces) surface.useNative();
        freeRenderer();failed = true;announce();
      }, {once: true});
    } catch { failed = true; announce(); return; }
  }
  try {
    const drawn = new Set();
    for (const {surface, bounds} of visible) if (render(surface, bounds)) drawn.add(surface);
    for (const surface of surfaces) if (!drawn.has(surface)) surface.useNative();
  } catch {
    // A lost context or tainted sample must never leave pixels from a prior frame.
    for (const surface of surfaces) surface.useNative();
    freeRenderer();failed = true;
  }
  announce();
}

function render(surface, bounds) {
  const {element} = surface;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const pad = Math.round(rendererModule.SHADOW_PAD * dpr);
  const width = Math.round(bounds.width * dpr), height = Math.round(bounds.height * dpr);
  if (width * height > 650000) return false;
  source.width = width + pad * 2;source.height = height + pad * 2;
  sample.setTransform(dpr, 0, 0, dpr, 0, 0);
  const type = captureBackdrop(sample, element, {x: bounds.left - pad / dpr, y: bounds.top - pad / dpr}, source.width / dpr, source.height / dpr);
  if (!type) return false;
  if (element.classList.contains('save-result-card')) {
    sample.fillStyle = getComputedStyle(element).backgroundColor;
    sample.fillRect(0, 0, source.width / dpr, source.height / dpr);
  }
  const cornerRadius = Math.min(Math.min(bounds.width, bounds.height) / 2, Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0);
  const config = {...rendererModule.DEFAULTS, ...selected.settings, refraction: selected.settings.refraction * surface.ramp, cornerRadius, shadowOpacity: 0, fresnel: .16, specular: .045};
  renderer.uploadAndBlur(source, 0, 0, source.width, source.height, config.blurAmount);
  renderer.clear();renderer.renderGlassPanel(config, width / dpr, height / dpr, dpr);
  surface.draw(renderer.canvas, pad, width, height, type);
  return true;
}

class Surface {
  constructor(element, options, makeNative) {
    this.element = element;this.options = options;this.makeNative = makeNative;
    this.priority = element.closest('.glass-settings-preview') ? 3 : element.matches('.morph-menu-glass,.save-result-card') ? 2 : 1;
    this.suspended = false;this.destroyed = false;this.ramp = 1;
    surfaces.add(this);
    this.useNative();schedule();
  }
  get resolved() { return this.native?.resolved ?? {usesFallback: false}; }
  get filter() { return this.native?.filter ?? (this.output || null); }
  get usesFallback() { return this.native?.usesFallback ?? false; }
  get configuredRefraction() { return this.options.refraction ?? 0; }
  useNative() {
    this.output?.remove();this.output = null;
    delete this.element.dataset.previewOptics;delete this.element.dataset.previewBackdrop;
    if (this.destroyed || this.suspended || !this.element.isConnected || this.native) return;
    try { this.native = this.makeNative(this.options); } catch { /* The styled surface still works. */ }
  }
  draw(webgl, pad, width, height, type) {
    const output = this.output || document.createElement('canvas');
    if (!this.output) { output.className = 'preview-webgl-face';output.setAttribute('aria-hidden', 'true'); }
    if (output.width !== width || output.height !== height) { output.width = width;output.height = height; }
    const ctx = output.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(webgl, pad, pad, width, height, 0, 0, width, height);
    if (this.native) { this.native.destroy();this.native = null; }
    if (!this.output) { this.output = output;this.element.prepend(output); }
    this.element.dataset.previewOptics = 'ybouane';this.element.dataset.previewBackdrop = type;
  }
  update(next) { this.options = {...this.options, ...next};this.native?.update(next);schedule(); }
  syncToBackdrop() { this.native?.syncToBackdrop();schedule(); }
  flexRefraction(value) {
    const strength = this.configuredRefraction;
    this.ramp = value == null ? 1 : strength ? Math.max(0, Math.min(1, value / strength)) : 0;
    this.native?.flexRefraction(value);schedule();
  }
  scheduleRegen() { this.native?.scheduleRegen();schedule(); }
  scheduleBuild(build) { queueMicrotask(() => { if (!this.destroyed && !this.suspended) build(); }); }
  installFilter() { this.useNative();this.native?.resume();schedule(); }
  suspend() { this.suspended = true;this.useNative();this.native?.suspend(); }
  resume() { this.suspended = false;this.installFilter(); }
  destroy() {
    this.destroyed = true;this.native?.destroy();this.native = null;
    this.useNative();surfaces.delete(this);schedule();
    if (!surfaces.size) freeRenderer();
  }
}

export function createPreviewGlass(element, options, makeNative) {
  if (element.matches('.rail-lens-surface,.capsule-optics-lens')) return makeNative(options);
  return new Surface(element, options, makeNative);
}

for (const event of ['resize', 'scroll', 'load', 'playing', 'pause', 'seeked', 'transitionend', 'animationend', 'fromm-theme-change']) window.addEventListener(event, schedule, {capture: true, passive: true});
for (const query of mediaQueries) query.addEventListener('change', refreshSelection);
document.addEventListener('visibilitychange', refreshSelection);
window.addEventListener('pageshow', refreshSelection);
window.addEventListener('pagehide', () => { for (const surface of surfaces) surface.useNative();freeRenderer(); });
window.addEventListener('storage', event => {
  if (!event.key?.endsWith(`::${STORAGE_KEY}`)) return;
  try { selected = preferences(JSON.parse(event.newValue)); } catch { selected = preferences(); }
  refreshSelection();
});
window.FrommPreviewGlassEngine = glassEngine;
refreshSelection();

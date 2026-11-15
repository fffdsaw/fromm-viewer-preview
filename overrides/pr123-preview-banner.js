/* PR #123 preview marker. No production files or credentials are read. */
(() => {
  'use strict';
  if (!location.pathname.startsWith('/fromm-viewer-preview/')) return;
  const style=document.createElement('style');
  style.textContent='#fromm-preview-pr123-banner{position:fixed;z-index:2147483647;top:calc(env(safe-area-inset-top,0px) + 8px);right:8px;max-width:calc(100vw - 16px);padding:7px 11px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:#146f66;box-shadow:0 2px 10px rgba(0,0,0,.22);color:#fff;font:750 12px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap}';
  document.head.append(style);
  const label=document.createElement('div');
  label.id='fromm-preview-pr123-banner';
  label.setAttribute('role','status');
  label.setAttribute('aria-label','실험용 사이트, PR 123');
  label.textContent='실험용 · PR #123';
  document.body.append(label);
})();

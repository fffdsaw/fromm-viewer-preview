/* Persistent label for the independent PR #121 account-test deployment. */
(() => {
  'use strict';
  if (!location.pathname.startsWith('/fromm-viewer-preview/')) return;
  const style = document.createElement('style');
  style.textContent = `
    #fromm-preview-pr121-banner {
      position: fixed;
      z-index: 2147483647;
      top: calc(env(safe-area-inset-top, 0px) + 8px);
      right: 8px;
      max-width: calc(100vw - 16px);
      padding: 7px 11px;
      border: 1px solid rgba(255,255,255,.48);
      border-radius: 999px;
      background: #b42318;
      box-shadow: 0 2px 10px rgba(60,0,0,.28);
      color: #fff;
      font: 750 12px/1.2 system-ui, sans-serif;
      letter-spacing: .01em;
      pointer-events: none;
      white-space: nowrap;
    }
  `;
  document.head.append(style);
  const badge = document.createElement('div');
  badge.id = 'fromm-preview-pr121-banner';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', '실험용 사이트, PR 121');
  badge.textContent = '실험용 · PR #121';
  document.body.append(badge);
})();

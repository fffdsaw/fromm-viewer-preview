/* Preview-only clearly visible environment marker. */
(()=>{
 'use strict';
 if(!location.pathname.startsWith('/fromm-viewer-preview/'))return;
 const style=document.createElement('style');
 style.textContent='#fromm-preview-artist-banner{position:fixed;z-index:2147483647;top:calc(env(safe-area-inset-top,0px) + 8px);right:8px;max-width:calc(100vw - 16px);padding:7px 11px;border:1px solid #ffffff75;border-radius:999px;background:#166c61;box-shadow:0 2px 10px #0003;color:white;font:750 12px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap}';
 document.head.append(style);
 const label=document.createElement('div');label.id='fromm-preview-artist-banner';label.setAttribute('role','status');
 label.setAttribute('aria-label','Fromm Viewer 실험용 Artist 페이지');label.textContent='실험용 · Artist';
 document.body.append(label);
})();
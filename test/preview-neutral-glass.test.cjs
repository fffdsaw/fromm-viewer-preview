'use strict';
// Preview-only neutrality contract; no login or API requests.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../overrides/preview-neutral-glass.css'),'utf8');
const builder=fs.readFileSync(path.join(__dirname,'../scripts/build-pr123-preview.py'),'utf8');

test('untinted styles are scoped to existing top controls and morph face',()=>{
  assert.match(css,/\.viewer-header button/);
  assert.match(css,/#mediaActionDock button/);
  assert.match(css,/\.channel-media-tabs \.channel-content-trigger/);
  assert.match(css,/\.morph-menu-glass/);
  assert.match(css,/\.morph-menu-skin\.morph-menu-vertical/);
  assert.match(css,/background-color: transparent !important/);
  assert.match(css,/--droplet-tint: transparent !important/);
  assert.match(css,/prefers-reduced-transparency: no-preference/);
  assert.match(css,/forced-colors: none/);
});

test('glass stays enabled with rim, blur, morph and pointer effects',()=>{
  assert.doesNotMatch(css,/display:\s*none\s*!important/);
  assert.doesNotMatch(css,/filter:\s*none\s*!important/);
  assert.doesNotMatch(css,/animation:\s*none\s*!important/);
  assert.match(css,/backdrop-filter: blur\(1\.6px\) saturate\(1\)/);
  assert.match(css,/data-optics='fallback'/);
  // Source engine and menu modules remain copies with just explicit tint settings.
  assert.match(builder,/morph_path = site \/ "web-morph-menu\.js"/);
  assert.match(builder,/saturation:100,tint:'rgba\(255,255,255,0\)'/);
  assert.match(builder,/fixed_path = site \/ "web-clear-controls\.js"/);
  assert.match(builder,/el\.closest\('\.viewer-header'\)/);
});

test('build-only file injection preserves original source repository and assets',()=>{
  assert.match(builder,/shutil\.copy2\(source, site \/ source\.name\)/);
  assert.match(builder,/preview-neutral-glass\.css/);
  assert.match(builder,/previewNeutralGlass/);
  assert.doesNotMatch(builder,/upstream\s*\/\s*"web-morph-menu\.js"\s*\)\.write_text/);
});

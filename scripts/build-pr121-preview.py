#!/usr/bin/env python3
"""Assemble a public, storage-isolated site from the fixed PR #121 commit."""
from pathlib import Path
import json
import shutil
import sys

if len(sys.argv) != 4:
    raise SystemExit("usage: build-pr121-preview.py UPSTREAM_DIR SITE_DIR WORKFLOW_SHA")

upstream = Path(sys.argv[1]).resolve()
site = Path(sys.argv[2]).resolve()
build_sha = sys.argv[3]
source_sha = "5609ede9f5d8c503244d5eba0e0d9e4fe76e13f1"
version = build_sha[:12]
site.mkdir(parents=True, exist_ok=True)

for pattern in ("index.html", "*.js", "*.css", "*.webmanifest", ".nojekyll"):
    for source in upstream.glob(pattern):
        shutil.copy2(source, site / source.name)
for directory in ("assets", "vendor"):
    shutil.copytree(upstream / directory, site / directory, dirs_exist_ok=True)

preview_root = Path(__file__).resolve().parents[1]
for filename in ("preview-storage.js", "pr121-preview-banner.js", "pr121-search-nav.css", "pr121-audio-flat.css"):
    shutil.copy2(preview_root / "overrides" / filename, site / filename)

html_path = site / "index.html"
html = html_path.read_text(encoding="utf-8")
assert "<title>Fromm Viewer</title>" in html
assert '<meta charset="utf-8" />' in html
html = html.replace("<title>Fromm Viewer</title>", "<title>Fromm Viewer · 실험용 · PR #121</title>", 1)
html = html.replace(
    '<meta charset="utf-8" />',
    '<meta charset="utf-8" />\n<script src="preview-storage.js?v=' + version + '"></script>',
    1,
)
assert "</head>" in html
html = html.replace(
    "</head>",
    '<link rel="stylesheet" href="pr121-search-nav.css?v=' + version + '">\n</head>',
    1,
)
# Keep the voice controls flat even when other buttons use the optical engine.
html = html.replace(
    "</head>",
    '<link rel="stylesheet" href="pr121-audio-flat.css?v=' + version + '">\n</head>',
    1,
)
assert "</body>" in html
html = html.replace(
    "</body>",
    '<script src="pr121-preview-banner.js?v=' + version + '"></script>\n</body>',
    1,
)
html_path.write_text(html, encoding="utf-8")

# Both GitHub project sites use the same origin. Keep every persistent browser
# namespace and worker scope separate from /fromm-viewer/.
manifest_path = site / "manifest.webmanifest"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest.update({
    "id": "/fromm-viewer-preview/",
    "name": "Fromm Viewer 실험용 · PR #121",
    "short_name": "실험용 PR #121",
    "start_url": "/fromm-viewer-preview/",
    "scope": "/fromm-viewer-preview/",
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

core_path = site / "web-conversation-core.js"
core = core_path.read_text(encoding="utf-8")
old_db = "name='fromm-conversations-v1'"
assert old_db in core, "Conversation store default changed; review preview DB isolation"
core_path.write_text(core.replace(old_db, "name='fromm-preview-conversations-v1'", 1), encoding="utf-8")

conversation_path = site / "web-conversation.js"
conversation = conversation_path.read_text(encoding="utf-8")
for expression in (
    "event.key===epochKey(c.storageAccount,c.host)",
    "event.key===storageKey(c.storageAccount)",
):
    assert expression in conversation, "Storage event key changed; review localStorage isolation"
conversation = conversation.replace(
    "event.key===epochKey(c.storageAccount,c.host)",
    "event.key==='fromm.preview.v1::'+epochKey(c.storageAccount,c.host)",
    1,
)
conversation = conversation.replace(
    "event.key===storageKey(c.storageAccount)",
    "event.key==='fromm.preview.v1::'+storageKey(c.storageAccount)",
    1,
)
conversation_path.write_text(conversation, encoding="utf-8")

pwa_path = site / "web-pwa.js"
pwa = pwa_path.read_text(encoding="utf-8")
assert pwa.count("/fromm-viewer/") == 3, "Unexpected PWA registration contract"
pwa_path.write_text(pwa.replace("/fromm-viewer/", "/fromm-viewer-preview/"), encoding="utf-8")

sw_path = site / "sw.js"
sw = sw_path.read_text(encoding="utf-8")
old_prefix = "fromm-viewer-public-art-"
assert sw.count(old_prefix) == 1, "Unexpected service-worker cache namespace"
sw_path.write_text(sw.replace(old_prefix, "fromm-viewer-preview-public-art-", 1), encoding="utf-8")


# Restore the prior two-button Meapri lenses selectively. Do not bring the old
# preview-chat.js override into PR #121: it also replaces conversation logic.
controls_path = site / "web-glass-controls.js"
controls = controls_path.read_text(encoding="utf-8")
def replace_glass_once(original, expected, replacement):
    assert original.count(expected) == 1, "Upstream glass control contract changed: " + expected[:80]
    return original.replace(expected, replacement, 1)

controls = replace_glass_once(controls,
    "const controls='.card-", "const controls='#chatMatchPrev,#chatMatchNext,.card-")
controls = replace_glass_once(controls,
    "const strength=rail ? .85 : el.id==='scrollTopBtn' ? .35 : drop ? .65 : .55;",
    "const reply=el.matches('#chatMatchPrev,#chatMatchNext');\\n const strength=rail ? .85 : reply ? 1.05 : el.id==='scrollTopBtn' ? .35 : drop ? .65 : .55;".replace('\\n', '\n'))
controls = replace_glass_once(controls,
    "const brightness=menu?Math.min(.025,settings.opacity/100):settings.opacity/100;",
    "const brightness=menu?Math.min(.025,settings.opacity/100):reply?Math.min(.16,settings.opacity/180):settings.opacity/100;")
controls = replace_glass_once(controls,
    "tint:menu?'rgba(255,255,255,'+brightness+')':drop?",
    "tint:menu?'rgba(255,255,255,'+brightness+')':reply?'rgba(239,255,248,'+brightness+')':drop?")
controls = replace_glass_once(controls,
    "specular:menu||settings.specular>0,specularIntensity:menu?.10+settings.specular/400:settings.specular/100",
    "specular:menu||reply||settings.specular>0,specularIntensity:reply?Math.max(.24,settings.specular/100):menu?.10+settings.specular/400:settings.specular/100")
controls = replace_glass_once(controls,
    "el.id==='conversationNew'?85:el.matches(selected)||el===pointer?80:el.id==='scrollTopBtn'?50:0;",
    "el.id==='conversationNew'?85:el.matches(selected)||el===pointer?80:(el.id==='chatMatchPrev'||el.id==='chatMatchNext')?70:el.id==='scrollTopBtn'?50:0;")
# The interactive glass face formerly made voice toggles look raised and could
# leave a dark visual state after pointer exit. Preserve native playback and
# download behavior; exclude only these two selector entries from the engine.
voice_selectors = ".chat-audio-play,.chat-sound-download,"
assert controls.count(voice_selectors) == 2, "Voice lens selectors changed"
controls = controls.replace(voice_selectors, "")
controls_path.write_text(controls, encoding="utf-8")

(site / "pr121-build.json").write_text(json.dumps({
    "purpose": "independent PR #121 account test site",
    "sourceRepository": "fffdsaw/fromm-viewer",
    "sourceCommit": source_sha,
    "previewWorkflowCommit": build_sha,
    "previewPath": "/fromm-viewer-preview/",
    "storageNamespace": "isolated from /fromm-viewer/",
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

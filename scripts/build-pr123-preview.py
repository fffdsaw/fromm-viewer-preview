#!/usr/bin/env python3
"""Build a PR #123-only preview with persistent data isolated from production.

This script intentionally does NOT copy the historical preview-chat or PR #121
visual overrides. Production remains untouched, as do existing preview DB keys.
"""
from pathlib import Path
import json
import shutil
import sys

SOURCE_SHA = "1c7bb5019180d37549abb6b12cfc09c729de1dc5"
STORAGE_PREFIX = "fromm.preview.v1::"

if len(sys.argv) != 4:
    raise SystemExit("usage: build-pr123-preview.py UPSTREAM_DIR SITE_DIR WORKFLOW_SHA")
upstream = Path(sys.argv[1]).resolve()
site = Path(sys.argv[2]).resolve()
workflow_sha = sys.argv[3]
version = workflow_sha[:12]
preview = Path(__file__).resolve().parents[1]

if not (upstream / "index.html").is_file():
    raise SystemExit("missing pinned PR #123 upstream checkout")
site.mkdir(parents=True, exist_ok=True)

for pattern in ("index.html", "*.js", "*.css", "*.webmanifest", ".nojekyll"):
    for source in upstream.glob(pattern):
        shutil.copy2(source, site / source.name)
for directory in ("assets", "vendor"):
    shutil.copytree(upstream / directory, site / directory, dirs_exist_ok=True)
for filename in ("preview-storage.js", "pr123-preview-banner.js", "pr123-legacy-media.css", "pr123-gallery-audio-controls.js"):
    shutil.copy2(preview / "overrides" / filename, site / filename)

def replace_exact(value, old, new, why):
    if value.count(old) != 1:
        raise AssertionError(f"{why}: expected exactly one source occurrence, got {value.count(old)}")
    return value.replace(old, new, 1)

html_path = site / "index.html"
html = html_path.read_text(encoding="utf-8")
html = replace_exact(html, "<title>Fromm Viewer</title>",
                     "<title>Fromm Viewer · 실험용 · PR #123</title>", "title")
charset = '<meta charset="utf-8" />'
html = replace_exact(html, charset, charset + "\n"
                     + f'<script src="preview-storage.js?v={version}"></script>',
                     "early storage isolation")
html = replace_exact(html, "</body>",
                     f'<script src="pr123-preview-banner.js?v={version}"></script>\n</body>',
                     "preview badge")
# Keep the historical native browser players for gallery audio/video instead of
# mounting the PR #123 compact controller and oversized waveform player.
# Expanded Replay/Channel/LIVE are specialized streaming UIs; do not remove
# quality selection, PiP or stream handling.
html = replace_exact(html, '<script src="web-compact-player.js?v=stable-glass-glyph-20261115"></script>',
                     '<!-- Legacy gallery video controls restored in preview -->',
                     "remove compact video override")
html = replace_exact(html, 'window.FrommChatAudio?.enhance(a,{gallery:true});',
                     'window.FrommGalleryAudioControls?.enhance(a);', "video-style gallery audio overlay")
html = replace_exact(html, 'thumb?.classList.add("audio-player-ready");',
                     '// Preview native audio keeps the normal thumb state.', "native gallery audio thumb")
html = replace_exact(html, "</head>",
                     f'<link rel="stylesheet" href="pr123-legacy-media.css?v={version}">\n'
                     f'<script src="pr123-gallery-audio-controls.js?v={version}"></script>\n</head>',
                     "audio-card overlay stylesheet and controller")
html_path.write_text(html, encoding="utf-8")

manifest_path = site / "manifest.webmanifest"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest.update({
    "id": "/fromm-viewer-preview/",
    "name": "Fromm Viewer 실험용 · PR #123",
    "short_name": "실험용 PR #123",
    "start_url": "/fromm-viewer-preview/",
    "scope": "/fromm-viewer-preview/",
})
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                         encoding="utf-8")

core_path = site / "web-conversation-core.js"
core = core_path.read_text(encoding="utf-8")
core = replace_exact(core, "name='fromm-conversations-v1'",
                     "name='fromm-preview-conversations-v1'",
                     "preserve existing preview IndexedDB and isolate production")
core_path.write_text(core, encoding="utf-8")

conversation_path = site / "web-conversation.js"
conversation = conversation_path.read_text(encoding="utf-8")
for expression in ("event.key===epochKey(c.storageAccount,c.host)",
                   "event.key===storageKey(c.storageAccount)"):
    conversation = replace_exact(conversation, expression,
                                 "event.key==='" + STORAGE_PREFIX + "'+" + expression[len("event.key==="):],
                                 "cross-tab preview storage event")
conversation_path.write_text(conversation, encoding="utf-8")

pwa_path = site / "web-pwa.js"
pwa = pwa_path.read_text(encoding="utf-8")
if pwa.count("/fromm-viewer/") < 2:
    raise AssertionError("PWA registration paths changed; review isolation")
pwa_path.write_text(pwa.replace("/fromm-viewer/", "/fromm-viewer-preview/"),
                    encoding="utf-8")

sw_path = site / "sw.js"
sw = sw_path.read_text(encoding="utf-8")
sw = replace_exact(sw, "fromm-viewer-public-art-",
                   "fromm-viewer-preview-public-art-", "service-worker namespace")
sw = replace_exact(sw, "const CACHE_NAME = CACHE_PREFIX + 'v2';",
                   f"const CACHE_NAME = CACHE_PREFIX + 'pr123-{version}';",
                   "invalidate old preview artwork")
sw_path.write_text(sw, encoding="utf-8")

# Keep source (including new theme/settings/compact-player assets) untouched
# other than explicit project-path and storage isolation. Never import PR #124/125.
required = ("index.html", "web-compact-player.js", "compact-player.css",
            "web-themes.js", "themes.css", "settings-panel.css",
            "web-glass-controls.js", "web-glass-settings.js",
            "web-chat-audio.js", "web-pwa.js", "sw.js",
            "preview-storage.js", "pr123-preview-banner.js", "pr123-legacy-media.css",
            "pr123-gallery-audio-controls.js")
for filename in required:
    if not (site / filename).is_file():
        raise AssertionError(f"required PR #123 preview asset missing: {filename}")

(site / "pr123-build.json").write_text(json.dumps({
    "purpose": "13-item PR #123 visual and account test (not production)",
    "sourceRepository": "fffdsaw/fromm-viewer",
    "sourceCommit": SOURCE_SHA,
    "previewWorkflowCommit": workflow_sha,
    "previewPath": "/fromm-viewer-preview/",
    "storageNamespace": STORAGE_PREFIX,
    "indexedDB": "fromm-preview-conversations-v1",
    "containsExperimentalOptics124or125": False,
    "galleryPlayerMode": "video-style-audio-native-video",
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

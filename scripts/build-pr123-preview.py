#!/usr/bin/env python3
"""Build a PR #123-only preview with persistent data isolated from production.

This script intentionally does NOT copy the historical preview-chat or PR #121
visual overrides. Production remains untouched, as do existing preview DB keys.
"""
from pathlib import Path
import json
import shutil
import sys

SOURCE_SHA = "a21ced8d34bab7b4d3d7662babb106cbd144cad3"
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
for filename in ("preview-storage.js", "preview-artist-banner.js", "preview-artist.css", "preview-artist.js", "preview-nickname.js", "preview-artist-feed.css", "preview-artist-feed.js"):
    shutil.copy2(preview / "overrides" / filename, site / filename)

def replace_exact(value, old, new, why):
    if value.count(old) != 1:
        raise AssertionError(f"{why}: expected exactly one source occurrence, got {value.count(old)}")
    return value.replace(old, new, 1)

html_path = site / "index.html"
html = html_path.read_text(encoding="utf-8")
# Preview-only direct integration: when the copied Channel renderer builds
# its grid, consult the verified artist subset. Never change upstream files.
channel_visible_original = '''function visibleChannelPosts(){
  const type=channelVideoState.mediaType;
  return collectionOrderedPosts((channelVideoPage()?.posts||[]).filter(p=>type==="all" ? p.type==="video"||p.type==="image" : p.type===type),"channel");
}'''
channel_visible_preview = '''function visibleChannelPosts(){
  const type=channelVideoState.mediaType;
  const posts=collectionOrderedPosts((channelVideoPage()?.posts||[]).filter(p=>type==="all" ? p.type==="video"||p.type==="image" : p.type===type),"channel");
  return window.FrommPreviewArtist?.filterPosts ? window.FrommPreviewArtist.filterPosts(posts) : posts;
}'''
html = replace_exact(html, channel_visible_original, channel_visible_preview,
                     "preview mixed-media Artist filtering inside Channel renderer")
html = replace_exact(html, "<title>Fromm Viewer</title>",
                     "<title>Fromm Viewer · 실험용 · Artist</title>", "title")
charset = '<meta charset="utf-8" />'
html = replace_exact(html, charset, charset + "\n"
                     + f'<script src="preview-storage.js?v={version}"></script>',
                     "early storage isolation")
html = replace_exact(html, "</body>",
                     f'<script src="preview-artist-banner.js?v={version}"></script>\n</body>',
                     "preview badge")
# Keep copied current production UI and gallery controls unchanged.
# Only the preview feature and storage isolation are appended.
html = replace_exact(html, "</head>",
                     f'<link rel="stylesheet" href="preview-artist.css?v={version}">\n</head>',
                     "preview Artist styles")
html = replace_exact(html, "</body>",
                     f'<script src="preview-artist.js?v={version}"></script>\n</body>',
                     "preview Artist controller")
html = replace_exact(html, "</body>",
                     f'<script src="preview-nickname.js?v={version}"></script>\n</body>',
                     "preview fan nickname renderer")
html = replace_exact(html, "</head>",
                     f'<link rel="stylesheet" href="preview-artist-feed.css?v={version}">\n</head>',
                     "preview Artist source panel styles")
html = replace_exact(html, "</body>",
                     f'<script src="preview-artist-feed.js?v={version}"></script>\n</body>',
                     "preview Artist official-feed source discovery")
html_path.write_text(html, encoding="utf-8")

manifest_path = site / "manifest.webmanifest"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest.update({
    "id": "/fromm-viewer-preview/",
    "name": "Fromm Viewer 실험용 · Artist",
    "short_name": "실험용 Artist",
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
            "preview-storage.js", "preview-artist-banner.js", "preview-artist.css",
            "preview-artist.js", "preview-nickname.js", "preview-artist-feed.js", "web-channel-photos.js", "web-morph-menu.js")
for filename in required:
    if not (site / filename).is_file():
        raise AssertionError(f"required PR #123 preview asset missing: {filename}")

(site / "pr123-build.json").write_text(json.dumps({
    "purpose": "Current operating source copied for isolated Artist preview (not production)",
    "sourceRepository": "fffdsaw/fromm-viewer",
    "sourceCommit": SOURCE_SHA,
    "previewWorkflowCommit": workflow_sha,
    "previewPath": "/fromm-viewer-preview/",
    "storageNamespace": STORAGE_PREFIX,
    "indexedDB": "fromm-preview-conversations-v1",
    "containsExperimentalOptics124or125": False,
    "galleryPlayerMode": "copied-current-source-unchanged",
    "previewArtist": "attributed-channel-image-filter",
    "previewNickname": "hasNick-and-marker-room-scoped",
    "previewArtistFeed": "official-feed-url-discovery-only",
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

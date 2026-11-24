# 2026-11-24 — Preview LiquidGlass comparison

- Target `fffdsaw/fromm-viewer-preview`, branch `feature/ybouane-liquid-glass-engine-comparison`, preview base `e1e6dc9`. The generated site still uses the read-only source `a21ced8` and all of the preview's Artist, nickname and storage overrides.
- Settings can switch engines live. Meapri is the default and reads its existing preferences. The ybouane WebGL renderer is pinned to npm 1.0.3 at `2c8ff3d`. The preview uses it for a bounded set of visible optical surfaces. The app keeps the native foreground, morph controls and shared result-sheet lifecycle.
- The ybouane shader limits distortion and reflections to the bevel. The adapter samples decoded origin-clean media or bounded local paint with no new media fetches, no screen capture and no external proxy. Complex CSS/text backgrounds are approximated at the edge. Protected or unready media, playing video, unsupported WebGL and dedicated rail glyph interactions retain the existing fallback. Hardware GPU use and signed-in service media remain unverified.
- Local build `python3 scripts/build-pr123-preview.py UPSTREAM_DIR SITE_DIR WORKFLOW_SHA`. Set `PREVIEW_SITE_ROOT=SITE_DIR` to run `node test/artist-preview.browser.cjs` and `node test/preview-glass-engines.browser.cjs`. The Chromium checks cover visibly changed edge pixels, transparent centre, switching, isolated persistence, menu selection, save sheet, unreadable image, forced colors and missing WebGL. Compare deployed `pr123-build.json` to the preview merge SHA and pinned source before claiming rollout.
- During active scroll, controls and result sheets use their native material. The renderer restores WebGL after scrolling rests and reuses the settings preview frame while its backdrop is stable.

---

# 2026-11-15 — Fix preview audio Playwright timeout at login gate

- User showed failed GitHub Pages workflow with Playwright `TimeoutError` and repeated `waiting 500ms`, with the next `Run PR` regression step skipped.
- Source `index.html` mounts `#loginGate` as `position:fixed; z-index:2000` while unauthenticated. Previously `test/pr123-storage-isolation.browser.cjs` appended a sample audio `.media-card` to the end of `document.body` without z-index/visible positioning. It could be covered by the login overlay and non-scrollable `.login-screen`.
- The preview test now positions only its **synthetic sample** as a fixed viewport-visible card above the login gate; production/app UI is untouched. It checks `document.elementFromPoint` for all real controls and logs each Playwright input step. This preserves genuine pointer interaction coverage instead of using programmatic DOM clicks or weakening assertions.
- The gallery audio implementation `overrides/pr123-gallery-audio-controls.js` and its CSS are unchanged. Existing storage isolation, actual synthetic WAV play/pause/mute/seek/speed tests remain.
- Merge applies only to preview `fffdsaw/fromm-viewer-preview`; source `fffdsaw/fromm-viewer` PR #123 and production main, optical PR #124/#125, existing preview data and backups are unchanged.
- **Check the new Pages Actions run and live `pr123-build.json` before declaring deployment success.** If a later step fails, the new smoke logs identify the interaction.

---

# 2026-11-15 — Audio gallery now uses video-style bottom controls (requested visual follow-up)

- The user provided two real screenshots: native gray centered audio bar (undesired) and native video thumbnail with bottom-overlay controls (target). Implement the audio gallery to visually follow the latter without tampering with the media engine, download buttons, or other sections.
- Branch: `codex/pr123-audio-like-video-controls-20261115`. Target repository: **preview only** `fffdsaw/fromm-viewer-preview`.
- A scoped script `overrides/pr123-gallery-audio-controls.js` enhances only gallery `<audio>` elements and replaces the centered gray browser audio pill with native-video-like bottom overlay: play/pause at lower left, elapsed time, mute control and overflow menu (volume and playback speed), seek bar along lower edge. It preserves the real HTMLAudioElement and uses no network analysis or new media requests.
- `overrides/pr123-legacy-media.css` now matches gallery audio thumbnail aspect ratio to video cards (1.45:1), with an unobtrusive dark background; it hides native audio controls only after a successfully mounted overlay. If the script is unavailable the original audio control remains.
- `scripts/build-pr123-preview.py` embeds the script and switches the gallery enhancement hook, leaves video thumbnails on native Chrome controls, and writes `galleryPlayerMode: video-style-audio-native-video` to `pr123-build.json`.
- The existing storage-isolation browser test additionally checks actual overlay DOM and geometry, native video controls preserved, local synthetic WAV playback, seek, mute, and speed; no Fromm API or real account data is used.
- `.github/workflows/pages-preview.yml` checks the new asset and JavaScript syntax before deploying.
- **Do not merge to the operating `fffdsaw/fromm-viewer` main, apply PR #124/#125, delete old preview DB, or replace Replay/Channel/LIVE native streaming playback.**
- Upon merge, verify preview GitHub Pages publishes the new `pr123-build.json` and run passes; do not infer successful deployment from merge alone.

---

# 2026-11-15 — Preview legacy gallery player rollback (user visual review)

- User reported PR #123 gallery audio thumbnails were disproportionate and the revamped small-card player looked worse than the prior version. This rollback restores the **native browser** audio/video controls **only for gallery cards**, and reduces the audio-only thumb to 116–172px rather than reserving a video-size 1.45:1 stage.
- Preview-only development branch: `codex/pr123-restore-legacy-media-20261115`. Source remains pinned at `fffdsaw/fromm-viewer` PR #123 `1c7bb5019180d37549abb6b12cfc09c729de1dc5`.
- New `overrides/pr123-legacy-media.css` + targeted build-time transforms in `scripts/build-pr123-preview.py` remove the compact video module inclusion and skip `FrommChatAudio.enhance(a,{gallery:true})` in gallery. **All-conversation voice players, real Meapri glass, cache/scroll, downloads/selection, settings/themes remain untouched.**
- Replay/Channel/LIVE specialized players are **not** reverted to native controls: those already existed before the 13-item changes, and removing them would risk losing quality selection, PiP, rotation and stream logic. A separate visual reference/explicit scope is needed before changing that inherited design.
- `test/pr123-storage-isolation.browser.cjs` checks updated build metadata, absent compact controller script, legacy stylesheet, native audio/video controls and bounded gallery audio geometry. Existing storage and Service Worker isolation assertions are unchanged.
- The preview repository's original PR #121 version remains backed up at `backup/pr121-preview-before-pr123-20261115`. Production `fffdsaw/fromm-viewer` main and PR #123, PR #124/#125, private data, and credentials are not modified.
- Deployment outcome must be verified from GitHub Actions and the public `pr123-build.json`; do not claim browser or real-account verification until observed.

---

# Fromm Viewer Preview — PR #123 isolated integration (2026-11-15)

## Current scope and safety
- Source is pinned to `fffdsaw/fromm-viewer` PR #123 at `1c7bb5019180d37549abb6b12cfc09c729de1dc5` (13 UI/UX items; final implementation 10/10 CI succeeded in source repo).
- Active preview branch remains `codex/pr121-preview` because its existing GitHub Pages environment permits this branch. The old PR #121 preview state is preserved at `backup/pr121-preview-before-pr123-20261115` (`f3f6e123c2fd8493d7c0877066d46738d5314a93`).
- New build `scripts/build-pr123-preview.py` copies the complete verified source assets, including settings, themes, and compact player. It DOES NOT apply historical PR121 visual/conversation overrides, which would mask PR123 changes.
- Reuses `overrides/preview-storage.js` and existing prefix `fromm.preview.v1::` without clearing stored data; IndexedDB remains `fromm-preview-conversations-v1` (v2). Service worker, cache keys, and PWA URLs are restricted to `/fromm-viewer-preview/`. The visible badge now says `실험용 · PR #123`.
- New `test/pr123-storage-isolation.browser.cjs` checks old preview v1→v2 migration, production DB/localStorage sentinel preservation, SW scope and cache, new settings/theme/player assets, and release source SHA.
- The deployment workflow `.github/workflows/pages-preview.yml` on this branch runs these checks plus pinned source regressions, then deploys **only** to `https://fffdsaw.github.io/fromm-viewer-preview/` and verifies the public `pr123-build.json` source/workflow SHAs.
- Main repository `fffdsaw/fromm-viewer` main and its public Pages, PR #123, optical experiment PRs #124/#125, and preview `main` were not edited.
- **Deployment not yet verified at this checkpoint.** The connected GitHub run-list query returned no workflow executions for the recent preview API-created commits. Do not claim deployment succeeded; inspect Actions and, if necessary, manually dispatch `pages-preview.yml` with branch `codex/pr121-preview`, then check the workflow and public `pr123-build.json`.
- Do not overwrite any actual account state or clear preview caches; test migration with synthetic records only.

## Resume
1. Check preview branch HEAD and exact source SHA; do not recreate work or change preview main.
2. Check `https://github.com/fffdsaw/fromm-viewer-preview/actions/workflows/pages-preview.yml` for the latest run on `codex/pr121-preview`.
3. If no run exists, click **Run workflow** and select **codex/pr121-preview** (the workflow has `workflow_dispatch`).
4. Inspect failing step logs; repair only the preview branch, push and rerun. Do not weaken storage isolation assertions.
5. Confirm `https://fffdsaw.github.io/fromm-viewer-preview/pr123-build.json` contains source SHA `1c7bb5019180d37549abb6b12cfc09c729de1dc5` and matching workflow SHA. Then visually test with a real account; this has not been done.
6. No operation on production main, preview main, or PR #124/#125 without new authorization.

---

# Fromm Viewer Preview — PR #121 handoff

Updated: 2026-11-13 (Asia/Seoul)

## Repository and deployment

- Repository: https://github.com/fffdsaw/fromm-viewer-preview
- Test site: https://fffdsaw.github.io/fromm-viewer-preview/
- Production source: https://github.com/fffdsaw/fromm-viewer
- PR under test: https://github.com/fffdsaw/fromm-viewer/pull/121
- Current fixed source commit: `5609ede9f5d8c503244d5eba0e0d9e4fe76e13f1`
- Preview `main` preserved at `d37e2673f48dfa6ef630c95b8af2cb380ef51a3b`.
- Work branch: `codex/pr121-preview`, based on the unchanged preview `main`.
- Successful Pages run for this source: https://github.com/fffdsaw/fromm-viewer-preview/actions/runs/43419597212
- Deployed preview workflow commit: `604225bd8ccfcb28289faea5ee0cdf24b0afef76`; public `pr121-build.json` reports source `5609ede9f5d8c503244d5eba0e0d9e4fe76e13f1`.
- Previous source `7ebcdb491c7a1ea14cc7a77d02057eb433975cb2` was deployed by run 43407345638 and remains an ancestor of the updated PR branch.
- The `github-pages` environment initially allowed only `main`; its existing `main` rule was retained and `codex/pr121-preview` was added so the requested isolated branch could deploy.
- Production `main`, production Pages, and the preview repository's `main` were not changed.

## Build and data boundaries

The branch workflow builds the fixed PR source and deploys only the test repository's Pages artifact. It intentionally omits the existing preview chat/unread and glass-control overlays so they cannot change the behavior being tested. Those files and the old deployment workflow remain on preview `main` and in Git history.

Production and preview are paths on the same `https://fffdsaw.github.io` origin, so path separation alone does not isolate browser storage. The PR build therefore:

- uses IndexedDB database `fromm-preview-conversations-v1` (schema version 2), while production remains `fromm-conversations-v1`;
- namespaces preview localStorage keys with `fromm.preview.v1::`, including storage-event key checks;
- registers only `/fromm-viewer-preview/sw.js` with `/fromm-viewer-preview/` scope;
- uses Cache Storage names beginning `fromm-viewer-preview-public-art-`;
- scopes the preview manifest to `/fromm-viewer-preview/`;
- displays the persistent `실험용 · PR #121` badge.

The build script is `scripts/build-pr121-preview.py`. The browser boundary/migration test is `test/pr121-storage-isolation.browser.cjs`. The deployment workflow copies only `preview-storage.js` and `pr121-preview-banner.js`; no real account data is used by CI.

The latest code update keeps the “my replies” navigation mode and selected reply active after opening its quoted original, so the up/down reply arrows remain available and continue from the reply the user clicked. It does not alter the IndexedDB schema or database name and performs no cache clear. Existing PR-preview cache data remains in `fromm-preview-conversations-v1`.

## Verification completed locally

Environment: Node.js 22.23.5, Playwright 1.62.1, Chromium 151.0.7922.34.

- PR preview path browser test: PASS. Confirmed visible badge, localStorage prefix and non-destructive preview `clear()`, v1→v2 migration of a synthetic preview DB, unchanged synthetic production DB, separate service-worker scope, and preview-only cache name.
- `node --test test/conversation.test.cjs test/unread.test.cjs` from the fixed source: 16 passed, 0 failed.
- Browser `conversation-state`: PASS.
- Browser cache restore: PASS, including partial/complete restore, merge/deduplication and retained reader anchor.
- Browser cache conflicts: PASS, including v1 migration, multi-tab preservation, bounded conflicts and 10,000 synthetic conflicts.
- Browser storage recovery: PASS, including interrupted writes and completed metadata preservation.
- Browser progressive history: PASS, including recent-first display, partial restore, background completion and viewport retention.
- Browser 10,000/50,000 scale: PASS. Synthetic 50,000-row cold scan first displayed in 40 ms, completed in 37.166 s, flushed in 15.592 s, made 102 history requests and 14 incremental requests; 300 rows were visible during the scan. These are local synthetic Chromium measurements, not Fromm service timings.
- Large quoted-original regression on PR source `5609ede`: PASS locally. Navigating from a recent self-reply to a midpoint original in 50,000 synthetic messages keeps the virtualized view at 600 or fewer rows; reply arrows remain visible and navigate to the prior reply; an absent original leaves the calendar responsive.
- Full upstream unit suite: 275 passed. Related desktop/mobile browser suites `reply-anchor-context`, `reply-start-top`, `my-replies`, `search-calendar-panel`, and `chat-history-progressive`: PASS.
- `git diff --check`: PASS.

These checks used synthetic accounts/messages and a locally assembled copy of the fixed source. They did not authenticate to Fromm or call a live account API. The complete PR GitHub Actions results remain on PR #121 and are separate from the preview workflow run.

Run 43419244712 passed build and storage/migration isolation but timed out in `conversation-cache-restore.browser.cjs` at its 3-second post-flush reader-anchor assertion (line 67); the deployment was skipped. The same cache-restore test passed when run alone locally, and the full workflow retry succeeded. Run 43419597212 passed every step: build, storage/migration isolation, PR unit/browser regressions including preserved reply arrows at the quoted original, Pages artifact upload, and deployment. Public verification returned HTTP 200 and `pr121-build.json` reports source `5609ede9f5d8c503244d5eba0e0d9e4fe76e13f1` and preview workflow commit `604225bd8ccfcb28289faea5ee0cdf24b0afef76`.

PR #121 Actions on source `5609ede` passed all checks, including the Channel browser suite (16m08s). On the later handoff-only head `ad05377867ba76f2f3c6aa5ad36ef75f9014e75d`, [run 43421678801](https://github.com/fffdsaw/fromm-viewer/actions/runs/43421678801) first failed Chromium's existing post-flush cache reader-anchor assertion, then passed on the failed-job rerun; Chrome and Edge passed. The changed quote-navigation code does not modify cache flush or reader-anchor behavior.

## Access Bridge and manual account test

Static inspection of `access_bridge-1.zip` found MV3 host access for `*://*.frommyarti.com/*`, DNR rules matching `frommyarti.com` request URLs, and no `initiatorDomains` restriction. PR #121 calls `api.frommyarti.com`, `account-api.frommyarti.com`, and `channel-api.frommyarti.com`, so the request destinations match those rules in configuration. The extension was not installed or exercised in Chrome; browser-level application and account login remain unverified. The extension's `pages.dev` permission does not cover this `github.io` page, but its `frommyarti.com` request host permission is the relevant destination permission for these rules.

The user should use a separate Chrome profile for the real-account check. The updated deployment is live; reopen the test page or hard-refresh it, then confirm the badge and `pr121-build.json` source SHA before retrying quote navigation. Do not clear the preview cache to apply this code-only update. Do not copy tokens, cookies, account IDs, or message text into logs or GitHub. Native LIVE is outside this test scope.

## Risks and recovery

- The real Fromm API's same-timestamp pagination contract is still unverified. A saturated timestamp boundary must remain visibly incomplete; this test site does not prove server completeness.
- Synthetic v1→v2 migration confirms preservation of test records. It does not exercise a real user's database. The preview DB name is separate, so this test deployment does not migrate the production DB.
- The preview and production share the `github.io` origin, but the tested IndexedDB, localStorage, service-worker scope, manifest scope, and Cache Storage names are separated. Cookies are not read or written by the PR app code found in the static scan.
- Do not roll back a production v2 database to v1-only application code: the older code cannot open a version-2 database. This test deployment uses a distinct DB name; test-site rollback does not affect the production DB.
- To restore the previous preview experiment, use GitHub Actions → `Deploy Fromm Viewer Preview`, select `main`, and run workflow. Preview `main` stays at its old pinned baseline `e8c57b137d43e8d16e43ba2cb11db6a5f71636bc` with its original overlays. Do not merge the task branch to preview `main` for recovery.

## Resume commands

```bash
git fetch origin
git switch codex/pr121-preview
git pull --ff-only origin codex/pr121-preview
git status --short --branch
```

For PR deployment, run `pages-preview.yml` with ref `codex/pr121-preview`; inspect the completed Actions run and fetch `/pr121-build.json` from the test site to verify `sourceCommit` equals the current fixed SHA above. Do not merge or deploy the production repository without the user's separate approval.

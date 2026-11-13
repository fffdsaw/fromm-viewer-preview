# Fromm Viewer Preview — PR #121 handoff

Updated: 2026-11-13 (Asia/Seoul)

## Repository and deployment

- Repository: https://github.com/fffdsaw/fromm-viewer-preview
- Test site: https://fffdsaw.github.io/fromm-viewer-preview/
- Production source: https://github.com/fffdsaw/fromm-viewer
- PR under test: https://github.com/fffdsaw/fromm-viewer/pull/121
- Current fixed source commit: `6f1f595ff6beb19af2502d95b9949ec788ea46dd`
- Preview `main` preserved at `d37e2673f48dfa6ef630c95b8af2cb380ef51a3b`.
- Work branch: `codex/pr121-preview`, based on the unchanged preview `main`.
- Successful Pages run for this source: https://github.com/fffdsaw/fromm-viewer-preview/actions/runs/43412504785
- Deployed preview workflow commit: `08bc5c4f91c08d669d4ddb338dd20b19d22810b7`; public `pr121-build.json` reports source `6f1f595ff6beb19af2502d95b9949ec788ea46dd`.
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

The latest code update changes only quoted-original navigation and its regression test. It does not alter the IndexedDB schema or database name and performs no cache clear. Existing PR-preview cache data remains in `fromm-preview-conversations-v1`.

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
- Large quoted-original regression on PR source `6f1f595`: PASS. Navigating from a recent self-reply to a midpoint original in 50,000 synthetic messages keeps the virtualized view at 600 or fewer rows; an absent original leaves the calendar responsive.
- Full upstream unit suite: 275 passed. Related desktop/mobile browser suites `reply-anchor-context`, `reply-start-top`, `my-replies`, `search-calendar-panel`, and `chat-history-progressive`: PASS.
- `git diff --check`: PASS.

These checks used synthetic accounts/messages and a locally assembled copy of the fixed source. They did not authenticate to Fromm or call a live account API. The complete PR GitHub Actions results remain on PR #121 and are separate from the preview workflow run.

The latest successful GitHub Actions run passed every step: build, browser storage/migration isolation, PR unit/browser regressions (including the new 50k quote jump and calendar test), Pages artifact upload, and deployment. Public URL verification returned HTTP 200 and confirmed source `6f1f595`, the visible-label script, isolated database/PWA/cache namespace, and absence of the old preview overlay.

PR #121 Actions on source `6f1f595`: Video download engine, Media bulk save, and Conversation receive/send/persistence are successful; Channel videos regression is still running at the time of this update. Check run [43412123644](https://github.com/fffdsaw/fromm-viewer/actions/runs/43412123644) before reporting complete PR validation.

## Access Bridge and manual account test

Static inspection of `access_bridge-1.zip` found MV3 host access for `*://*.frommyarti.com/*`, DNR rules matching `frommyarti.com` request URLs, and no `initiatorDomains` restriction. PR #121 calls `api.frommyarti.com`, `account-api.frommyarti.com`, and `channel-api.frommyarti.com`, so the request destinations match those rules in configuration. The extension was not installed or exercised in Chrome; browser-level application and account login remain unverified. The extension's `pages.dev` permission does not cover this `github.io` page, but its `frommyarti.com` request host permission is the relevant destination permission for these rules.

The user should use a separate Chrome profile for the real-account check. The fix is deployed; reopen the test page or hard-refresh it, then confirm the badge and `pr121-build.json` source SHA before retrying. Test sign-in, artist selection/history loading, cache re-entry, search/date, and media. Do not clear the preview cache to apply this code-only update. Do not copy tokens, cookies, account IDs, or message text into logs or GitHub. Native LIVE is outside this test scope.

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

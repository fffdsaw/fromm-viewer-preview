# 2026-11-24 · 광학 엔진 비교

실험용 웹의 **설정 → 유리 효과 → 광학 엔진**에서 Meapri Liquid Glass와 ybouane LiquidGlass를 즉시 전환할 수 있습니다. Meapri가 처음 선택되며, ybouane은 별도의 굴절·가장자리 폭·반사광·흐림·색수차 설정을 사용합니다. 설정은 실험용 저장 키에 보관됩니다.

ybouane은 공식 npm 1.0.3의 WebGL 렌더러를 사용합니다. 중앙은 실제 배경을 그대로 비추고 가장자리에서만 굴절합니다. 설정 미리보기, Channel 모핑 메뉴, 공통 저장 결과 패널 및 기존 광학 컨트롤에서 비교할 수 있습니다. 브라우저에서 읽을 수 없는 미디어, 재생 중인 영상, WebGL 미지원 환경 등에서는 기존 Meapri 또는 CSS 표시를 사용합니다. 재생 중인 영상의 WebGL 굴절은 이 실험의 검증 범위에 포함되지 않습니다. [버전·MIT 라이선스](vendor/ybouane/README.md)

---

## 2026-11-20: Artist 공식 피드 주소 연결 실험

- 최신 Android APK `base.apk` 정적 분석에서 `GET /channels/arti`와 `channelFeedUrl`을 확인함.
- **프리뷰 전용** `preview-artist-feed.js`에서 아티스트 ID가 확인된 선택 채팅방에 한해, 기존 인증된 API 클라이언트로 공식 피드 주소 조회를 시도함.
- 주소는 `https://*.frommyarti.com`에서만 열 수 있도록 제한. 토큰·응답 원문을 기록하거나 지속 저장하지 않음.
- `Artist` 선택 시 확인된 공식 피드를 여는 링크와 상태를 안내함. 기존 채널 사진/영상과 Artist 업로더 정보 분류는 유지.
- **아직 해결되지 않은 부분:** `channelFeedUrl` 웹페이지의 Artist 게시물 목록 조회 API와 작성자 식별 필드는 확인되지 않았음. 따라서 프리뷰 웹의 자체 앨범/플레이어에 **공식 Artist 피드 사진·영상이 직접 표시되는 단계는 아님**.
- 읽기 전용 원본 저장소 `fffdsaw/fromm-viewer`의 코드는 수정하지 않음.

---

# Fromm Viewer · Artist 실험용 (2026-11-19)

- 운영 웹 저장소 `fffdsaw/fromm-viewer`의 커밋 `a21ced8d34bab7b4d3d7662babb106cbd144cad3`를 **읽기 전용으로 복사하여** 실험용 사이트를 빌드합니다. 운영 저장소에 코드를 쓰거나 병합하지 않습니다.
- 실험 주소: https://fffdsaw.github.io/fromm-viewer-preview/
- 보호용 이전 실험 웹 백업 브랜치: `backup/preview-before-main-copy-artist-20261119`
- 실험에 추가한 파일: `overrides/preview-artist.js`, `overrides/preview-artist.css`, `overrides/preview-artist-banner.js`, `test/artist-preview.browser.cjs`.
- 채널 `전체·영상·사진` 모핑 메뉴에 `Artist`를 추가하고, `Artist` 선택 시 오른쪽에 `전체 멤버` 필터를 조건부 표시합니다.
- **데이터 한계:** 공식 Artist 전용 목록 API는 확인되지 않았습니다. 현재 실험 기능은 기존 채널 **사진·영상 게시물 중 응답에 명시적인 `artistId/memberId/artist` 필드가 있는 항목만** Artist로 분류하며, 출처가 불분명한 사진이나 영상을 임의 분류하지 않습니다. 공식 Artist 전용 목록과 완전한 멤버별 목록은 **미구현·실계정 미검증**입니다.
- 기존 실험용 IndexedDB(`fromm-preview-conversations-v1`), 접두사(`fromm.preview.v1::`), PWA/Service Worker 범위를 유지합니다. 개인 계정 정보·토큰은 GitHub에 기록하지 않습니다.
- 새 소스의 갤러리·재생·다운로드 기능은 운영 웹과 동일하게 복사하고, 더 이상 PR #123 갤러리 조작 오버라이드를 적용하지 않습니다.

---

## 이전 PR #123 실험 기록 (보관)

# Fromm Viewer · 실험용 웹 (PR #123 통합 개선)

운영 웹 **https://fffdsaw.github.io/fromm-viewer/** 과 독립된 GitHub Pages 실험용 사이트입니다.

- **실험 사이트:** https://fffdsaw.github.io/fromm-viewer-preview/
- **실험용 저장소:** `fffdsaw/fromm-viewer-preview`
- **검증 대상 소스:** 운영 저장소 `fffdsaw/fromm-viewer` 의 PR #123, 고정 커밋 `1c7bb5019180d37549abb6b12cfc09c729de1dc5`
- **갤러리 플레이어:** 영상은 기존 브라우저 기본 컨트롤을 유지합니다. 음성은 영상 카드와 같은 화면 비율(1.45:1) 및 하단 플레이어 배치로 통일하며, 별도 음성 컨트롤(재생·시간·탐색·음량·속도)을 제공합니다. Replay·Channel·LIVE 전문 재생 기능은 그대로 유지합니다.
- **설치 확인:** 사이트의 `/pr123-build.json`에서 `sourceCommit` 및 `previewWorkflowCommit`을 검증합니다.
- **배포:** 실험용 저장소 `main`에 푸시하면 `.github/workflows/pages-preview.yml`이 합성 데이터 기반 테스트 후 GitHub Pages에 게시합니다.
- **복구용 체크포인트:** `backup/pr121-preview-before-pr123-20261115` 브랜치. 운영 저장소의 `main`과는 무관합니다.
- **별도 광학 실험 PR #124/#125:** 배포 소스에 포함하지 않습니다.

## 브라우저 데이터 격리

운영 사이트와 실험용 사이트는 같은 `fffdsaw.github.io` Origin(출처)을 공유하므로 서로 다른 경로만으로는 저장소가 격리되지 않습니다. 실험용은 운영 계정 저장 기록 보호를 위해 아래 이름을 별도로 사용합니다.

- IndexedDB: `fromm-preview-conversations-v1` (기존 실험용 데이터 재사용, 강제 삭제 금지)
- localStorage: `fromm.preview.v1::` 접두사
- Service Worker: `/fromm-viewer-preview/sw.js` 및 해당 경로로 한정된 scope
- Cache Storage: `fromm-viewer-preview-public-art-` 접두사
- PWA manifest: `/fromm-viewer-preview/` 전용
- 화면에는 `실험용 · PR #123` 구분 표시

이것은 저장 키 충돌 방지이지, 서로 다른 Origin과 같은 보안 경계는 아닙니다. 민감한 계정 검증에는 운영 사이트와 다른 Chrome 브라우저 프로필을 권장합니다.

## 자동 배포 및 검증

[Deploy Fromm Viewer Preview](https://github.com/fffdsaw/fromm-viewer-preview/actions/workflows/pages-preview.yml)

워크플로는 소스의 고정 커밋에서 HTML/JS/CSS/이미지/벤더 자산을 복사해 구성합니다. 기존 PR #121 시절 `preview-chat.js` 및 시각적 오버라이드는 PR #123의 원래 기능을 가리지 않도록 빌드에서 제외합니다. 기존 파일과 Git 기록은 삭제하지 않습니다.

실험용 격리·데이터베이스 이전·서비스 워커·테마/설정창/플레이어 자산 검증, 소스 회귀 검사를 통과해야만 배포를 실행합니다. 이후 `pr123-build.json`으로 실제 사이트 게시 버전을 확인합니다.

실제 Fromm 인증 API, 개인 계정 데이터, 실기기 Android/iOS 및 Safari는 GitHub Actions가 검증하지 않습니다. 토큰이나 실제 메시지는 저장소 이슈·로그·커밋에 올리지 마세요.

**이 저장소에 병합하거나 배포해도 운영 `fffdsaw/fromm-viewer` 의 `main`과 운영 페이지는 변경되지 않습니다.**

## 다시 시작하기

인수인계: [CODEX_HANDOFF.md](CODEX_HANDOFF.md). 예전 PR #121 실험은 `backup/pr121-preview-before-pr123-20261115`에서 확인합니다. 단순히 예전 브랜치를 배포하기 전에 새로운 격리·테스트 구성이 맞는지 확인해야 합니다.

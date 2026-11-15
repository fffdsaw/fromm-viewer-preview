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

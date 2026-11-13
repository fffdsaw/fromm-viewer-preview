# Fromm Viewer · 실험용 웹

이 저장소는 공개 운영 중인 [Fromm Viewer](https://github.com/fffdsaw/fromm-viewer)의 **독립 실험용 배포**입니다. 정식 저장소와 정식 웹은 이 저장소의 작업이나 배포 대상이 아닙니다.

- 운영 웹: https://fffdsaw.github.io/fromm-viewer/
- 실험용 웹: https://fffdsaw.github.io/fromm-viewer-preview/
- 운영 저장소의 `main`은 여기서 **수정하지 않습니다**.
- `main`에는 이전 실험이 보존되어 있고, 현재 PR #121 검증 브랜치 `codex/pr121-preview`는 정식 저장소 PR 브랜치의 고정 커밋 `6f1f595ff6beb19af2502d95b9949ec788ea46dd`를 기준으로 합니다.
- 공개 저장소이므로 로그인 토큰, 비밀번호, 실제 개인 대화 기록은 커밋하지 않습니다.
- 운영 웹과 실험용 웹은 `fffdsaw.github.io`의 같은 Origin을 공유합니다. PR #121 테스트 빌드는 별도 IndexedDB 이름, localStorage 접두사, 서비스 워커 경로, Cache Storage 이름을 사용합니다.

## 최초 1회: Pages 활성화

1. [이 저장소의 Settings → Pages](https://github.com/fffdsaw/fromm-viewer-preview/settings/pages)로 이동합니다.
2. **Build and deployment → Source**가 **GitHub Actions**인지 확인합니다.
3. PR #121 시험은 `codex/pr121-preview` 브랜치의 [Deploy Fromm Viewer Preview 워크플로](https://github.com/fffdsaw/fromm-viewer-preview/actions/workflows/pages-preview.yml)를 선택한 뒤 **Run workflow**를 실행합니다. `main` 푸시는 기존 실험 버전을 배포하므로 PR 테스트를 갱신하지 않습니다.
4. 완료 후 [실험용 웹](https://fffdsaw.github.io/fromm-viewer-preview/)의 우측 상단에 `실험용 · PR #121` 표시가 있는지 확인합니다.

## 실제 계정 테스트 전

- Chrome에서 운영 웹과 분리된 새 프로필을 만들고, 그 프로필에서만 테스트 웹에 로그인합니다.
- 브라우저 확장 `Access Bridge`가 활성화되어 있고 `frommyarti.com` 요청 권한을 부여받았는지 확인합니다. Pages 주소는 `github.io`이며 확장의 `pages.dev` 권한은 이 주소에 적용되지 않지만, 규칙은 요청 URL을 기준으로 `frommyarti.com` 호스트에 적용되도록 작성되어 있습니다.
- 테스트는 실제 로그인 후에도 그 프로필 안에서만 진행합니다. 프로필의 토큰, 쿠키, 메시지 내용을 저장소 이슈/로그에 복사하지 마세요.
- 이 저장소는 PR 코드의 실계정 인증을 자동으로 수행하지 않습니다. 확장 규칙의 실제 브라우저 적용, 로그인, 대화/미디어 동작은 사람이 직접 확인해야 합니다.

## PR #121 테스트를 끝낸 뒤 이전 실험 복구

PR 테스트 브랜치를 병합하지 않고 이전 실험용 배포로 되돌리려면 Actions에서 `main`을 선택해 기존 워크플로를 **Run workflow**로 실행합니다. `main`의 소스와 오버라이드는 보존되어 있으며 이 동작은 `main` 코드나 정식 사이트를 수정하지 않고 실험용 Pages만 다시 배포합니다.

자동 검증 실패 시에도 Pages는 마지막 성공 artifact를 계속 제공할 수 있습니다. `pr121-build.json`의 `sourceCommit`이 위 고정 SHA인지 확인하고, 작업 브랜치의 마지막 성공 배포를 기록한 다음 `main` 워크플로를 실행하면 이전 실험 상태로 복구할 수 있습니다.

## 실험용 수정 방법

`overrides/` 디렉터리에 변경할 사이트 파일을 운영 웹과 동일한 상대 경로로 저장합니다.
예시: `overrides/web-conversation.js`, `overrides/index.html`, `overrides/conversation.css`.

`main`의 기존 워크플로는 고정된 기준 버전을 가져와 기존 `overrides/`를 적용합니다. `codex/pr121-preview`에서는 PR #121 고정 SHA를 빌드하고, 저장소 격리 오버라이드와 실험 표시만 넣습니다. 기존 `preview-chat.js` 및 Glass 실험은 지우지 않았으며 PR 동작을 가리지 않도록 PR 테스트 artifact에서만 제외합니다. 개발 문서/테스트 자료나 인증 데이터는 사이트 배포에 포함하지 않습니다.

기본 화면의 웹 문서 제목과 PWA 이름에 `실험용` 표시를 추가하여 운영 버전과 구분합니다. 더 이상 테스트가 필요하지 않으면 실험용 저장소만 비활성화할 수 있습니다.

## 실험 우선순위

1. 새 메시지 표시: 미확인 메시지 수 및 배지, 최신 대화 이동
2. 대화창 안정화: 진입 위치, 스크롤 복원, 모바일 입력창 겹침
3. 인용 메시지: 나/팬 구분, 원문 이동 및 강조

서버에서 실제 읽음 정보가 제공되지 않을 때는 로컬 확인 시점 기반 새 메시지 수와 서버의 읽음 상태를 혼동하지 않습니다.

# Fromm Viewer · 실험용 웹

이 저장소는 공개 운영 중인 [Fromm Viewer](https://github.com/fffdsaw/fromm-viewer)의 **독립 실험용 배포**입니다.

- 운영 웹: https://fffdsaw.github.io/fromm-viewer/
- 실험용 웹: https://fffdsaw.github.io/fromm-viewer-preview/
- 운영 저장소의 `main`은 여기서 **수정하지 않습니다**.
- 실험용은 운영 저장소의 확인된 커밋 `e8c57b137d43e8d16e43ba2cb11db6a5f71636bc`을 기준으로 만듭니다.
- 공개 저장소이므로 로그인 토큰, 비밀번호, 실제 개인 대화 기록은 커밋하지 않습니다.

## 최초 1회: Pages 활성화

1. [이 저장소의 Settings → Pages](https://github.com/fffdsaw/fromm-viewer-preview/settings/pages)로 이동합니다.
2. **Build and deployment → Source**를 **GitHub Actions**로 변경합니다.
3. 이미 존재하는 [Deploy Fromm Viewer Preview 워크플로](https://github.com/fffdsaw/fromm-viewer-preview/actions/workflows/pages-preview.yml)를 **Run workflow**로 실행하거나 `main`에 새 커밋을 푸시하면 자동 배포됩니다.
4. 배포 완료 후 실험용 웹 주소로 접속합니다.

## 실험용 수정 방법

`overrides/` 디렉터리에 변경할 사이트 파일을 운영 웹과 동일한 상대 경로로 저장합니다.
예시: `overrides/web-conversation.js`, `overrides/index.html`, `overrides/conversation.css`.

자동 배포는 고정된 운영 버전의 웹 파일을 가져온 다음 `overrides/`의 내용을 덮어쓰고, GitHub Pages에 게시합니다. 개발 문서/테스트 자료나 인증 데이터는 사이트 배포에 포함하지 않습니다.

기본 화면의 웹 문서 제목과 PWA 이름에 `실험용` 표시를 추가하여 운영 버전과 구분합니다. 더 이상 테스트가 필요하지 않으면 실험용 저장소만 비활성화할 수 있습니다.

## 실험 우선순위

1. 새 메시지 표시: 미확인 메시지 수 및 배지, 최신 대화 이동
2. 대화창 안정화: 진입 위치, 스크롤 복원, 모바일 입력창 겹침
3. 인용 메시지: 나/팬 구분, 원문 이동 및 강조

서버에서 실제 읽음 정보가 제공되지 않을 때는 로컬 확인 시점 기반 새 메시지 수와 서버의 읽음 상태를 혼동하지 않습니다.

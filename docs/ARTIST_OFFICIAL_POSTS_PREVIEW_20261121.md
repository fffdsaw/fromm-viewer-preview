# 실험용 Artist 공식 게시물 목록 연결 — 2026-11-21

## 확인된 코드 근거
- 사용자가 제공한 공식 웹 JS `1304-2622a4318b76dcd5.js` 내 모듈 22316: `GET /posts` / `GET /posts/{postId}`, 호출 시 `channel-id` 존재 검사.
- 동 JS의 Artist 게시물 모델: `post.id`, `post.author`, `post.isVisible`, `post.isMembershipOnly`, `post.mediaType`, `post.media[]`의 `url`/`thumbnailUrl`/`runningTime`, `post.mediaUrl` 폴백.
- `POST /channels/enter`의 브라우저 직접 접근에서는 `Bearer null`과 401. **앱과 Viewer의 유효 인증을 동일시하지 않는다.**
- 공식 웹에 `GET /posts` 함수가 있지만 첫 페이지의 실제 `query`, 응답 껍질(wrapper), 페이지네이션 커서는 미확인.

## 구현
- 메인 웹 `fffdsaw/fromm-viewer`의 고정 커밋을 **읽기/복사만** 한다.
- 별도 `preview-artist-posts.js`는 `Artist` 선택 시에만 Viewer의 기존 `frommApiRequest('/posts', {base: FROMM_CHANNEL_API_BASE, channelId})`로 1차 읽기 요청. **조회 조건 추측을 피하려고 query를 붙이지 않는다.**
- 응답에 `posts` 배열이 있는 경우에만 표시. 사진·영상 중 작성자가 명시되고 실제 HTTPS 미디어 URL이 있으며 `isVisible!==false`인 항목만 UI에 노출. `text` 및 비공개·잘못된 항목은 표시하지 않음.
- 기존 Channel 업로드 `/media/posts`와는 다른 소스: 목록 카드는 같은 스타일을 활용하지만 개별 게시물 열기에서는 **`GET /posts/{id}`**로 재확인한 후에만 미디어 URL을 표시. 원본 /media/posts용 갤러리·플레이어에 잘못된 ID를 넘기지 않음.
- Artist 작성자/멤버 필터는 실제 `author.id/name`을 사용. 계정/채널을 바꾸면 이전 요청 취소·메모리 초기화. 계정 인증값/서명된 URL을 localStorage 등 영구 저장하거나 로그로 내보내지 않음.
- 401/403, 400, 404, CORS 및 형식 미확인을 0건으로 오해하지 않도록 별도 메시지 표시.
- 첫 페이지만 읽음. `isLast===false`일 경우 끝이라고 주장하지 않고 추가 조회 조건 확인 필요 표시.
- 영상은 HTML5 플레이어 우선. 브라우저가 HLS를 지원하지 않을 때는 안내만 표시. 추가 코덱/다운로드 통합은 실기기 응답 검증 이후 별도 단계.

## 검증 경계
- Mock(가상 응답) 기반 단위/브라우저 테스트는 기능 결합 및 상태 관리만 검증한다.
- 본인 계정으로 실제 `GET /posts` 성공/실제 Artist 콘텐츠 보기는 **테스트 환경에 인증 정보가 없어서 미검증**.
- 실제 로그인 세션에서 400/401/CORS가 반환되면 성공으로 포장하지 말고 표시된 오류 구분을 보고, 서버가 허용하는 공식 요청 파라미터/인증 방식 확인 후 후속 구현.
- 메인 웹 코드 수정, 삭제, 추가, 병합, 배포 **없음**.

# Artist 피드 읽기 API 추적 — 2026-11-21

> **범위:** 팬용 Fromm Android APK `base.apk` (사용자가 업로드한 분할 압축 `base.7z.001/.002`)의 **정적 분석** 및 실험용 웹 코드 점검. 운영 저장소 `fffdsaw/fromm-viewer`는 수정하지 않음. 실제 계정의 앱/웹 통신 패킷은 확보하지 못했음.

## 결론

**아티스트 게시물의 전체 목록을 조회하는 읽기 API는 아직 입증되지 않았다.** APK는 아티스트 피드로 이동할 수 있는 `channelFeedUrl`을 반환하는 API, 피드 게시판 목록, **개별** 팬 피드 게시물 읽기, 아티스트의 게시물 **쓰기**를 선언하지만 아티스트 게시물 목록 읽기 메서드를 해당 Retrofit 인터페이스에서 제공하지 않는다.

`channelFeedUrl`이 가리키는 웹 앱에서 목록 요청을 별도로 실행할 가능성이 있지만, **실제 Network 요청 URL·Method·Query·응답·인증 방식**은 미확인이다. 추측한 API를 실행하거나 작성자 데이터를 조작해서는 안 된다.

## APK에서 확정한 요청

Dex `classes2.dex`의 Retrofit 인터페이스 `Lp8/c;`의 주석 및 매개변수 주석을 분석했다.

| Method | 경로 | 주요 매개변수 | 응답형 | 확인된 역할 |
| --- | --- | --- | --- | --- |
| GET | `/channels/arti` | Query `artiId` | `ChannelInfoByArtiBody` | 아티스트 채널 정보 |
| GET | `/feed/boards` | Header `channel-id`, `language`; Query `channelId` | `FeedBoardBody` | 피드 게시판 목록 |
| GET | `/feed/posts/{postId}` | Header `channel-id`, Path `postId` | `ChannelFanFeedPostBody` | 팬 피드 **단일 게시물** |
| POST | `/posts` | Header `channel-id`, JSON `ArtiCreateFeedPostRequest` | `CreateFeedPostBody` | 아티스트 게시물 **작성** |
| POST | `/feed/posts` | Header `channel-id`, JSON `FanCreateFeedPostRequest` | `CreateFeedPostBody` | 팬 게시물 **작성** |
| 수정 요청 (HTTP 동사 미확정) | `/posts/{postId}` | Header `channel-id`, Path `postId`, JSON body | generic | 아티스트 게시물 수정 |
| 수정 요청 (HTTP 동사 미확정) | `/feed/posts/{postId}` | Header `channel-id`, Path `postId`, JSON body | generic | 팬 게시물 수정 |

`classes.dex`의 `POST /v2/app/resource/channel/media`는 multipart 업로드 응답 `UploadChannelMediaBody`이며 **미디어 조회 API가 아님**.

모델의 JSON Adapter 문자열에서도 다음 필드를 확인했다.

- `ChannelInfoByArtiDataModel`: `id`, `isSubscribed`, `channelFeedUrl`, `channelSubscribeUrl`, `channelIntroUrl`.
- `FeedBoardDataModel`: `id`, `name` (게시물 배열 필드 없음).
- `ChannelFanFeedPostDataModel`: `id`, `createdAt`, `updatedAt`, `content`, `mediaType`, `isMembershipOnly`, `isVisible`, `author`, `isLike`, `likeCount`, `commentCount`, `media`.
- `FeedMediaDataModel`: `id`, `url`, `thumbnailUrl`, `runningTime`, `mediaType`.

`GET /feed/posts/{postId}`의 모델에 사진·영상 미디어 정보가 **존재**하더라도, 이것만으로 아티스트 게시물 **목록** 및 그 목록의 접근 권한을 보장하지 않는다.

## 프리뷰의 현재 상태

- `overrides/preview-artist.js`: 채널 `/media/posts`에서 가져온 사진·영상 중 **명시적 아티스트 작성자 필드**가 있는 항목만 표시.
- `overrides/preview-artist-feed.js`: 확인된 `artiId`에 대해 `/channels/arti`를 요청하고, 검증한 HTTPS `channelFeedUrl`을 표시하려는 1차 연결.
- **별도의 공식 Artist 피드 목록을 프리뷰 자체의 카드/플레이어로 가져오는 구현은 없음.**

현재 Artist 0개는 **아티스트가 업로드하지 않았음을 뜻하지 않음**. 기존 채널 미디어 응답만으로 작성자를 식별할 수 없거나 별도 피드 목록이 필요하다는 뜻이다.

## 남은 핵심 조사 — 동적 네트워크 캡처

1. **승인된 본인 계정**으로 프롬 앱에서 해당 채널의 Artist 게시물이 실제 표시되는 화면을 연다. 가능한 경우 `channelFeedUrl`의 **웹페이지를 브라우저에서 직접 연다**.
2. 개발자 도구 Network(네트워크)에서 Fetch/XHR(데이터 요청)만 필터링하고, 아티스트 게시물 목록 화면을 새로 고침하거나 다음 페이지로 이동한다.
3. 읽기 요청의 **호스트/경로, HTTP Method, Query 파라미터 이름, 페이지네이션 방식, 응답 JSON의 구조**를 확인한다. 요청 헤더의 Authorization/Cookie/토큰, 원본 미디어 URL, 사용자 ID, 유료 콘텐츠는 기록하지 않는다.
4. 응답에서 아티스트 작성자 식별 필드·미디어 항목·공개/구독 권한·다음 페이지 커서를 식별한다. 공개된 것과 계정 권한이 필요한 것을 구분한다.
5. 기존 `frommApiRequest`를 통해 **정상 인증 및 CORS 범위에서 읽기 호출 가능할 때만** `fffdsaw/fromm-viewer-preview`에 연결한다. 별도 웹 Origin의 요청이면 호환성/허용된 접근 방식부터 검증한다.
6. 캡처한 **비밀이 없는 메서드·필드 구조**에 대한 테스트 픽스처와 브라우저 테스트를 추가한다. 추측 필드·무단 우회·가짜 게시물은 금지한다.

## 이번 분석의 한계

- 제공된 APK는 정적 바이트코드이며 사용자의 현재 세션/API 응답을 포함하지 않는다.
- 공개 `https://channel.frommyarti.com/`은 웹 앱 페이지로 확인했지만, 이번 조사 환경에서는 그 안의 실행된 네트워크 요청을 볼 수 없었다.
- 연결된 로컬 브라우저 탭 읽기 기능은 현재 접속 컨텍스트에서 이용할 수 없어, 인증된 피드의 실제 GET 목록 요청을 검증하지 못했다.
- 따라서 **공식 Artist 피드 전체 목록 연결 성공 / 실계정에서 콘텐츠 로드 성공**이라고 말할 수 없다.

## 격리

원본 `fffdsaw/fromm-viewer`에는 어떤 파일 변경·병합·배포도 수행하지 않는다. 본 문서는 `fffdsaw/fromm-viewer-preview`의 연구 브랜치에만 추가되며, 기능 코드를 수정하지 않는다.

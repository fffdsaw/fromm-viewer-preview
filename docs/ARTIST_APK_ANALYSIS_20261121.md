# Fromm Artist 피드 정적 분석 및 실험용 진단 수정 — 2026-11-21

## 결론

첨부 APK와 웹 번들은 Artist API 경로 후보와 일부 모델을 보여주지만, 실제 Artist 목록 호출에 전달되는 query, 응답 본문, 인증 성공 여부는 보여주지 않는다. 따라서 `GET /posts`에 query를 임의로 추가하거나 실제 Artist 게시물이 조회된 것으로 처리하지 않았다.

APK의 네이티브 Retrofit 인터페이스에서는 `GET /feed/posts/{postId}`가 피드 게시물 상세 조회이고 `/posts`는 `POST` 생성 요청이다. 공식 채널 웹 번들에는 별도로 `GET /posts` 및 `GET /posts/{postId}`가 있다. 이 두 증거는 API host와 클라이언트가 다른 상황일 수 있으므로 합쳐서 하나의 호출이라고 단정하지 않는다.

실험용 기능에서 재현 가능한 진단 오류를 수정했다. 세션이 로컬에서 확인되지 않아 요청을 보내지 않은 경우를 HTTP 401로 오표시하지 않고, 서버가 응답한 HTTP 401·403·400·404·5xx와 상태를 읽을 수 없는 네트워크/CORS 가능성을 각각 보여준다. 실제 계정 요청은 수행하지 않았다.

## 첨부 및 APK 확인

- 분할 파일 `base.7z.001`, `base.7z.002`의 SHA-256이 `README_FIRST.txt`의 값과 일치했다. 두 파일을 결합한 7z 무결성 검사에 통과했다.
- 압축에는 `base.apk`, `split_config.arm64_v8a.apk`, `split_config.ko.apk`, `split_config.xxhdpi.apk`가 있었다. 따라서 이 번들은 base APK만이 아니라 위 세 configuration split을 함께 포함한다. APKTool/JADX는 base APK를 디코드했고 split 목록과 native library를 별도로 확인했다.
- base APK에는 `classes.dex`, `classes2.dex`, `classes3.dex`와 `com.knowmerce.fromm.feature.inappweb.browser.InAppBrowserActivity`가 있다. 매니페스트에서 Activity는 `exported=false`다.
- JADX에서 `com.knowmerce.fromm.feature.inappweb.d`(`WebViewContainer`)는 JavaScript와 DOM storage를 활성화하고 전달받은 URL을 `loadUrl`한다. APK에 WebView 구현이 있다는 사실은 확인되지만, 이것만으로 Android의 Channel → Artist 화면이 이 WebView를 사용한다고 확정할 수 없다. 현재 패키지에서 Artist 탭 목록을 여는 네이티브 호출자와 실행 시 내려받는 웹 페이지 번들은 확인되지 않았다.

## 증거 표

| 발견 | 파일 및 위치 | 확인된 사실 | 확실성 |
|---|---|---|---|
| Channel API host | APK `R8/b.java:83-87` | `p169p8.c` Retrofit 서비스가 `https://channel-api.frommyarti.com`을 base URL로 사용하고 저장 토큰 interceptor를 등록한다. | 확정 |
| Channel 인증 헤더 | APK `p177q8/b.java:25-33`, `p169p8/c.java:40-51` | interceptor는 Bearer Authorization을 추가한다. `GET /feed/posts/{postId}`와 일부 요청은 `channel-id` 헤더를 명시한다. 해당 Channel 서비스 계약에서 `uuid` 헤더는 확인되지 않았다. | 확정 |
| 앱의 `/posts` 용도 | APK `p169p8/c.java:62-66`, `data/repositories/inappweb/a.java:93-112` | 이 네이티브 서비스에서 `/posts`는 `POST` 생성, `/posts/{postId}`는 수정이다. 네이티브 `GET /posts` 목록 메서드는 없다. | 확정 |
| Fan 피드 상세 | APK `p169p8/c.java:50-51`, `data/repositories/inappweb/a.java:177-251` | `GET /feed/posts/{postId}`에 channel ID와 게시물 ID를 전달하고, Fan 피드 모델로 파싱한다. | 확정 |
| Fan 게시물 모델 | APK `ChannelFanFeedPostDataModelJsonAdapter.java:45-56`, `FeedMediaDataModelJsonAdapter.java:33-40` | `id`, `createdAt`, `updatedAt`, `content`, `mediaType`, `isMembershipOnly`, `isVisible`, `author`, 반응 수, `media`; 미디어는 `id`, `url`, `thumbnailUrl`, `runningTime`, `mediaType`를 가진다. 이 모델은 이름대로 Fan feed 모델이며 Artist 응답 모델이라고 단정하지 않는다. | 확정 |
| 웹 Artist 목록 함수 | 첨부 `1304-2622a4318b76dcd5.js`의 로컬 포맷본, 모듈 22316 | `GET /posts` 함수는 query 객체를 그대로 전달하며 channel-id 존재를 검사한다. 상세는 `GET /posts/{postId}`이고 별도 query가 없다. | 함수 경로 확정, 실제 호출 조건 미확인 |
| 웹 Media 목록 함수 | 첨부 동일 JS, 모듈 7155 | `GET /media/posts`는 다른 함수/경로다. `/posts`와 같은 목록이라고 볼 수 없다. | 확정 |
| 웹 `artistPostList` | 첨부 `layout-db0ca5197de4c7d3.js` | 보이는 사용처는 캐시 키 무효화다. `getArtistPostList` 자체는 API URL이 아니며 query를 확인해주지 않는다. | 확정 |
| 목록 호출자/커서 | 첨부 `page-e84719b03b0ea995.js`, `webpack-33676f00f1bc60b3.js` | 엔트리는 추가 동적 chunk 8218 로딩을 선언하지만 해당 chunk 파일은 ZIP에 없다. query 생성, 목록 응답 wrapper, 커서 규칙, 마지막 페이지 판별은 확인되지 않았다. | 미확인 |
| 작성자 및 미디어 | 첨부 `1304`의 모델 변환 부분(포맷본 6357-6462 부근) | `author`, `isOfficialPost`, `isMembershipOnly`, `isVisible`, `mediaType`, `media[]`의 URL/thumbnail/runningTime, 단일 media URL fallback이 등장한다. 이를 실제 API 응답으로 검증하지는 않았다. | 코드 모델 확정, 실제 응답 미확인 |

## API 후보 비교

| 경로 | Method | 근거 및 의미 | query/인증/응답 검증 |
|---|---|---|---|
| `/posts` | 웹 번들 `GET`; APK 네이티브 서비스는 `POST` 생성 | 웹 번들은 `GET` 조회 함수를 선언한다. Android Retrofit `/posts`는 생성 요청이다. | 웹 목록 query 호출자와 응답은 미확인. APK Channel 서비스는 Bearer + `channel-id`를 사용한다. 웹과 동일 인증이라고 증명되지 않았다. |
| `/posts/{postId}` | 웹 번들 `GET`; APK 네이티브 서비스는 `PUT` 수정 | 웹 상세 함수와 앱 수정 함수가 같은 path지만 method가 다르다. | 웹 상세 응답 미확인. viewer에서 상세 미디어 조회를 실제 확인하지 않았다. |
| `/feed/posts` | 웹 번들 `GET`; APK에서 `POST` 생성 | Feed 목록과 생성은 서로 다른 method다. | Artist 목록과 같은 결과라고 확인할 근거가 없다. |
| `/feed/posts/{postId}` | APK `GET`; 웹 feed code에도 사용 | Fan feed 상세 조회 모델과 연결된다. | APK Fan 모델은 확인되지만 Artist 모델과 동일하다는 근거는 없다. |
| `/media/posts` | 웹 번들 `GET` | 별도 media 게시물 목록 경로다. | Channel 업로드 미디어 실험과 공식 Artist 피드는 구분해야 한다. |

`channelId`, `artiId`, `labelId`, `limit`, `num`, `displayStartAt`, `postId` 등은 코드 전체에 등장 여부와 별개로 **Artist 목록 GET query의 필수 여부가 확인되지 않았다**. 이 변경에서는 어떤 query도 새로 보내지 않는다. `author.id`와 아티스트 ID 계열 식별자 간 대응도 확정하지 않았다.

## 401·403·CORS 분리

- `GET /posts` 성공/실패 상태를 실제 계정에서 관찰하지 않았다.
- Viewer 고정 운영 소스 `web-unread.js`와 `web-conversation.js`는 `/v2/auth/signin/firebase/secure/reader`를 별도 호출한다. 그 경로의 401만으로 Artist `GET /posts` 상태나 원인을 정할 수 없다.
- Preview의 `channelVideoSession()`은 세션 값이 유효하고 같은지 확인하는 로컬 closure다. 거짓이면 요청 자체를 보내지 않으므로 그 경우는 HTTP 상태가 아니다.
- 실제 fetch가 반환한 401은 인증 실패, 403은 서버가 응답한 권한 거부, 400은 요청 조건 거부, 404는 경로 부재로 따로 표시한다. 5xx도 별도 상태다.
- fetch가 HTTP 응답 없이 실패하면 브라우저 코드만으로 CORS와 네트워크 오류를 구분할 수 없다. 화면에는 둘 다 가능한 원인으로 표시하고, DevTools Network에서 preflight와 `GET /posts`를 각각 확인해야 한다.
- APK가 붙이는 Bearer 토큰과 `channel-id`를 확인했지만, 테스트 환경의 Viewer 토큰이 해당 API에 승인되는지/기존 `uuid` 헤더가 필요한지는 미확인이다. 권한을 우회하거나 프록시를 추가하지 않았다.

## 실험용 코드 수정 및 검증 경계

- `overrides/preview-artist-posts.js`: 세션 미연결을 가짜 HTTP 401로 만들지 않는다. 401/403/400/404/5xx를 별도 error state로 보이고, 응답 없는 fetch 오류는 CORS가 확정된 것처럼 표현하지 않는다. 세션이 바뀌면 기존 목록을 비우고 다시 확인한다.
- `test/preview-artist-posts.test.cjs`: 요청 미전송 세션, 세션 변경 시 목록 폐기, HTTP 401/403/400/404/503, HTTP 상태 없는 TypeError, 빈 첫 페이지 케이스를 추가했다.
- `test/artist-preview.browser.cjs`: 브라우저 DOM에서 HTTP 오류 문구가 구별되고 요청이 미전송이면 HTTP 401로 표시되지 않으며 세션 변경 시 카드가 사라지는지 검증한다.
- 합성 응답 브라우저/단위 테스트는 UI, 상태 분리, 기존 채널 미디어 복귀만 확인한다. 실제 인증, 서버 응답, CORS 정책, Artist 사진·영상 재생은 확인하지 않는다.
- 배포 상태와 관계없이 이 변경을 실제 Artist 연결 성공으로 표현하지 않는다. 남은 핵심 사항은 승인된 실제 계정으로 `GET /posts`의 요청/상태/응답 schema를 읽기 전용으로 확인하는 것이다.

## 보안 범위

메인 저장소 `fffdsaw/fromm-viewer`의 소스는 고정 commit을 별도 read-only checkout에서 읽고 테스트에만 사용했다. 수정·추가·삭제·PR·병합·배포는 하지 않는다. APK, 공식 번들, 계정 token, UUID, cookie, Firebase 자격 증명, signed media URL은 실험용 저장소에 복사하지 않는다.

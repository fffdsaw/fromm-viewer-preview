# Artist 실험용 웹 배포 요청 · 2026-11-19

배포 대상: `fffdsaw/fromm-viewer-preview` (`main`)만.
복사되는 원본: `fffdsaw/fromm-viewer`의 고정 커밋 `a21ced8d34bab7b4d3d7662babb106cbd144cad3` (읽기 전용).
기능: 채널 `Artist` 필터와 조건부 멤버 메뉴. 기존 사진 중 명시적 아티스트 식별자가 있는 것만 분류하며, 공식 Artist 전용 API는 별도 검증 필요.

GitHub Actions `pages-preview.yml`은 합성 테스트 성공 후에만 실험용 Pages를 배포하도록 설정되어 있음. 데이터 격리 보존. 이 파일은 작업과 배포 요청의 기록이며 메인 웹에 적용되지 않음.

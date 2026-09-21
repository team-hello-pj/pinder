> 문서: 11-Hello-component-inventory.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-21

## 컴포넌트

| 컴포넌트명 | 위치(경로) | 상태(기본/hover/disabled 등 구현 여부) | 사용 화면(06 기준) | 근거 |
|---|---|---|---|---|
| Button | src/components/ui/Button.tsx | 기본/hover(opacity)/`:active`(scale)/`disabled`(opacity+cursor) 구현. `:focus-visible` 전용 스타일은 없고 전역 규칙에 의존 | SC06(내 일정), SC07(플래너, 상품 투어), SC09(마이페이지) | src/components/ui/Button.module.css, 각 화면의 `import { Button } from '@/components/ui'` |
| Card | src/components/ui/Card.tsx | `interactive` props에 hover(테두리·그림자·이동) 구현 | **사용처 없음** — `src/app/` 전체에서 import가 발견되지 않는다(정의만 있고 실제 화면에서 쓰이지 않는 컴포넌트) | src/app 전체 grep 결과(일치 없음) |
| Modal | src/components/ui/Modal.tsx | 네이티브 `<dialog>` 기반(브라우저 기본 포커스 트랩/ESC 지원), 닫기 버튼 hover만 별도 스타일 | SC03(회원가입 약관 모달), SC05(탐색, 일수 선택/로그인 모달), SC06(내 일정, 새 일정/삭제/일정수정/로그인 안내/AI 생성 좌표 매칭 실패 안내), SC07(플래너, 각종 팝업), SC08(커뮤니티, 로그인 유도/사진 크롭), SC09(마이페이지) | 각 화면의 `import { Modal } from '@/components/ui'`(grep 결과) |
| SegmentedControl | src/components/ui/SegmentedControl.tsx | hover/active(선택됨) 구현, `disabled` 옵션 자체가 없음 | **사용처 없음** — `src/app/` 전체에서 import가 발견되지 않는다(정의만 있고 실제로는 이모지 버튼 그룹 등으로 대체되어 쓰이는 것으로 보임) | src/app 전체 grep 결과(일치 없음) |
| DateRangeCalendar | src/components/ui/DateRangeCalendar.tsx | 이전/다음 달 버튼 hover만 CSS로 구현, 선택 범위 색상은 CSS 클래스가 아니라 인라인 style로 계산되어 적용됨(`:disabled`/`:focus-visible` 없음) | SC06(내 일정 — 새 일정 만들기, 일정 수정 팝업) | src/app/(main)/routes/NewTripFlow.tsx, src/app/(main)/routes/MyRoutesClient.tsx |
| ImageCropModal | src/components/ui/ImageCropModal.tsx | 확인 버튼은 `naturalSize` 없으면 `disabled`(Button의 disabled 스타일 상속), 크롭 프레임은 `:active`(grabbing)만 별도 구현 | SC08(커뮤니티 글쓰기 — 사진 첨부 시 4:3 크롭) | src/app/(main)/community/CommunityClient.tsx |
| PlaceholderImage | src/components/ui/PlaceholderImage.tsx | 상태 없음(정적 표시 전용, `role="img"`) | SC05(탐색 — 사진 없는 여행지 카드), SC08(커뮤니티 — 사진 없는 경우) | src/app/(main)/explore/ExploreClient.tsx, src/app/(main)/community/CommunityClient.tsx |
| AuthorAvatar | src/components/ui/AuthorAvatar.tsx | 상호작용 없음(표시 전용) — 사진/기본이미지/이니셜배지 3분기, 이니셜배지 색은 이름 해시로 결정 | SC06(내 일정 — 참여자 목록), SC08(커뮤니티 — 작성자/댓글) | src/app/(main)/routes/MyRoutesClient.tsx, src/app/(main)/community/CommentThread.tsx |
| HighlightedCaption | src/components/ui/HighlightedCaption.tsx | 상태 없음(텍스트 변환 전용, `#태그`만 색상 처리) | SC08(커뮤니티 — 게시물 감상평의 태그 강조) | src/app/(main)/community/CommunityClient.tsx |
| SiteHeader | src/components/layout/SiteHeader.tsx | 네비게이션 링크 hover/active(현재 경로), 로그인 버튼 hover 구현 | SC01(홈), SC05(탐색), SC06(내 일정), SC08(커뮤니티), SC09(마이페이지) — `(main)` 레이아웃 그룹 공통. **SC02·SC03·SC04(인증 화면)와 SC07(플래너)에는 렌더되지 않는다** — 인증 화면은 자체 `AuthLayout`을, 플래너는 `(main)` 그룹 밖에 있어 전용 화면을 쓴다 | src/app/(main)/layout.tsx, src/app/(auth)/layout.tsx, 디렉터리 구조(`src/app/planner`가 `(main)` 밖에 위치) |
| SiteFooter | src/components/layout/SiteFooter.tsx | 웹 버전 링크 hover만 구현 | SiteHeader와 동일한 5개 화면(SC01, SC05, SC06, SC08, SC09) | src/app/(main)/layout.tsx |
| MobileMenu | src/components/layout/MobileMenu.tsx | 버튼 자체 hover 없음, 링크 hover 구현, `aria-expanded`/`role="menu"` 적용 | SiteHeader와 동일한 5개 화면(768px 이하 너비에서만 노출) | src/components/layout/SiteHeader.tsx |
| NotificationBell | src/components/layout/NotificationBell.tsx | 버튼 hover(밝기)/active(scale), 읽음/안읽음 표시는 인라인 style로 처리(클래스 기반 아님) | SiteHeader와 동일한 5개 화면 | src/components/layout/SiteHeader.tsx |
| Logo | src/components/layout/Logo.tsx | hover는 사실상 변화 없음(색 유지), 브랜드 애니메이션에 `prefers-reduced-motion` 예외 처리 있음 | SiteHeader(5개 화면), SC02·SC03(로그인/회원가입 자체 헤더) | src/components/layout/SiteHeader.tsx, src/app/(auth)/login/LoginClient.tsx 등 |
| ThemeToggle | src/components/layout/ThemeToggle.tsx | hover(밝기+투명도)/active(scale), 다크모드 전용 테두리색 별도 처리 | SiteHeader와 동일한 5개 화면 | src/components/layout/SiteHeader.tsx |
| ScreenScaffold | src/components/layout/ScreenScaffold.tsx | 상호작용 없음(정적 안내 카드) | **사용처 없음** — "아직 포팅이 끝나지 않은 화면"을 위한 임시 컴포넌트였고, 모든 화면 이식이 끝난 지금은 `src/app/` 어디에서도 쓰이지 않는다 | 컴포넌트 자체의 주석("아직 포팅이 끝나지 않은 화면의 껍데기"), src/app 전체 grep 결과(일치 없음) |
| DesktopScaleView / ForceDesktopView | src/components/layout/DesktopScaleView.tsx, ForceDesktopView.tsx | 시각적 컴포넌트가 아니라 `?view=pc` 쿼리로 데스크톱 비율 강제/스케일링을 처리하는 동작 래퍼 | SC01, SC05, SC06, SC08, SC09(`(main)` 레이아웃에 공통 적용) | src/app/(main)/layout.tsx |

**추가로 확인된 사실**: 회원가입(SC03)·마이페이지(SC09)의 아바타 업로드는 `ImageCropModal`을 쓰지 않고 `src/lib/avatar-upload.ts`의 `resizeImageFile`(정중앙 정사각형 자동 크롭)만 쓴다 — 반면 커뮤니티(SC08) 게시물 사진은 사용자가 직접 위치를 조정하는 `ImageCropModal`을 쓴다. 같은 "이미지 업로드" 기능인데도 화면마다 서로 다른 두 가지 크롭 방식이 쓰이고 있다(근거: src/app/(auth)/signup/SignupClient.tsx, src/app/(main)/my-page/MyPageClient.tsx의 `resizeImageFile` 호출부, src/app/(main)/community/CommunityClient.tsx의 `ImageCropModal` 사용).

> 문서: 10-Hello-design-system.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-18

## 색상

모든 색상 토큰은 `src/styles/tokens.css`의 `:root`(라이트)와 `[data-theme='dark']`(다크) 선택자에 정의되어 있다. `prefers-color-scheme` 미디어쿼리는 쓰지 않는다 — 테마는 전적으로 사용자가 직접 고른 값(또는 기본값 라이트)으로만 정해진다.

| 토큰명 | 라이트 값 | 다크 값 | 용도 | 근거(경로) |
|---|---|---|---|---|
| `--pd-brand` | `#7bcb93` | (다크에서 재정의 없음) | 브랜드 기본색 | src/styles/tokens.css |
| `--pd-brand-strong` | `#63b37e` | (재정의 없음) | 브랜드 hover/강조 | src/styles/tokens.css |
| `--pd-brand-ink` | `#12321f` | `#12321f`(명시적으로 동일값 재선언) | 브랜드 배경 위 텍스트 | src/styles/tokens.css |
| `--pd-brand-accent` | `#26ab4e` | (재정의 없음) | 로고 콜론 등 포인트 색 | src/styles/tokens.css |
| `--pd-link` | `#1f7a44` | `#7bcb93` | 링크 색 | src/styles/tokens.css |
| `--pd-link-hover` | `#146030` | `#95c898` | 링크 hover 색 | src/styles/tokens.css |
| `--pd-bg` | `#ffffff` | `#0f0f10` | 페이지 배경 | src/styles/tokens.css |
| `--pd-text` | `#171719` | `#f7f7f8` | 기본 텍스트 | src/styles/tokens.css |
| `--pd-text-sub` | `rgba(23,23,25,0.6)` | `rgba(247,247,248,0.62)` | 보조 텍스트 | src/styles/tokens.css |
| `--pd-border` | `#e1e2e4` | `#292a2d` | 테두리 | src/styles/tokens.css |
| `--pd-header-bg` | `rgba(255,255,255,0.82)` | `rgba(15,15,16,0.72)` | 고정 헤더(블러) 배경 | src/styles/tokens.css |
| `--pd-card-bg` | `#ffffff` | `#17181a` | 카드 표면 | src/styles/tokens.css |
| `--pd-chip-bg` | `#f4f4f5` | `rgba(255,255,255,0.08)` | 칩/필 배경 | src/styles/tokens.css |
| `--pd-row-hover` | `#f7f7f8` | `rgba(255,255,255,0.06)` | 리스트 행 hover | src/styles/tokens.css |
| `--pd-badge-bg` | `#eaf9ef` | `rgba(123,203,147,0.14)` | 홈 히어로 배지/CTA | src/styles/tokens.css |
| `--pd-danger` / `--pd-danger-bg` | `#e52222` / `#feecec` | `#ff6b6b` / `rgba(229,34,34,0.18)` | 위험(삭제 등) | src/styles/tokens.css |
| `--pd-info` / `--pd-info-bg` | `#0054d1` / `#eaf2fe` | `#6ca3ff` / `rgba(0,84,209,0.2)` | 정보 안내 | src/styles/tokens.css |
| `--pd-warn` / `--pd-warn-bg` | `#d47800` / `#fef4e6` | `#f2a94e` / `rgba(212,120,0,0.2)` | 경고 | src/styles/tokens.css |

**토큰 규칙 위반(실제 확인된 것)**: 프로젝트 스스로 정한 규칙(docs/ARCHITECTURE.md "색상·간격·반경은 src/styles/tokens.css 의 CSS 변수만 쓴다")과 달리, 화면 단위 CSS 모듈 90건 이상에서 하드코딩된 hex 색상이 발견된다 — 특히 `src/app/planner/planner.module.css`에 약 50건(`#171719`, `#fff`, `#fee500`, `#3b82f6` 등), 그 외 `my-routes.module.css`, `my-page.module.css`, `explore.module.css`, `community.module.css`, `login.module.css`, `signup.module.css`, `forgot-password.module.css`, `AntCtaCard.module.css`, `home.module.css`에도 존재한다(근거: 위 각 파일, 스스로 다크모드 대응이 안 됨을 주석으로 인정한 사례로 `my-routes.module.css`의 `#12321f` 하드코딩과 `planner.module.css`의 `#F3C9C9`(라이트 전용 고정값) 주석이 있다). `SiteHeader.module.css`의 `.link:hover { color: #95c898 }`도 라이트 모드에서는 어느 토큰과도 맞지 않는 하드코딩이다.

## 타이포그래피

중앙 집중식 글자 크기/굵기 스케일(디자인 토큰)은 없다 — `tokens.css`에는 색상·간격·반경·그림자만 있고 타이포그래피 토큰은 없다. 폰트 패밀리만 전역으로 한 번 지정되어 있다.

| 레벨 | font-size/weight | 용도 | 근거 |
|---|---|---|---|
| 전역 폰트 | `'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif` | 모든 텍스트의 기본 서체(CDN에서 로드, 자체 호스팅 아님) | src/styles/globals.css, src/app/layout.tsx(jsdelivr `<link>`) |
| 화면 제목(ScreenScaffold) | 28px / 800 / letter-spacing -0.02em | 미완성 화면 임시 안내 카드의 제목 | src/components/layout/ScreenScaffold.module.css |
| 모달 제목 | 16px / 700 | 공용 Modal 컴포넌트 헤더 | src/components/ui/Modal.module.css |
| 버튼 | sm 12.5px / md 13px / lg 15px, 공통 굵기 700 | Button 컴포넌트 3사이즈 | src/components/ui/Button.module.css |
| 세그먼트 컨트롤 | 13px/600(기본), 700(선택됨) | 경로 기준 등 세그먼트 선택 | src/components/ui/SegmentedControl.module.css |
| 로고 | sm 14px / md 20px(굵기 700) / lg 28px(굵기 800) | 헤더·화면별 로고 크기 | src/components/layout/Logo.module.css |
| 푸터 저작권 | 11.5px | 하단 저작권 텍스트 | src/components/layout/SiteFooter.module.css |

전역 `h1`-`h6` 스타일은 `globals.css`에 없으며, 각 화면 CSS 모듈이 그때그때 픽셀 값을 직접 정한다 — 즉 타이포그래피는 토큰화되어 있지 않고 화면마다 개별적으로 결정된다(근거: src/styles/globals.css 전체, 각 화면 `*.module.css`).

## 아이콘

주력 아이콘 체계는 `public/icons/` 아래의 PNG 래스터 파일이며, `<img>` 태그(또는 Logo의 CSS `mask-image`)로 직접 소비한다 — lucide·heroicons 같은 SVG 아이콘 라이브러리나 아이콘 폰트는 어디에도 import되어 있지 않다(근거: src/components/layout/Logo.module.css, src/components/layout/ThemeToggle.tsx, src/components/ui/AuthorAvatar.tsx 등).

**일관성 문제(실제 확인된 것)**: 하나의 아이콘 체계로 통일되어 있지 않고 최소 네 가지 방식이 동시에 쓰인다.
1. PNG 파일 — 가장 많이 쓰이는 방식(`/icons/waypoints.png`, `/icons/notepad-text.png`, `/icons/moon-icon.png`, `/icons/map-pin.png` 등).
2. 이모지 글자 — `src/constants/index.ts`의 `MODE_MAP`(🚗🚶🚌🚲)이 이동수단 아이콘으로 그대로 쓰이고, `PlaceholderImage.tsx`의 🖼도 마찬가지다.
3. 손으로 그린 인라인 SVG — `NotificationBell.tsx`가 알림 종류별로 서로 다른 `<svg>`를 직접 그려 쓴다.
4. 순수 유니코드 기호 — `Modal.tsx`의 닫기 버튼(`✕`), `MobileMenu.tsx`의 햄버거(`☰`), `NotificationBell.tsx`의 삭제 버튼(`✕`).

특히 `src/app/planner/SegmentConnector.tsx` 한 파일 안에서 이동수단 아이콘은 이모지(`MODE_MAP`)를, 지도 핀 아이콘은 PNG(`/icons/map-pin.png`)를 함께 쓰고 있어 같은 컴포넌트 내부에서도 방식이 섞여 있다. `ThemeToggle.tsx`는 라이트→다크 전환 버튼에 유니코드 `'☀'`를, 다크→라이트 전환에는 PNG(`/icons/moon-icon.png`)를 써서 같은 토글의 두 상태가 서로 다른 아이콘 방식을 쓴다 — `public/icons/sun-medium.png`가 이미 존재함에도 사용되지 않는다(근거: 위 각 파일).

## 반응형 그리드 처리

토큰 단위는 아니지만, 좁은 화면에서 레이아웃을 재조정하는 처리도 실제로 존재한다 — 플래너(SC07) 하단 요약 바의 액션 버튼 6개는 모바일 폭에서 `grid-template-columns: repeat(12, 1fr)` 기반 12분할 그리드로 2줄로 나뉘고, 각 버튼이 차지하는 칸 수(`grid-column: span N`)를 열마다 다르게 두어 버튼 간 간격을 유지한다(근거: src/app/planner/planner.module.css `.summaryActions`, `.mobileActionsRow1Col1`-`.mobileActionsRow2Col3`).

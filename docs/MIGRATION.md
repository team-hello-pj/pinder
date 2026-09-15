# 프로토타입 → Next.js 포팅 가이드

## 무엇이 달라졌나

리뉴얼 전에는 디자인 캔버스가 만든 `.dc.html` 파일 하나가 화면 하나였다.
각 파일은 `support.js` 런타임이 읽어서 React 컴포넌트로 바꿔주는 구조였다.

| 프로토타입                                        | Next.js                                          |
| ------------------------------------------------- | ------------------------------------------------ |
| `Route Planner App.dc.html`                       | `src/app/(main)/planner/page.tsx`                |
| `<x-dc>` + `{{ }}` 템플릿                         | JSX                                              |
| `class Component extends DCLogic` + `state = {…}` | `useState` / `useReducer`                        |
| `<sc-if value="{{ cond }}">`                      | `{cond ? <A /> : null}`                          |
| `<sc-for>`                                        | `{items.map((item) => <Row key={item.id} … />)}` |
| `{{ c.bg }}` 같은 테마 객체                       | `var(--pd-bg)` CSS 변수                          |
| 인라인 `style="…"`                                | `*.module.css`                                   |
| `<a href="./My Routes.dc.html">`                  | `<Link href="/routes">`                          |
| `api/*.js` (Vercel 함수)                          | `src/app/api/*/route.ts`                         |
| `<script src="./support.js">`                     | 필요 없음 (삭제)                                 |

## 화면 하나 옮기는 순서

1. `legacy/____.dc.html` 를 연다. 맨 아래 `<script type="text/x-dc">` 블록이 로직,
   그 위 마크업이 화면이다.
2. `state = { … }` 를 보고 **화면 상태**와 **고정 상수**를 분리한다.
   고정 상수(이동수단 목록, 카테고리 등)는 대부분 이미 `src/constants/` 에 있다. 먼저 확인할 것.
3. 순수 계산 함수(정렬, 재조정, 포맷)는 `src/lib/` 로 보낸다. 이미 옮겨둔 것:
   - `computeAutoAdjustment`, `applySituationAdjustment` → `src/lib/route-engine.ts`
   - `formatDuration`, `tripDayCount`, `chunkEven` → `src/lib/format.ts`
4. 마크업을 JSX 로 옮긴다. 인라인 `style` 의 값은 그대로 베끼지 말고
   `tokens.css` 의 변수로 바꾼다 (`#7BCB93` → `var(--pd-brand)`).
5. 반복되는 조각은 `components/ui/` 에 이미 있는지 먼저 본다. 없고 다른 화면도 쓸 것 같으면
   거기에 추가하고, 이 화면 전용이면 화면 폴더 안에 둔다.
6. `ScreenScaffold` 를 지운다.
7. 라이트/다크, 400px 폭에서 확인한다.

## 색상 대응표

프로토타입의 `LIGHT` / `DARK` 객체가 그대로 CSS 변수가 됐다.

| 프로토타입                 | 토큰                                       |
| -------------------------- | ------------------------------------------ |
| `c.bg`                     | `var(--pd-bg)`                             |
| `c.text`                   | `var(--pd-text)`                           |
| `c.textSub`                | `var(--pd-text-sub)`                       |
| `c.border`                 | `var(--pd-border)`                         |
| `c.headerBg`               | `var(--pd-header-bg)`                      |
| `c.cardBg`                 | `var(--pd-card-bg)`                        |
| `c.chipBg`                 | `var(--pd-chip-bg)`                        |
| `#7BCB93` (브랜드)         | `var(--pd-brand)`                          |
| `#63B37E` (브랜드 hover)   | `var(--pd-brand-strong)`                   |
| `#12321F` (브랜드 위 글자) | `var(--pd-brand-ink)`                      |
| `#26AB4E` (로고 콜론)      | `var(--pd-brand-accent)`                   |
| `#E52222` / `#FEECEC`      | `var(--pd-danger)` / `var(--pd-danger-bg)` |
| `#0054D1` / `#EAF2FE`      | `var(--pd-info)` / `var(--pd-info-bg)`     |
| `#D47800` / `#FEF4E6`      | `var(--pd-warn)` / `var(--pd-warn-bg)`     |

`.cm-dark`, `.ed-dark` 같은 다크 전용 클래스는 전부 필요 없다.
`[data-theme='dark']` 가 토큰 값을 바꿔주므로 컴포넌트는 한 벌만 쓰면 된다.

## 자산 경로

- `./uploads/heart.png` → `/icons/heart.png`
- `./korea-map.svg` → `/korea-map.svg`

새로 필요한 이미지가 있으면 `legacy/uploads/` 에서 찾아 `public/` 으로 복사한다
(전부 옮기지 말고 실제로 쓰는 것만).

## 데이터 호환

`localStorage` 키를 레거시와 똑같이 유지했다 (`pd-theme`, `rp-saved-routes` 등).
직접 문자열을 쓰지 말고 `src/lib/storage.ts` 의 `STORAGE_KEYS` 를 import 해서 쓴다.

## 모바일 화면

레거시에는 `Community (Mobile).dc.html` 처럼 모바일 전용 파일이 따로 있었다.
Next.js 에서는 **파일을 나누지 않고** CSS 미디어 쿼리로 한 컴포넌트에서 처리한다.
모바일 파일은 레이아웃 참고용으로만 본다.

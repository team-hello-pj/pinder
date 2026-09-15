# 아키텍처

## 폴더 구조

```
travel-route-planner/
├─ src/
│  ├─ app/                     # 라우팅 (Next.js App Router)
│  │  ├─ layout.tsx            # 루트 레이아웃 (폰트, 테마 프로바이더)
│  │  ├─ (main)/               # 헤더가 있는 일반 화면 그룹
│  │  │  ├─ layout.tsx         #   └ SiteHeader + <main>
│  │  │  ├─ page.tsx           #   / (홈)
│  │  │  ├─ explore/           #   /explore      여행지 탐색
│  │  │  ├─ routes/            #   /routes       내 일정
│  │  │  ├─ planner/           #   /planner      경로 만들기
│  │  │  ├─ community/         #   /community    커뮤니티
│  │  │  └─ my-page/           #   /my-page      마이페이지
│  │  ├─ (auth)/               # 헤더 없는 인증 화면 그룹
│  │  │  ├─ login/ signup/
│  │  │  └─ AuthForm.tsx
│  │  └─ api/                  # 서버 라우트 핸들러
│  │     ├─ kakao/             #   POST /api/kakao         Kakao REST 프록시
│  │     ├─ kakao-config/      #   GET  /api/kakao-config  JS SDK 키 전달
│  │     └─ chat/              #   POST /api/chat          AI 도우미
│  ├─ components/
│  │  ├─ ui/                   # 화면 독립적인 프리미티브 (Button, Card, Modal…)
│  │  ├─ layout/               # 헤더·로고·테마 토글 등 전역 구성요소
│  │  └─ providers/            # 컨텍스트 (ThemeProvider)
│  ├─ lib/                     # 도메인 로직 · 외부 연동 (UI 없음)
│  │  ├─ kakao/server.ts       #   Kakao 호출 + 응답 정규화 (서버 전용)
│  │  ├─ kakao/client.ts       #   /api/kakao 호출 래퍼 + SDK 로더
│  │  ├─ route-engine.ts       #   경로 재조정 규칙 엔진
│  │  ├─ storage.ts            #   localStorage 접근 단일 창구
│  │  ├─ chat.ts               #   AI 도우미 호출
│  │  └─ format.ts             #   시간·거리 표시 포맷
│  ├─ constants/               # 이동수단·우선순위·내비게이션 등 고정 값
│  ├─ types/                   # 공용 타입 (Place, RouteLeg, SavedRoute…)
│  └─ styles/                  # tokens.css (디자인 토큰) + globals.css
├─ public/                     # 정적 자산 (아이콘, korea-map.svg)
├─ legacy/                     # 리뉴얼 전 프로토타입 (빌드 제외)
├─ docs/                       # 팀 문서
└─ .github/                    # CI, PR/이슈 템플릿, CODEOWNERS
```

## 레이어 규칙

의존 방향은 **한쪽으로만** 흐른다. 거꾸로 가져다 쓰면 리뷰에서 막는다.

```
app/ (화면)  →  components/  →  lib/ · constants/ · types/
```

- `lib/` 는 React 를 모른다 (`storage.ts`, `chat.ts`, `kakao/client.ts` 처럼 브라우저 API 를
  쓰는 모듈만 `'use client'` 를 붙인다). 화면에서 `fetch` 를 직접 부르지 말고 `lib/` 을 거친다.
- `components/ui/` 는 도메인을 모른다. `Place` 나 `SavedRoute` 를 import 하면 잘못 놓인 것이다.
  도메인을 아는 컴포넌트는 해당 화면 폴더 안에 둔다.
- 색상·간격·반경은 `src/styles/tokens.css` 의 CSS 변수만 쓴다. 컴포넌트에 `#7BCB93` 같은
  값을 직접 쓰지 않는다.

## 서버 / 클라이언트 경계

- 기본은 **서버 컴포넌트**다. `useState`·`useEffect`·이벤트 핸들러가 필요할 때만
  파일 맨 위에 `'use client'` 를 붙인다.
- API 키는 전부 서버 라우트에서만 읽는다. `KAKAO_REST_API_KEY` 와 `GEMINI_API_KEY` 는
  어떤 경로로도 브라우저에 나가지 않는다. `KAKAO_JS_KEY` 만 `/api/kakao-config` 로 전달한다.
- 그래서 `NEXT_PUBLIC_` 접두사 환경변수는 쓰지 않는다.

## 스타일링

**CSS Modules + 디자인 토큰**을 쓴다. 컴포넌트마다 `X.module.css` 를 옆에 둔다.

이유: 클래스 이름이 파일 단위로 격리돼서 여러 명이 동시에 작업해도 스타일이 충돌하지 않고,
추가 빌드 설정이 필요 없다. 전역 스타일은 `globals.css` 에만 있고, 그 외 전역 선택자는 쓰지 않는다.

## 데이터 저장

지금은 백엔드가 없어서 저장한 경로를 `localStorage` 에 둔다.
키와 접근은 전부 `src/lib/storage.ts` 를 거치므로, 나중에 서버 API 로 바꿀 때
이 파일의 함수 본문만 교체하면 화면 코드는 그대로 둘 수 있다.

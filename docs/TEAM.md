# 담당 분배와 진행 현황

> 이름 칸을 채우고, `.github/CODEOWNERS` 의 주석도 같은 내용으로 맞춰주세요.

## 화면 담당

| 화면              | 경로                | 원본 프로토타입                                               | 담당 | 상태                  |
| ----------------- | ------------------- | ------------------------------------------------------------- | ---- | --------------------- |
| 홈                | `/`                 | `legacy/main(home).dc.html`                                   |      | ✅ 이식 완료          |
| 로그인 / 회원가입 | `/login`, `/signup` | `legacy/Login Screen.dc.html`, `legacy/Signup Screen.dc.html` |      | 🟡 폼만 (인증 미연동) |
| 경로 만들기       | `/planner`          | `legacy/Route Planner App.dc.html`                            |      | ⬜ 미착수             |
| 내 일정           | `/routes`           | `legacy/My Routes.dc.html`                                    |      | ⬜ 미착수             |
| 여행지 탐색       | `/explore`          | `legacy/Explore Destinations.dc.html`                         |      | ⬜ 미착수             |
| 커뮤니티          | `/community`        | `legacy/Community.dc.html`                                    |      | ⬜ 미착수             |
| 마이페이지        | `/my-page`          | `legacy/My Page.dc.html`                                      |      | ⬜ 미착수             |

## 공통 기반 (이미 이식 완료)

담당이 따로 없고, 바꿀 때는 팀에 먼저 알린다.

| 영역             | 파일                                                  | 상태                                     |
| ---------------- | ----------------------------------------------------- | ---------------------------------------- |
| 디자인 토큰      | `src/styles/tokens.css`                               | ✅                                       |
| 공통 UI          | `src/components/ui/`                                  | ✅ Button, Card, Modal, SegmentedControl |
| 헤더·테마        | `src/components/layout/`, `src/components/providers/` | ✅                                       |
| Kakao 연동       | `src/lib/kakao/`, `src/app/api/kakao*`                | ✅                                       |
| AI 도우미        | `src/lib/chat.ts`, `src/app/api/chat`                 | ✅                                       |
| 경로 재조정 엔진 | `src/lib/route-engine.ts`                             | ✅                                       |
| 저장             | `src/lib/storage.ts`                                  | ✅ (localStorage)                        |

## 작업 순서 제안

1. **`/planner`** — 가장 크고 다른 화면이 여기 결과에 의존한다. 2명이 붙어
   (지도 / 방문지 패널)로 나누는 걸 권한다.
2. **`/routes`** — planner 가 저장한 데이터를 읽으므로 그다음.
3. **`/explore`, `/community`** — 독립적이라 병렬로 가능.
4. **`/my-page`, 인증 연동** — 마지막.

## 남은 공통 과제

- [ ] 인증 백엔드 결정 (자체 API vs NextAuth) → `src/app/(auth)/AuthForm.tsx` 의 TODO
- [ ] `localStorage` → 서버 저장으로 전환 여부 결정 (`src/lib/storage.ts` 만 바꾸면 됨)
- [ ] 모바일 전용 레이아웃 정리 (레거시에 `(Mobile)` 파일이 따로 있음 → 반응형 하나로 합치기)
- [ ] 공통 UI 추가: Toast, Input, Badge (현재 화면마다 직접 만들고 있으면 `components/ui` 로 올리기)
- [ ] 모든 화면 포팅 완료 후 `legacy/` 삭제

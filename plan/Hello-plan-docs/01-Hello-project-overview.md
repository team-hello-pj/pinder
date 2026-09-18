> 문서: 01-Hello-project-overview.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-18

## 타깃 사용자
국내에서 여행·데이트·모임 등으로 여러 장소를 이동해야 하는 사람들(외국인 포함)이다(근거: plan/plan-example/01-merged.md "대상" 항목).

## 핵심 문제
약속 장소나 목적지는 정해져 있어도 주변에서 무엇을 할지와 장소 간 이동 순서를 함께 고려한 효율적인 일정을 짜기 어렵다는 문제를 풀기 위해 만든다(근거: plan/plan-example/01-merged.md "📝 한 문단으로").

## 문제 상황 설명
plan/plan-example/01-merged.md에 기록된 팀의 문제 정의에 따르면, 사용자는 지금 ① 네이버 지도 등으로 장소를 개별적으로 검색하고 ② 장소 간 이동시간·순서를 직접 계산하며 ③ 캐치테이블·SNS 등 여러 서비스를 오가며 정보를 조합하고 ④ 생성형 AI로 일정을 구성하는 방식을 쓰고 있다(근거: plan/plan-example/01-merged.md "📋 4요소" 표의 "현재해법"·"불편" 행). 이 과정에서 익숙하지 않은 지역일수록 동선을 효율적으로 구성하기 어렵고, 계획에 불필요한 시간과 노력이 많이 든다는 것이 팀이 정리한 불편 사항이다(근거: plan/plan-example/01-merged.md "📋 4요소" 표 "불편" ①-⑤).

실제로 지금 서비스에 배포된 화면은 이 불편 중 "장소 검색·동선 계산·일정 구성"을 한 화면 안에서 처리하는 방향으로 만들어져 있다. 홈 화면은 "목적지를 입력하면 최적화된 일정과 이동 동선을 자동으로 생성해드립니다"라는 문구와 "장소 입력 → AI가 최적의 경로 생성 → 세부 정보 추가해 커스텀"이라는 3단계 설명을 전면에 내세운다(근거: src/app/(main)/page.tsx의 STEPS 배열과 hero 문구).

## 유사 서비스 비교
아래 표는 팀이 실제 접속해 조사한 내용이다(근거: plan/plan-example/01-merged.md "유사 서비스" 표).

| 서비스 | 이 문제를 어떻게 다루나 | 이 프로젝트와 다른 점 |
|---|---|---|
| 유니다고 | 순환/편도/출발·도착 고정 등 경로 방식을 고르면 경로를 추천하고, 카카오내비로 연결해 안내를 시작한다. 방문 순서는 드래그로 바꿀 수 있다(근거: plan/plan-example/01-merged.md) | 장소를 주소 텍스트 상자에 직접 입력해야 해 번거롭고, 지도에서 장소를 고르는 기능은 정확도가 낮다(근거: plan/plan-example/01-merged.md) |
| 트리플 | 여행 기간·일행·스타일을 선택하면 주변 장소 카드와 리뷰를 보여주고, 야놀자 연동으로 숙소 데이터가 풍부하다(근거: plan/plan-example/01-merged.md) | 사용자가 고른 장소의 방문 순서(동선)를 추천해주지는 않는다(근거: plan/plan-example/01-merged.md) |
| 대한민국 구석구석 | "AI콕콕"으로 좋아하는 카테고리를 정하면 추천 경로를 만들어준다(근거: plan/plan-example/01-merged.md) | 로그인해야만 쓸 수 있고, 추천 장소가 흥미롭지 않다는 평가가 있다(근거: plan/plan-example/01-merged.md) |
| Funliday AI 여행 플래너 | AI로 여행 플랜을 짜주며 사용하기 쉽고 UI가 한눈에 들어온다(근거: plan/plan-example/01-merged.md) | 제시된 선택지 안에서만 골라야 해 선택의 폭이 좁고, 추천 결과를 수정할 수 없다(근거: plan/plan-example/01-merged.md) |

## 이 프로젝트가 다르게 접근한 지점
- AI 자동 생성과 수동 편집을 하나의 데이터 구조 위에서 병행한다: `schedules` 테이블은 AI로 만들었든 사용자가 직접 만들었든 같은 `places`/`segments`/`criteria` 구조로 저장되어, 생성 이후에도 같은 화면(플래너)에서 계속 수정할 수 있다(근거: src/db/schema.ts의 `schedules` 테이블 정의).
- 경로 기준(최단시간/최단거리)을 사용자가 바꿀 수 있고, 구간별로 조회한 결과를 `routeCache`에 캐시해 재조회 비용을 줄인다(근거: src/db/schema.ts `schedules.criteria`, `schedules.routeCache` 주석).
- 보기 링크와 편집 링크를 서로 다른 토큰(`inviteTokenViewer`/`inviteTokenEditor`)으로 분리해, 하나가 유출돼도 그 권한만 노출되게 설계했다(근거: src/db/schema.ts `schedules` 테이블 주석 "보기전용/편집가능 초대 링크는 서로 다른 토큰을 쓴다").
- 편집 권한은 요청 → 제작자 승인의 절차를 거치도록 `scheduleEditRequests` 테이블로 별도 관리한다(근거: src/db/schema.ts `scheduleEditRequests` 테이블 주석).
- 짐 추가·기상 변화·일정 지연·교통 상황 악화 같은 변수와 불편 정도를 고르면 동선을 재계산하는 규칙 엔진을 별도 모듈로 분리해 두었다(근거: src/lib/route-engine.ts, src/constants/index.ts `SITUATION_VARS`/`SEVERITY_LEVELS`).
- 여행지 탐색(`destinations`) 데이터에 당일치기/1박2일/2박3일용으로 미리 만들어 둔 AI 동선(`routes` jsonb)을 함께 저장해, 큐레이션된 여행지에서 바로 "이 여행지로 일정 짜기"로 이어지게 했다(근거: src/db/schema.ts `destinations.routes` 주석).

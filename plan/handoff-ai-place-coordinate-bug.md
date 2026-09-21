# 인수인계: AI 생성 장소 좌표 누락 시 가짜 경로 데이터 표시

> 작성: 2026-09-21 · README(READ_ME.md) 섹션 1 작업 중 발견되어 별도 세션에서 수정하기로 함

## 한 줄 요약
AI가 추천한 장소를 카카오에서 못 찾으면 좌표 없이(`x: null, y: null`) 그대로 일정에 들어가고, 플래너 화면은 이걸 알리지 않은 채 **가짜 이동시간·거리(대중교통이면 가짜 지하철 노선명까지)** 를 만들어 보여준다.

## 재현 조건
AI 일정 생성(F3/F4) 결과에 포함된 장소 중 하나를, 카카오 키워드 검색이 끝내 찾지 못하는 경우. 이름이 모호하거나 실재하지 않는 상호일 때 발생 가능.

## 원인 경로 (코드 확인)
1. `src/app/api/route-generate/route.ts` — Gemini는 장소 이름·카테고리·체류시간만 생성한다. 좌표는 여기서 만들어지지 않는다.
2. `src/app/(main)/routes/AiGenerateWizard.tsx:135-178`
   - 각 AI 장소 이름으로 카카오 키워드 검색을 최대 3개 쿼리까지 시도한다 (지역+주소힌트+이름 → 지역+이름 → 이름).
   - 코드 자체 주석(138-140행)이 이미 이 위험을 인지하고 있다: "그러면 좌표가 없는 채로 저장돼 지도에 핀이 안 뜨고, 그 핀이 차지해야 할 순번도 비어버린다."
   - 모든 쿼리가 실패해도 `x`, `y`를 `null`로 둔 채 `resolved` 배열에 그대로 push한다(163-177행). 걸러내거나 사용자에게 알리는 로직이 없다.
3. `src/app/(main)/routes/AiGenerateWizard.tsx:524` — "이 일정으로 시작하기" 클릭 시 `resultPlaces`를 검증 없이 그대로 `onConfirm`에 넘긴다.
4. `src/lib/ai-route-handoff.ts` → `src/app/planner/PlannerClient.tsx:861-863` — 핸드오프 데이터를 그대로 `setPlaces`에 반영. 여기서도 좌표 유효성 검사가 없다.
5. `src/app/planner/PlannerClient.tsx:2021-2063` (`enrichedSegments`) — 인접한 두 장소 중 하나라도 좌표가 없으면(`hasRealCoords === false`) `computeMockSteps`로 분기한다.
6. `src/lib/route-engine.ts:24-58` (`computeMockSteps`, `SEGMENT_DISTANCES`) — 하드코딩된 거리 배열과 임의의 지하철 노선명(`LINE_NAMES`)으로 완전히 지어낸 이동시간/거리/노선을 반환한다. 이게 화면에 진짜 데이터처럼 표시된다.

## 참고: 이미 있는 "정상적인" 처리 패턴
같은 파일의 AI 도우미 추천 흐름(`advanceRecommendedQueue`, `PlannerClient.tsx:1949-1980`)은 카카오 검색이 실패하면 `"<장소명>"의 위치를 찾지 못해 추가하지 못했어요` 토스트를 띄우고 해당 장소를 아예 추가하지 않는다(1970-1973행). AI 생성 마법사(AiGenerateWizard)에도 같은 원칙을 적용하면 이번 버그와 일관성이 맞는다.

## 영향 범위
- F3/F4(AI 일정 생성), F7(경로 계산)에 한정. 수동 추가(검색/지도클릭/현재위치)는 항상 카카오 doc의 좌표를 그대로 쓰므로(`PlannerClient.tsx:986-987`) 영향 없음.
- 사용자에게는 아무 경고 없이 틀린 시간·거리·노선명이 보인다는 점이 가장 문제 — 침묵 실패(silent failure)이자 데이터 신뢰성 문제.

## 고칠 방향 (택 1, 구현은 안 함 — 판단은 다음 세션 몫)
1. **AiGenerateWizard 단에서 걸러내기**: 좌표를 못 찾은 장소는 `advanceRecommendedQueue`처럼 결과에서 제외하고 사용자에게 "N개 장소 위치를 찾지 못해 제외했어요" 안내.
2. **PlannerClient 단에서 정직하게 표시하기**: `computeMockSteps` 폴백을 없애고, 좌표 없는 구간은 `status: 'failed'`(또는 새 상태)로 처리해 "위치 정보가 없어 계산할 수 없어요" 같은 실제 안내를 보여준다.
3. **둘 다 적용**: 1번으로 애초에 발생 빈도를 줄이고, 2번으로 혹시 새어나갈 경우의 방어선을 둔다(권장).

## 관련 문서
- `plan/Hello-plan-docs/04-Hello-features.md` F7 항목이 이미 이 문제를 "코드 성숙도: 부분"으로 판단한 근거였다.
- `plan/Hello-plan-docs/READ_ME.md` 섹션 1의 MVP 표 3~4번 행이 이 이슈를 근거로 "일부 구현"으로 표기되어 있다. 코드가 고쳐지면 상태를 "완료"로 갱신할 것.

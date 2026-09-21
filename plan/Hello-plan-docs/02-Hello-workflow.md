> 문서: 02-Hello-workflow.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-21

## 행위자

| A | 역할 | 한 줄 상황 | 실제 화면/기능 진입점 |
|---|---|---|---|
| A1 | 제작자(Creator) | 일정(schedule)을 처음 만든 사람. `schedules.ownerId`로 식별된다 | `/routes`의 "새 일정" → `/planner`(근거: src/db/schema.ts `schedules.ownerId`, src/lib/server/schedules.ts `getScheduleRole`) |
| A2 | 편집자(Editor) | 제작자의 승인을 받아 방문지·동선을 함께 수정할 수 있는 협업자. `scheduleCollaborators.role='editor'`로 식별된다 | 편집 가능 초대 링크로 참여 후 승인됨(근거: src/db/schema.ts `scheduleCollaborators`, src/app/api/schedules/[id]/edit-requests/[requestId]/route.ts) |
| A3 | 뷰어(Viewer) | 로그인 상태로 일정을 읽기 전용으로 보는 사용자. `scheduleCollaborators.role='viewer'`로 참여했거나, 초대 링크로 들어와 아직 참여(저장)하지 않고 열람만 하는 로그인 사용자도 포함한다 | 보기/편집 링크로 `/planner?invite=<token>&role=...` 접속(근거: src/app/api/schedules/invite/[token]/route.ts, src/app/planner/PlannerClient.tsx) |
| A4 | 비로그인 사용자(게스트) | 세션이 없는 방문자. 홈·여행지 탐색·초대 링크 열람은 가능하지만, 일정 저장·편집 권한 요청·커뮤니티 작성 등은 로그인 화면으로 이동한다 | `/`, `/explore`, 초대 링크(근거: src/app/api/schedules/invite/[token]/route.ts에 `getSessionUser()` 호출이 없음 — 로그인 확인 자체를 하지 않는다) |
| A5 | 회원(로그인 사용자, 커뮤니티/탐색 이용) | A1-A3 중 누구든 로그인한 상태에서 커뮤니티에 글을 쓰거나 여행지 탐색에서 새 일정을 시작할 때 겸하는 역할. 별도 권한 테이블 없이 세션 유무로만 구분된다 | `/community`, `/explore`(근거: src/app/api/community/posts/route.ts POST의 `getSessionUser()` 체크, src/app/(main)/explore/ExploreClient.tsx `onCardClick`의 `isLoggedIn` 체크) |

> 참고: 기획 예시(plan/plan-example)에 있던 "A7(에디터가 테마 게시물을 작성)"·"관리자(신고 처리)" 역할은 실제 코드에서 찾지 못했다. `src/db/schema.ts`의 `destinations` 테이블 주석과 `scripts/seed-destinations.mjs`의 주석 모두 "관리자 화면이 없어서 지금은 시드 스크립트로만 채운다"고 명시하고, `src/`(레거시 제외) 전체에서 `report`·`관리자`·`moderat`를 검색해도 실제 관리자/신고 처리 화면은 나오지 않는다(근거: src/db/schema.ts, scripts/seed-destinations.mjs). 따라서 이 문서에는 해당 역할을 포함하지 않는다.

## 단계 (실제 플로우)

| S | 단계 | 사용자 행동 | 시스템 반응 | 근거(경로) |
|---|---|---|---|---|
| S1 | 동선 만들기 시작 | 홈 화면 "최적 동선 생성하기" 또는 `/routes`의 "＋ 새 일정" 클릭 | 로그인 상태가 아니면 `/login`으로 이동, 로그인 상태면 "생성 방식 선택" 모달을 연다 | src/app/(main)/AntCtaCard.tsx, src/app/(main)/routes/NewTripFlow.tsx (`NewTripFlowHandle.open`) |
| S2 | 생성 방식 선택 | "직접 생성하기" 또는 "AI 생성하기" 중 선택 | 선택한 모드를 저장하고 날짜 선택 모달을 연다 | src/app/(main)/routes/NewTripFlow.tsx (`chooseMode`) |
| S3 | 여행 날짜 선택 | 달력에서 출발·도착 날짜(범위) 선택 후 "시작하기" | 수동 모드면 `/planner?new=1&tripStart=...&tripEnd=...&mode=manual`로 이동, AI 모드면 AI 마법사를 연다 | src/app/(main)/routes/NewTripFlow.tsx (`startNewTrip`), src/components/ui/DateRangeCalendar.tsx |
| S4a | (수동) 방문지 추가 | 플래너 화면에서 주소 검색·지도 클릭·현재 위치로 장소를 추가 | Kakao로 지오코딩해 방문지를 목록/지도에 추가한다 | src/app/planner/PlannerClient.tsx (`runMapSearch`, `handleMapClick`, `openCurrentLocationAddConfirm`) |
| S4b | (AI) 조건 입력 및 생성 | AI 마법사에서 지역·스타일·관심사·동행·이동수단 5단계를 고르고 "AI 일정 생성하기" 클릭 | Gemini(`gemini-3.8-flash`)로 방문지 목록을 생성하고, 선택한 지역 주소와 일치하는 Kakao 검색 결과로만 각 장소의 좌표를 매칭한다(동명이지만 다른 지역인 후보는 제외). 매칭에 실패한 장소는 같은 조건으로 최대 3회까지 대체 후보를 다시 받아 채우고, 매칭된 장소들 사이의 구간 거리/시간은 Kakao 길찾기로 계산해 결과를 보여준다 | src/app/(main)/routes/AiGenerateWizard.tsx (`generate`, `matchesRegion`, `resolvePlaceCoords`), src/app/api/route-generate/route.ts |
| S5 | AI 결과 확인 및 반영 | 결과 화면에서 "다시 추천받기"(재생성) 또는 "이 일정으로 시작하기" 클릭 | 재생성은 방금 나온 장소를 제외하고 다시 요청하고, 확정하면 플래너로 결과를 넘긴다. 대체 후보까지 반복했는데도 좌표를 끝내 찾지 못한 장소가 있으면 "좌표 매칭에 실패했습니다" 모달로 안내한다(일부만 실패하면 해당 장소만 제외하고 진행, 전부 실패하면 결과 화면 자체로 넘어가지 않음) | src/app/(main)/routes/AiGenerateWizard.tsx (`generate`의 `excludeNames`, `onConfirm`, `unmatchedNotice`), src/lib/ai-route-handoff.ts |
| S6 | 경로 기준 선택·계산 | "최단시간"/"최단거리" 기준을 고르고 "경로 계산" 클릭 | 캐시된 결과가 있으면 재사용하고, 없으면 Kakao 구간 데이터 + Gemini 가중치(`/api/route-weights`)로 방문 순서를 최적화한다 | src/app/planner/PlannerClient.tsx (`setCriteria`, `runOptimalRoute`), src/lib/route-optimizer.ts |
| S7 | 상황 변경(변수) 반영 | "변수 추가"에서 짐/날씨/지연/교통 중 항목과 불편 정도를 고르고 "AI로 동선 재구성" 클릭 | 선택한 지점 이후의 방문지만 Gemini에 보내 순서를 재배치하고, 실패하면 원래 순서를 그대로 유지한다 | src/app/planner/PlannerClient.tsx (`applySituationWithAi`), src/app/api/route-adjust/route.ts |
| S8 | AI 도우미 대화 | AI 도우미(FAB)에 자연어로 질문·요청 입력 | `/api/chat`으로 응답을 받아 대화창에 보여주고, 장소 추가/교체 제안이 포함되면 확인 팝업을 거쳐 적용할 수 있다 | src/app/planner/PlannerClient.tsx (`sendAiMessage`, `advanceRecommendedQueue`), src/app/api/chat/route.ts |
| S9 | 일정 저장 | 요약 바의 "저장" 클릭 | 로그인 상태가 아니면 로그인 모달을 띄우고, 로그인 상태면 새 일정은 생성, 기존 일정은 갱신한다 | src/app/planner/PlannerClient.tsx (`saveOrRemoveAction`, `saveCurrentRoute`), src/app/api/schedules/route.ts, src/app/api/schedules/[id]/route.ts |
| S10 | 초대 링크 발급 | 제작자가 "＋ 일행 초대"에서 권한(편집 가능/보기 전용)을 고름 | 역할별로 서로 다른 토큰을 발급(이미 있으면 재사용)하고 링크를 보여준다 | src/app/api/schedules/[id]/invite/route.ts |
| S11 | 초대 링크 열람 | 발급된 링크로 접속(로그인 여부 무관) | 로그인 여부와 관계없이 그 일정을 읽기 전용으로 보여준다(참여 처리는 하지 않음) | src/app/api/schedules/invite/[token]/route.ts, src/app/planner/PlannerClient.tsx |
| S12 | 일정 저장(참여) | 초대 링크로 열람 중인 사용자가 "저장"(또는 "내 일정에 추가") 클릭 | 로그인이 안 돼 있으면 로그인 유도, 로그인 상태면 보기 링크는 곧바로 뷰어로 등록되고, 편집 링크는 일단 뷰어로 등록된 뒤 편집 권한 요청이 자동으로 하나 생성된다 | src/app/api/schedules/join/route.ts |
| S13 | 편집 권한 요청(뷰어) | 이미 뷰어로 참여 중인 사용자가 "편집 권한 요청" 클릭 | 요청을 하나 만들고 제작자에게 알림을 보낸다(중복 요청은 무시) | src/app/api/schedules/[id]/edit-requests/route.ts |
| S14 | 승인/거절 | 제작자가 "권한 관리" 화면에서 요청자 닉네임을 보고 승인/거절 선택 | 승인하면 협업자 역할이 editor로 바뀌고, 거절해도 승인해도 요청 자체는 삭제되며 요청자에게 결과 알림이 간다 | src/app/api/schedules/[id]/edit-requests/[requestId]/route.ts |
| S15 | 뷰어 화면의 자동 갱신 | (사용자 행동 없음) 뷰어가 플래너 화면을 열어 두고 있음 | 5초 간격으로 최신 일정을 폴링하고, 권한이 바뀌면 새로고침 없이 편집 화면으로 전환한다 | src/app/planner/PlannerClient.tsx (뷰어 전용 `setInterval` 폴링) |
| S16 | 내 일정 목록 관리 | `/routes`에서 제목 클릭(개인화 이름 수정), 날짜 수정(제작자만), 목록에서 제거 | 제목은 참여자 누구나 자기 화면에서만 바꿀 수 있고, 날짜는 제작자만 바꿀 수 있으며, 목록 제거는 역할에 따라 결과가 다르다(S17 참고) | src/app/(main)/routes/MyRoutesClient.tsx (`saveEdit`, `saveRouteEdit`), src/app/api/schedules/[id]/route.ts (PATCH) |
| S17 | 일정 삭제/제거 | `/routes` 또는 플래너에서 삭제 버튼 클릭 | 제작자가 삭제하면 일정 자체와 모든 참여자의 참여 기록이 함께 사라지고, 편집자·뷰어가 삭제하면 자신의 참여 기록만 없어지고 원본은 그대로 남는다 | src/app/api/schedules/[id]/route.ts (DELETE), src/db/schema.ts(각 테이블의 `onDelete: 'cascade'`) |
| S18 | 여행지 탐색 | `/explore`에서 지역을 고르고 카드의 "이 여행지로 일정 짜기" 클릭 | 로그인 여부와 무관하게 카드는 보이지만, 클릭 시 로그인 상태가 아니면 `/login`으로 이동한다. 로그인 상태면 미리 준비된 AI 동선(당일치기/1박2일/2박3일)을 골라 플래너로 넘긴다 | src/app/(main)/explore/ExploreClient.tsx (`onCardClick`, `startWithDestinationRoute`), src/app/api/explore/destinations/[id]/route.ts |
| S19 | 커뮤니티 이용 | `/community`에서 글 목록을 보거나, 글쓰기/좋아요/북마크/댓글/답글 작성 | 글 목록 자체는 로그인 없이도 서버에서 내려주지만, 화면은 비로그인 시 로그인 유도 모달로 덮는다. 실제 작성·좋아요 등은 서버에서도 로그인 여부를 다시 확인한다 | src/app/(main)/community/CommunityClient.tsx (`requireLogin`), src/app/api/community/posts/route.ts |
| S20 | 알림 확인 | 헤더의 알림벨 클릭 | 화면 진입(마운트) 시 한 번 불러온 알림을 보여주고, 벨을 열면 전체를 읽음 처리하며, 항목 클릭 시 관련 일정/게시물로 이동한다 | src/components/layout/NotificationBell.tsx, src/lib/server/notifications.ts |
| S21 | 마이페이지 관리 | 닉네임/프로필 사진 변경, 알림 설정, 회원 탈퇴 | 닉네임은 7일 재사용 보호 규칙을 검사하고, 탈퇴는 확인→(소유 일정 있으면 경고)→최종 경고→삭제의 다단계 확인을 거친다 | src/app/(main)/my-page/MyPageClient.tsx, src/lib/server/nickname.ts, src/app/api/auth/account/route.ts |
| S22 | 회원가입 완료 안내(온보딩) | (사용자 행동 없음, 자동) 회원가입 성공 직후 | 시스템이 "[p:nder] 회원가입을 환영합니다 🎉" 제목의 환영 이메일을 발송한다. 발송 성공 여부와 무관하게 회원가입 자체는 이미 완료된 상태로 처리된다 | src/app/api/auth/register/route.ts, src/lib/server/email.ts (`sendWelcomeEmail`) |
| S23 | 플래너 최초 방문 안내(온보딩) | 플래너 화면에 처음 접속(같은 브라우저에서 이전에 완료·건너뛰기한 기록이 없음) | 실제 화면 요소(장소 검색·방문지 목록·순서 변경·일정 설정·변수 추가·지도 전환·현재 위치·AI 도우미·경로 계산) 9곳을 순서대로 짚어주는 스포트라이트 안내가 자동으로 시작되고, 완료·건너뛰기 시 브라우저(localStorage)에 기록되어 다음 방문부터는 다시 뜨지 않는다 | src/app/planner/ProductTour.tsx |

## 흐름도

S1 → S2 → S3 → (S4a 또는 S4b→S5) → S6 → (S7·S8은 필요할 때 반복 가능) → S9 → (S10 → S11 → S12 → (편집 링크였다면 S13 → S14 → S15)) → S16 → S17

- 분기 1: S2에서 "직접 생성하기"를 고르면 S4a로, "AI 생성하기"를 고르면 S4b→S5로 간다(근거: src/app/(main)/routes/NewTripFlow.tsx `startNewTrip`).
- 분기 2: S9(저장)에서 로그인 상태가 아니면 로그인 모달만 뜨고 저장은 되지 않는다(근거: src/app/planner/PlannerClient.tsx `saveOrRemoveAction`).
- 분기 3: S11(초대 링크 열람) 이후 실제로 "참여"(S12)하지 않는 한 서버에는 어떤 기록도 남지 않는다 — 열람 자체는 완전한 게스트 동작이다(근거: src/app/api/schedules/invite/[token]/route.ts에 세션 체크가 없음).
- 분기 4: S12에서 보기 링크는 즉시 뷰어로 등록되어 끝나지만, 편집 링크는 뷰어 등록 + 편집 권한 요청 자동 생성까지 함께 일어나 S13을 건너뛰고 바로 S14로 이어진다(근거: src/app/api/schedules/join/route.ts).
- 분기 5: S17(삭제)은 역할에 따라 결과가 완전히 다르다 — 제작자는 `schedules` 행 자체를 지워 CASCADE로 모든 참여자의 기록이 함께 사라지고, 편집자·뷰어는 자신의 `scheduleCollaborators` 행만 지워 원본에는 영향이 없다(근거: src/app/api/schedules/[id]/route.ts DELETE 핸들러의 역할 분기).
- 분기 6: S18(여행지 탐색)은 S1-S3과 독립된 별도 진입점이지만, 로그인 후에는 날짜 선택 없이 곧바로 준비된 AI 동선을 들고 플래너로 진입해 S6 이후 흐름에 합류한다(근거: src/app/(main)/explore/ExploreClient.tsx `startWithDestinationRoute`가 `/planner?...&mode=ai`로 이동).
- 분기 7: S19(커뮤니티)·S20(알림)·S21(마이페이지)은 일정 제작 흐름과 독립적으로 언제든 드나들 수 있는 화면이다.
- 분기 8: S22는 회원가입(F31)의 부수 효과로, 별도의 사용자 행동 없이 자동으로 발생한다(근거: src/app/api/auth/register/route.ts에서 세션 발급 직후 `sendWelcomeEmail` 호출).
- 분기 9: S23은 S1-S17 중 어느 경로로 플래너(SC07)에 처음 도달했든, 다른 모달이 열려 있지 않다면 그 진입과 동시에 병행해서 나타난다 — 특정 단계 뒤에 오는 것이 아니라 "플래너 화면 자체에 처음 왔는지"만으로 발동 여부가 결정된다(근거: src/app/planner/ProductTour.tsx, `localStorage['pinder-planner-tour-completed']` 기준).
- 확인되지 않은 분기: 일정의 여행 종료일(`tripEnd`)이 지난 뒤에도 편집·저장·초대가 그대로 동작한다 — "일정 종료 후 읽기 전용 전환"에 해당하는 서버 검증은 찾지 못했다(근거 없음 — src/app/api/schedules/[id]/route.ts PATCH 핸들러에 `tripEnd` 비교 로직이 없음). `/routes`의 "완료된 일정" 탭은 `tripEnd`가 지난 일정을 분류해 보여주는 화면 필터일 뿐, 편집을 막지는 않는다(근거: src/app/(main)/routes/MyRoutesClient.tsx `isDone` 계산).

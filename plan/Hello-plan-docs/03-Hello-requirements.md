> 문서: 03-Hello-requirements.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-21

> 비고: 아래 요구사항은 신규로 발굴한 것이 아니라, 02-Hello-workflow.md의 단계(S)에서 실제로 구현된 기능이 "왜 필요했는지"를 역으로 정리한 것이다. 모든 행은 실제 코드에서 확인된 동작만 담았다.

## 요구사항

| R | 관련 A/S | 요구 (이 기능은 ~를 만족시킨다) | 유형(기능/데이터/제약) | 근거(경로) |
|---|---|---|---|---|
| R1 | A4, S1 | 로그인하지 않은 사용자가 "새 일정 만들기"를 시도하면 로그인 화면으로 이동시킨다 | 제약 | src/app/(main)/routes/NewTripFlow.tsx (`NewTripFlowHandle.open`) |
| R2 | A1, S2 | 일정을 만들 때 "직접 생성하기"와 "AI 생성하기" 중 방식을 선택할 수 있다 | 기능 | src/app/(main)/routes/NewTripFlow.tsx (`chooseMode`) |
| R3 | A1, S3 | 달력에서 출발·도착 날짜(범위)를 선택하고 초기화할 수 있다 | 기능 | src/components/ui/DateRangeCalendar.tsx, src/app/(main)/routes/NewTripFlow.tsx |
| R4 | A1, A2, S4a | 주소 검색·지도 클릭·현재 위치 세 가지 방법으로 방문지를 추가할 수 있다 | 기능 | src/app/planner/PlannerClient.tsx (`runMapSearch`, `handleMapClick`, `openCurrentLocationAddConfirm`) |
| R5 | S4a | 좌표(지오코딩) 조회에 실패해도 방문지 추가 자체는 실패하지 않는다 | 제약 | src/app/planner/PlannerClient.tsx (방문지 추가 확인 흐름) |
| R6 | A1, S4b | AI로 일정을 생성할 때 지역·여행 스타일·관심사(다중 선택)·동행·이동수단 다섯 가지 조건을 입력받는다 | 기능 | src/app/(main)/routes/AiGenerateWizard.tsx |
| R7 | S4b | 지역을 "기타"로 직접 입력하면 실제로 존재하는 지역인지 Kakao 검색으로 확인한 뒤에만 다음 단계로 진행한다 | 제약 | src/app/(main)/routes/AiGenerateWizard.tsx (`confirmCustomRegion`) |
| R8 | S4b | AI가 추천하는 방문지 수는 여행 일수에 비례한 최소·최대 범위 안에서만 나온다 | 제약 | src/app/api/route-generate/route.ts (`MIN_PLACES_PER_DAY`, `MAX_PLACES_PER_DAY`, `MAX_PLACES_TOTAL`) |
| R9 | S4b | `GEMINI_API_KEY`가 설정되어 있지 않으면 AI 생성 요청은 오류를 반환하고, 그 외 서비스는 계속 동작한다 | 제약 | src/app/api/route-generate/route.ts |
| R10 | A1, S5 | AI 결과를 같은 조건으로 다시 추천받을 수 있고, 이때 직전에 나온 장소는 제외하고 추천한다 | 기능 | src/app/(main)/routes/AiGenerateWizard.tsx (`generate`의 `excludeNames`) |
| R11 | S5 | 확정한 AI 생성 결과는 한 번만 플래너로 전달되고 재방문 시 중복 적용되지 않는다 | 제약 | src/lib/ai-route-handoff.ts (`consumeAiRouteHandoff`) |
| R12 | A1, A2, S6 | 최단시간/최단거리 기준을 바꿀 수 있고, 이미 계산해 둔 결과가 있으면 재계산 없이 재사용한다 | 기능 | src/app/planner/PlannerClient.tsx (`setCriteria`), src/lib/route-optimizer.ts (`buildRouteSignature`) |
| R13 | S6 | 방문 순서 최적화는 Kakao 실제 이동 데이터와 AI가 산정한 가중치(효율/쾌적)를 함께 반영한다 | 기능 | src/lib/route-optimizer.ts, src/app/api/route-weights/route.ts |
| R14 | S6 | Kakao 구간 조회가 실패해도 직선거리 기반 추정치로 대체해 계산이 중단되지 않는다 | 제약 | src/app/planner/PlannerClient.tsx (`fetchLeg` 폴백) |
| R15 | A1, A2, S7 | 짐 추가·기상 변화·일정 지연·교통 상황 악화 중 변수와 불편 정도를 고르면 선택한 지점 이후의 동선만 재구성한다 | 기능 | src/app/planner/PlannerClient.tsx (`applySituationWithAi`), src/constants/index.ts (`SITUATION_VARS`, `SEVERITY_LEVELS`) |
| R16 | S7 | AI가 반환한 순서가 유효한 순열이 아니면 원래 순서를 그대로 유지한다 | 제약 | src/app/api/route-adjust/route.ts (`isPermutationOfIds`) |
| R17 | A1, A2, S8 | 사용자는 AI 도우미에게 자연어로 질문·요청을 보낼 수 있다 | 기능 | src/app/planner/PlannerClient.tsx (`sendAiMessage`), src/app/api/chat/route.ts |
| R18 | S8 | AI가 제안한 장소 추가/교체는 사용자가 확인 팝업에서 승인해야만 실제 일정에 반영된다 | 제약 | src/app/planner/PlannerClient.tsx (`advanceRecommendedQueue`) |
| R19 | A1, A2, S9 | 로그인하지 않은 상태에서 저장을 시도하면 로그인을 요구한다 | 제약 | src/app/planner/PlannerClient.tsx (`saveOrRemoveAction`) |
| R20 | S9 | 새 일정은 생성되고 기존 일정은 갱신되며, 둘 다 같은 데이터 구조(방문지·구간·기준·날짜)로 저장된다 | 데이터 | src/app/api/schedules/route.ts, src/app/api/schedules/[id]/route.ts, src/db/schema.ts (`schedules`) |
| R21 | A1, S10 | 초대 링크는 제작자만 발급할 수 있다 | 제약 | src/app/api/schedules/[id]/invite/route.ts |
| R22 | S10 | 보기 전용 링크와 편집 가능 링크는 서로 다른 토큰을 쓰며, 한 번 발급된 토큰은 재사용된다(재발급하지 않음) | 데이터 | src/db/schema.ts (`schedules.inviteTokenViewer`/`inviteTokenEditor`), src/app/api/schedules/[id]/invite/route.ts |
| R23 | A3, A4, S11 | 초대 링크는 로그인 여부와 무관하게 해당 일정을 읽기 전용으로 열람할 수 있게 한다 | 기능 | src/app/api/schedules/invite/[token]/route.ts |
| R24 | A3, S12 | 보기 전용 링크로 저장하면 즉시 뷰어(협업자)로 등록된다 | 기능 | src/app/api/schedules/join/route.ts |
| R25 | A3, S12 | 편집 가능 링크로 저장해도 곧바로 편집자가 되지 않고, 뷰어로 등록됨과 동시에 편집 권한 요청이 자동으로 하나 생성된다 | 제약 | src/app/api/schedules/join/route.ts |
| R26 | S12 | 참여자의 실제 권한은 URL에 담긴 role 값이 아니라 서버에 저장된 토큰이 어느 컬럼과 일치했는지로 결정된다 | 제약 | src/app/api/schedules/join/route.ts (`linkRole`) |
| R27 | A3, S13 | 이미 뷰어로 참여 중인 사용자는 별도로 편집 권한을 요청할 수 있다 | 기능 | src/app/api/schedules/[id]/edit-requests/route.ts |
| R28 | A1, S14 | 제작자는 요청자 닉네임이 담긴 목록에서 승인 또는 거절을 선택할 수 있다 | 기능 | src/app/api/schedules/[id]/route.ts (GET의 `editRequests`), src/app/api/schedules/[id]/edit-requests/[requestId]/route.ts |
| R29 | S14 | 승인하든 거절하든 처리된 요청 기록은 삭제된다 | 데이터 | src/app/api/schedules/[id]/edit-requests/[requestId]/route.ts |
| R30 | A3, S15 | 뷰어로 접속 중인 화면은 주기적으로 최신 데이터를 확인해 권한이 바뀌면 새로고침 없이 반영한다 | 제약 | src/app/planner/PlannerClient.tsx (뷰어 전용 폴링) |
| R31 | A1, A2, A3, S16 | 참여자는 누구나 자신의 화면에서만 보이는 개인화된 일정 이름을 따로 설정할 수 있다 | 기능 | src/db/schema.ts (`scheduleTitleOverrides`), src/app/api/schedules/[id]/route.ts (PATCH의 `personalTitle`) |
| R32 | A1, S16 | 여행 날짜 변경은 제작자만 할 수 있다 | 제약 | src/app/api/schedules/[id]/route.ts (PATCH의 역할 분기) |
| R33 | A1, S17 | 제작자가 일정을 삭제하면 일정 자체와 모든 참여자의 참여 기록이 함께 삭제된다 | 제약 | src/app/api/schedules/[id]/route.ts (DELETE), src/db/schema.ts(각 테이블 `onDelete: 'cascade'`) |
| R34 | A2, A3, S17 | 편집자·뷰어가 "삭제"(제거)하면 자신의 참여 기록만 삭제되고 원본 일정은 그대로 남는다 | 제약 | src/app/api/schedules/[id]/route.ts (DELETE) |
| R35 | A4, A5, S18 | 여행지 탐색 화면과 그 데이터는 로그인 여부와 무관하게 열람할 수 있다 | 기능 | src/app/api/explore/destinations/route.ts (세션 확인 없음) |
| R36 | S18 | "이 여행지로 일정 짜기"는 로그인한 사용자만 실행할 수 있다 | 제약 | src/app/(main)/explore/ExploreClient.tsx (`onCardClick`) |
| R37 | S18 | 미리 준비된 AI 동선(당일치기/1박2일/2박3일)이 없는 여행지는 "일정 짜기" 버튼 자체를 보여주지 않는다 | 제약 | src/lib/server/destinations.ts (`availableTripLengths`), src/app/(main)/explore/ExploreClient.tsx |
| R38 | A5, S19 | 커뮤니티 글 작성·좋아요·북마크·댓글·답글은 서버에서도 로그인 여부를 다시 확인한다 | 제약 | src/app/api/community/posts/route.ts 등 커뮤니티 API 전반의 `getSessionUser()` 체크 |
| R39 | S19 | 게시물에는 최소 1장, 최대 5장까지 사진을 첨부할 수 있다 | 제약 | src/app/api/community/posts/route.ts (`MAX_POST_IMAGES`) |
| R40 | S19, S20 | 댓글·답글이 달리거나 편집 권한 요청/승인/거절이 발생하면 대상자에게 알림이 생성된다 | 기능 | src/lib/server/notifications.ts (`createNotification` 호출 지점) |
| R41 | S20 | 알림함을 열면 그 시점의 모든 알림이 읽음 처리된다 | 기능 | src/components/layout/NotificationBell.tsx (`toggle`) |
| R42 | A1, A2, A3, S21 | 닉네임은 2-12자, 한글·영문·숫자·밑줄만 허용하며, 변경 전 닉네임은 7일간 다른 사람이 재사용할 수 없다 | 제약 | src/lib/server/nickname.ts (`validateNicknameFormat`, `PROTECTION_DAYS`) |
| R43 | S21 | 소유한 일정이 있는 상태에서 회원 탈퇴를 시도하면 1차로 막고 그 목록을 보여준다 | 제약 | src/app/api/auth/account/route.ts (`has_creator_schedules`) |
| R44 | S21 | 최종 확인(강제 탈퇴)을 거치면 소유한 일정과 그에 딸린 협업·요청 기록이 모두 삭제된다 | 제약 | src/app/api/auth/account/route.ts, src/db/schema.ts (`schedules.ownerId`의 `onDelete: 'cascade'`) |
| R45 | 전체 | 이메일 인증은 6자리 코드·5분 만료·60초 재전송 대기·5회 시도 제한을 지켜야 한다 | 제약 | src/lib/server/verification-code.ts (`CODE_TTL_SEC`, `RESEND_COOLDOWN_SEC`), src/app/api/auth/verify-code/route.ts (`MAX_ATTEMPTS`) |
| R46 | 전체 | 로그인 세션은 30일 만료의 서명된 쿠키(JWT)로 유지되어야 한다 | 제약 | src/lib/server/session.ts (`SESSION_TTL_SEC`, `SESSION_COOKIE`) |
| R47 | A1-A4 | "아이디 저장"을 선택하면 이메일 문자열만 브라우저에 남고 비밀번호는 저장하지 않는다 | 데이터 | src/app/(auth)/login/LoginClient.tsx, src/lib/storage.ts (`STORAGE_KEYS.savedId`) |
| R48 | S22 | 회원가입이 완료되면 시스템이 자동으로 환영 이메일을 발송해야 하며, 발송 실패가 가입 처리 자체를 막아서는 안 된다 | 기능 | src/app/api/auth/register/route.ts, src/lib/server/email.ts (`sendWelcomeEmail`) |
| R49 | A1, A2, A3, S23 | 플래너 화면에 처음 접속한 사용자에게 주요 기능(장소 검색·목록·순서 변경·일정 설정·변수·지도 전환·현재 위치·AI 도우미·경로 계산)을 순서대로 안내하는 투어를 제공해야 한다 | 기능 | src/app/planner/ProductTour.tsx |
| R50 | A1, S4b | AI가 추천한 장소의 좌표는 선택한 지역 주소와 일치하는 카카오 검색 결과만 인정하고, 동명이지만 다른 지역인 후보는 매칭에서 제외한다 | 제약 | src/app/(main)/routes/AiGenerateWizard.tsx (`matchesRegion`, `resolvePlaceCoords`) |
| R51 | A1, S4b, S5 | 좌표 매칭에 실패한 장소는 가짜 좌표를 만들지 않고, 같은 조건으로 최대 3회까지 AI에게 대체 후보를 다시 요청한다. 그래도 실패하면 사용자에게 모달로 안내한다 | 기능 | src/app/(main)/routes/AiGenerateWizard.tsx (`MAX_REPLACEMENT_ROUNDS`, `unmatchedNotice`) |
| R52 | A1, A2, S6 | 방문지 좌표가 없는 구간은 임의의 이동시간·거리·교통수단명을 만들지 않고, 조회 실패와 동일한 상태로 표시한다 | 제약 | src/app/planner/PlannerClient.tsx (`enrichedSegments`) |

## 검토했으나 제외

| 후보 | 출처 | 제외 이유 |
|---|---|---|
| "일정 종료일이 지나면 편집이 막힌다"는 요구 | plan/plan-example의 기존 요구(구 R38 계열) | 실제 코드에서 `tripEnd`를 비교해 편집·저장·초대를 막는 서버 검증을 찾지 못했다. `/routes`의 "완료된 일정" 탭은 화면 분류일 뿐이다(근거 없음 — src/app/api/schedules/[id]/route.ts PATCH에 날짜 비교 없음). 09번 문서의 예외 흐름에 "미확인"으로만 남긴다 |
| "실시간 변동을 감지해 동선을 자동 재조정한다"는 요구 | plan/plan-example 02 문서의 기존 팀 결정(사용 안 함) | 코드에서도 대응 기능을 찾지 못했다 — 재계산은 전부 사용자가 "변수 추가"를 눌러야 시작된다(R15) |
| "커뮤니티는 비회원이 아예 접근할 수 없다"는 요구 | plan/plan-example의 기존 가정 | 실제로는 `GET /api/community/posts`가 로그인 여부와 무관하게 전체 글 목록을 내려준다 — 접근 자체가 막힌 것이 아니라 화면(클라이언트)이 로그인 모달로 덮을 뿐이다. 09번 문서에 이 차이를 별도로 기록한다(근거: src/app/api/community/posts/route.ts) |

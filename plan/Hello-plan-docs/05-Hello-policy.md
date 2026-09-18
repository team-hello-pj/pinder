> 문서: 05-Hello-policy.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-18

## 정책

| P | 대상 F | 대상(누가) | 조건(상태값) | 규칙 | 위반 시 실제 동작(에러 메시지/차단 등) | 근거(경로) |
|---|---|---|---|---|---|---|
| P1 | F2,F7,F8,F9,F10 | creator/editor(canEdit) vs viewer | `role ∈ {creator, editor}`이면 `canEdit=true` | canEdit인 사용자만 방문지 추가·삭제·순서 변경·경로 계산·변수 적용·AI 도우미를 쓸 수 있다 | 뷰어 화면에는 해당 버튼 자체가 렌더되지 않고(클라이언트 단속), 서버 PATCH도 role이 creator/editor가 아니면 403 "수정 권한이 없습니다" | src/app/planner/PlannerClient.tsx (`canEdit`), src/app/api/schedules/[id]/route.ts (PATCH) |
| P2 | F11,F12,F13 | 제작자(발급), 링크 소지자(사용) | `inviteTokenViewer`/`inviteTokenEditor`가 서로 다른 값으로 존재 | 링크의 실제 권한은 URL의 `role` 값이 아니라 서버에 저장된 토큰이 어느 컬럼과 일치했는지로만 결정한다 | URL의 role을 `editor`로 바꿔도 서버가 무시하고 실제 매칭된 토큰 기준으로만 처리 | src/app/api/schedules/join/route.ts (`linkRole`) |
| P3 | F13,F14,F15 | 뷰어 → 편집자 승격 희망자 | `scheduleEditRequests` 행 존재 여부 | 편집 가능 링크로 들어와도 즉시 editor가 되지 않고 반드시 제작자 승인을 거쳐야 한다 | 승인 전에는 계속 viewer로 취급되어 편집 관련 서버 요청은 403 | src/app/api/schedules/join/route.ts, src/app/api/schedules/[id]/edit-requests/route.ts |
| P4 | F15 | 제작자 | `scheduleCollaborators.role='editor'`로 이미 확정 | 한 번 승인된 편집 권한은 제작자가 되돌릴(강등/회수) 수 없다 | 회수용 API 자체가 존재하지 않는다(부재를 근거로 확인) | src/app/api/schedules 하위 전체(회수/강등 엔드포인트를 찾지 못함) |
| P5 | F18 | 제작자만 | `role === 'creator'` | 여행 날짜(`tripStart`/`tripEnd`) 변경은 제작자만 할 수 있다 | 제작자가 아닌 사용자가 보낸 날짜 값은 서버가 조용히 무시하고 나머지 필드만 저장(요청 자체는 실패시키지 않음) | src/app/api/schedules/[id]/route.ts (PATCH) |
| P6 | F19 | creator vs editor/viewer | `role` | 삭제 요청의 파급 범위는 역할에 따라 다르다 — creator는 일정 전체(CASCADE), editor/viewer는 자신의 참여 기록만 | 제작자 삭제 시 모든 참여자의 기록이 함께 사라짐, 비제작자 삭제 시 원본은 그대로 남음 | src/app/api/schedules/[id]/route.ts (DELETE) |
| P7 | F8 | 시스템(서버) | AI가 반환한 `order`가 원래 방문지 id 집합의 순열이고, anchor가 있으면 `order[0]`가 anchor와 같아야 함 | 조건을 만족하지 않으면 AI 결과를 버리고 원래 순서를 그대로 반환한다 | "AI 응답을 해석하지 못해 기존 동선을 유지했어요" 안내(`applied:false`를 함께 반환하지만 클라이언트는 이 값을 분기에 쓰지 않는다) | src/app/api/route-adjust/route.ts |
| P8 | F3,F4,F5 | 시스템(서버) | 여행 일수(`dayCount`) | AI 추천 장소 수는 하루 2-6곳, 전체 최대 30곳, 체류시간은 10-180분으로 강제 조정(clamp)한다 | Gemini가 범위를 벗어난 값을 주더라도 서버가 자동으로 clamp해 항상 범위 안의 값만 저장 | src/app/api/route-generate/route.ts (`sanitizePlaces`, `MIN_PLACES_PER_DAY` 등) |
| P9 | F21,F26 | 로그인 사용자 | 닉네임 2-12자, 한글/영문/숫자/밑줄만 허용, 변경 후 7일 | 형식 위반·중복·보호기간 내 재사용을 모두 차단한다 | "한글, 영문, 숫자, _만 사용할 수 있어요" / "사용할 수 없는 닉네임이에요" 등 사유별 메시지. 단, 회원가입 시점 닉네임 검사는 이 규칙을 따르지 않고 최소 2자 이상만 확인한다(불일치, 근거는 09번 문서 참고) | src/lib/server/nickname.ts, src/app/(auth)/signup/SignupClient.tsx |
| P10 | F29 | 로그인 사용자 | 소유한 일정(`schedules.ownerId`) 존재 여부 | 소유 일정이 있으면 confirm→blocked(목록 확인)→finalWarning→삭제의 4단계를 거치고, 없으면 confirm 단계에서 바로 삭제된다 | 각 단계의 동의 체크 없이는 다음 버튼이 비활성화되고, 실패 시 일반 삭제는 처음(confirm) 단계로, 강제 삭제는 finalWarning 단계로 되돌아가 오류가 표시된다 | src/app/(main)/my-page/MyPageClient.tsx, src/app/api/auth/account/route.ts |
| P11 | F32,F34 | 로그인 사용자 | 쿠키 `pd_session`(JWT) | 세션은 30일 만료이며 `httpOnly`·`secure`·`sameSite=lax` 속성을 가진다 | 만료되었거나 서명이 위조된 쿠키는 검증 실패로 비로그인 상태와 동일하게 처리된다 | src/lib/server/session.ts (`SESSION_TTL_SEC`, `SESSION_COOKIE`) |
| P12 | F30,F31,F33 | 이메일 인증이 필요한 모든 흐름 | 코드 6자리, 5분 만료, 60초 재전송 대기, 5회 시도 제한, 인증 후 30분간 유효 | 위 수치를 벗어나면 각각 다른 사유로 거부한다 | "만료되었어요"/"시도 횟수를 초과했어요" 등 사유별 안내, 재전송 버튼은 카운트다운 동안 비활성화 | src/lib/server/verification-code.ts, src/app/api/auth/verify-code/route.ts, src/app/api/auth/register/route.ts (`VERIFIED_TTL_MS`) |
| P13 | F27,F31 | 사용자 | 이미지 형식 png/jpeg/jpg/webp, data URL 약 200만자 이하 | 프로필 사진은 클라이언트에서 200×200 JPEG로 강제 리사이즈한 뒤 서버가 형식·용량을 다시 검사한다 | "이미지 형식이 올바르지 않습니다" / "이미지 용량이 너무 큽니다" | src/lib/avatar-upload.ts, src/app/api/account/avatar/route.ts |
| P14 | F1,F20,F21-F24,F26,F27,F28,F29 | 비로그인 사용자(게스트) | 화면별로 다름 | 홈·여행지 탐색은 서버·화면 모두 완전히 공개하고, 커뮤니티는 서버 데이터는 공개하되 화면이 로그인 모달로 덮으며, 마이페이지는 화면(설정 UI와 모달 문구 전체)까지 완전히 공개하고 개별 저장·조회 액션만 서버에서 로그인 필요로 거부한다. 쓰기 액션(일정 생성/저장/편집 권한 요청/글쓰기 등)은 예외 없이 로그인이 필요하다 | 홈의 "새 일정"과 탐색의 "일정 짜기"는 클릭 즉시 `/login`으로 이동, 커뮤니티는 모달을 닫으면 홈으로 이동, 마이페이지는 아무 안내 없이 화면이 그대로 열리고 닉네임·이메일 등 값이 비어 보일 뿐이다 | src/app/(main)/routes/NewTripFlow.tsx, src/app/(main)/explore/ExploreClient.tsx, src/app/(main)/community/CommunityClient.tsx, src/app/api/community/posts/route.ts, src/app/(main)/my-page/MyPageClient.tsx(진입 가드 부재), src/app/api/account/nickname/route.ts |

## 상태값 전이

1. **일정 참여자 역할(ScheduleRole)** — `none`(미참여) → `viewer`(초대 링크로 join, 또는 편집 링크 join 시에도 우선 viewer) → `editor`(제작자 승인, `scheduleCollaborators.role` UPDATE). `editor`에서 `viewer`로 되돌아가는 전이는 코드에 없다(P4). `creator`는 일정 생성 시점에 고정되며 전이 대상이 아니다(근거: src/app/api/schedules/join/route.ts, src/app/api/schedules/[id]/edit-requests/[requestId]/route.ts).
2. **편집 권한 요청(`scheduleEditRequests`)** — 없음 → 생성(요청 또는 편집 링크 join 시 자동 생성) → 삭제(승인·거절 어느 쪽이든). 삭제 후에도 다시 요청하면 재생성된다(근거: src/app/api/schedules/[id]/edit-requests/route.ts `onConflictDoNothing`).
3. **일정 자체(`schedules`)** — 없음 → 생성(POST, creator) → 수정(장소/구간/기준/날짜) → 삭제(creator 전용, CASCADE). "종료(읽기 전용)" 상태는 스키마에도 코드에도 없다 — `tripEnd`가 지나도 편집·저장·초대는 그대로 동작하며, `/routes`의 "완료된 일정" 탭은 화면 표시용 분류일 뿐 상태 전이가 아니다(근거: src/app/(main)/routes/MyRoutesClient.tsx `isDone`, src/app/api/schedules/[id]/route.ts PATCH에 날짜 비교 없음 — 부재 확인됨).
4. **이메일 인증(`emailVerificationCodes`)** — 미인증 → 코드 발급(행 생성) → 인증 완료(`verifiedAt` 기록, 이후 30분간 유효) → 회원가입/비밀번호 재설정에 소비되어 삭제되거나, 사용되지 않으면 다음 발급 때 덮어써진다(근거: src/db/schema.ts `emailVerificationCodes`, src/lib/server/verification-code.ts).
5. **계정 탈퇴** — 활성 → (소유 일정 있음) `blocked` 경고 → `finalWarning` 최종 확인 → 삭제(CASCADE) / 활성 → (소유 일정 없음) → 즉시 삭제(근거: src/app/api/auth/account/route.ts).
6. **로그인 세션** — 없음 → 로그인(쿠키 발급, 30일) → 만료 또는 로그아웃 → 없음(근거: src/lib/server/session.ts).

## 서비스 정책

| SP | 내용 | 근거(경로) |
|---|---|---|
| SP1 | 관리자/운영 화면이 존재하지 않는다 — 커뮤니티 신고 처리, 여행지 탐색 데이터 편집 모두 시드 스크립트 재실행이나 코드 배포로만 가능하다 | scripts/seed-destinations.mjs (주석), src/db/schema.ts (`destinations` 테이블 주석) |
| SP2 | 외부 API 키(`GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `KAKAO_*`)가 없어도 서비스 자체는 계속 뜨고 해당 기능만 오류를 반환한다. 다만 `SESSION_SECRET`이 없으면 로그인·회원가입·세션·닉네임변경·비밀번호재설정 라우트 전체가 처리되지 않은 예외로 500 오류를 낸다 — README.md의 "키가 없어도 앱은 뜨고 해당 기능만 오류를 보여준다"는 설명이 이 키에는 적용되지 않는다 | src/lib/server/session.ts (`getSecret`), README.md |
| SP3 | 메일 발송 자격 증명(`GMAIL_USER`/`GMAIL_APP_PASSWORD`)이 없으면 인증 코드·환영 메일(F37)·탈퇴 안내 메일을 포함한 모든 발신 메일이 실제 이메일로 가지 않고 서버 로그에만 출력되지만, 해당 API(회원가입 등)는 그대로 성공으로 응답한다. 자격 증명이 있어도 발송 자체가 실패(오류)하면 서버 로그만 남기고 예외를 던지지 않아, 어느 경우든 사용자 화면에는 실패 사실이 전혀 드러나지 않는다 — 사용자 입장에서는 이메일을 못 받았는데도 "성공" 화면을 보게 된다 | src/lib/server/email.ts (`sendMail`이 모든 발신 함수의 공통 경로) |
| SP4 | 데이터 저장은 현재 서버 DB(Postgres/Drizzle) 기준이며, `localStorage`는 테마·"아이디 저장"·AI 생성 결과 임시 전달 같은 순수 클라이언트 상태에만 남아 있다 — docs/ARCHITECTURE.md·docs/TEAM.md의 "저장은 localStorage" 설명은 현재 코드를 반영하지 못한 과거 문서다 | src/lib/storage.ts (주석), src/db/schema.ts |

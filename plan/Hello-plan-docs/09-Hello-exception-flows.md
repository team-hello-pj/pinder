> 문서: 09-Hello-exception-flows.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-18

> 비고: 이 문서는 04-Hello-features.md와 06-Hello-screen-design.md에서 이미 확인된 예외 처리를 한 곳에 모은 것이며, 신규 발굴이 아니다. "실제 동작 확인 여부"는 두 값 중 하나다 — **코드 확인**: 소스 코드에서 해당 예외 처리 로직을 직접 확인했다는 뜻이며, 배포 링크는 GET 열람만 허용되는 규칙(폼 제출·로그인 등 상호작용 금지)상 실제로 그 예외를 트리거해 화면에서 재현·캡처하지는 않았다. **근거 없음(기능 부재 확인)**: 그 상황을 처리하는 코드 자체가 없다는 것을 코드 전체 검색으로 확인했다는 뜻이다.

## 예외 흐름

| 상황 | 사용자에게 보이는 것 | 다음 행동 | 관련 F/화면 | 근거(경로) | 실제 동작 확인 여부 |
|---|---|---|---|---|---|
| 지도 클릭 지점에 주소 정보 없음 | "이 위치의 주소 정보를 찾지 못했어요" 토스트, 임시 마커 제거 | 다른 지점 클릭 또는 검색으로 재시도 | F2 / SC07 | src/app/planner/PlannerClient.tsx (`handleMapClick`) | 코드 확인 |
| Kakao 구간(경로) 조회 실패 | 해당 구간은 직선거리 기반 추정치로 대체되어 계산이 이어짐 | 별도 조치 불필요(추후 "경로 검색"으로 실제 값 재조회 가능) | F2, F7 / SC07 | src/app/planner/PlannerClient.tsx (`fetchLeg` 폴백) | 코드 확인 |
| 현재 위치 사용 불가(권한 거부/미지원) | 토스트 안내 | 주소 검색으로 전환 | F2 / SC07 | src/app/planner/PlannerClient.tsx (`openCurrentLocationAddConfirm`) | 코드 확인 |
| AI 생성 시 "기타" 지역이 실재하지 않음 | "존재하지 않는 지역이에요. 다시 입력해주세요." | 지역명 재입력 | F3 / SC06 | src/app/(main)/routes/AiGenerateWizard.tsx (`confirmCustomRegion`) | 코드 확인 |
| AI 최초 생성 실패(키 누락·네트워크 오류 등) | **오류 문구가 화면에 표시되지 않음** — 결과 없이 마지막 입력 단계로 되돌아감(결함) | 원인을 모른 채 재시도해야 함 | F3, F4 / SC06 | src/app/(main)/routes/AiGenerateWizard.tsx(오류 텍스트가 `resultPlaces` 존재 시에만 렌더되는 조건부 렌더링 구조) | 코드 확인(결함으로 판단) |
| AI 생성 결과가 최소 개수 미만 | 502 오류, "AI가 충분한 추천 장소를 만들지 못했어요"(단, 최초 생성 시에는 위 결함으로 화면에 보이지 않을 수 있음) | 재생성 시도 | F4 / SC06 | src/app/api/route-generate/route.ts | 코드 확인 |
| 상황 변경(AI 재구성) 응답이 유효한 순열이 아님 | "AI 응답을 해석하지 못해 기존 동선을 유지했어요" 토스트, 동선은 원래대로 유지 | 다른 조건으로 재시도 | F8 / SC07 | src/app/api/route-adjust/route.ts (`isPermutationOfIds`) | 코드 확인 |
| AI 도우미 응답 실패 | "AI 응답을 가져오지 못했어요. 잠시 후 다시 시도해주세요." | 다시 전송 | F9 / SC07 | src/app/planner/PlannerClient.tsx (`sendAiMessage`) | 코드 확인 |
| AI 도우미가 제안한 장소를 Kakao에서 찾지 못함 | `"<장소명>"의 위치를 찾지 못해 추가하지 못했어요` 토스트 | 다음 제안으로 자동 진행 | F9 / SC07 | src/app/planner/PlannerClient.tsx (`advanceRecommendedQueue`) | 코드 확인 |
| 일정 저장 중 서버 오류 | "저장하지 못했어요. 다시 시도해주세요." 토스트, 화면은 저장 전 상태 유지 | 다시 저장 시도 | F10 / SC07 | src/app/planner/PlannerClient.tsx (`saveOrRemoveAction`) | 코드 확인 |
| 비로그인 상태에서 저장/새 일정/편집 권한 요청 시도 | 화면마다 다름 — 로그인 필요 모달 또는 즉시 `/login` 이동 | 로그인 또는 회원가입 | F1, F10, F13, F20 / SC01, SC06, SC07 | src/app/(main)/routes/NewTripFlow.tsx, src/app/planner/PlannerClient.tsx, src/app/(main)/explore/ExploreClient.tsx | 코드 확인 |
| 유효하지 않은 초대 링크 토큰 | 404 "유효하지 않은 초대 링크예요" | 올바른 링크를 다시 받아야 함 | F12 / SC07 | src/app/api/schedules/invite/[token]/route.ts | 코드 확인 |
| 이미 편집자인 사용자가 편집 링크로 재방문 | 아무 변화 없이 그대로 편집자 유지 | 계속 사용 | F13 / SC07 | src/app/api/schedules/join/route.ts | 코드 확인 |
| 편집 권한 요청 전송 실패 | **실패 안내가 없음** — 성공 시에만 토스트가 뜨고, 실패 시에는 조용히 끝남(결함) | 요청이 갔는지 알기 어려움, 재시도 여부 판단 불가 | F14 / SC07 | src/app/planner/PlannerClient.tsx (`requestEditPermission`) | 코드 확인(결함으로 판단) |
| 승인/거절 대상 요청을 찾을 수 없음 | 404 "요청을 찾을 수 없습니다" | 목록 새로고침 | F15 / SC07 | src/app/api/schedules/[id]/edit-requests/[requestId]/route.ts | 코드 확인 |
| 제작자가 아닌 사용자가 날짜 변경을 포함한 저장 요청을 보냄 | 요청은 성공하지만 날짜만 조용히 무시됨(오류 표시 없음) | 왜 날짜가 안 바뀌었는지 사용자가 알기 어려움 | F18 / SC06 | src/app/api/schedules/[id]/route.ts (PATCH) | 코드 확인 |
| "내 일정에서 삭제" 확인 모달 문구 | 제작자에게도 "공유된 원본 일정은 삭제되지 않습니다"라는 동일한 문구가 표시됨(실제로는 제작자가 삭제하면 원본과 다른 참여자 기록까지 함께 삭제됨 — 문구와 동작 불일치) | 제작자가 문구만 보고 안전하다고 오인할 수 있음 | F19 / SC06 | src/app/(main)/routes/MyRoutesClient.tsx (삭제 확인 모달) | 코드 확인(결함으로 판단) |
| 준비된 AI 동선이 없는 여행지 | "이 여행지로 일정 짜기" 버튼 자체가 표시되지 않음 | 다른 여행지 선택 | F20 / SC05 | src/lib/server/destinations.ts (`availableTripLengths`) | 코드 확인 |
| 요청한 여행 일수의 동선이 없음 | 404 "아직 준비된 동선이 없어요" | 다른 일수 선택 | F20 / SC05 | src/app/api/explore/destinations/[id]/route.ts | 코드 확인 |
| 커뮤니티 글쓰기 시 사진 0장 또는 지역·감상평 공백 | 저장 차단 + 인라인 오류(예: "사진을 1장 이상 첨부해주세요.") | 값 보완 후 재시도 | F21 / SC08 | src/app/(main)/community/CommunityClient.tsx (`saveComposer`), src/app/api/community/posts/route.ts | 코드 확인 |
| 커뮤니티 데이터는 서버상 로그인 없이 공개되지만 화면은 로그인 모달로 가려짐 | 비로그인 사용자는 모달을 닫으면 홈으로 이동(글 목록 자체는 API로는 이미 받아온 상태) | 로그인 또는 회원가입 | F21-F24 / SC08 | src/app/api/community/posts/route.ts(세션 체크 없음) vs src/app/(main)/community/CommunityClient.tsx(모달로 가림) | 코드 확인(정책과 실제 접근 통제 수준의 불일치로 판단) |
| 이메일 인증번호 5회 오입력 | "시도 횟수를 초과했어요" | 인증번호 재전송 필요 | F30, F31, F33 / SC03, SC04 | src/app/api/auth/verify-code/route.ts (`MAX_ATTEMPTS`) | 코드 확인 |
| 이메일 인증번호 5분 경과(만료) | "만료되었어요" | 인증번호 재전송 필요 | F30 / SC03, SC04 | src/lib/server/verification-code.ts (`CODE_TTL_SEC`) | 코드 확인 |
| 인증 완료 후 30분 초과해 가입/재설정 제출 | 인증되지 않은 것으로 처리됨 | 이메일 인증부터 다시 시작 | F31, F33 | src/app/api/auth/register/route.ts, src/app/api/auth/password-reset/confirm/route.ts (`VERIFIED_TTL_MS`) | 코드 확인 |
| 아이디/닉네임 중복(회원가입) | "이미 사용 중인 아이디입니다"/"이미 사용 중인 닉네임입니다" | 다른 값으로 변경 후 재시도 | F31 / SC03 | src/app/api/auth/register/route.ts | 코드 확인 |
| 구글 전용 계정으로 비밀번호 로그인/재설정 시도 | "구글 로그인으로 가입된 계정이에요. 구글 로그인을 이용해주세요." | 구글 로그인 버튼 이용 | F32, F33 / SC02, SC04 | src/app/api/auth/login/route.ts, src/app/api/auth/password-reset/send-code/route.ts | 코드 확인 |
| 프로필 사진이 이미지가 아니거나 용량 초과 | "이미지 파일만 업로드할 수 있어요." / "이미지 용량이 너무 큽니다." | 다른 파일로 재시도 | F27 / SC03, SC09 | src/lib/avatar-upload.ts, src/app/api/account/avatar/route.ts | 코드 확인 |
| 알림 설정에서 "좋아요 알림"/"동선 알림"/"서비스 소식" 토글 변경 | 저장은 성공하지만 실제 알림 생성에는 아무 영향이 없음(해당 알림을 만드는 코드 자체가 없음) | 사용자는 설정이 반영됐다고 오인할 수 있음 | F25, F28 / SC09 | src/app/(main)/my-page/data.ts (`NOTIFICATION_DEFS`), src/lib/server/notifications.ts | 코드 확인(결함으로 판단) |
| 소유한 일정이 있는 상태에서 회원 탈퇴 시도 | 1차 차단 + 소유 일정 목록 안내 | 목록 확인 후 최종 경고 단계로 진행하거나 취소 | F29 / SC09 | src/app/api/auth/account/route.ts (`has_creator_schedules`) | 코드 확인 |
| `SESSION_SECRET` 환경변수 누락 | 로그인·회원가입·세션조회·닉네임변경·비밀번호재설정 라우트가 처리되지 않은 예외로 500 오류를 반환(구체적인 사용자 안내 문구는 코드에 없음) | 재시도해도 동일하게 실패 — 서버 설정을 고쳐야 함 | F26, F31, F32, F33 / SC02, SC03, SC04, SC09 | src/lib/server/session.ts (`getSecret`) | 코드 확인(README의 "키가 없어도 오류 메시지만 보여준다" 원칙에서 벗어난 예외로 판단) |
| `GMAIL_USER`/`GMAIL_APP_PASSWORD` 환경변수 누락 | 인증번호가 실제 이메일로는 발송되지 않고 서버 로그에만 출력되지만, 화면에는 "발송됨"으로 표시됨 | 사용자는 이메일을 받지 못해 다음 단계로 진행할 수 없음 | F30 / SC03, SC04 | src/lib/server/email.ts | 코드 확인 |
| 일정의 여행 종료일(`tripEnd`)이 지남 | 아무 제한도 걸리지 않고 계속 편집·저장·초대가 가능함(예외 처리가 아니라 기능 자체의 부재) | 해당 없음 | F18, F19 / SC06, SC07 | src/app/api/schedules/[id]/route.ts(PATCH에 날짜 비교 로직 없음) | 근거 없음(기능 부재 확인) |
| 회원가입 환영 메일 발송 실패(자격 증명 누락 또는 발송 오류) | **사용자에게는 아무 안내도 없음** — 회원가입 화면은 이메일 발송 성공 여부와 무관하게 정상적으로 완료 처리됨 | 별도 행동 불필요(사용자는 환영 메일을 못 받았다는 사실 자체를 알 방법이 없음) | F37 / SC03 | src/lib/server/email.ts (`sendMail`의 자격 증명 누락 시 `return`, 발송 오류 시 `catch`만 하고 재전파하지 않음) | 코드 확인 |
| 플래너 최초 방문 투어의 안내 대상 요소를 찾지 못함(6초 내) | 투어가 뜨지 않고 조용히 종료됨(오류 메시지 없음) | 완료 처리는 하지 않으므로 다음 방문 때 다시 투어를 시도함 | F36 / SC07 | src/app/planner/ProductTour.tsx (`MAX_WAIT_TRIES`, `phase='idle'` 분기) | 코드 확인 |
| 비로그인 사용자가 `/my-page` URL로 직접 접속 | 로그인 안내나 리다이렉트 없이 마이페이지 설정 화면 전체(모달 문구 포함)가 그대로 표시되고, 닉네임·이메일 등 값이 채워질 자리만 빈 문자열로 보임 | 실제로 닉네임 변경·아바타 업로드·알림 설정 저장·탈퇴 등을 시도하면 그 시점에 서버가 401로 거부함(화면 자체는 계속 열려 있음) | F26-F29 / SC09 | src/app/(main)/my-page/MyPageClient.tsx(진입 시점 로그인 가드 부재), src/app/api/account/nickname/route.ts 등 각 API의 `getSessionUser()` 401 처리 | 코드 확인(배포 링크 GET 응답으로 교차 확인 — 06번 문서 SC09 참고) |

> 문서: 07-Hello-user-stories.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-18

> 비고: 아래 스토리는 04-Hello-features.md의 기능을 유저스토리 형식으로 다시 서술한 것이며, 신규로 발굴한 요구가 아니다.

## 유저스토리

| US | 스토리("~로서 ~하고싶다, 그래야~") | 연결 F | 연결 화면(06) | 근거(경로) |
|---|---|---|---|---|
| US1 | 여행을 계획하는 사용자로서, 로그인한 뒤 바로 "새 일정 만들기"를 시작하고 싶다, 그래야 메뉴를 헤매지 않는다 | F1 | SC01, SC06 | src/app/(main)/routes/NewTripFlow.tsx |
| US2 | 일정 제작자로서, 주소 검색이나 지도 클릭으로 방문지를 추가하고 싶다, 그래야 정확한 위치로 동선을 짤 수 있다 | F2 | SC07 | src/app/planner/PlannerClient.tsx |
| US3 | 여행 계획이 막막한 사용자로서, 지역·스타일·관심사 등 조건만 고르면 AI가 방문지를 추천해주면 좋겠다, 그래야 하나하나 검색하지 않아도 된다 | F3, F4, F5 | SC06 | src/app/(main)/routes/AiGenerateWizard.tsx |
| US4 | AI 추천을 받은 사용자로서, 그 결과를 그대로 플래너로 가져가 이어서 수정하고 싶다, 그래야 처음부터 다시 만들지 않아도 된다 | F6 | SC06, SC07 | src/lib/ai-route-handoff.ts |
| US5 | 일정 제작자로서, 최단시간/최단거리 기준으로 방문 순서를 자동 최적화하고 싶다, 그래야 이동 낭비를 줄일 수 있다 | F7 | SC07 | src/lib/route-optimizer.ts |
| US6 | 여행 중 변수가 생긴 사용자로서, 짐·날씨·지연 같은 상황을 입력하면 남은 동선만 다시 짜주면 좋겠다, 그래야 처음부터 다시 계산하지 않는다 | F8 | SC07 | src/app/api/route-adjust/route.ts |
| US7 | 일정을 수정 중인 사용자로서, AI 도우미에게 자연어로 물어보고 제안을 받고 싶다, 그래야 원하는 변경을 더 쉽게 표현할 수 있다 | F9 | SC07 | src/app/api/chat/route.ts |
| US8 | 일정 제작자로서, 만든 일정을 저장해두고 싶다, 그래야 나중에 다시 열어 이어서 쓸 수 있다 | F10 | SC07, SC06 | src/app/api/schedules/route.ts |
| US9 | 일정 제작자로서, 보기 전용과 편집 가능 링크를 따로 만들고 싶다, 그래야 링크가 새어나가도 편집 권한까지 함께 넘어가지 않는다 | F11 | SC07 | src/app/api/schedules/[id]/invite/route.ts |
| US10 | 일정을 공유받은 사람으로서, 로그인하지 않아도 먼저 내용을 확인하고 싶다, 그래야 가입 여부를 결정하기 전에 내용을 볼 수 있다 | F12 | SC07 | src/app/api/schedules/invite/[token]/route.ts |
| US11 | 초대 링크로 들어온 사용자로서, "저장"을 누르면 내 일정 목록에 남기고 싶다, 그래야 다시 링크를 찾지 않아도 된다 | F13 | SC07, SC06 | src/app/api/schedules/join/route.ts |
| US12 | 일정을 함께 보는 사람으로서, 편집 권한을 요청하고 제작자의 승인을 기다리고 싶다, 그래야 허락 없이 아무나 고치는 것을 막을 수 있다 | F14, F15 | SC07 | src/app/api/schedules/[id]/edit-requests/route.ts |
| US13 | 승인을 기다리는 뷰어로서, 승인되는 순간 새로고침 없이 편집 화면으로 바뀌면 좋겠다, 그래야 다시 들어올 필요가 없다 | F16 | SC07 | src/app/planner/PlannerClient.tsx(뷰어 폴링) |
| US14 | 여러 일정에 참여 중인 사용자로서, 내 화면에서만 보이는 이름으로 구분하고 싶다, 그래야 다른 참여자에게 영향을 주지 않고도 알아보기 쉽다 | F17 | SC06 | src/db/schema.ts (`scheduleTitleOverrides`) |
| US15 | 일정 제작자로서, 여행 날짜는 나만 바꿀 수 있게 하고 싶다, 그래야 참여자가 마음대로 일정을 옮기지 못한다 | F18 | SC06 | src/app/api/schedules/[id]/route.ts |
| US16 | 협업 중인 참여자로서, 나만 목록에서 빠지고 원본은 그대로 두고 싶다, 그래야 다른 사람의 일정을 실수로 지우지 않는다 | F19 | SC06, SC07 | src/app/api/schedules/[id]/route.ts |
| US17 | 여행지를 정하지 못한 사용자로서, 지역별 추천 여행지를 보고 바로 일정을 시작하고 싶다, 그래야 장소부터 하나씩 찾지 않아도 된다 | F20 | SC05 | src/app/(main)/explore/ExploreClient.tsx |
| US18 | 여행을 다녀온 사용자로서, 사진과 후기를 커뮤니티에 남기고 싶다, 그래야 기록을 한곳에 모아둘 수 있다 | F21 | SC08 | src/app/api/community/posts/route.ts |
| US19 | 커뮤니티를 보는 사용자로서, 마음에 드는 글에 좋아요·북마크를 남기고 댓글로 소통하고 싶다, 그래야 관심 있는 정보를 표시해둘 수 있다 | F22, F23 | SC08 | src/app/api/community/posts/[id]/like/route.ts |
| US20 | 여러 후기를 보는 사용자로서, 지역·검색어·정렬로 원하는 글만 걸러보고 싶다, 그래야 관련 없는 글을 넘기지 않아도 된다 | F24 | SC08 | src/app/(main)/community/CommunityClient.tsx |
| US21 | 서비스를 쓰는 사용자로서, 댓글이나 편집 권한 요청이 오면 알림으로 바로 확인하고 싶다, 그래야 앱을 계속 들여다보지 않아도 된다 | F25 | SC07, SC08(헤더 공통) | src/components/layout/NotificationBell.tsx |
| US22 | 닉네임을 바꾸고 싶은 사용자로서, 형식과 중복 검사만 통과하면 바로 바뀌면 좋겠다, 그래야 원하는 이름을 빨리 쓸 수 있다 | F26 | SC09 | src/lib/server/nickname.ts |
| US23 | 프로필을 꾸미고 싶은 사용자로서, 사진을 올리면 자동으로 정리(리사이즈)되어 저장되면 좋겠다, 그래야 직접 편집하지 않아도 된다 | F27 | SC09 | src/lib/avatar-upload.ts |
| US24 | 서비스를 그만 쓰려는 사용자로서, 내가 소유한 일정이 있으면 미리 경고를 받고 싶다, 그래야 실수로 다른 참여자의 일정까지 날리지 않는다 | F29 | SC09 | src/app/api/auth/account/route.ts |
| US25 | 새로 가입하는 사용자로서, 이메일 인증을 마쳐야 가입이 완료되면 좋겠다, 그래야 내 계정이 실제 이메일로 보호된다 | F31 | SC03 | src/app/api/auth/register/route.ts |
| US26 | 자주 방문하는 사용자로서, 아이디를 저장해두고 매번 다시 입력하지 않고 싶다, 그래야 로그인이 더 빠르다 | F35 | SC02 | src/app/(auth)/login/LoginClient.tsx |
| US27 | 비밀번호를 잊은 사용자로서, 이메일 인증만으로 새 비밀번호를 설정하고 싶다, 그래야 계정에 다시 접근할 수 있다 | F33 | SC04 | src/app/(auth)/forgot-password/ForgotPasswordClient.tsx |
| US28 | 아직 가입하지 않은 방문자로서, 로그인 없이도 홈과 여행지 탐색을 둘러보고 싶다, 그래야 가입 전에 서비스가 쓸만한지 확인할 수 있다 | F1, F20 | SC01, SC05 | src/app/(main)/explore/ExploreClient.tsx, src/app/api/explore/destinations/route.ts |

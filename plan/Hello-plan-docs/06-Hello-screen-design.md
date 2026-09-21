> 문서: 06-Hello-screen-design.md · 근거: 코드베이스 분석 · 마지막 갱신: 2026-09-18

> 화면 확인 방법 안내: 이 문서의 "실제 화면 구성"은 스크린샷이 아니라 **배포 링크(https://pinder-one.vercel.app/)에 대한 GET 응답 텍스트 분석**으로 작성했다. 방법은 두 가지를 병행했다 — ① `curl`로 각 라우트의 원본 HTML을 받아 `grep`으로 태그 사이의 한글 텍스트 노드를 그대로 추출(확인 시각: 2026-09-18, 이하 각 화면에 바이트 수와 함께 표기), ② WebFetch로 같은 URL의 렌더링 결과를 교차 확인. 이 저장소에는 Playwright·Puppeteer 같은 헤드리스 브라우저가 설치되어 있지 않고 규칙상 새로 설치할 수 없어 이미지 캡처는 하지 않았다. Next.js 클라이언트 컴포넌트 특성상 일부 화면(SC03, SC07)은 최초 GET 응답에 본문 텍스트가 전혀 없다 — 이 경우 그 사실 자체를 근거로 남기고 코드 분석으로 서술을 대신했다.

## 화면 목록

| 화면 ID | 화면명 | 라우트 경로 | 관련 F | 사용 컴포넌트 | 근거(파일) |
|---|---|---|---|---|---|
| SC01 | 홈 | `/` | F1 | AntCtaCard, NewTripFlow, SectionReveal | src/app/(main)/page.tsx |
| SC02 | 로그인 | `/login` | F32, F35 | LoginClient | src/app/(auth)/login/page.tsx |
| SC03 | 회원가입 | `/signup` | F31, F37 | SignupClient | src/app/(auth)/signup/page.tsx |
| SC04 | 비밀번호 찾기 | `/forgot-password` | F33 | ForgotPasswordClient | src/app/(auth)/forgot-password/page.tsx |
| SC05 | 여행지 탐색 | `/explore` | F20 | ExploreClient | src/app/(main)/explore/page.tsx |
| SC06 | 내 일정 | `/routes` | F10, F17, F18, F19 및 F1-F6(새 일정 흐름 진입) | MyRoutesClient, NewTripFlow, AiGenerateWizard, DateRangeCalendar | src/app/(main)/routes/page.tsx |
| SC07 | 경로 플래너 | `/planner` | F2, F6-F16, F36 | PlannerClient, PlaceCard, SegmentConnector, ProductTour | src/app/planner/page.tsx |
| SC08 | 커뮤니티 | `/community` | F21-F24 | CommunityClient, CommentThread | src/app/(main)/community/page.tsx |
| SC09 | 마이페이지 | `/my-page` | F26-F29 | MyPageClient | src/app/(main)/my-page/page.tsx |

## 화면별 레이아웃

### SC01 홈
주요 영역: 히어로(배지+타이틀+설명), CTA 카드(개미 애니메이션 + "최적 동선 생성하기" 버튼, 클릭 시 `NewTripFlow` 모달로 이어짐), 통계 3개, "3단계로 완성되는 최적의 동선" 섹션. 상태 분기는 없다 — 로그인 여부와 무관하게 정적 렌더링이며, CTA 클릭 시점에만 로그인 여부를 확인한다(근거: src/app/(main)/AntCtaCard.tsx, src/app/(main)/routes/NewTripFlow.tsx).

**실제 화면 구성(배포 링크 확인)**: `curl` GET 응답(36,572바이트)의 텍스트 노드를 그대로 추출한 결과 "AI 기반 동선 플래너" 배지, "최적의 동선, p:nder와 함께" 제목, "목적지를 입력하면 최적화된 일정과 이동 동선을 자동으로 생성해드립니다." 설명, "최적 동선 생성하기 →" CTA, "빠진 머리카락 개수"·"총 커밋 횟수"·"박애관 체류 시간" 통계 라벨, "단 3단계로 완성되는 최적의 동선"과 "장소 입력"·"최적 경로 생성"·"일정에 맞게 수정" 3단계 문구가 모두 코드(src/app/(main)/page.tsx의 `STATS`·`STEPS` 배열)와 한 글자도 다르지 않게 확인된다. 흥미로운 점은 CTA를 눌러야 열리는 "어떻게 일정을 만들까요?"(생성 방식 선택) 모달과 날짜 선택 캘린더 모달의 내용("직접 생성하기"/"AI 생성하기", "출발 날짜"/"도착 날짜", "취소"/"시작하기")까지 닫힌 상태 그대로 최초 응답에 이미 포함되어 있다는 것이다 — `Modal` 컴포넌트가 네이티브 `<dialog>`를 쓰기 때문에(10·11번 문서 참고) 열기 전에도 마크업 자체는 서버가 미리 내려준다(근거: src/app/(main)/AntCtaCard.tsx, src/app/(main)/routes/NewTripFlow.tsx, src/components/ui/Modal.tsx; 확인: `curl "https://pinder-one.vercel.app/"`, 2026-09-18).

### SC02 로그인
주요 영역: 이메일/비밀번호 입력, "아이디 저장" 체크박스(로컬 저장된 이메일 자동 채움), 에러 텍스트, 구글 로그인 버튼(커스텀 스타일 위에 구글 실제 버튼을 투명하게 겹침), 회원가입 링크. 상태 분기: 성공(세션 발급 후 이동), 실패(미가입/구글전용계정/비밀번호 불일치 각각 다른 문구), 구글 로그인 실패(별도 `googleError` 텍스트)(근거: src/app/(auth)/login/LoginClient.tsx, src/app/api/auth/login/route.ts).

**실제 화면 구성(배포 링크 확인)**: GET 응답(13,764바이트)에서 "로그인하고 최적의 동선을 만들어보세요" 소개문, "이메일"/"비밀번호" 입력 라벨, "아이디 저장" 체크박스, "비밀번호를 잊으셨나요?" 링크, "로그인" 제출 버튼, "또는" 구분선, "Google로 계속하기" 버튼, "아직 계정이 없으신가요?"와 "회원가입" 링크가 그대로 확인된다 — `LoginClient.tsx`에 적힌 라벨과 정확히 일치한다(근거: src/app/(auth)/login/LoginClient.tsx; 확인: `curl "https://pinder-one.vercel.app/login"`, 2026-09-18).

### SC03 회원가입
주요 영역: 프로필 사진(선택), 이름/아이디/닉네임(각각 중복확인 버튼)/이메일(인증번호 발송)/인증번호 입력/비밀번호/약관 동의(4항목, 2개 필수). 상태 분기: 아이디·닉네임 중복확인 결과 텍스트, 인증번호 재전송 카운트다운, 인증 완료 안내, 제출 버튼은 필수값 미충족 시 비활성화, 서버 검증 실패 시 이메일/아이디/닉네임 우선순위로 오류 문구 표시. 구글 회원가입 진입 시 이메일/이름이 미리 채워지고 인증 단계가 생략된다(근거: src/app/(auth)/signup/SignupClient.tsx, src/app/api/auth/register/route.ts).

**실제 화면 구성(배포 링크 확인)**: 이 화면의 GET 응답은 10,321바이트에 불과하고, `<title>회원가입 | p:nder</title>`와 메타 설명 외에는 폼 요소 텍스트가 전혀 들어있지 않다(직접 `curl`로 원본 HTML을 받아 확인). `SignupClient`가 완전한 클라이언트 컴포넌트라 서버가 보내는 최초 HTML은 비어 있고, 브라우저에서 자바스크립트가 실행(hydration)된 뒤에야 실제 폼이 그려지는 구조로 보인다 — 따라서 이 화면은 텍스트 기반으로 실제 렌더링 결과를 추가 검증하지 못했고, 위 레이아웃 서술은 전적으로 코드 분석(src/app/(auth)/signup/SignupClient.tsx)에 근거한다(확인: `curl "https://pinder-one.vercel.app/signup"`, 2026-09-18, HTTP 200이나 본문 텍스트 없음).

### SC04 비밀번호 찾기
주요 영역: 4단계(이메일 → 인증번호 → 새 비밀번호 → 완료) 순차 진행. 상태 분기: 가입 안 된 이메일/구글 전용 계정은 첫 단계에서 차단, 인증번호 오류/만료는 각각 다른 문구, 완료 후 1.2초 뒤 홈으로 자동 이동(근거: src/app/(auth)/forgot-password/ForgotPasswordClient.tsx).

**실제 화면 구성(배포 링크 확인)**: GET 응답(11,612바이트)에서 "비밀번호를 재설정해요" 안내문, "이메일" 입력 라벨, "인증번호 받기" 버튼, "로그인으로 돌아가기" 링크가 확인된다. 4단계 중 첫 번째(이메일 입력) 단계 문구만 최초 응답에 보이고, 이후 단계(인증번호/새 비밀번호/완료)는 사용자의 진행에 따라 클라이언트에서 전환되어 초기 HTML에는 나타나지 않는다(근거: src/app/(auth)/forgot-password/ForgotPasswordClient.tsx; 확인: `curl "https://pinder-one.vercel.app/forgot-password"`, 2026-09-18).

### SC05 여행지 탐색
주요 영역: 지도(한국 지역 SVG 핀) + 지역 목록, 섹션별(팀이 시드한 큐레이션 묶음) 여행지 카드 그리드, 카드별 "이 여행지로 일정 짜기" 버튼(준비된 동선이 있을 때만 노출). 상태 분기: 지역 필터로 해당 지역에 카드가 없으면 "이 지역의 추천 여행지가 아직 없어요", 여러 일수 옵션이 있으면 "며칠 동안 다녀오시나요?" 모달, 비로그인 클릭 시 모달 없이 곧장 `/login`으로 이동, 준비된 동선이 없는 일수를 요청하면 서버가 404(근거: src/app/(main)/explore/ExploreClient.tsx, src/lib/server/destinations.ts).

**실제 화면 구성(배포 링크 확인)**: GET 응답(19,988바이트)에서 "지도의 핀이나 아래 목록에서 지역을 눌러 여행지를 추천받아보세요" 안내문, "지역 선택▾" 드롭다운, 전체·서울·강원·경기 등 지역 17개, "며칠 동안 다녀오시나요?" 일수 선택 모달 문구까지 확인된다. 다만 실제 여행지 카드(이름·태그·"이 여행지로 일정 짜기" 버튼)는 이 최초 응답 텍스트에 없다 — `ExploreClient`가 마운트된 뒤 `/api/explore/destinations`를 별도로 호출해 카드 데이터를 채워 넣는 구조와 일치한다. 즉 지역 목록·안내문 같은 정적 뼈대는 서버가 미리 그려주고, 실제 여행지 콘텐츠는 클라이언트에서 데이터를 받아온 뒤 채워진다(근거: src/app/(main)/explore/ExploreClient.tsx, src/app/api/explore/destinations/route.ts; 확인: `curl "https://pinder-one.vercel.app/explore"`, 2026-09-18).

### SC06 내 일정
주요 영역: 헤더("＋ 새 일정"), 예정된/완료된 일정 탭, 카드 목록(제목 인라인 수정, 참여자 아바타+왕관(제작자), 방문지 칩, "열기"/삭제/일정 수정 버튼), 페이지네이션(5개 단위). 상태 분기: 세션 확인 중이면 아무것도 렌더하지 않음, 로그인했지만 목록 로딩 중이면 역시 렌더 보류, 비로그인이면 "회원만 이용할 수 있어요" 모달이 화면을 덮고 닫으면 홈으로 이동, 일정이 0건이면 "저장된 일정이 없어요" 빈 상태, 삭제 확인 모달에는 "공유된 원본 일정은 삭제되지 않습니다"라는 문구가 역할과 무관하게 항상 표시된다(근거: src/app/(main)/routes/MyRoutesClient.tsx).

**실제 화면 구성(배포 링크 확인)**: GET 응답(13,745바이트)에는 공통 헤더·푸터 텍스트("여행지 탐색"·"내 일정"·"커뮤니티"·"로그인"·"웹 버전으로 보기")만 있고, 목록·빈 상태 문구·로그인 안내 모달 텍스트는 전혀 나타나지 않는다. 이는 코드의 `if (sessionLoading) return null;`(로그인 상태 확인이 끝나기 전에는 아무것도 그리지 않음) 분기와 정확히 일치한다 — 배포 서버가 응답을 내려보내는 시점에는 아직 세션 확인이 끝나지 않은 상태이므로, 헤더·푸터 바깥의 본문이 비어 있는 것이 코드상 정상 동작이다(근거: src/app/(main)/routes/MyRoutesClient.tsx; 확인: `curl "https://pinder-one.vercel.app/routes"`, 2026-09-18).

### SC07 경로 플래너
주요 영역: 좌측 방문지 패널(타임라인: 일차 구분+PlaceCard+구간 커넥터), 우측 지도(Kakao 지도, 주소 검색 오버레이, AI 도우미 패널), 하단 요약 바(총 거리/시간, 날짜, 변수 추가, 활동 로그, 저장/제거, 권한 관리/일행 초대, 편집 권한 요청, 경로 계산). 상태 분기: 방문지 0건이면 "아직 방문지가 없어요" + 추가 버튼, 경로 계산 전이면 구간이 "경로 검색 버튼을 눌러주세요" 상태로 표시, 계산/재구성 중에는 "동선 재계산 중..." 오버레이, 실패 시 토스트 안내. 역할별로 버튼 노출이 달라진다 — creator: 모든 기능+권한 관리+일행 초대+원본 삭제, editor: 편집 기능 전부(날짜 변경 제외), viewer: 읽기 전용 + "편집 권한 요청"/"승인 대기 중" 표시, AI 도우미 FAB는 viewer에게 노출되지 않는다. 초대 링크로 들어온 미참여 사용자는 역할과 무관하게 항상 읽기 전용으로 먼저 보여진다. 최초 방문 시에는 F36(ProductTour) 스포트라이트 안내가 병행 표시된다(근거: src/app/planner/PlannerClient.tsx, src/app/planner/ProductTour.tsx). 하단 요약 바의 액션 버튼 6개(변수 추가·활동 로그·저장, 달력·원본 삭제·경로 계산)는 모바일 폭에서 12분할 그리드로 2줄로 나뉘어 배치되며, 각 버튼이 겹치거나 잘리지 않도록 열마다 `grid-column: span` 값을 다르게 두어 칸 너비를 조정해 둔 것이 확인된다(근거: src/app/planner/planner.module.css `.summaryActions`, `.mobileActionsRow1Col1`-`.mobileActionsRow2Col3`).

**실제 화면 구성(배포 링크 확인)**: `curl` GET 응답이 8,373바이트로 이 문서에서 조사한 화면 중 가장 가벼우며, `<title>경로 만들기 | p:nder</title>`와 메타 설명 외에는 어떤 본문 텍스트도 없다. `PlannerClient` 역시 완전한 클라이언트 컴포넌트라 지도·요약 바·타임라인 등 모든 내용이 브라우저에서 그려지는 것으로 보인다 — 텍스트 기반으로는 이 화면의 실제 렌더링 결과를 추가 검증할 수 없었고, 위 레이아웃 서술은 전적으로 코드 분석(PlannerClient.tsx 등)에 근거한다(확인: `curl "https://pinder-one.vercel.app/planner"`, 2026-09-18, HTTP 200이나 본문 텍스트 없음).

### SC08 커뮤니티
주요 영역: 검색/지역 필터/정렬/보기전환 툴바, 게시물 목록(좋아요/북마크/댓글 수, 인라인 댓글 또는 "댓글 N개 더보기"), 사이드바(이번 주 인기 여행지, 인기 태그), 글쓰기/수정 팝업, 댓글 상세 팝업. 상태 분기: 글 목록 자체는 로그인 없이도 서버에서 내려오지만, 화면 진입 시 비로그인이면 "로그인이 필요한 페이지예요" 모달이 즉시 뜨고 닫으면 홈으로 이동 — 즉 데이터는 공개, 화면은 비공개(근거: src/app/(main)/community/CommunityClient.tsx, src/app/api/community/posts/route.ts). 검색/필터 결과가 없으면 "검색 결과가 없어요", 글이 아예 없으면 "아직 게시물이 없어요".

**실제 화면 구성(배포 링크 확인)**: GET 응답(13,895바이트)도 SC06과 같은 패턴이다 — 공통 헤더·푸터 텍스트만 있고 게시물 목록이나 로그인 유도 모달 텍스트는 나타나지 않는다. `CommunityClient` 역시 세션 확인이 끝나기 전에는 실질적인 본문을 그리지 않는 것으로 보인다. 다만 09번 문서에서 이미 지적했듯 데이터 자체는 `GET /api/community/posts`가 로그인 여부와 무관하게 내려주므로, 최초 HTML 본문이 비어 있는 것은 접근 통제가 아니라 클라이언트 렌더링 타이밍의 결과일 뿐이라는 점에 유의해야 한다(근거: src/app/(main)/community/CommunityClient.tsx, src/app/api/community/posts/route.ts; 확인: `curl "https://pinder-one.vercel.app/community"`, 2026-09-18).

### SC09 마이페이지
주요 영역: 프로필(아바타 업로드/삭제, 닉네임 수정), 알림 설정 모달(6개 토글), 약관 및 개인정보 모달, 회원 탈퇴 모달(단계별: 확인→(소유 일정 있으면 차단 안내)→최종 경고→처리 중→완료), 로그아웃. 상태 분기: 닉네임 저장 성공 시 토스트, 탈퇴 시 소유 일정 유무에 따라 단계 수가 달라짐, 탈퇴 실패 시 실패한 단계로 되돌아가 오류 표시(근거: src/app/(main)/my-page/MyPageClient.tsx).

**실제 화면 구성(배포 링크 확인) — 정정 사항 포함**: GET 응답(23,867바이트)에는 예상과 달리 설정 화면 전체가 그대로 담겨 있다 — "닉네임 수정", 알림 설정 6개 항목의 설명 전문("여행 일정과 계획된 활동을 미리 알려드려요.", "다음 일정이 시작되기 전에 알려드려요.", "일정 시작 알림", "동선 알림", "내 게시물의 댓글, 대댓글 활동을 알려드려요.", "내 댓글이나 게시물에 좋아요가 눌리면 알려드려요.", "좋아요 알림", "새로운 기능 및 서비스 관련 소식을 알려드려요.", "서비스 소식"), "약관 및 개인정보"(이용약관/개인정보 처리방침/위치기반서비스 이용약관), "로그아웃하시겠어요?", "정말 탈퇴하시겠어요?" 같은 각 모달의 문구까지 전부 서버 응답에 포함되어 있다.

이는 코드 확인 결과와 정확히 맞아떨어지는 **중요한 정정 사항**이다 — `MyPageClient.tsx`에는 SC06(`if (sessionLoading) return null`)이나 SC08(로그인 유도 모달)과 같은 진입 차단 분기가 전혀 없다. 코드 안의 `router.push('/login')` 호출은 모두 로그아웃 완료 후·탈퇴 완료 후에만 쓰이며, 화면 진입 시점의 가드로는 쓰이지 않는다(근거: src/app/(main)/my-page/MyPageClient.tsx 전체 검토). 즉 **비로그인 방문자도 이 화면 전체(닫혀 있는 모달의 문구 포함)를 그대로 받는다** — 실제 값이 채워지는 자리(닉네임·이메일)만 빈 문자열로 보일 뿐이다. 이는 이 문서 초안에서 "헤더의 로그인/마이페이지 링크가 로그인 여부에 따라 갈리므로 사실상 로그인 상태에서만 도달한다"고 서술했던 부분을 **정정한다** — 실제로는 URL만 알면 비로그인 상태에서도 화면 자체는 그대로 열리며, 저장·조회 등 실제 동작만 서버 API에서 세션 부재로 거부된다(근거: src/app/api/account/nickname/route.ts 등 각 API의 `getSessionUser()` 401 처리; 확인: `curl "https://pinder-one.vercel.app/my-page"`, 2026-09-18).

## 스크린샷 수동 확보 가이드

이 프로젝트는 이번 세션에서 이미지 스크린샷을 캡처하지 않았다(사유: 위 상단 안내 참고). 채점 등에서 실제 화면 이미지가 필요하다면, 아래 순서대로 사용자가 직접 캡처해 이 문서에 붙여 넣을 수 있다. 파일은 모두 `plan/Hello-plan-docs/assets/` 아래에 저장한다.

| 화면 ID | 열 URL | 만들어야 할 상태 | 캡처 영역 | 저장 파일명 | 붙여넣을 위치 |
|---|---|---|---|---|---|
| SC01 | `https://pinder-one.vercel.app/` | 별도 조작 불필요(비로그인 기본 화면) | 브라우저 전체 화면(히어로+CTA+통계+3단계 섹션) | `SC01-home.png` | 이 문서 "### SC01 홈" 문단 바로 다음 줄에 `![홈](assets/SC01-home.png)` 추가 |
| SC02 | `https://pinder-one.vercel.app/login` | 별도 조작 불필요 | 로그인 폼 전체(이메일-회원가입 링크까지) | `SC02-login.png` | "### SC02 로그인" 문단 다음 줄 |
| SC03 | `https://pinder-one.vercel.app/signup` | 페이지 로딩 완료까지 2-3초 대기(클라이언트 렌더링) | 전체 폼(프로필 사진-약관 동의까지 스크롤 캡처) | `SC03-signup.png` | "### SC03 회원가입" 문단 다음 줄 |
| SC04 | `https://pinder-one.vercel.app/forgot-password` | 별도 조작 불필요 | 이메일 입력 단계 전체 | `SC04-forgot-password.png` | "### SC04 비밀번호 찾기" 문단 다음 줄 |
| SC05 | `https://pinder-one.vercel.app/explore` | 로딩 완료 후(여행지 카드가 채워질 때까지 대기) | 지도+지역 목록+카드 그리드 일부 | `SC05-explore.png` | "### SC05 여행지 탐색" 문단 다음 줄 |
| SC06 | `https://pinder-one.vercel.app/routes` | 로그인 후 접속(빈 상태를 보려면 신규 계정, 실제 목록을 보려면 일정을 하나 이상 저장한 계정) | 탭+카드 목록 또는 빈 상태 화면 | `SC06-routes.png` | "### SC06 내 일정" 문단 다음 줄 |
| SC07 | `https://pinder-one.vercel.app/planner?new=1&mode=manual` | 로그인 후 접속, 방문지를 1곳 이상 추가한 상태 권장(빈 화면도 별도로 캡처 가능) | 좌측 방문지 패널+우측 지도+하단 요약 바가 모두 보이는 전체 화면 | `SC07-planner.png` | "### SC07 경로 플래너" 문단 다음 줄 |
| SC08 | `https://pinder-one.vercel.app/community` | 로그인 후 접속(비로그인 상태의 로그인 유도 모달을 보려면 로그아웃 상태로 별도 캡처) | 툴바+게시물 목록+사이드바 | `SC08-community.png` | "### SC08 커뮤니티" 문단 다음 줄 |
| SC09 | `https://pinder-one.vercel.app/my-page` | 로그인 후 접속 권장(비로그인 상태의 빈 값 화면도 이 문서가 지적한 정정 사항을 보여주는 자료로 유용) | 계정 설정-계정 관리 섹션 전체 | `SC09-my-page.png` | "### SC09 마이페이지" 문단 다음 줄 |

붙여넣는 형식은 이 프로젝트의 원래 지침(`plan/.claude/agents/Hello-plan-writer.md`)에 따라 다음과 같이 한다 — 이미지 줄 바로 아래에 근거를 한 줄 더 남긴다:

```
![<화면명>](assets/<파일명>.png)
(근거: <라우트 경로>, <캡처한 날짜와 시각>)
```

> 문서: design-abstract.md · 출처: pinder screen design (HTML, `C:\pinder\legacy`) · 마지막 갱신: 2026-09-16

## 화면 목록
| 화면 | 코드 근거(컴포넌트·id/class) |
|---|---|
| 로그인 | `Login Screen.dc.html`, `<div class="pd-fade pd-login-wrap">`, `class Component extends DCLogic` |
| 회원가입 | `Signup Screen.dc.html`, `<div class="pd-fade">`(폼 컨테이너) |
| 회원가입 - 약관 상세 모달 | `sc-if value="{{ termsModalOpen }}"` |
| 메인(홈) | `main(home).dc.html`, `<div class="pd-fade">`(헤더+히어로+CTA+3단계+푸터) |
| 메인(홈) - 알림 드롭다운 | `sc-if value="{{ notificationsOpen }}"` |
| 메인(홈) - 모바일 메뉴 드롭다운 | `class="pd-mobile-menu-wrap"`, `sc-if value="{{ mobileMenuOpen }}"` |
| 여행지 탐색 | `Explore Destinations.dc.html` / `Explore Destinations (Mobile).dc.html`, `data-screen-label="여행지 탐색"` |
| 여행지 탐색 - 새 일정 만들기 모달 | `sc-if value="{{ newTripModalOpen }}"` |
| 여행지 탐색 - 모바일 메뉴 드롭다운 | `class="ed-mobile-menu-wrap"` |
| 내 일정 | `My Routes.dc.html` / `My Routes (Mobile).dc.html`, `data-screen-label="내 일정"` |
| 내 일정 - 모바일 메뉴 드롭다운 | `class="mr-mobile-menu-wrap"` |
| 내 일정 - 생성 방식 선택 모달 | `sc-if value="{{ modeSelectModalOpen }}"` |
| 내 일정 - 새 일정 만들기 모달 | `sc-if value="{{ newTripModalOpen }}"` |
| 내 일정 - 삭제 확인 모달 | `sc-if value="{{ deleteConfirmOpen }}"` |
| 내 일정 - 토스트 | `sc-if value="{{ toastVisible }}"` |
| 경로 플래너 메인 | `Route Planner App.dc.html`, `<div class="rp-shell" data-screen-label="경로 플래너 메인">` |
| 경로 플래너 - 새 일정 날짜 모달 | `sc-if value="{{ newTripDateModalOpen }}"` |
| 경로 플래너 - 권한 관리 모달 | `sc-if value="{{ permissionsModalOpen }}"` |
| 경로 플래너 - 권한 요청 확인 모달 | `sc-if value="{{ requestConfirmOpen }}"` |
| 경로 플래너 - 로그인 필요 모달 | `sc-if value="{{ loginRequiredModalOpen }}"` |
| 경로 플래너 - 내 일정 드로어 | `myRoutesDrawerTransform`, `toggleMyRoutes` |
| 경로 플래너 - 활동 로그 드로어 | `sc-if value="{{ activityLogOpen }}"`, `logDrawerTransform` |
| 경로 플래너 - 방문지 수정 팝업 | `sc-if value="{{ editModalOpen }}"` |
| 경로 플래너 - 카테고리 선택 팝업 | `sc-if value="{{ categoryModalOpen }}"` |
| 경로 플래너 - 방문지 추가 확인 팝업 | `sc-if value="{{ addConfirmOpen }}"` |
| 경로 플래너 - 상황 변경(변수 추가) 팝업 | `sc-if value="{{ situationModalOpen }}"` |
| 경로 플래너 - 삭제 확인 팝업 | `sc-if value="{{ deleteConfirmOpen }}"` |
| 경로 플래너 - AI 도우미 패널 | `class="rp-ai-panel"`, `aiOpen` |
| 경로 플래너 - 지도 검색 오버레이 | `sc-if value="{{ searchMode }}"` |
| AI 일정 생성 | `AI Schedule Planner.dc.html`, `<div class="pd-fade aip-wrap" data-screen-label="AI 일정 생성">` |
| 커뮤니티 | `Community.dc.html` / `Community (Mobile).dc.html`, `data-screen-label="커뮤니티"` |
| 커뮤니티 - 프로필 설정 모달 | `sc-if value="{{ myProfileEditOpen }}"` |
| 커뮤니티 - 글쓰기/수정 팝업 | `sc-if value="{{ composerOpen }}"` |
| 커뮤니티 - 댓글 상세 팝업 | `sc-if value="{{ commentModalPost }}"` |
| 커뮤니티 - 삭제 확인 팝업 | `sc-if value="{{ deleteConfirmOpen }}"` |
| 마이페이지 | `My Page.dc.html`, `<div style="min-height:100vh">`(계정/서비스/계정관리 섹션) |
| 마이페이지 - 닉네임 수정 모달 | `sc-if value="{{ editNicknameOpen }}"` |
| 마이페이지 - 알림 설정 모달 | `sc-if value="{{ notificationSettingsOpen }}"` |
| 마이페이지 - 약관 및 개인정보 모달 | `sc-if value="{{ termsOpen }}"` |
| 마이페이지 - 회원 탈퇴 모달 | `sc-if value="{{ withdrawOpen }}"`(단계: blocked/finalWarning/confirm/success) |
| 마이페이지 - 닉네임 저장 토스트 | `sc-if value="{{ nicknameSavedToast }}"` |
| Canvas(빈 캔버스) | `Canvas.dc.html`, `<x-dc></x-dc>` 내부 내용 없음 |
| 모바일 프리뷰 도구 | `Community Mobile Preview.dc.html`, 모드/페이지 선택 버튼 + iframe 미리보기 |
| 레퍼런스 와이어프레임 모음 | `레퍼런스..dc.html`, `.dv-turn#t1`, 옵션 카드 `#1a`~`#1e2`(정적 목업) |

## 요소
| 화면 | 요소(종류) | 라벨/텍스트 |
|---|---|---|
| 로그인 | 아이콘 버튼 | 테마 전환(`title="테마 전환"`, `☀`/문 이미지) |
| 로그인 | 로고 링크 | `p:nder`(href=`./main(home).dc.html`) |
| 로그인 | 서브 텍스트 | `로그인하고 최적의 동선을 만들어보세요` |
| 로그인 | 입력 | 이메일(`placeholder="you@example.com"`) |
| 로그인 | 입력 | 비밀번호(`placeholder="비밀번호를 입력하세요"`) |
| 로그인 | 에러 텍스트 | `{{ error }}` |
| 로그인 | 체크박스 | `아이디 저장` |
| 로그인 | 링크 | `비밀번호를 잊으셨나요?`(href=`#`) |
| 로그인 | 버튼(submit) | `로그인` |
| 로그인 | 구분 텍스트 | `또는` |
| 로그인 | 슬롯 | Google 로그인 버튼(`#google-login-btn-slot`) |
| 로그인 | 에러 텍스트 | `{{ googleError }}` |
| 로그인 | 안내 텍스트 | `{{ googleUser }}(으)로 로그인되었습니다` |
| 로그인 | 링크 | `회원가입`(href=`./Signup Screen.dc.html`) |
| 회원가입 | 아이콘 버튼 | 테마 전환 |
| 회원가입 | 로고 링크 | `p:nder`(href=`./main(home).dc.html`) |
| 회원가입 | 서브 텍스트 | `회원가입하고 나만의 여행 동선을 만들어보세요!` |
| 회원가입 | 이미지 슬롯+아이콘 버튼 | 프로필 사진 + 연필(편집) 아이콘 |
| 회원가입 | 버튼(2, `avatarActionsOpen`일 때) | `Replace` / `Edit` |
| 회원가입 | 입력 | 이름(`placeholder="실명을 입력해주세요"`) |
| 회원가입 | 입력+버튼 | 아이디(`placeholder="영문, 숫자 조합 4~16자"`) + `중복확인`/`확인 완료` |
| 회원가입 | 상태 텍스트 | 아이디 확인 결과 메시지 |
| 회원가입 | 입력+버튼 | 별명(`placeholder="다른 여행자에게 보여질 이름이에요"`) + `중복확인`/`확인 완료` |
| 회원가입 | 상태 텍스트 | 닉네임 확인 결과 메시지 |
| 회원가입 | 입력+버튼 | 이메일(`placeholder="you@example.com"`) + `인증번호 받기`/`재전송`/`이메일 변경` |
| 회원가입 | 안내 텍스트 | `이메일 인증이 완료되었습니다.` |
| 회원가입 | 입력+버튼(`codeStepVisible`일 때) | 인증번호 6자리 + `인증하기` |
| 회원가입 | 텍스트+링크 | 인증 상태 메시지 + `인증번호 재전송`/`재전송 (Ns)` |
| 회원가입 | 입력+아이콘 | 비밀번호(`placeholder="영문, 숫자, 특수문자 포함 8자 이상"`) + 표시/숨김 눈 아이콘 |
| 회원가입 | 힌트 텍스트 | 비밀번호 규칙/부족 안내 |
| 회원가입 | 입력+아이콘 | 비밀번호 확인(`placeholder="비밀번호를 다시 입력해주세요"`) + 눈 아이콘 |
| 회원가입 | 경고 텍스트 | `비밀번호가 일치하지 않습니다.` |
| 회원가입 | 에러 텍스트 | `{{ error }}` |
| 회원가입 | 체크박스 | `약관 전체 동의` + 펼침 화살표(`⌄`) |
| 회원가입 | 체크박스(목록 3) | `[필수] 이용약관 동의` / `[필수] 개인정보 수집·이용 동의` / `[선택] 마케팅 정보 수신 동의` + 상세보기 `›` |
| 회원가입 | 요약 텍스트(접힘 상태) | `{{ termsSummaryText }}` |
| 회원가입 | 버튼(submit) | `회원가입` |
| 회원가입 | 링크 | `로그인`(href=`./Login Screen.dc.html`) |
| 회원가입 - 약관 상세 모달 | 제목 | `{{ termsModalTitle }}` |
| 회원가입 - 약관 상세 모달 | 본문 | `{{ termsModalBody }}` |
| 회원가입 - 약관 상세 모달 | 버튼 | `확인` |
| 메인(홈) | 로고 | 애니메이션 개미 아이콘 + `p:nder` |
| 메인(홈) | 내비게이션 링크(3) | `여행지 탐색` / `내 일정` / `커뮤니티` |
| 메인(홈) | 아이콘 버튼 | 테마 전환 |
| 메인(홈) | 아이콘 버튼 | 알림(`title="알림"`, 안읽음 배지 dot) |
| 메인(홈) | 버튼(링크) | `로그인`(href=`./Login Screen.dc.html`) |
| 메인(홈) | 아이콘 버튼 | 모바일 메뉴 토글 `☰` |
| 메인(홈) | 배지 | `AI 기반 동선 플래너` |
| 메인(홈) | 제목 | `최적의 동선, p:nder와 함께` |
| 메인(홈) | 서브 텍스트 | `목적지를 입력하면 최적화된 일정과 이동 동선을 자동으로 생성해드립니다.` |
| 메인(홈) | CTA 카드 | 제목 `지금 바로 시작하세요` / 서브 `무료로 나만의 여행 일정을 만들어보세요` / 버튼(링크) `최적 동선 생성하기 →`(href=`./My Routes.dc.html`) |
| 메인(홈) | 통계(3) | `128,400+ 만족한 횟수` / `2,300+ 이용 누적 수` / `21,904+ 만족한 개발자` |
| 메인(홈) | 섹션 제목 | `단 3단계로 완성되는 최적의 동선` |
| 메인(홈) | 스텝 카드(3) | `01 장소 입력` / `02 최적 경로 생성` / `03 일정에 맞게 수정` |
| 메인(홈) | 푸터 | 로고 + `© 2026 p:nder made by team_hello` |
| 메인(홈) - 알림 드롭다운 | 오버레이 | (텍스트 없음, 배경 클릭용) |
| 메인(홈) - 알림 드롭다운 | 알림 항목(목록) | `{{ nt.text }}`(예: `유수님이 「제주 3박4일」에 댓글을 남겼어요.`) |
| 메인(홈) - 모바일 메뉴 드롭다운 | 메뉴 링크(4) | `여행지 탐색` / `내 일정` / `커뮤니티` / `로그인` |
| 메인(홈) - 모바일 메뉴 드롭다운 | 항목(비활성) | 알림 아이콘 + `알림` |
| 여행지 탐색 | 로고 링크 | `p:nder`(href=`./main(home).dc.html`) |
| 여행지 탐색 | 내비게이션 링크(3) | `여행지 탐색`(활성) / `내 일정` / `커뮤니티` |
| 여행지 탐색 | 아이콘 버튼 | 테마 전환 |
| 여행지 탐색 | 아이콘 버튼(모바일) | 모바일 메뉴 토글(데스크톱 `···`, 모바일 햄버거 svg) |
| 여행지 탐색 | 제목+안내문 | `여행지 탐색` / `지도의 핀이나 아래 목록에서 지역을 눌러 여행지를 추천받아보세요` |
| 여행지 탐색 | 헤더(모바일 전용) | `지역 선택` + 펼침/접힘 아이콘(`▴`/`▾`) |
| 여행지 탐색 | 목록 항목(`전체`+지역 17개) | `전체`, `{{ mr.label }}`(서울/강원/경기 등) |
| 여행지 탐색 | 지도 이미지+핀(17) | `대한민국 지도`(`korea-map.svg`) + 지역 라벨 핀 |
| 여행지 탐색 | 섹션 페이지네이션(6개 초과 시) | `‹` / `{{ section.pageLabel }}` / `›` |
| 여행지 탐색 | 여행지 카드(목록) | 이미지 슬롯+배지(`드라이브`/`급상승`) + 이름 + 지역 + 설명 + 태그칩 + `이 여행지로 일정 짜기 →` |
| 여행지 탐색 | 빈 상태 텍스트 | `이 지역의 추천 여행지가 아직 없어요` |
| 여행지 탐색 - 새 일정 만들기 모달 | 닫기 아이콘 | `×`(SVG) |
| 여행지 탐색 - 새 일정 만들기 모달 | 제목+안내 | `새 일정 만들기` / `여행 날짜를 입력해주세요` |
| 여행지 탐색 - 새 일정 만들기 모달 | 입력(2) | `시작 날짜`(date) / `종료 날짜`(date, min=시작일) |
| 여행지 탐색 - 새 일정 만들기 모달 | 버튼/링크 | `취소` / `시작하기`(링크) |
| 여행지 탐색 - 모바일 메뉴 드롭다운 | 메뉴 링크(4) | `여행지 탐색` / `내 일정` / `커뮤니티` / `로그인` |
| 내 일정 | 로고 링크 | `p:nder`(href=`./main(home).dc.html`) |
| 내 일정 | 내비게이션 링크(3) | `여행지 탐색` / `내 일정`(활성) / `커뮤니티` |
| 내 일정 | 아이콘 버튼 | 테마 전환 / 모바일 메뉴 토글 `☰` |
| 내 일정 | 제목+서브 | `내 일정` / `저장해둔 동선을 확인하고 이어서 계획할 수 있어요` |
| 내 일정 | 버튼 | `＋ 새 일정` |
| 내 일정 | 탭(2, `hasRoutes`) | `예정된 일정 (n)` / `완료된 일정 (n)` |
| 내 일정 | 카드(목록) | 제목(클릭시 인라인 편집) + 날짜·방문지 수(클릭시 인라인 달력 편집) + 멤버 아바타 + 장소 칩(최대3+더보기) + `열기`(링크) + 삭제 아이콘 |
| 내 일정 | 페이지네이션 | `‹` / 페이지 번호 / `›` |
| 내 일정 | 빈 상태 | `＋` 아이콘 / `저장된 일정이 없어요` / 안내문 / `새 일정 만들기` 버튼 |
| 내 일정 - 모바일 메뉴 드롭다운 | 메뉴 링크(4) | `여행지 탐색` / `내 일정` / `커뮤니티` / `로그인` |
| 내 일정 - 생성 방식 선택 모달 | 제목+옵션 카드(2) | `어떻게 일정을 만들까요?` / `직접 생성하기` / `AI 생성하기` |
| 내 일정 - 새 일정 만들기 모달 | 제목+아이콘+달력+라벨+버튼 | `새 일정 만들기` / 날짜 초기화 아이콘 / 월 이동(‹›)+요일+날짜 그리드 / `출발 날짜`·`도착 날짜` 라벨 / `취소` / `시작하기`(링크) |
| 내 일정 - 삭제 확인 모달 | 제목+본문+안내+버튼 | `내 일정에서 삭제하시겠습니까?` / `내 일정 목록에서만 제거됩니다.` / 공유본 미삭제 안내 2줄 / `취소` / `내 일정에서 삭제` |
| 내 일정 - 토스트 | 아이콘+텍스트 | 체크 SVG + `{{ toastMsg }}` |
| 경로 플래너 메인 | 로고 링크 | `p:nder`(href=`./main(home).dc.html`) |
| 경로 플래너 메인 | 아이콘 버튼 | 테마 전환 / 패널 접기 `«` |
| 경로 플래너 메인 | 버튼(2, `canManageInvite`) | `권한 관리` / `+ 일행 초대` |
| 경로 플래너 메인 | Dev Role 칩(4, 테스트용) | `Creator` / `Editor` / `Viewer` / `Saved Viewer` |
| 경로 플래너 메인 | 세그먼트(2) | 경로 기준 `최단시간` / `최단거리` |
| 경로 플래너 메인 | 칩(4) | 이동수단 일괄 적용 `자동차` / `도보` / `대중교통` / `자전거` |
| 경로 플래너 메인 | 경고 배너(`urgentPushedBack`) | `{{ urgentPushedLabel }}`(급한 방문지가 뒤로 밀렸어요) |
| 경로 플래너 메인 | 헤더+select+텍스트+버튼 | `방문지 목록 (n)` / 일차 선택(`hasDayTabs`) / `드래그로 순서 변경` / `전체 삭제` |
| 경로 플래너 메인 | 빈 상태 | `＋` 아이콘 / `아직 방문지가 없어요` / 안내문 |
| 경로 플래너 메인 | 방문지 카드(목록) | 순서 번호 + 이름 + 메모 아이콘 + 주소 + (펼침시) 카카오맵 길찾기 링크·카테고리 칩·메모 입력+저장·체류시간 −/+·수정 아이콘 + 삭제 아이콘 + 펼침 화살표 |
| 경로 플래너 메인 | 구간(커넥터, 목록) | 이동수단 칩(아이콘+라벨+시간·거리) + 펼침 화살표 + (펼침시) 단계별 상세(도보→버스/지하철 등) |
| 경로 플래너 메인 | 입력+select+버튼 | 주소 검색(`placeholder="주소를 검색하여 추가하기"`) + 일차 select + `추가` |
| 경로 플래너 메인 | 지도 영역 | Kakao 지도(또는 mock 오버레이) + 방문지 핀(순번) + 경로 폴리라인 |
| 경로 플래너 메인 | 로딩 오버레이 | `동선 재계산 중...` |
| 경로 플래너 메인 | 요약 바 | `총 방문지`/`총 이동거리`/`총 이동시간` + 버튼: `원본 삭제`(canDeleteOriginal) / `변수 추가`(canEdit) / `활동 로그` / `저장`·`저장됨`·`내 일정에 저장`·`내 일정에서 제거` / `편집 권한 요청`(viewer) / `승인 대기 중` 표시 / `경로 계산`(canEdit) |
| 경로 플래너 메인 | FAB 버튼 | `✨ AI 도우미` |
| 경로 플래너 메인 | 토스트 | `{{ toastMsg }}` |
| 경로 플래너 - 새 일정 날짜 모달 | 제목+안내+입력(2)+버튼 | `새 일정 만들기` / `여행 날짜를 입력해주세요` / `시작 날짜`·`종료 날짜`(date) / `시작하기` |
| 경로 플래너 - 권한 관리 모달 | 제목+목록(2) | `권한 관리` / 편집 가능한 일행 목록(`{{ mb.nickname }}님`) / 편집 권한 요청 목록(닉네임 + `승인`/`거절`) |
| 경로 플래너 - 권한 요청 확인 모달 | 메시지+버튼(2) | `{{ requestConfirmMessage }}` / `취소` / `수락`or`거절` |
| 경로 플래너 - 로그인 필요 모달 | 안내문+링크(2) | `내 일정에 저장하려면 로그인이 필요해요` / `로그인` / `회원가입` |
| 경로 플래너 - 내 일정 드로어 | 제목+카드(목록)+빈 상태 | `내 일정` / 저장된 일정 카드(이름/저장일·개수, ✕ 삭제) / `저장된 일정이 없어요` 안내 |
| 경로 플래너 - 활동 로그 드로어 | 제목+입력+목록+빈 상태 | `활동 로그` / 닉네임 입력 / 로그 항목(텍스트+시각) / `아직 활동 내역이 없어요` |
| 경로 플래너 - 방문지 수정 팝업 | 제목+입력(2)+버튼 | `방문지 수정` / `이름`·`주소` / `취소` / `저장` |
| 경로 플래너 - 카테고리 선택 팝업 | 제목+칩(6) | `카테고리 선택` / `카페·베이커리`/`식당`/`쇼핑`/`관광명소`/`생활서비스`/`기타` |
| 경로 플래너 - 방문지 추가 확인 팝업 | 제목+입력(2)+버튼 | `방문지를 추가할까요?` / `이름`·`주소` / `취소` / `추가` |
| 경로 플래너 - 상황 변경 팝업 | 제목+옵션(4)+하위옵션+버튼 | `변수 추가` / `짐 추가`·`기상 변화`·`일정 지연`·`교통 상황 악화` / (날씨 선택시) `비`·`눈`·`태풍` / 힘듦 정도 `조금 불편`·`보통`·`매우 불편` / `취소` / `동선 재계산` |
| 경로 플래너 - 삭제 확인 팝업 | 메시지+(원본삭제시) 경고+체크박스+버튼 | `{{ deleteConfirmMessage }}` / 경고 3줄(전체 계정 삭제 등) / `정말 삭제할 건지 확인했습니다` / 취소·삭제 |
| 경로 플래너 - AI 도우미 패널 | 제목+안내+컨텍스트+대화+입력 | `✨경로 AI` / `경로 계획을 도와드릴게요` / `현재 경로 · {{ aiContextLabel }}` / 메시지 목록(추천 칩 포함) / 입력+`전송` |
| 경로 플래너 - 지도 검색 오버레이 | 입력+버튼+결과 | 검색 입력(`placeholder="장소명 또는 주소를 검색하세요"`) + 검색 버튼 + 지우기(×) + 로딩/에러/결과 리스트 + 선택 카드+`이 장소 선택` |
| AI 일정 생성 | 로고+링크 | `p:nder`(href=`./main(home).dc.html`) / `나가기`(href=`./My Routes.dc.html`) |
| AI 일정 생성 | 진행 점(5) | (step<=5일 때 표시) |
| AI 일정 생성 | Step0 캘린더 | `여행 날짜를 알려주세요` / 월 이동(‹›) / 요일 라벨 / 날짜 셀 / 범위 안내 텍스트 |
| AI 일정 생성 | Step1 지역 칩(18) | `서울`~`제주`, `기타`(선택시 커스텀 입력) |
| AI 일정 생성 | Step2 스타일 칩(4) | `여유롭게` / `알차게` / `인기 장소 위주` / `조용하게` |
| AI 일정 생성 | Step3 관심사 칩(7, 다중선택) | `맛집`/`카페`/`관광`/`쇼핑`/`자연`/`문화`/`체험` |
| AI 일정 생성 | Step4 동행 칩(4) | `혼자`/`연인`/`친구`/`가족` |
| AI 일정 생성 | Step5 이동방식 칩(4) | `도보`/`대중교통`/`자동차`/`자전거` |
| AI 일정 생성 | Step6 생성중 | 스피너 + `AI가 최적의 일정을 만들고 있어요...` |
| AI 일정 생성 | Step7 결과 | 요약문 + 통계(방문 장소/총 이동시간/총 이동거리) + 장소 리스트(순서·이름·카테고리·체류시간·다음 이동수단) + 버튼 `다시 추천받기`/`이 일정으로 시작하기` |
| AI 일정 생성 | 하단 내비 | `뒤로`(step>0) / `다음`·`AI 일정 생성하기` |
| 커뮤니티 | 로고+내비게이션(3) | `p:nder` / `여행지 탐색`/`내 일정`/`커뮤니티`(활성) |
| 커뮤니티 | 아이콘 버튼 | 테마 전환 / 모바일 메뉴 토글 |
| 커뮤니티 | 제목+안내+검색 | `커뮤니티` / 안내문 / 검색 입력(`placeholder="게시글 키워드로 검색..."`) |
| 커뮤니티 | 지역 목록(`전체`+18) | 지역 필터 항목 (모바일은 `지역 선택` 토글 헤더 추가) |
| 커뮤니티 | 정렬 옵션(3) | `인기순`/`최신순`/`오래된순` |
| 커뮤니티 | 보기 전환 | `목록` / `사진` |
| 커뮤니티 | 프로필 보기 바 | 뒤로가기(←) + 아바타 + 이름 + `게시물 N개` + (본인) `저장` 토글 / `프로필 설정` |
| 커뮤니티 | 빈 상태 텍스트 | `{{ noPostsMessage }}`(검색결과 없음/게시물 없음) |
| 커뮤니티 | 그리드뷰 썸네일(목록) | 게시물 사진 슬롯 |
| 커뮤니티 | 리스트뷰 게시물 카드(목록) | 작성자 아바타/이름 + 장소·시간 + (본인) `수정`/`삭제` + 사진 + 좋아요(하트+수) + 댓글 버튼(수) + 북마크 + 캡션(#태그 강조) + 태그칩 + 댓글 목록(좋아요/답글) + `댓글 더보기`/`댓글 접기` + 댓글 입력+게시 |
| 커뮤니티 | 버튼(`hasMore`) | `더보기` |
| 커뮤니티 | 사이드바 | `이번 주 인기 여행지` 랭킹(3) + `추천 태그` 칩(5) + `여행 후기 쓰기` 버튼 |
| 커뮤니티 - 프로필 설정 모달 | 제목+아바타+입력+버튼 | `커뮤니티 프로필 설정` / 프로필 사진 / 닉네임 입력 / `취소` / `저장` |
| 커뮤니티 - 글쓰기/수정 팝업 | 제목+사진+입력(3)+버튼 | `여행 후기 쓰기`/`후기 수정` / 사진 슬롯 / `여행지`·`지역`(select)·`감상평`(textarea, #태그 미리보기) / `취소` / `게시` |
| 커뮤니티 - 댓글 상세 팝업 | 사진+작성자+캡션+댓글목록+좋아요바+입력 | 사진 / 작성자 정보 / 캡션 / 전체 댓글(좋아요/답글) / 좋아요 바 / 댓글 입력+게시 |
| 커뮤니티 - 삭제 확인 팝업 | 메시지+버튼 | `삭제하시겠습니까?` / `삭제한 게시물은 되돌릴 수 없어요` / `취소` / `삭제` |
| 마이페이지 | 로고+아이콘 버튼 | `p:nder`(href=`./main(home).dc.html`) / 테마 전환 |
| 마이페이지 | 링크 | `← 홈으로`(href=`./main(home).dc.html`) |
| 마이페이지 | 제목+안내 | `마이페이지` / `내 계정과 서비스 설정을 관리해요` |
| 마이페이지 | 프로필 카드 | 아바타(image-slot)+편집 아이콘 + 닉네임 + 이메일 |
| 마이페이지 | 계정 설정 행(2) | `닉네임`(클릭시 수정) / `이메일`(읽기 전용) |
| 마이페이지 | 서비스 설정 행(2) | `알림 설정` / `약관 및 개인정보` |
| 마이페이지 | 계정 관리 행 | `회원 탈퇴`(위험색) |
| 마이페이지 - 닉네임 수정 모달 | 제목+입력+버튼+메시지 | `닉네임 수정` / 닉네임 입력 + `중복 확인`/`확인 중...` / 결과 메시지 / `취소` / `저장` |
| 마이페이지 - 알림 설정 모달 | 제목+항목(6)+버튼 | `알림 설정` / 일정·일정 시작·동선·커뮤니티·좋아요·서비스 소식 알림(제목+설명+토글) / `확인` |
| 마이페이지 - 약관 및 개인정보 모달 | 제목+섹션(3) | `약관 및 개인정보` / 이용약관·개인정보 처리방침·위치기반서비스 이용약관(제목+본문) / `확인` |
| 마이페이지 - 회원 탈퇴 모달(blocked) | 안내+목록+체크박스+버튼 | `탈퇴하기 전에 확인해주세요` / Creator 소유 일정 목록 / 동의 체크박스 / `취소` / `확인` |
| 마이페이지 - 회원 탈퇴 모달(finalWarning) | 경고문+체크박스+에러+버튼 | `회원 탈퇴 시 모든 일정, 기록들은 소멸되며...` / 동의 체크박스 / 실패 안내 / `계속 사용할래요.` / `네, 탈퇴할게요.` |
| 마이페이지 - 회원 탈퇴 모달(confirm) | 안내+체크박스+에러+버튼 | `정말 탈퇴하시겠어요?` / 동의 체크박스 / 실패 안내 / `뒤로가기` / `회원 탈퇴` |
| 마이페이지 - 회원 탈퇴 모달(success) | 완료 안내 | `회원 탈퇴가 완료되었습니다` / `로그인 화면으로 이동할게요.` |
| 마이페이지 - 닉네임 저장 토스트 | 아이콘+텍스트 | 체크 아이콘 + `닉네임이 변경되었어요.` |
| 모바일 프리뷰 도구 | 버튼(모드 3) | `Desktop` / `375px` / `390px` |
| 모바일 프리뷰 도구 | 버튼(페이지 9) | `Main (Home)`/`Community`/`Explore`/`My Routes`/`Route Planner`/`Login`/`Signup`/`AI Schedule Planner`/`My Page` |
| 모바일 프리뷰 도구 | 안내 텍스트 | `{{ widthLabel }} — PC 버전 파일(Community.dc.html)은 수정되지 않습니다...` |
| 모바일 프리뷰 도구 | 프레임 | iframe 미리보기(선택 페이지/너비 반영) |
| 레퍼런스 와이어프레임 모음 | 옵션 카드(정적 목업, `#1a`~`#1e2`) | 단계별 마법사(3단계) / 지도+리스트 분할 대시보드 / 카드 드래그 재정렬+체크인 / 표(스프레드시트)형 대량 입력+리포트 / 대화형 도우미(챗봇) |

## 상호작용
| 화면 | 요소 | 트리거 | 동작(코드상 함수/핸들러) | 결과(코드상 변화) |
|---|---|---|---|---|
| 로그인 | 테마 전환 아이콘 | 클릭 | `toggleTheme` | `state.theme` light/dark 토글, `localStorage['pd-theme']` 저장 |
| 로그인 | 이메일 입력 | 입력 | `onEmailChange` | `state.email` 갱신, `error` 초기화, `saveId`면 `localStorage['pd-saved-id']` 갱신 |
| 로그인 | 비밀번호 입력 | 입력 | `onPasswordChange` | `state.password` 갱신, `error` 초기화 |
| 로그인 | `아이디 저장` 체크박스 | 클릭 | `onToggleSaveId` | `saveId` 토글, `localStorage['pd-saved-id']` 저장/삭제 |
| 로그인 | `로그인` 버튼(submit) | 클릭 | `handleSubmit` | 미입력시 에러; `localStorage['pnder-users']`에서 계정 조회 실패시 에러; 성공시 `window.location.href='./Route Planner App.dc.html'` |
| 로그인 | (진입시) | `componentDidMount` | `ensureGoogleButtonRendered` | Google Identity Services 버튼 렌더링(미로드시 300ms 간격 재시도) |
| 로그인 | Google 로그인 버튼 | 콜백 | `onGoogleAuthSuccess` | `sessionStorage['pnder_google_logged_in']='1'` 저장, 0.5초 후 `./Route Planner App.dc.html`로 이동 |
| 로그인 | 로고/`회원가입` 링크 | 클릭 | `<a href>` | 각각 `main(home).dc.html`/`Signup Screen.dc.html`로 이동 |
| 회원가입 | 테마 전환 아이콘 | 클릭 | `toggleTheme` | theme 토글, localStorage 저장 |
| 회원가입 | 아바타 연필 아이콘 | 클릭 | `onAvatarPencilClick` | `avatarActionsOpen` 토글 |
| 회원가입 | `Replace` | 클릭 | `onAvatarReplace` | image-slot의 `openFilePicker()` 호출 |
| 회원가입 | `Edit` | 클릭 | `onAvatarEdit` | image-slot에 `dblclick` 이벤트 디스패치 |
| 회원가입 | 이름/닉네임/이메일/비밀번호/비밀번호확인 입력 | 입력 | 각 `onXChange` | 해당 state 갱신, `error` 초기화 |
| 회원가입 | 아이디 `중복확인` | 클릭 | `checkUsername` | 4자 미만시 invalid, 0.5초 후 `TAKEN_USERNAMES` 대조해 available/taken 표시 |
| 회원가입 | 닉네임 `중복확인` | 클릭 | `checkNickname` | 2자 미만시 invalid, 0.5초 후 `TAKEN_NICKNAMES` 대조해 available/taken 표시 |
| 회원가입 | `인증번호 받기`/`재전송` | 클릭 | `sendEmailCode` | `EmailVerificationService.sendCode`(mock, 6자리 코드 console 출력) 호출, 코드 입력 UI 표시, 60초 재전송 쿨다운, 300초 후 만료 처리 |
| 회원가입 | 인증번호 입력 | 입력 | `onEmailCodeChange` | 숫자만 허용해 `emailCode` 갱신 |
| 회원가입 | `인증하기` | 클릭 | `verifyEmailCode` | `EmailVerificationService.verifyCode` 호출, 성공시 `emailVerified=true`, 실패시 사유별 에러 메시지 |
| 회원가입 | `이메일 변경` | 클릭 | `onEmailChangeRequest` | `emailVerified=false`, 인증 관련 상태 초기화 |
| 회원가입 | 비밀번호/비밀번호확인 눈 아이콘 | 클릭 | `togglePasswordVisible`/`togglePasswordConfirmVisible` | input type text/password 전환 |
| 회원가입 | `약관 전체 동의` 체크박스 | 클릭 | `toggleAllTerms` | 전체 약관 체크 여부 토글 |
| 회원가입 | 개별 약관 체크박스 | 클릭 | `toggleTerm(key)` | 해당 약관 체크 토글 |
| 회원가입 | 약관 섹션 헤더 | 클릭 | `toggleTermsSectionOpen` | 약관 목록 펼침/접힘 |
| 회원가입 | 약관 `›` | 클릭 | `openTermsModal(key)` | 약관 상세 모달 열림 |
| 회원가입 | 약관 상세 모달 `확인` | 클릭 | `closeTermsModal` | 모달 닫힘 |
| 회원가입 | `회원가입`(submit) | 클릭 | `handleSubmit` | 미입력/8자 미만 비밀번호/아이디 미확인/이메일 미인증/비밀번호 불일치/필수약관 미동의시 에러; 통과시 `localStorage['pnder-users']`에 계정 추가 후 `./Route Planner App.dc.html`로 이동 |
| 메인(홈) | 테마 전환 아이콘 | 클릭 | `toggleTheme` | theme 토글, localStorage 저장 |
| 메인(홈) | 알림 아이콘 | 클릭 | `toggleNotifications` | `notificationsOpen` 토글; 열 때 모든 알림 `read:true`로 일괄 변경 |
| 메인(홈) | 알림 드롭다운 오버레이 | 클릭 | `closeNotificationsFromOverlay` | `stopPropagation` 후 `notificationsOpen=false` |
| 메인(홈) | 모바일 메뉴 `☰` | 클릭 | `toggleMobileMenu` | `mobileMenuOpen` 토글 |
| 메인(홈) | 모바일 메뉴 오버레이 | 클릭 | `toggleMobileMenu`(재사용) | 드롭다운 닫힘 |
| 메인(홈) | `최적 동선 생성하기 →` | 클릭 | `<a href="./My Routes.dc.html">` | 페이지 이동 |
| 메인(홈) | `로그인` 버튼 | 클릭 | `<a href="./Login Screen.dc.html">` | 페이지 이동 |
| 메인(홈) | 네비게이션 링크(3) | 클릭 | `<a href>` | 각각 Explore/My Routes/Community로 이동 |
| 여행지 탐색 | 지역 지도 핀/목록 항목 | 클릭 | `mr.onSelect`→`selectRegion(key)` | `activeRegion` 설정, 해당 지역 카드만 필터링, 핀/목록 활성 스타일 변경 |
| 여행지 탐색 | `전체` | 클릭 | `selectAll` | `activeRegion=null` |
| 여행지 탐색(모바일) | `지역 선택` 헤더 | 클릭 | `toggleRegionCollapsed` | `regionCollapsed` 토글, 지역 목록 펼침/접힘(데스크톱 버전에는 이 토글 없음 — 항상 펼침) |
| 여행지 탐색 | 카드 `이 여행지로 일정 짜기 →` | 클릭 | `<a href="{{ dest.planHref }}">` | `./Route Planner App.dc.html?destination=<이름>`으로 이동 |
| 여행지 탐색 | 섹션 페이지네이션 `‹`/`›` | 클릭 | `section.onPrevPage`/`onNextPage` | `sectionPages[si]` 갱신, 카드 페이지 전환 |
| 여행지 탐색 | 모바일 메뉴 토글 | 클릭 | `toggleMobileMenu` | 드롭다운 표시/숨김 |
| 여행지 탐색 - 새 일정 만들기 모달 | 시작/종료 날짜 입력 | 변경 | `onNewTripStartDateChange`/`onNewTripEndDateChange` | 날짜 갱신(종료일<시작일이면 시작일로 보정) |
| 여행지 탐색 - 새 일정 만들기 모달 | `취소` | 클릭 | `closeNewTripModal` | 모달 닫힘 |
| 여행지 탐색 - 새 일정 만들기 모달 | `시작하기` | 클릭 | `<a href="{{ newTripHref }}">` | `./Route Planner App.dc.html?new=1&tripStart=...&tripEnd=...`로 이동 |
| 여행지 탐색 | 새 일정 모달을 여는 요소 | — | `openNewTripModal` 정의됨 | 템플릿에서 이를 호출하는 클릭 요소를 찾지 못함 `[?]` |
| 내 일정 | 테마 전환 아이콘 | 클릭 | `toggleTheme` | theme 토글, localStorage 저장 |
| 내 일정 | 모바일 메뉴 `☰` | 클릭 | `toggleMobileMenu` | 드롭다운 토글 |
| 내 일정 | `＋ 새 일정` | 클릭 | `openNewTripModal` | `modeSelectModalOpen=true`, 날짜 초기화 → 생성 방식 선택 모달 표시 |
| 내 일정 | 상태 탭(예정/완료) | 클릭 | `onSetStatusTab(tab)` | `statusTab` 설정, `page=0` → 목록 필터링 |
| 내 일정 | 카드 `열기` | 클릭 | `<a href="{{ route.openHref }}">` | `./Route Planner App.dc.html?loadRoute=<id>`로 이동 |
| 내 일정 | 카드 삭제 아이콘 | 클릭 | `openDeleteConfirm(route)` | `deleteConfirmOpen=true`, 대상 설정 → 삭제 확인 모달 표시 |
| 내 일정 | 카드 제목(비편집) | 클릭 | `startEdit(route)` | 제목이 입력창으로 전환 |
| 내 일정 | 카드 제목 입력 | blur/Enter/Escape | `onEditSave`/`onEditKeyDown` | `saveEdit()`로 이름 저장(localStorage persist) 또는 Escape로 편집 취소 |
| 내 일정 | 카드 날짜/방문지 텍스트(비편집) | 클릭 | `startDateEdit(route)` | 인라인 날짜 편집 UI(미니 달력) 표시 |
| 내 일정 | 카드 날짜 편집 오버레이 | 클릭 | `onDateEditCancel` | 인라인 날짜 편집 닫힘 |
| 내 일정 | 카드 내 달력 이전/다음월, 날짜 셀 | 클릭 | `onCardCalPrev`/`onCardCalNext`/`onCardCalDayClick` | 카드 달력 갱신, 날짜 범위 설정 |
| 내 일정 | 카드 날짜 편집 `확인` | 클릭 | `saveDateEdit` | 일정 기간 저장(persist), 토스트(`일정이 변경되었습니다`) |
| 내 일정 | 페이지네이션 `‹`/`›`/번호 | 클릭 | `onPrevPage`/`onNextPage`/`goToPage(i)` | `page` 갱신 |
| 내 일정 | 빈 상태 `＋`/`새 일정 만들기` | 클릭 | `openNewTripModal` | 생성 방식 선택 모달 표시 |
| 내 일정 - 생성 방식 선택 모달 | 닫기(×) | 클릭 | `closeModeSelectModal` | 모달 닫힘 |
| 내 일정 - 생성 방식 선택 모달 | `직접 생성하기` | 클릭 | `chooseCreateMode('manual')` | 새 일정 만들기 모달 표시(`createMode='manual'`) |
| 내 일정 - 생성 방식 선택 모달 | `AI 생성하기` | 클릭 | `chooseCreateMode('ai')` | `window.location.href='./AI Schedule Planner.dc.html'` |
| 내 일정 - 새 일정 만들기 모달 | 날짜 초기화 아이콘 | 클릭 | `onResetDates` | 시작일=오늘, 종료일 초기화 |
| 내 일정 - 새 일정 만들기 모달 | 달력 이전/다음월, 날짜 셀 | 클릭 | `onCalPrevMonth`/`onCalNextMonth`/`onCalDayClick` | 달력 갱신, 시작/종료일 범위 설정 |
| 내 일정 - 새 일정 만들기 모달 | `취소`/`시작하기` | 클릭 | `closeNewTripModal`/`<a href>` | 닫힘 / `./Route Planner App.dc.html?new=1&tripStart=...&mode=...`로 이동 |
| 내 일정 - 삭제 확인 모달 | 닫기/`취소` | 클릭 | `closeDeleteConfirm` | 모달 닫힘 |
| 내 일정 - 삭제 확인 모달 | `내 일정에서 삭제` | 클릭 | `confirmDelete` | 목록에서 제거(persist), 토스트(`내 일정 1건이 삭제되었습니다`) |
| 내 일정 - 토스트 | (자동) | `showToast(message)` 호출시 | `setState` | 2400ms 후 자동으로 사라짐 |
| 내 일정(로드) | 화면 진입 | `componentDidMount` | `load()` | `localStorage['rp-saved-routes']` 파싱해 목록 표시(주석: MOCK, 서버 API로 교체 예정) |
| 경로 플래너 메인 | 테마 전환 아이콘 | 클릭 | `toggleTheme` | theme 토글 |
| 경로 플래너 메인 | `권한 관리` | 클릭 | `openPermissionsModal` | 권한 관리 모달 열림 |
| 경로 플래너 메인 | `+ 일행 초대` | 클릭 | `toggleInvite` | `inviteOpen` 토글 → 초대 링크/권한 드롭다운 인라인 표시 |
| 경로 플래너 메인 | 패널/지도 접기·펼치기 `«`/`»` | 클릭 | `togglePanelCollapsed`/`toggleMapCollapsed` | 좌우 레이아웃 전환, Kakao 지도 relayout |
| 경로 플래너 메인 | Dev Role 칩 | 클릭 | `setDevRole(role)` | `devRole` 변경 → 편집/초대/삭제/저장 등 권한별 UI 전환 |
| 경로 플래너 메인 | 경로 기준 세그먼트 | 클릭 | `setCriteria(c)` | `criteria` 변경, 미조회 구간을 해당 기준으로 백그라운드 재조회 |
| 경로 플래너 메인 | 이동수단 일괄 적용 칩 | 클릭 | `applyModeToAll(mode)` | 전체 구간 이동수단 일괄 변경(재클릭시 해제) |
| 경로 플래너 메인 | 일차 select | 변경 | `onDaySelectChange` | 선택 일차만 타임라인 필터링 |
| 경로 플래너 메인 | `전체 삭제` | 클릭 | `clearAllPlaces` | 삭제 확인 팝업(대상 전체) 오픈 |
| 경로 플래너 메인 | 빈 상태 `＋` | 클릭 | `quickAddPlace` | 새 방문지 즉시 추가 |
| 경로 플래너 메인 | 방문지 카드 드래그 | dragstart/over/drop/end | `onDragStart`/`onDragOver`/`onDrop`/`onDragEnd` | 방문 순서 변경, 구간 재계산, routeCache 초기화, 활동 로그 |
| 경로 플래너 메인 | 방문지 카드 펼침 화살표 | 클릭 | `togglePlaceExpand(id)` | 카드 상세(메모/카테고리/체류시간 등) 펼침/접힘 |
| 경로 플래너 메인 | 방문지 삭제 아이콘 | 클릭 | `onDeleteClick`→`deleteConfirmOpen` | 삭제 확인 팝업(대상 해당 방문지) |
| 경로 플래너 메인 | 방문지 수정 아이콘 | 클릭 | `openEditModal(id)` | 방문지 수정 팝업(이름/주소 프리필) |
| 경로 플래너 메인 | 카카오맵 길찾기 링크 | 클릭 | `onKakaoDirectionsClick` | 좌표 없으면 `e.preventDefault()`로 이동 차단 |
| 경로 플래너 메인 | 카테고리 칩 | 클릭 | `openCategoryModal(id)` | 카테고리 선택 팝업 |
| 경로 플래너 메인 | 메모 입력/저장 | 입력/클릭 | `updatePlaceField`/`saveMemo(id)` | 메모 갱신 및 저장 표시, 활동 로그 |
| 경로 플래너 메인 | 체류시간 `−`/`+` | 클릭 | `changeDuration(id, ±5)` | 최소 5분 유지하며 체류시간 변경, 활동 로그 |
| 경로 플래너 메인 | 구간 이동수단 칩 | 클릭 | `cycleSegmentMode(idx)` | car→walk→transit→bike 순환 변경, 활동 로그, 지도 폴리라인 갱신 |
| 경로 플래너 메인 | 구간 펼침 화살표 | 클릭 | `toggleExpand(idx)` | 이동 단계 상세 펼침/접힘 |
| 경로 플래너 메인 | 주소 입력/추가 | 입력·Enter/클릭 | `onAddressInput`/`onAddressKeyDown`/`addPlace` | 검색 선택 장소면 즉시 추가, 아니면 방문지 추가 확인 팝업 |
| 경로 플래너 메인 | 주소 입력 포커스 | focus | `openSearchMode` | 지도 위 검색 오버레이 표시(`searchMode=true`) |
| 경로 플래너 - 지도 검색 오버레이 | 검색 입력·Enter/검색 버튼 | 입력/클릭 | `onMapSearchInput`/`runMapSearch` | `/api/kakao`(keyword) 호출, 결과 리스트 또는 에러 표시 |
| 경로 플래너 - 지도 검색 오버레이 | 지우기(×) | 클릭 | `clearMapSearchQuery` | 검색어/결과/마커 초기화 |
| 경로 플래너 - 지도 검색 오버레이 | 결과 항목 | 클릭 | `selectMapResult(doc)` | 지도 중심 이동+마커 표시, `selectedMapDoc` 설정 |
| 경로 플래너 - 지도 검색 오버레이 | `이 장소 선택` | 클릭 | `confirmMapSelection` | 주소 입력창에 장소명 채움, 검색 모드 종료 |
| 경로 플래너 - 새 일정 날짜 모달 | 날짜 입력/`시작하기` | 변경/클릭 | `onNewTripStartDateChange`등/`confirmNewTripDate` | 날짜 반영 / 모달 닫힘 |
| 경로 플래너 - 방문지 수정 팝업 | 이름/주소 입력, `저장`/`취소` | 입력/클릭 | `onEditNameChange`등/`saveEditModal`/`closeEditModal` | places 갱신+활동 로그 / 닫힘 |
| 경로 플래너 - 카테고리 선택 팝업 | 칩 | 클릭 | `selectCategory(cat)` | 해당 방문지 카테고리 변경, 팝업 닫힘, 활동 로그 |
| 경로 플래너 - 방문지 추가 확인 팝업 | `추가` | 클릭 | `confirmAddPlace` | 실제 Kakao 지오코딩(`geocodePlace`) 호출 후 방문지 추가(좌표 실패해도 추가), 활동 로그+토스트 |
| 경로 플래너 - 상황 변경 팝업 | 상황/하위/심각도 선택 | 클릭 | `selectSituationVar`/`Sub`/`Severity` | 선택 상태 갱신 |
| 경로 플래너 - 상황 변경 팝업 | `동선 재계산` | 클릭 | `applySituation` | `applySituationAdjustment()`로 places/segments 재계산(800ms 로딩), 활동 로그+토스트 |
| 경로 플래너 메인 | `활동 로그` 버튼 | 클릭 | `toggleActivityLog` | 활동 로그 드로어 토글 |
| 경로 플래너 - 활동 로그 드로어 | 닉네임 입력 | 입력 | `onNicknameChange` | 활동 로그에 표기되는 닉네임 변경 |
| 경로 플래너 메인 | `저장`/`내 일정에 저장`/`내 일정에서 제거` | 클릭 | `saveOrRemoveAction` | savedViewer면 제거 토스트만; 비로그인시 로그인 필요 모달; 그 외 `saveCurrentRoute()`로 localStorage 저장+devRole 전환+토스트 |
| 경로 플래너 - 로그인 필요 모달 | `로그인`/`회원가입` 링크 | 클릭 | `<a href>` | 각각 Login/Signup 화면으로 이동 |
| 경로 플래너 메인 | `편집 권한 요청`(viewer) | 클릭 | `requestEditPermission` | `editRequestStatus='pending'`, 토스트 |
| 경로 플래너 메인 | `원본 삭제`(creator) | 클릭 | `deleteOriginalRoute` | 삭제 확인 팝업(대상 `ORIGINAL_ROUTE`, 동의 체크 필요) |
| 경로 플래너 - 삭제 확인 팝업 | 동의 체크박스/삭제/취소 | 클릭 | `toggleDeleteAgreeChecked`/`confirmDelete`/`closeDeleteConfirm` | 대상별(전체/개별/원본) 삭제 처리 또는 닫힘 |
| 경로 플래너 메인 | `경로 계산`(canEdit) | 클릭 | `recalcAndSearch`(`recalc`+`searchAllRoutes`) | 방문 순서 확정 + 전 구간 실제 Kakao API 병렬 조회, 활동 로그+토스트 |
| 경로 플래너 - 내 일정 드로어 | 카드/✕ | 클릭 | `route.onLoad`(`loadSavedRoute`)/`route.onDelete`(`deleteSavedRoute`) | 저장 일정 불러오기(드로어 닫힘, 활동 로그) / 목록에서 삭제 |
| 경로 플래너 메인 | 내 일정 드로어를 여는 요소 | URL 파라미터 `openMyRoutes=1`(진입 시) | `componentDidMount`에서 파라미터 확인 → `myRoutesOpen: true` | 드로어 열림(화면 내 클릭 트리거는 코드에 없음 — 배경/✕ 클릭은 `toggleMyRoutes`로 닫기만 함) |
| 경로 플래너 메인 | `✨ AI 도우미` FAB / 패널 닫기(✕) | 클릭 | `toggleAi` | AI 도우미 패널 표시/숨김 |
| 경로 플래너 - AI 도우미 패널 | 입력·Enter/`전송` | 입력/클릭 | `onAiInput`/`sendAiMessage` | `/api/chat` POST(현재 경로 컨텍스트 포함) 호출, 응답을 대화 목록에 추가(실패시 에러 메시지) |
| 경로 플래너 - AI 도우미 패널 | 추천 칩 | 클릭 | `onSuggestionClick(text)` | 해당 문구로 `sendAiMessage` 즉시 실행 |
| 경로 플래너 - 권한 관리 모달 | `승인`/`거절` | 클릭 | `askApproveRequest`/`askRejectRequest` | 권한 요청 확인 모달 오픈 |
| 경로 플래너 - 권한 요청 확인 모달 | `수락`/`거절` | 클릭 | `confirmRequestAction` | 승인시 `members`에 editor로 추가, 요청 목록에서 제거 |
| 경로 플래너 메인(초대 패널) | `복사` | 클릭 | `copyInvite` | 라벨이 `복사됨`으로 1.2초 표시 |
| 경로 플래너 메인(초대 패널) | 권한 드롭다운/옵션 | 클릭 | `togglePermissionMenu`/`setPermission(p)` | 편집 가능/보기 전용 권한 전환 |
| 경로 플래너 메인(로드) | 화면 진입 | `componentDidMount` | `loadKakaoSdk`, URL 파라미터 처리 | 실제 Kakao Maps SDK 로드, `openMyRoutes`/`loadRoute`/`tripStart`/`fromAI` 등 파라미터에 따라 상태 초기화, Escape 키로 열린 모달 우선순위 닫기 |
| AI 일정 생성 | 달력 이전/다음월, 날짜 셀 | 클릭 | `onCalPrevMonth`/`onCalNextMonth`/`onDayClick` | 여행 시작/종료일 범위 설정 |
| AI 일정 생성 | 지역/스타일/동행/이동방식 칩 | 클릭 | `selectRegion`/`selectStyle`/`selectCompanion`/`selectTransport` | 해당 단계 값 선택 |
| AI 일정 생성 | 커스텀 지역 입력(`기타`) | 입력 | `onRegionCustomChange` | `regionCustom` 갱신 |
| AI 일정 생성 | 관심사 칩 | 클릭(토글) | `toggleInterest(v)` | 다중 선택 배열에 추가/제거 |
| AI 일정 생성 | `뒤로` | 클릭 | `goBack` | 이전 스텝으로 이동 |
| AI 일정 생성 | `다음`/`AI 일정 생성하기` | 클릭 | `goNext` | 유효성 검사 후 다음 스텝, 마지막 스텝에서 `generate()` 호출 |
| AI 일정 생성 | (자동) | `generate()` | `buildResult()` | 1.4초 로딩 후 목업 결과(장소/이동수단) 계산해 결과 화면 표시 |
| AI 일정 생성 | `다시 추천받기` | 클릭 | `regenerate`(`generate` 재실행) | 결과 재계산 |
| AI 일정 생성 | `이 일정으로 시작하기` | 클릭 | `startWithResult` | `localStorage['pd-ai-handoff']` 저장 후 `./Route Planner App.dc.html?fromAI=1`로 이동 |
| AI 일정 생성 | `나가기` 링크 | 클릭 | `<a href="./My Routes.dc.html">` | 페이지 이동 |
| 커뮤니티 | 검색 입력/제출 | 입력/클릭 | `onSearchChange`/`onSearchSubmit` | `searchQuery`로 장소·캡션 텍스트 필터링 |
| 커뮤니티 | 지역 항목 | 클릭 | `selectRegion(region)` | 게시물 지역 필터링 |
| 커뮤니티(모바일) | `지역 선택` 헤더 | 클릭 | `toggleRegionCollapsed` | 지역 목록 펼침/접힘(데스크톱에는 이 토글 없음) |
| 커뮤니티 | 정렬 옵션 | 클릭 | `selectSort(mode)` | 인기순/최신순/오래된순 정렬 |
| 커뮤니티 | `목록`/`사진` | 클릭 | `setViewList`/`setViewGrid` | 보기 모드 전환 |
| 커뮤니티 | 그리드 썸네일/작성자 아바타·이름 | 클릭 | `openProfile(author)` | 해당 작성자 프로필 보기로 필터링 |
| 커뮤니티 | 프로필 뒤로가기(←) | 클릭 | `closeProfile` | 프로필 보기 종료 |
| 커뮤니티(본인 프로필) | `저장` 토글 | 클릭 | `toggleBookmarksOnly` | 북마크한 게시물만 표시 |
| 커뮤니티(본인 프로필) | `프로필 설정` | 클릭 | `openMyProfileEdit` | 프로필 설정 모달 오픈 |
| 커뮤니티 - 프로필 설정 모달 | 닉네임 입력/`저장`/`취소` | 입력/클릭 | `onMyNicknameChange`/`saveMyProfile`/`closeMyProfileEdit` | `myNickname` 갱신 / 모달 닫힘 |
| 커뮤니티 | 좋아요(하트) | 클릭 | `toggleLike(id)` | liked 토글, likeCount ±1 |
| 커뮤니티 | 댓글 버튼 | 클릭 | `openCommentModal(id)` | 댓글 상세 팝업 오픈 |
| 커뮤니티 | 북마크 토글 | 클릭 | `toggleBookmark(id)` | bookmarked 토글 |
| 커뮤니티 | 댓글 좋아요/`답글` | 클릭 | `toggleCommentLike`/`toggleReplyBox` | 좋아요 토글 / 답글 입력창 표시·숨김 |
| 커뮤니티 | 답글 입력·Enter/`게시`(답글) | 입력/클릭 | `onReplyInput`/`onReplyKeyDown`/`submitReply` | 해당 댓글에 답글 추가 |
| 커뮤니티 | 답글 좋아요 | 클릭 | `toggleReplyLike` | 좋아요 토글 |
| 커뮤니티 | `댓글 더보기`/`댓글 접기` | 클릭 | `toggleComments(id)` | 댓글 목록 펼침/접힘 |
| 커뮤니티 | 댓글 입력·Enter/`게시`(댓글) | 입력/클릭 | `onCommentInput`/`onCommentKeyDown`/`submitComment` | 댓글 배열에 추가 |
| 커뮤니티(본인 게시물) | `수정` | 클릭 | `openEditComposer(id)` | 글쓰기 팝업(수정 모드, 내용 프리필) |
| 커뮤니티(본인 게시물) | `삭제` | 클릭 | `requestDelete(id)` | 삭제 확인 팝업 오픈 |
| 커뮤니티 - 삭제 확인 팝업 | `삭제`/`취소` | 클릭 | `confirmDelete`/`cancelDelete` | posts에서 제거 / 닫힘 |
| 커뮤니티 | `더보기` | 클릭 | `showMorePosts` | `visibleCount` +5 |
| 커뮤니티(사이드바) | 인기 여행지 항목/추천 태그 | 클릭 | `filterByTagOrPlace` | 검색어로 필터링(해당 장소·태그) |
| 커뮤니티(사이드바) | `여행 후기 쓰기` | 클릭 | `openComposer` | 글쓰기 팝업(신규) 오픈 |
| 커뮤니티 - 글쓰기/수정 팝업 | 여행지/지역/감상평 입력, `취소`/`게시` | 입력/클릭 | `onDraftXChange`/`closeComposer`/`saveComposer` | 신규 게시물 추가 또는 기존 게시물 수정 |
| 마이페이지 | 테마 전환 아이콘 | 클릭 | `toggleTheme` | theme 토글 |
| 마이페이지 | 아바타 편집 아이콘 | 클릭 | `onAvatarChangeClick` | image-slot `openFilePicker()` 호출 |
| 마이페이지 | `닉네임` 행 | 클릭 | `onEditNickname` | 닉네임 수정 모달 오픈 |
| 마이페이지 - 닉네임 수정 모달 | 입력/`중복 확인`/`저장`/`취소` | 입력/클릭 | `onNicknameDraftChange`/`onCheckNickname`/`onSaveNickname`/`onCloseEditNickname` | 형식·중복·7일 보호 검사 후 확인 메시지; 확인된 값일 때만 저장(2.2초 토스트) |
| 마이페이지 | `알림 설정` 행 | 클릭 | `onOpenNotificationSettings` | 알림 설정 모달 오픈 |
| 마이페이지 - 알림 설정 모달 | 토글 스위치/`확인` | 클릭 | `onToggleNotification(key)`/`onCloseNotificationSettings` | 개별 알림 on/off / 모달 닫힘 |
| 마이페이지 | `약관 및 개인정보` 행 | 클릭 | `onOpenTerms` | 약관 모달 오픈 |
| 마이페이지 | `회원 탈퇴` 행 | 클릭 | `onOpenWithdraw` | 회원 탈퇴 모달(confirm 단계)로 오픈 |
| 마이페이지 - 회원 탈퇴(confirm) | 동의 체크/`회원 탈퇴`/`뒤로가기` | 클릭 | `onToggleWithdrawAgree`/`onConfirmWithdraw`/`onCloseWithdraw` | `deleteAccount()` 호출 → Creator 소유 일정 있으면 blocked 단계로, 실패시 에러, 성공시 success 단계 |
| 마이페이지 - 회원 탈퇴(blocked) | 동의 체크/`확인`/`취소` | 클릭 | `onToggleBlockedAgree`/`onConfirmBlocked`/`onCloseWithdraw` | 동의시 finalWarning 단계로 이동 |
| 마이페이지 - 회원 탈퇴(finalWarning) | 동의 체크/`네, 탈퇴할게요.`/`계속 사용할래요.` | 클릭 | `onToggleFinalWarningAgree`/`onConfirmFinalWarning`/`onCancelFinalWarning` | `deleteAccount(skipCreatorCheck)` 성공시 success 단계 후 1.4초 뒤 `./Login Screen.dc.html`로 이동; 취소시 모달 닫힘 |
| 마이페이지 | `← 홈으로` 링크 | 클릭 | `<a href="./main(home).dc.html">` | 페이지 이동 |
| 모바일 프리뷰 도구 | 모드 버튼(3) | 클릭 | `selectMode(key)` | 프레임 너비/높이/테두리 변경 |
| 모바일 프리뷰 도구 | 페이지 버튼(9) | 클릭 | `selectPage(key)` | iframe `src` 전환 |
| 모바일 프리뷰 도구 | (자동) | iframe `onLoad` | `onFrameLoad` | 로드된 문서에 스크롤바 숨김 스타일 주입 |

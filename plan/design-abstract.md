> 문서: design-abstract.md · 출처: pinder screen design (HTML) · 마지막 갱신: 2026-09-15

> 원본 경로: `c:\hello-planning-pull\design\pinder-screen-design.html` (읽기 전용). `script[type="__bundler/page_order"]` 값이 `[]`이므로 이 번들에는 화면이 1개(`data-screen-label="내 일정"`, 파일 `My Routes.dc.html`)만 포함됨. 헤더/모달의 다른 화면 링크(`main(home).dc.html`, `Explore Destinations.dc.html`, `Community.dc.html`, `Login Screen.dc.html`, `Route Planner App.dc.html`, `AI Schedule Planner.dc.html`)는 `href`/`window.location.href` 문자열로만 존재하고 실제 코드는 이 파일에 없음.

## 화면 목록
| 화면 | 코드 근거(컴포넌트·id/class) |
|---|---|
| 내 일정 (My Routes) 메인 화면 | `<div class="pd-fade" data-screen-label="내 일정">`, `class Component extends DCLogic`, 파일 `./My Routes.dc.html` |
| 모바일 메뉴 드롭다운 | `class="mr-mobile-menu-wrap"`, `sc-if value="{{ mobileMenuOpen }}"` |
| 생성 방식 선택 모달 | `sc-if value="{{ modeSelectModalOpen }}"` |
| 새 일정 만들기 모달 | `sc-if value="{{ newTripModalOpen }}"` |
| 삭제 확인 모달 | `sc-if value="{{ deleteConfirmOpen }}"` |
| 토스트 알림 | `sc-if value="{{ toastVisible }}"` |

## 요소
| 화면 | 요소(종류) | 라벨/텍스트 |
|---|---|---|
| 내 일정 메인 | 로고(링크) | `p:nder` (href=`./main(home).dc.html`) |
| 내 일정 메인 | 내비게이션 링크 | `여행지 탐색` (href=`./Explore Destinations.dc.html`) |
| 내 일정 메인 | 내비게이션 링크(활성) | `내 일정` (href=`./My Routes.dc.html`) |
| 내 일정 메인 | 내비게이션 링크 | `커뮤니티` (href=`./Community.dc.html`) |
| 내 일정 메인 | 아이콘 버튼 | 테마 전환 (`title="테마 전환"`; `isDark`이면 `☀` 문자, `isLight`이면 `<img>` 아이콘) |
| 내 일정 메인 | 아이콘 버튼 | 모바일 메뉴 토글 `☰` |
| 내 일정 메인 | 제목 텍스트 | `내 일정` |
| 내 일정 메인 | 서브 텍스트 | `저장해둔 동선을 확인하고 이어서 계획할 수 있어요` |
| 내 일정 메인 | 버튼 | `＋ 새 일정` |
| 내 일정 메인 | 탭(`hasRoutes`일 때, 2개) | `예정된 일정 (n)` / `완료된 일정 (n)` — n은 각 상태 route 개수 |
| 내 일정 메인 | 카드 내 링크 | `열기` (href=`{{ route.openHref }}`) |
| 내 일정 메인 | 카드 내 아이콘 버튼 | 삭제(휴지통 SVG) |
| 내 일정 메인 | 카드 내 인풋(`route.isEditing`일 때) | 제목 편집 인풋 (value=`{{ route.editValue }}`) |
| 내 일정 메인 | 카드 내 텍스트(`route.notEditing`일 때) | 제목 `{{ route.name }}` (title=`클릭해서 제목 수정`) |
| 내 일정 메인 | 카드 내 오버레이(`route.isDateEditing`일 때) | 배경 클릭 캡처용 오버레이(텍스트 없음) |
| 내 일정 메인 | 카드 내 날짜 범위 라벨(`route.isDateEditing`일 때) | `{{ route.editStart }} - {{ route.editEnd }}` |
| 내 일정 메인 | 카드 내 달력 월 이동 버튼(`route.isDateEditing`일 때) | `‹` / `›` |
| 내 일정 메인 | 카드 내 달력 월 라벨(`route.isDateEditing`일 때) | `{{ route.cardCalLabel }}` |
| 내 일정 메인 | 카드 내 달력 날짜 그리드(`route.isDateEditing`일 때, 42칸) | `{{ cell.day }}` (`route.cardCalCells`) |
| 내 일정 메인 | 카드 내 버튼(`route.isDateEditing`일 때) | `확인` |
| 내 일정 메인 | 카드 내 텍스트(`route.notDateEditing`일 때) | `{{ route.dateOnly }} · 방문지 {{ route.countLabel }}` (title=`클릭해서 날짜 수정`) |
| 내 일정 메인 | 카드 내 멤버 아바타(`route.hasMembers`일 때) | 이니셜 원(`{{ mem.initial }}`) + 이름(`{{ mem.name }}`) |
| 내 일정 메인 | 카드 내 칩(목록) | 장소 칩 `{{ chip }}` (`route.placeChips`, 최대 3개) |
| 내 일정 메인 | 카드 내 칩(`route.hasMoreChips`일 때) | `+{{ route.moreChipsCount }}` |
| 내 일정 메인 | 페이지네이션 버튼(`hasMultiplePages`일 때) | `‹` (이전) |
| 내 일정 메인 | 페이지네이션 버튼(목록, `hasMultiplePages`일 때) | 페이지 번호(`{{ pg.label }}`) |
| 내 일정 메인 | 페이지네이션 버튼(`hasMultiplePages`일 때) | `›` (다음) |
| 내 일정 메인 | 빈 상태 아이콘 버튼(`noRoutes`일 때) | `＋` |
| 내 일정 메인 | 빈 상태 텍스트(`noRoutes`일 때) | `저장된 일정이 없어요` |
| 내 일정 메인 | 빈 상태 안내문(`noRoutes`일 때) | `Route Planner에서 방문지를 추가하고 "저장"을 누르면 여기에 나타나요` |
| 내 일정 메인 | 빈 상태 버튼(`noRoutes`일 때) | `새 일정 만들기` |
| 모바일 메뉴 드롭다운 | 배경 오버레이 | (텍스트 없음, 클릭 시 닫힘용) |
| 모바일 메뉴 드롭다운 | 메뉴 링크 | `여행지 탐색` |
| 모바일 메뉴 드롭다운 | 메뉴 링크 | `내 일정` |
| 모바일 메뉴 드롭다운 | 메뉴 링크 | `커뮤니티` |
| 모바일 메뉴 드롭다운 | 메뉴 링크 | `로그인` (href=`./Login Screen.dc.html`) |
| 생성 방식 선택 모달 | 닫기 버튼 | `×` 아이콘(SVG) |
| 생성 방식 선택 모달 | 제목 | `어떻게 일정을 만들까요?` |
| 생성 방식 선택 모달 | 옵션 카드 | `직접 생성하기` / `내가 가고 싶은 곳을 입력하고 최적의 동선을 생성해줘요` |
| 생성 방식 선택 모달 | 옵션 카드 | `AI 생성하기` / `AI로 알아서 최적의 동선을 생성해줘요` |
| 새 일정 만들기 모달 | 닫기 버튼 | `×` 아이콘(SVG) |
| 새 일정 만들기 모달 | 제목 | `새 일정 만들기` |
| 새 일정 만들기 모달 | 아이콘 버튼 | 날짜 초기화 (`title="날짜 초기화"`) |
| 새 일정 만들기 모달 | 달력 월 이동 버튼 | `‹` / `›` |
| 새 일정 만들기 모달 | 달력 월 라벨 | `{{ calMonthLabel }}` |
| 새 일정 만들기 모달 | 달력 요일 헤더(7개) | `{{ wd.label }}` (`calWeekdays`) |
| 새 일정 만들기 모달 | 달력 날짜 그리드(42칸) | `{{ cell.day }}` (`calCells`) |
| 새 일정 만들기 모달 | 텍스트 | `출발 날짜` 라벨 + `{{ tripStartLabel }}` |
| 새 일정 만들기 모달 | 텍스트 | `도착 날짜` 라벨 + `{{ tripEndLabel }}` |
| 새 일정 만들기 모달 | 버튼 | `취소` |
| 새 일정 만들기 모달 | 링크(버튼형) | `시작하기` (href=`{{ newTripHref }}`) |
| 삭제 확인 모달 | 닫기 버튼 | `×` 아이콘(SVG) |
| 삭제 확인 모달 | 제목 | `내 일정에서 삭제하시겠습니까?` |
| 삭제 확인 모달 | 본문 | `내 일정 목록에서만 제거됩니다.` |
| 삭제 확인 모달 | 안내 박스 | `✓ 공유된 원본 일정은 삭제되지 않습니다.` / `✓ 다른 참여자의 일정에는 영향을 주지 않습니다.` |
| 삭제 확인 모달 | 버튼 | `취소` |
| 삭제 확인 모달 | 버튼 | `내 일정에서 삭제` |
| 토스트 알림 | 아이콘+텍스트 | 체크 SVG + `{{ toastMsg }}` (예: `내 일정 1건이 삭제되었습니다`, `일정이 변경되었습니다`) |

## 상호작용
| 화면 | 요소 | 트리거 | 동작(코드상 함수/핸들러) | 결과(코드상 변화) |
|---|---|---|---|---|
| 내 일정 메인 | 로고 `p:nder` | 클릭 | `<a href="./main(home).dc.html">` | 페이지 이동(코드상 href만, 대상 화면 코드 없음) `[?]` |
| 내 일정 메인 | 테마 전환 아이콘 | 클릭 | `sc-camel-on-click="{{ toggleTheme }}"` → `toggleTheme()` | `state.theme` light↔dark 토글, `localStorage.setItem('pd-theme', next)` |
| 내 일정 메인 | 모바일 메뉴 토글 `☰` | 클릭 | `toggleMobileMenu()` | `state.mobileMenuOpen` 토글 → 드롭다운 표시/숨김 |
| 내 일정 메인 | 모바일 메뉴 오버레이 | 클릭 | `toggleMobileMenu()` (재사용) | 드롭다운 닫힘 |
| 내 일정 메인 | `＋ 새 일정` 버튼 | 클릭 | `openNewTripModal()` | `state.modeSelectModalOpen=true`, `newTripStartDate`/`newTripEndDate` 초기화 → 생성 방식 선택 모달 표시 |
| 내 일정 메인 | 상태 탭(예정/완료) | 클릭 | `onSetStatusTab(tab)` → `state.statusTab` 설정, `page:0` | 목록이 해당 상태(`isDone` 여부)로 필터링, 활성 탭 표시 변경 |
| 내 일정 메인 | 카드 `열기` 링크 | 클릭 | `<a href="{{ route.openHref }}">` (`./Route Planner App.dc.html?loadRoute=<id>`) | 페이지 이동(대상 화면 코드 없음) `[?]` |
| 내 일정 메인 | 카드 삭제 아이콘 | 클릭 | `route.onDeleteClick` → `openDeleteConfirm(route)` | `state.deleteConfirmOpen=true`, `deleteTargetId/Name` 설정 → 삭제 확인 모달 표시 |
| 내 일정 메인 | 카드 제목(비편집 상태) | 클릭 | `route.onEditStart` → `startEdit(route)` | `state.editingId=route.id`, `editValue=route.name` → 제목이 인풋으로 전환 |
| 내 일정 메인 | 카드 제목 인풋 | 입력(change) | `onEditChange` | `state.editValue` 갱신 |
| 내 일정 메인 | 카드 제목 인풋 | blur | `onEditSave` → `saveEdit()` | `routes` 배열에서 해당 일정 `name`/`customName` 갱신, `localStorage` persist, `editingId=null` |
| 내 일정 메인 | 카드 제목 인풋 | keydown Enter/Escape | `onEditKeyDown` | Enter→`saveEdit()` 호출, Escape→`editingId=null`(편집 취소) |
| 내 일정 메인 | 카드 날짜/방문지 텍스트(비편집) | 클릭 | `route.onDateEditStart` → `startDateEdit(route)` | `state.dateEditingId=route.id`, `editStart/editEnd` 설정 → 인라인 날짜 편집 UI 표시 |
| 내 일정 메인 | 날짜 편집 오버레이 | 클릭 | `route.onDateEditCancel` → `dateEditingId=null` | 인라인 날짜 편집 UI 닫힘 |
| 내 일정 메인 | 카드 내 달력 이전/다음 월 버튼 | 클릭 | `route.onCardCalPrev` / `route.onCardCalNext` | `cardCalViewMonth`/`cardCalViewYear` 변경, 카드 달력 갱신 |
| 내 일정 메인 | 카드 내 달력 날짜 셀 | 클릭 | `cell.onClick` → `onCardCalDayClick(dateStr)` | `editStart`/`editEnd` 범위 갱신 |
| 내 일정 메인 | 카드 날짜 편집 `확인` 버튼 | 클릭 | `route.onDateSave` → `saveDateEdit()` | `routes`의 `tripStart/tripEnd` 갱신, persist, `showToast('일정이 변경되었습니다')`, `dateEditingId=null` |
| 내 일정 메인 | 페이지네이션 이전(‹) | 클릭 | `onPrevPage` | `state.page` -1 (0 미만 방지) |
| 내 일정 메인 | 페이지네이션 다음(›) | 클릭 | `onNextPage` | `state.page` +1 |
| 내 일정 메인 | 페이지 번호 버튼 | 클릭 | `pg.onClick` → `goToPage(i)` | `state.page=i` |
| 내 일정 메인 | 빈 상태 `＋` 아이콘 / `새 일정 만들기` 버튼 | 클릭 | `openNewTripModal()` | 생성 방식 선택 모달 표시(위와 동일) |
| 모바일 메뉴 | `로그인` 링크 | 클릭 | `<a href="./Login Screen.dc.html">` | 페이지 이동(대상 화면 코드 없음) `[?]` |
| 생성 방식 선택 모달 | 닫기(×) | 클릭 | `closeModeSelectModal` | `modeSelectModalOpen=false` |
| 생성 방식 선택 모달 | `직접 생성하기` 카드 | 클릭 | `chooseCreateModeManual` → `chooseCreateMode('manual')` | `modeSelectModalOpen=false`, `newTripModalOpen=true`, `createMode='manual'`, 달력 뷰 초기화 → 새 일정 만들기 모달 표시 |
| 생성 방식 선택 모달 | `AI 생성하기` 카드 | 클릭 | `chooseCreateModeAi` → `chooseCreateMode('ai')` | `window.location.href='./AI Schedule Planner.dc.html'` (페이지 이동, 대상 화면 코드 없음 `[?]`) |
| 새 일정 만들기 모달 | 닫기(×) | 클릭 | `closeNewTripModal` | `newTripModalOpen=false` |
| 새 일정 만들기 모달 | 날짜 초기화 아이콘 | 클릭 | `onResetDates` | `newTripStartDate=오늘`, `newTripEndDate=''` |
| 새 일정 만들기 모달 | 달력 이전/다음 월 | 클릭 | `onCalPrevMonth` / `onCalNextMonth` | `calViewMonth`/`calViewYear` 변경 |
| 새 일정 만들기 모달 | 달력 날짜 셀 | 클릭 | `cell.onClick` → `onCalDayClick(dateStr)` | `newTripStartDate`/`newTripEndDate` 범위 설정 |
| 새 일정 만들기 모달 | `취소` 버튼 | 클릭 | `closeNewTripModal` | 모달 닫힘 |
| 새 일정 만들기 모달 | `시작하기` 링크 | 클릭 | `<a href="{{ newTripHref }}">` (`./Route Planner App.dc.html?new=1&tripStart=...&tripEnd=...&mode=...`) | 페이지 이동(대상 화면 코드 없음 `[?]`) |
| 삭제 확인 모달 | 닫기(×) | 클릭 | `closeDeleteConfirm` | `deleteConfirmOpen=false` |
| 삭제 확인 모달 | `취소` 버튼 | 클릭 | `closeDeleteConfirm` | 모달 닫힘 |
| 삭제 확인 모달 | `내 일정에서 삭제` 버튼 | 클릭 | `confirmDelete` | `routes`에서 `deleteTargetId` 제거, persist, `showToast('내 일정 1건이 삭제되었습니다')`, `deleteConfirmOpen=false` |
| 토스트 알림 | (자동) | `showToast(message)` 호출 시 | `setState({toastMsg, toastVisible:true})`, `setTimeout(...,2400)` | 2400ms 후 `toastVisible=false`로 자동 사라짐 |
| 내 일정 메인(로드) | 화면 진입 | `componentDidMount()` | `this.load()` | `localStorage.getItem('rp-saved-routes')` 파싱해 `state.routes` 설정 (실패 시 빈 배열). 코드 주석: `// MOCK: 실제 연동 시 localStorage 대신 서버 API에서 목록을 불러오도록 교체` |

## `[?]`로 남긴 항목
1. 헤더/모달에서 링크로만 연결되는 화면(`main(home).dc.html`, `Explore Destinations.dc.html`, `Community.dc.html`, `Login Screen.dc.html`, `Route Planner App.dc.html`, `AI Schedule Planner.dc.html`)의 실제 마크업 — 이 번들(`page_order:[]`)에 없음.
2. 라이트 테마 아이콘 `<img src="9b67324c-d2b1-4839-b4cf-6531f71a9fbf" alt="">`가 실제로 어떤 그림인지 — `alt`가 빈 문자열이라 코드로 확인 불가.
3. 템플릿 `<head>`의 `<script src="6376b866-ba19-409b-a9a6-ed2db20dce7a">` 런타임 스크립트의 실제 내용.
4. `manifest`(`script[type="__bundler/manifest"]`)의 정확한 총 자산 개수와 목록 — 해당 스크립트 내용이 한 줄에 매우 커서 원문을 직접 읽지 못함. `ext_resources` 스크립트를 통해 `react@18.3.1`, `react-dom@18.3.1` UMD 스크립트 uuid만 확인됨.
5. `route.places` 배열 원소가 `name` 외에 어떤 필드를 갖는지 — 코드에서는 `.name`만 참조됨.
6. `route.id`의 정확한 타입/생성 규칙 — 코드상 `Number(r.id)` 변환 시도로 보아 숫자형 타임스탬프로 추정되나 명시적 타입/생성 로직 없음.
7. `route.customName` 필드가 `saveEdit()`에서 `true`로 설정되는데, 템플릿 어디에서도 이 값을 조건으로 사용하는 곳을 찾지 못함(소비처 불명).
8. `enriched.memberChips`, `onEditStartChange`, `onEditEndChange`, `onNewTripStartDateChange`, `onNewTripEndDateChange` — 클래스에 정의되어 있으나 템플릿 마크업에서 이를 호출하는 요소(예: `<input type="date">`)를 찾지 못함.
9. `onSetFilterMode`, `onClearFilter`, `onPickFilterValue`와 `filterMode`/`filterValue` 상태 — 클래스에 정의되어 있으나 템플릿에 필터 UI 요소 자체가 없어 트리거 불명.
10. `renderVals()`가 반환하는 `colorScheme`, `sortedRoutes` 값이 템플릿의 어느 부분에서 쓰이는지 확인 안 됨.
11. `this.props.defaultTheme`가 어디서/어떤 값으로 주입되는지(이 파일에는 정의부 없음).
12. `hint-placeholder-count` 값(2, 3, 7, 42 등)이 실제 렌더링 개수를 제한/보장하는지 여부.
13. 카드 맨 끝의 `<div style="display:none"></div>`(빈 placeholder div)의 용도.
14. `<helmet data-dc-atomics="">`의 `data-dc-atomics` 속성이 실제로 하는 역할.

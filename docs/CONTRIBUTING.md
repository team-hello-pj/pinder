# 협업 규칙

## 브랜치

```
main      배포 브랜치. 직접 push 금지. PR 로만 병합한다.
develop   통합 브랜치. 기능 브랜치는 여기서 따고 여기로 합친다.
feat/…    기능 작업
fix/…     버그 수정
chore/…   설정·문서·의존성
```

브랜치 이름은 `feat/planner-place-list`, `fix/theme-flicker` 처럼
**종류/화면-내용** 순으로 짓는다.

### GitHub 설정 (최초 1회, 팀장)

- `main`, `develop` 브랜치 보호 규칙 켜기
- PR 승인 1명 이상 필수
- CI(`.github/workflows/ci.yml`) 통과 필수
- 병합 방식은 **Squash and merge** 로 통일

## 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/ko/) 를 따른다.

```
feat(planner): 방문지 드래그 순서 변경 추가
fix(theme): 새로고침 시 다크 테마가 깜빡이는 문제 수정
chore(ci): 빌드 워크플로 추가
docs(readme): 환경 변수 설명 보강
refactor(lib): 경로 계산 로직을 route-engine 으로 분리
```

타입: `feat` `fix` `chore` `docs` `refactor` `style` `test`
범위(scope)는 화면 이름이나 폴더 이름을 쓴다.

## 작업 흐름

1. 이슈를 만든다 (화면 작업이면 `화면 작업` 템플릿 사용)
2. `develop` 에서 브랜치를 딴다
3. 작업하고 커밋한다
4. 올리기 전에 로컬에서 확인한다:
   ```bash
   npm run format
   npm run lint
   npm run typecheck
   npm run build
   ```
5. PR 을 올린다 (템플릿 체크리스트 채우기)
6. 리뷰 1명 승인 + CI 통과 후 squash merge

## 충돌을 줄이는 방법

이 프로젝트는 화면 단위로 나눠서 작업한다. 아래만 지키면 충돌이 거의 안 난다.

- **내 화면 폴더 안에서만 작업한다.** `src/app/(main)/planner/` 담당이면 그 안에서.
- **공통 파일을 고쳐야 하면 먼저 팀에 알린다.** `src/components/ui/`, `src/lib/`,
  `src/styles/tokens.css`, `src/constants/` 는 모두가 쓰는 파일이다.
  여기를 바꾸는 PR 은 작게 쪼개서 따로 올린다.
- **공통 컴포넌트는 고치지 말고 늘린다.** 버튼 스타일이 하나 더 필요하면
  기존 스타일을 바꾸지 말고 `variant` 를 추가한다.
- **CSS 는 반드시 `*.module.css` 에 쓴다.** 전역 CSS 를 건드리면 남의 화면이 깨진다.
- **매일 `develop` 을 내 브랜치로 받아온다.**
  ```bash
  git fetch origin
  git rebase origin/develop
  ```

## 코드 리뷰

리뷰어가 볼 것:

- 레이어 규칙을 지켰는가 (`docs/ARCHITECTURE.md`)
- 하드코딩된 색상·간격이 없는가 (토큰을 쓰는가)
- API 키가 클라이언트로 새지 않는가
- 라이트/다크, 데스크톱/모바일 양쪽에서 확인했는가
- 비슷한 코드가 이미 `lib/` 나 `components/ui/` 에 있지 않은가

## 환경 변수

`.env.local` 은 커밋하지 않는다 (`.gitignore` 에 있음).
새 환경 변수를 추가하면 **반드시 `.env.example` 과 README 표에도 추가**한다.
실제 키 값은 팀 내부 채널로만 공유한다.

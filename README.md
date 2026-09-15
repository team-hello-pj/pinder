# p:nder — 여행 경로 플래너

방문지를 모아 최적의 이동 순서를 만들어 주는 여행 경로 플래너.
디자인 캔버스 프로토타입(`.dc.html`)에서 **Next.js(App Router) + TypeScript** 기반으로 리뉴얼했다.

## 빠르게 시작하기

```bash
git clone <repo-url>
cd travel-route-planner
npm install
cp .env.example .env.local   # 값 채우기 (아래 참고)
npm run dev                  # http://localhost:3000
```

Node 20 이상이 필요하다 (`.nvmrc` 참고).

## 환경 변수

`.env.local` 에 넣는다. **절대 커밋하지 않는다.**

| 변수                 | 용도                   | 노출 범위                                   |
| -------------------- | ---------------------- | ------------------------------------------- |
| `KAKAO_JS_KEY`       | Kakao Maps JS SDK 로드 | `/api/kakao-config` 를 통해 브라우저로 전달 |
| `KAKAO_REST_API_KEY` | 장소 검색·경로 탐색    | 서버 전용                                   |
| `GEMINI_API_KEY`     | AI 도우미 답변 생성    | 서버 전용                                   |

키가 없어도 앱은 뜨고, 해당 기능만 오류 메시지를 보여준다.

## 명령어

| 명령어                 | 설명                    |
| ---------------------- | ----------------------- |
| `npm run dev`          | 개발 서버               |
| `npm run build`        | 프로덕션 빌드           |
| `npm run start`        | 빌드 결과 실행          |
| `npm run lint`         | ESLint                  |
| `npm run typecheck`    | 타입 검사               |
| `npm run format`       | Prettier 자동 정리      |
| `npm run format:check` | 포맷 검사 (CI에서 실행) |

## 문서

| 문서                                         | 내용                             |
| -------------------------------------------- | -------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 폴더 구조와 각 레이어의 역할     |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | 브랜치·커밋·PR 규칙              |
| [docs/TEAM.md](docs/TEAM.md)                 | 화면별 담당자와 진행 현황        |
| [docs/MIGRATION.md](docs/MIGRATION.md)       | 프로토타입 → Next.js 포팅 가이드 |

## `legacy/` 폴더

리뉴얼 전 디자인 캔버스 프로토타입 전체가 들어 있다.
**빌드·린트 대상이 아니다.** 화면을 포팅할 때 원본을 확인하는 용도로만 쓰고,
포팅이 모두 끝나면 통째로 지운다.

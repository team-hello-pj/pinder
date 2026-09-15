# legacy — 리뉴얼 전 프로토타입

Claude Design 캔버스로 만든 원본 화면(`.dc.html`)과 자산이 들어 있다.
`support.js` 런타임이 `{{ }}` 템플릿을 React 로 변환하는 구조였다.

**이 폴더는 빌드·린트·타입 검사 대상이 아니다.** 수정하지 않는다.
화면을 Next.js 로 옮길 때 원본을 확인하는 용도로만 쓰고,
포팅이 모두 끝나면 이 폴더를 통째로 삭제한다.

포팅 방법은 [`../docs/MIGRATION.md`](../docs/MIGRATION.md) 참고.

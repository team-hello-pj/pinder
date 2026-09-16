// 협업 멤버/편집요청은 이제 /api/schedules/* 가 실제로 관리한다 (src/lib/schedules.ts).
// legacy/Route Planner App.dc.html 의 데모 방문지(INITIAL_PLACES)는 실사용자 화면에는
// 필요 없어서 옮기지 않았다 — /planner 는 항상 빈 목록에서 시작한다.

export interface Member {
  id: string;
  nickname: string;
  role: 'editor' | 'viewer';
}

export interface EditRequest {
  id: string;
  nickname: string;
  time: string;
}

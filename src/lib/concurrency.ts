/**
 * 동시 실행 개수를 제한하며 작업들을 처리한다.
 * 카카오 API는 짧은 시간에 요청이 몰리면(예: 방문지 여러 곳 × 이동수단 4종을 한 번에
 * Promise.all로 쏘는 경우) 요청 속도 제한에 걸려 일부가 실패한다 — 그래서 한 번에 너무
 * 많은 요청을 동시에 보내지 않도록 이 유틸로 묶어서 처리한다.
 */
export async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

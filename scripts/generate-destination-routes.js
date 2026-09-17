// destinations 테이블의 각 여행지에 대해 우리 AI 동선 생성 기능(/api/route-generate)으로
// 방문지 목록을 미리 만들어서 places/segments 컬럼에 저장한다 — "이 여행지로 일정 짜기"는
// 이렇게 미리 만들어 둔 동선만 쓰고, 클릭할 때마다 다시 생성하지 않는다.
//
// 사용법: node --env-file=.env.local scripts/generate-destination-routes.js [여행지 이름...]
//   인자 없이 실행하면 destinations 테이블의 모든 행을 대상으로 한다.
//   Gemini 호출은 로컬 dev 서버(localhost:3000, GEMINI_API_KEY 필요)를 쓰고, 지오코딩은
//   배포된 프로덕션의 Kakao 프록시를 쓴다(로컬 .env.local 에는 KAKAO 키가 없을 수 있어서다 —
//   로컬에 KAKAO_REST_API_KEY 가 있다면 GEOCODE_BASE 를 http://localhost:3000 으로 바꿔도 된다).
//
// 주의: scripts/seed-destinations.mjs 를 다시 실행하면 destinations 테이블 행 자체가 삭제/재삽입돼
// 여기서 저장한 places/segments 도 함께 사라진다 — seed 스크립트를 다시 돌렸다면 이 스크립트도
// 다시 돌려야 한다.

const { Pool } = require('@neondatabase/serverless');

const GENERATE_BASE = 'http://localhost:3000';
const GEOCODE_BASE = 'https://pinder-one.vercel.app';

const STYLE = '알차게';
const COMPANION = '혼자';
const TRANSPORT = 'transit';
const TRIP_START = '2026-06-01';
const TRIP_END = '2026-06-01';

const targetNames = process.argv.slice(2);

async function generatePlaces(region, interests) {
  const res = await fetch(`${GENERATE_BASE}/api/route-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region,
      style: STYLE,
      interests,
      companion: COMPANION,
      tripStart: TRIP_START,
      tripEnd: TRIP_END,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'AI 일정을 생성하지 못했습니다.');
  return data.places;
}

async function searchKeyword(query) {
  const res = await fetch(`${GEOCODE_BASE}/api/kakao`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'keyword', params: { query } }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** 조합 쿼리가 실패하면 장소명만으로 한 번 더 시도한다 (AiGenerateWizard 의 재시도 전략과 동일). */
async function geocode(region, name, addressHint) {
  const queries = addressHint
    ? [`${region} ${addressHint} ${name}`, `${region} ${name}`, name]
    : [`${region} ${name}`, name];
  for (const query of queries) {
    try {
      const data = await searchKeyword(query);
      const doc = data?.documents?.[0];
      if (doc) return { x: Number(doc.x), y: Number(doc.y) };
    } catch {
      // 다음 후보 쿼리로 계속.
    }
  }
  return { x: null, y: null };
}

async function buildRoute(region, tags) {
  const aiPlaces = await generatePlaces(region, tags);
  const places = [];
  for (const p of aiPlaces) {
    const { x, y } = await geocode(region, p.name, p.addressHint);
    places.push({
      id: places.length + 1,
      name: p.name,
      category: p.category || '미분류',
      address: p.addressHint || p.name,
      duration: p.duration,
      hours: 'unknown',
      hoursLabel: '영업시간 확인 필요',
      visitTime: '',
      packItems: '',
      weather: 'sunny',
      day: 0,
      x,
      y,
    });
  }
  const segments = new Array(Math.max(0, places.length - 1)).fill(TRANSPORT);
  return { places, segments };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    'select id, name, region, tags from destinations order by section_order, item_order',
  );
  const targets = targetNames.length ? rows.filter((r) => targetNames.includes(r.name)) : rows;

  for (const dest of targets) {
    console.log(`\n=== ${dest.name} (${dest.region}) ===`);
    try {
      const { places, segments } = await buildRoute(dest.name, dest.tags);
      console.log(
        `생성된 장소 ${places.length}곳:`,
        places.map((p) => `${p.name}${p.x == null ? '(좌표없음)' : ''}`).join(', '),
      );
      await pool.query(
        'update destinations set places = $1::jsonb, segments = $2::jsonb where id = $3',
        [JSON.stringify(places), JSON.stringify(segments), dest.id],
      );
      console.log('저장 완료.');
    } catch (err) {
      console.error(`실패: ${err.message}`);
    }
  }

  await pool.end();
}

main();

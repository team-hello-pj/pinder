// destinations 테이블의 각 여행지에 대해 우리 AI 동선 생성 기능(/api/route-generate)으로
// 2박3일짜리 방문지 목록을 한 번 생성한 뒤, 그 안에서 1일차/1~2일차/1~3일차를 그대로 잘라내
// 당일치기·1박2일·2박3일 세 가지 동선을 만들어 routes 컬럼에 저장한다.
// (기간별로 따로 생성하지 않고 한 번 생성한 결과를 잘라 쓰는 이유: Gemini 하루 호출 한도가
// 20개(팀 공용)라 여행지 하나당 여러 번 부르는 걸 피한다.)
//
// "이 여행지로 일정 짜기"는 이렇게 미리 만들어 둔 동선만 쓰고, 클릭할 때마다 다시 생성하지 않는다.
// routes 에 담긴 기간이 하나뿐이면(--days=1 로 만든 경우) 화면에서 며칠인지 묻지 않고 바로
// 그 기간으로 시작한다 — 예: 드라이브 코스는 당일치기만 만들어서 그렇게 동작하게 한다.
//
// 사용법: node --env-file=.env.local scripts/generate-destination-routes.js [여행지 이름...]
//   [--days=1|2|3] 그 기간까지만 생성해서 routes 를 통째로 교체(기본은 3 — 당일치기/1박2일/
//     2박3일 세 가지를 다 만들어서 저장).
//   [--style=<값>] (기본 "알차게")
//   [--interests=a,b,c] (기본은 각 여행지의 태그)
//   [--transport=car|walk|transit|bike] (기본 "transit")
//   인자로 여행지 이름을 안 주면 destinations 테이블의 모든 행을 대상으로 한다.
//   Gemini 호출은 로컬 dev 서버(localhost:3000, GEMINI_API_KEY 필요)를 쓰고, 지오코딩은
//   배포된 프로덕션의 Kakao 프록시를 쓴다(로컬 .env.local 에는 KAKAO 키가 없을 수 있어서다 —
//   로컬에 KAKAO_REST_API_KEY 가 있다면 GEOCODE_BASE 를 http://localhost:3000 으로 바꿔도 된다).
//
// 주의: scripts/seed-destinations.mjs 를 다시 실행하면 destinations 테이블 행 자체가 삭제/재삽입돼
// 여기서 저장한 routes 도 함께 사라진다 — seed 스크립트를 다시 돌렸다면 이 스크립트도 다시 돌려야 한다.

const { Pool } = require('@neondatabase/serverless');

const GENERATE_BASE = 'http://localhost:3000';
const GEOCODE_BASE = 'https://pinder-one.vercel.app';

const args = process.argv.slice(2);
const flags = {};
const targetNames = [];
for (const arg of args) {
  const m = /^--([^=]+)=(.*)$/.exec(arg);
  if (m) flags[m[1]] = m[2];
  else targetNames.push(arg);
}

const STYLE = flags.style || '알차게';
const TRANSPORT = flags.transport || 'transit';
const COMPANION = '혼자';
const TRIP_DAYS = flags.days ? Number(flags.days) : 3;
const TRIP_START = '2026-06-01';
const TRIP_END = new Date(new Date(TRIP_START).getTime() + (TRIP_DAYS - 1) * 86400000)
  .toISOString()
  .slice(0, 10);
const INTERESTS_OVERRIDE = flags.interests ? flags.interests.split(',') : null;

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

/** 잘라낸 조각(days개 일차)으로 places/segments 를 다시 번호 매겨 만든다. */
function buildVariant(fullPlaces, days) {
  const places = fullPlaces.filter((p) => p.day < days).map((p, i) => ({ ...p, id: i + 1 }));
  const segments = new Array(Math.max(0, places.length - 1)).fill(TRANSPORT);
  return { places, segments };
}

async function buildRoutes(region, tags) {
  const aiPlaces = await generatePlaces(region, INTERESTS_OVERRIDE || tags);
  const fullPlaces = [];
  for (const p of aiPlaces) {
    const { x, y } = await geocode(region, p.name, p.addressHint);
    fullPlaces.push({
      id: fullPlaces.length + 1,
      name: p.name,
      category: p.category || '미분류',
      address: p.addressHint || p.name,
      duration: p.duration,
      hours: 'unknown',
      hoursLabel: '영업시간 확인 필요',
      visitTime: '',
      packItems: '',
      weather: 'sunny',
      day: Math.max(0, (p.day || 1) - 1),
      x,
      y,
    });
  }
  fullPlaces.sort((a, b) => a.day - b.day);

  // --days=1 처럼 그 기간까지만 만들라고 하면, routes 는 그 하나만 담아 통째로 교체한다
  // (더 긴 기간 옵션 자체가 없어져서 화면에서도 며칠인지 묻지 않고 바로 시작한다).
  const routes = {};
  for (let len = 1; len <= TRIP_DAYS; len++) routes[len] = buildVariant(fullPlaces, len);
  return routes;
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
      const routes = await buildRoutes(dest.name, dest.tags);
      for (let len = 1; len <= TRIP_DAYS; len++) {
        const { places } = routes[len];
        console.log(`  ${len}일: ${places.map((p) => p.name).join(', ')}`);
      }
      await pool.query('update destinations set routes = $1::jsonb where id = $2', [
        JSON.stringify(routes),
        dest.id,
      ]);
      console.log('저장 완료.');
    } catch (err) {
      console.error(`실패: ${err.message}`);
    }
  }

  await pool.end();
}

main();

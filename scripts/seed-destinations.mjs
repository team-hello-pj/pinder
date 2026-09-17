// 탐색(Explore) 화면의 큐레이션 데이터를 destinations 테이블에 채운다.
// 이미 있는 행은 지우고 다시 넣는다 — 관리자 화면이 없어서 지금은 이 스크립트가 유일한 편집 경로다.
// 사용법: node scripts/seed-destinations.mjs  (.env 의 DATABASE_URL 을 사용한다)
//
// 주의: 행을 통째로 지우고 다시 넣으므로, scripts/generate-destination-routes.js 로 미리
// 만들어 둔 "이 여행지로 일정 짜기"용 동선(places/segments)도 함께 사라진다. 이 스크립트를
// 다시 실행했다면 generate-destination-routes.js 도 다시 실행해야 한다.

import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx === -1) continue;
  const key = t.slice(0, idx).trim();
  const val = t.slice(idx + 1).trim();
  if (key && !process.env[key]) process.env[key] = val;
}

const SECTIONS = [
  {
    title: '당장 차키 챙기자',
    subtitle: '드라이브하기 좋은 곳',
    items: [
      {
        name: '제주도',
        region: '제주',
        badge: '드라이브',
        desc: '오름과 해안도로를 잇는 자유여행의 정석',
        tags: ['자연', '드라이브'],
      },
      {
        name: '부산',
        region: '부산',
        badge: '드라이브',
        desc: '바다와 도심을 함께 즐기는 대표 휴양 도시',
        tags: ['해변', '도시여행'],
      },
      {
        name: '경주',
        region: '경북',
        badge: '드라이브',
        desc: '유적과 벚꽃길이 어우러진 역사 여행지',
        tags: ['역사', '문화'],
      },
      {
        name: '군산',
        region: '전북',
        badge: '드라이브',
        desc: '오래된 빵집과 베이커리 투어로 유명한 항구도시',
        tags: ['베이커리', '카페'],
      },
      {
        name: '동대문',
        region: '서울',
        badge: '드라이브',
        desc: '밤새 열리는 쇼핑 상권과 야시장',
        tags: ['쇼핑', '야경'],
      },
      {
        name: '전주',
        region: '전북',
        badge: '드라이브',
        desc: '한정식과 길거리 음식이 풍부한 미식 도시',
        tags: ['미식', '한옥'],
      },
    ],
  },
  {
    title: '가을 타나봐',
    subtitle: '🍂🍂🍂',
    items: [
      {
        name: '속초',
        region: '강원',
        badge: '급상승',
        desc: '서울에서 가까운 바다+산 당일여행 코스',
        tags: ['근교', '자연'],
      },
      {
        name: '통영',
        region: '경남',
        badge: '급상승',
        desc: '한적한 항구와 섬 여행이 주목받는 곳',
        tags: ['해변', '섬여행'],
      },
      {
        name: '연남동',
        region: '서울',
        badge: '급상승',
        desc: '개성 있는 베이커리와 카페가 몰려있는 동네',
        tags: ['베이커리', '카페'],
      },
      {
        name: '을지로',
        region: '서울',
        badge: '급상승',
        desc: '뉴트로 감성의 소품샵과 쇼핑거리',
        tags: ['쇼핑', '감성'],
      },
      {
        name: '포항',
        region: '경북',
        badge: '급상승',
        desc: '신선한 해산물과 물회가 유명한 미식 여행지',
        tags: ['미식', '해산물'],
      },
      {
        name: '남이섬',
        region: '강원',
        badge: '가을',
        desc: '메타세쿼이아길과 은행나무길이 물드는 대표 단풍 명소',
        tags: ['단풍', '자연'],
      },
      {
        name: '내장산',
        region: '전북',
        badge: '가을',
        desc: '빨갛게 물든 단풍터널로 유명한 가을 산행 명소',
        tags: ['단풍', '등산'],
      },
      {
        name: '담양',
        region: '전남',
        badge: '가을',
        desc: '메타세쿼이아 가로수길과 대나무숲을 걷는 힐링 코스',
        tags: ['자연', '산책'],
      },
    ],
  },
];

const sql = neon(process.env.DATABASE_URL);

await sql`DELETE FROM destinations`;

let inserted = 0;
for (let si = 0; si < SECTIONS.length; si++) {
  const section = SECTIONS[si];
  for (let ii = 0; ii < section.items.length; ii++) {
    const item = section.items[ii];
    await sql`
      INSERT INTO destinations (id, section_title, section_subtitle, section_order, item_order, name, region, badge, "desc", tags)
      VALUES (${crypto.randomUUID()}, ${section.title}, ${section.subtitle}, ${si}, ${ii}, ${item.name}, ${item.region}, ${item.badge}, ${item.desc}, ${JSON.stringify(item.tags)}::jsonb)
    `;
    inserted++;
  }
}

console.log(`Seeded ${inserted} destinations across ${SECTIONS.length} sections.`);

import { NextResponse } from 'next/server';

import {
  LOCAL_BASE,
  MOBILITY_BASE,
  kakaoGet,
  parseCarRoute,
  parseLegBasedRoute,
  parseTransitRoute,
} from '@/lib/kakao/server';

/**
 * POST /api/kakao — Kakao REST 단일 프록시. Body: { action, params }
 * KAKAO_REST_API_KEY 가 필요하며, 키는 절대 클라이언트로 나가지 않는다.
 */

export const runtime = 'nodejs';

type Action =
  | 'geocode'
  | 'reverseGeocode'
  | 'keyword'
  | 'nearby'
  | 'car'
  | 'walk'
  | 'transit'
  | 'bike';

/** 지도 클릭 좌표 주변의 실제 장소 후보를 찾을 때 훑는 대표 카테고리 — Kakao 카테고리 검색은
 * "전체" 카테고리 옵션이 없으므로, 자주 방문지가 될 만한 카테고리를 병렬로 조회해 합친다.
 * 상업시설이 드문 주거/외곽 지역에서도 후보가 아예 안 나오는 경우를 줄이려고 지하철역·
 * 대형마트·문화시설·은행처럼 널리 퍼져 있는 카테고리도 포함한다. */
const NEARBY_CATEGORY_CODES = [
  'FD6',
  'CE7',
  'CS2',
  'PO3',
  'SC4',
  'AT4',
  'HP8',
  'AD5',
  'MT1',
  'CT1',
  'SW8',
  'BK9',
] as const;
/** 상업시설이 드문 곳에서도 후보를 찾을 확률을 높이려고 300m보다 넓게 훑는다. */
const NEARBY_SEARCH_RADIUS_M = 800;

interface KakaoRequestBody {
  action?: Action;
  params?: Record<string, string | number | undefined>;
}

const ROUTE_ENDPOINTS = {
  walk: { path: `${LOCAL_BASE}/v2/routing/walk`, label: '도보' },
  transit: { path: `${LOCAL_BASE}/v2/routing/publictraffic`, label: '대중교통' },
  bike: { path: `${LOCAL_BASE}/v2/routing/bicycle`, label: '자전거' },
} as const;

export async function POST(request: Request) {
  if (!process.env.KAKAO_REST_API_KEY) {
    return NextResponse.json({ error: 'Kakao API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  let body: KakaoRequestBody;
  try {
    body = (await request.json()) as KakaoRequestBody;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const { action, params = {} } = body;

  try {
    switch (action) {
      case 'geocode': {
        const r = await kakaoGet(`${LOCAL_BASE}/v2/local/search/address.json`, {
          query: params.query,
        });
        if (!r.ok) {
          console.error('kakao geocode error', r.status, r.data);
          return NextResponse.json(
            { error: '주소를 찾지 못했습니다.', detail: r.data },
            { status: 502 },
          );
        }
        return NextResponse.json(r.data);
      }

      case 'reverseGeocode': {
        // "현재 위치를 출발지로 설정" — 브라우저 Geolocation 좌표를 사람이 읽을 수 있는
        // 주소로 바꾼다(좌표 자체는 이미 있으니 여기서는 표시용 주소만 구한다).
        const r = await kakaoGet(`${LOCAL_BASE}/v2/local/geo/coord2address.json`, {
          x: params.x,
          y: params.y,
        });
        if (!r.ok) {
          console.error('kakao reverseGeocode error', r.status, r.data);
          return NextResponse.json(
            { error: '현재 위치의 주소를 찾지 못했습니다.', detail: r.data },
            { status: 502 },
          );
        }
        return NextResponse.json(r.data);
      }

      case 'keyword': {
        const r = await kakaoGet(`${LOCAL_BASE}/v2/local/search/keyword.json`, {
          query: params.query,
          x: params.x,
          y: params.y,
          radius: params.radius,
        });
        if (!r.ok) {
          console.error('kakao keyword error', r.status, r.data);
          return NextResponse.json(
            { error: '장소를 찾지 못했습니다.', detail: r.data },
            { status: 502 },
          );
        }
        return NextResponse.json(r.data);
      }

      case 'nearby': {
        // 지도 클릭 → 좌표의 실제 주소 + 주변 실존 장소 후보. 클릭 좌표 자체는 절대
        // 조작하지 않고 그대로 Kakao 에 전달하며, 후보가 없으면 documents 를 빈 배열로
        // 돌려줘 프론트에서 주소만으로 진행하게 한다(마음대로 후보를 지어내지 않는다).
        const addrRes = await kakaoGet(`${LOCAL_BASE}/v2/local/geo/coord2address.json`, {
          x: params.x,
          y: params.y,
        });
        if (!addrRes.ok) {
          console.error('kakao nearby(reverseGeocode) error', addrRes.status, addrRes.data);
          return NextResponse.json(
            { error: '클릭한 위치의 주소를 찾지 못했습니다.', detail: addrRes.data },
            { status: 502 },
          );
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addrDoc = (addrRes.data as any)?.documents?.[0];
        const radius = params.radius ?? NEARBY_SEARCH_RADIUS_M;

        const categoryResults = await Promise.all(
          NEARBY_CATEGORY_CODES.map((code) =>
            kakaoGet(`${LOCAL_BASE}/v2/local/search/category.json`, {
              category_group_code: code,
              x: params.x,
              y: params.y,
              radius,
              sort: 'distance',
              size: 5,
            }),
          ),
        );

        const seen = new Set<string>();
        const documents = categoryResults
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .flatMap((r) => (r.ok ? ((r.data as any)?.documents ?? []) : []))
          .sort((a, b) => Number(a.distance) - Number(b.distance))
          .filter((doc) => {
            if (seen.has(doc.id)) return false;
            seen.add(doc.id);
            return true;
          })
          .slice(0, 8);

        return NextResponse.json({
          roadAddress: addrDoc?.road_address?.address_name || '',
          jibunAddress: addrDoc?.address?.address_name || '',
          buildingName: addrDoc?.road_address?.building_name || '',
          documents,
        });
      }

      case 'car': {
        const r = await kakaoGet(`${MOBILITY_BASE}/v1/directions`, {
          origin: `${params.originX},${params.originY}`,
          destination: `${params.destX},${params.destY}`,
          // 카카오모빌리티 길찾기 priority 유효값은 RECOMMEND/TIME/DISTANCE 뿐이다 —
          // 'SHORTEST'는 존재하지 않는 값이라 항상 400(invalid priority)으로 실패해서,
          // "최단 거리" 기준으로 계산할 때 자동차 경로(따라서 지도 경로선)가 아예 안 나왔다.
          priority: params.priority === 'distance' ? 'DISTANCE' : 'RECOMMEND',
        });
        if (!r.ok) {
          console.error('kakao car route error', r.status, r.data);
          return NextResponse.json(
            { error: '자동차 경로를 찾지 못했습니다.', detail: r.data },
            { status: 502 },
          );
        }
        const parsed = parseCarRoute(r.data);
        if (!parsed) {
          return NextResponse.json(
            { error: '자동차 경로 응답을 해석하지 못했습니다.' },
            { status: 502 },
          );
        }
        return NextResponse.json(parsed);
      }

      case 'walk':
      case 'bike':
      case 'transit': {
        const { path, label } = ROUTE_ENDPOINTS[action];
        const r = await kakaoGet(path, {
          start_x: params.originX,
          start_y: params.originY,
          end_x: params.destX,
          end_y: params.destY,
        });
        if (!r.ok) {
          // 429 는 무료 쿼터 초과일 가능성이 높다.
          console.error(`kakao ${action} route error`, r.status, r.data);
          return NextResponse.json(
            { error: `${label} 경로를 불러오지 못했습니다.`, detail: r.data },
            { status: 502 },
          );
        }
        const parsed =
          action === 'transit'
            ? parseTransitRoute(r.data, params.priority as string | undefined)
            : parseLegBasedRoute(r.data);
        if (!parsed) {
          return NextResponse.json(
            { error: `${label} 경로 응답을 해석하지 못했습니다.`, detail: r.data },
            { status: 502 },
          );
        }
        return NextResponse.json(parsed);
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('kakao handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

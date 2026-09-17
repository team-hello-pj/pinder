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

type Action = 'geocode' | 'keyword' | 'car' | 'walk' | 'transit' | 'bike';

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

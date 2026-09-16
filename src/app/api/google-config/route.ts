import { NextResponse } from 'next/server';

/**
 * GET /api/google-config — Google Identity Services 클라이언트 ID만 내려준다.
 * 이 값 자체는 공개 값(브라우저에 노출되는 게 정상)이지만, 코드에 하드코딩하지 않고
 * 다른 외부 서비스 키(kakao-config)와 같은 방식으로 서버 환경변수로 관리한다.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Server is missing GOOGLE_CLIENT_ID' }, { status: 500 });
  }
  return NextResponse.json({ clientId });
}

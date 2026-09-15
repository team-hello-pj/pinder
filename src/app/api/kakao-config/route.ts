import { NextResponse } from 'next/server';

/** GET /api/kakao-config — JS SDK 키만 내려준다. REST/Gemini 키는 절대 포함하지 않는다. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.KAKAO_JS_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Server is missing KAKAO_JS_KEY' }, { status: 500 });
  }
  return NextResponse.json({ javascriptKey: key });
}

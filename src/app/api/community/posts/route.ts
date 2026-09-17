import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { posts } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 게시물 사진 개수/용량 제한 — src/lib/community.ts 의 MAX_POST_IMAGES(클라이언트 UI 제한)와 값을 맞춰둔다.
const MAX_POST_IMAGES = 5;
const MAX_IMAGE_DATA_URL_LENGTH = 3_000_000;
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function GET() {
  const session = await getSessionUser();
  const list = await listPosts(session?.id ?? null);
  return NextResponse.json({ posts: list });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { place, region, caption, tags, images } = ((await request.json().catch(() => null)) ??
    {}) as {
    place?: string;
    region?: string;
    caption?: string;
    tags?: string[];
    images?: string[];
  };
  if (!place?.trim() || !region?.trim() || !caption?.trim()) {
    return NextResponse.json({ error: '여행지와 감상평을 입력해주세요.' }, { status: 400 });
  }
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: '사진을 1장 이상 첨부해주세요.' }, { status: 400 });
  }
  if (images.length > MAX_POST_IMAGES) {
    return NextResponse.json(
      { error: `사진은 최대 ${MAX_POST_IMAGES}장까지 첨부할 수 있어요.` },
      { status: 400 },
    );
  }
  if (images.some((img) => typeof img !== 'string' || !IMAGE_DATA_URL_RE.test(img))) {
    return NextResponse.json({ error: '이미지 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (images.some((img) => img.length > MAX_IMAGE_DATA_URL_LENGTH)) {
    return NextResponse.json({ error: '이미지 용량이 너무 큽니다.' }, { status: 400 });
  }

  await db.insert(posts).values({
    authorId: session.id,
    place: place.trim(),
    region: region.trim(),
    caption: caption.trim(),
    tags: Array.isArray(tags) ? tags : [],
    images,
  });

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}

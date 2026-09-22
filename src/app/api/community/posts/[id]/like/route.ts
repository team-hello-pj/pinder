import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postLikes } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const [existing] = await db
    .select({ id: postLikes.id })
    .from(postLikes)
    .where(and(eq(postLikes.postId, id), eq(postLikes.userId, session.id)))
    .limit(1);

  if (existing) {
    await db.delete(postLikes).where(eq(postLikes.id, existing.id));
  } else {
    await db.insert(postLikes).values({ postId: id, userId: session.id });
  }

  // 목록 응답과 마찬가지로 사진 원본은 빼고 imageCount만 내려준다 — 그대로 두면 좋아요를
  // 누를 때마다 전체 게시물의 사진(최대 수십 MB)을 다시 내려받아 클릭이 느리거나 실패한
  // 것처럼 보였다. 화면은 이미 받아둔 사진을 postId 기준으로 계속 붙여서 보여준다.
  const list = await listPosts(session.id, false);
  return NextResponse.json({ posts: list });
}

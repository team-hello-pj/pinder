import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postCommentReplies } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const result = await db
    .delete(postCommentReplies)
    .where(and(eq(postCommentReplies.id, id), eq(postCommentReplies.authorId, session.id)))
    .returning({ id: postCommentReplies.id });
  if (result.length === 0) {
    return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 });
  }

  // 목록 응답과 마찬가지로 사진 원본은 빼고 imageCount만 내려준다.
  const list = await listPosts(session.id, false);
  return NextResponse.json({ posts: list });
}

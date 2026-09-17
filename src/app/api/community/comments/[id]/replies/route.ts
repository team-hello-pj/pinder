import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postCommentReplies, postComments } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { createNotification } from '@/lib/server/notifications';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { text } = ((await request.json().catch(() => null)) ?? {}) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: '답글을 입력해주세요.' }, { status: 400 });

  const [comment] = await db
    .select({ authorId: postComments.authorId, postId: postComments.postId })
    .from(postComments)
    .where(eq(postComments.id, id))
    .limit(1);

  await db
    .insert(postCommentReplies)
    .values({ commentId: id, authorId: session.id, text: text.trim() });

  if (comment && comment.authorId !== session.id) {
    await createNotification(
      comment.authorId,
      'comment',
      `${session.nickname ?? session.name}님이 회원님의 댓글에 답글을 남겼어요.`,
      'communityComment',
      { relatedId: comment.postId },
    );
  }

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postComments, posts } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { createNotification } from '@/lib/server/notifications';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { text } = ((await request.json().catch(() => null)) ?? {}) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: '댓글을 입력해주세요.' }, { status: 400 });

  const [post] = await db
    .select({ authorId: posts.authorId, place: posts.place })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  await db.insert(postComments).values({ postId: id, authorId: session.id, text: text.trim() });

  if (post && post.authorId !== session.id) {
    await createNotification(
      post.authorId,
      'comment',
      `${session.nickname ?? session.name}님이 「${post.place}」에 댓글을 남겼어요.`,
      'communityComment',
      { relatedId: id },
    );
  }

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}

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

  // 목록 응답과 마찬가지로 사진 원본은 빼고 imageCount만 내려준다 — 그대로 두면 댓글을
  // 남길 때마다 전체 게시물의 사진(최대 수십 MB)을 다시 내려받게 된다.
  const list = await listPosts(session.id, false);
  return NextResponse.json({ posts: list });
}

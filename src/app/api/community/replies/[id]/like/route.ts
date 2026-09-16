import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { postReplyLikes } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const [existing] = await db
    .select({ id: postReplyLikes.id })
    .from(postReplyLikes)
    .where(and(eq(postReplyLikes.replyId, id), eq(postReplyLikes.userId, session.id)))
    .limit(1);

  if (existing) {
    await db.delete(postReplyLikes).where(eq(postReplyLikes.id, existing.id));
  } else {
    await db.insert(postReplyLikes).values({ replyId: id, userId: session.id });
  }

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}

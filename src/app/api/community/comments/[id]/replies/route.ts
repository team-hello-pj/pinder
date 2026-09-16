import { NextResponse } from 'next/server';

import { db } from '@/db/client';
import { postCommentReplies } from '@/db/schema';
import { listPosts } from '@/lib/server/community';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { text } = ((await request.json().catch(() => null)) ?? {}) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: '답글을 입력해주세요.' }, { status: 400 });

  await db
    .insert(postCommentReplies)
    .values({ commentId: id, authorId: session.id, text: text.trim() });

  const list = await listPosts(session.id);
  return NextResponse.json({ posts: list });
}

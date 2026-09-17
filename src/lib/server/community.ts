import 'server-only';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  postBookmarks,
  postCommentLikes,
  postCommentReplies,
  postComments,
  postLikes,
  postReplyLikes,
  posts,
  users,
} from '@/db/schema';

export interface ReplyView {
  id: string;
  author: string;
  text: string;
  liked: boolean;
  likeCount: number;
  isMine: boolean;
}

export interface CommentView {
  id: string;
  author: string;
  text: string;
  liked: boolean;
  likeCount: number;
  isMine: boolean;
  replies: ReplyView[];
}

export interface PostView {
  id: string;
  author: string;
  place: string;
  region: string;
  caption: string;
  tags: string[];
  images: string[];
  timestamp: number;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  isMine: boolean;
  comments: CommentView[];
}

/** 게시글 목록 + 댓글/답글까지 한 번에 조립해서 돌려준다 (커뮤니티 화면은 전체를 한 번에 그린다). */
export async function listPosts(viewerId: string | null): Promise<PostView[]> {
  const postRows = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      authorNickname: users.nickname,
      authorName: users.name,
      place: posts.place,
      region: posts.region,
      caption: posts.caption,
      tags: posts.tags,
      images: posts.images,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt));

  if (postRows.length === 0) return [];
  const postIds = postRows.map((p) => p.id);

  const likeRows = await db
    .select({ postId: postLikes.postId, userId: postLikes.userId })
    .from(postLikes)
    .where(inArray(postLikes.postId, postIds));
  const likeCountByPost = new Map<string, number>();
  const likedPostIdsByViewer = new Set<string>();
  for (const row of likeRows) {
    likeCountByPost.set(row.postId, (likeCountByPost.get(row.postId) ?? 0) + 1);
    if (viewerId && row.userId === viewerId) likedPostIdsByViewer.add(row.postId);
  }

  const bookmarkRows = viewerId
    ? await db
        .select({ postId: postBookmarks.postId })
        .from(postBookmarks)
        .where(and(inArray(postBookmarks.postId, postIds), eq(postBookmarks.userId, viewerId)))
    : [];
  const bookmarkedPostIds = new Set(bookmarkRows.map((r) => r.postId));

  const commentRows = await db
    .select({
      id: postComments.id,
      postId: postComments.postId,
      authorId: postComments.authorId,
      authorNickname: users.nickname,
      authorName: users.name,
      text: postComments.text,
      createdAt: postComments.createdAt,
    })
    .from(postComments)
    .innerJoin(users, eq(postComments.authorId, users.id))
    .where(inArray(postComments.postId, postIds))
    .orderBy(postComments.createdAt);
  const commentIds = commentRows.map((c) => c.id);

  const commentLikeRows = commentIds.length
    ? await db
        .select({ commentId: postCommentLikes.commentId, userId: postCommentLikes.userId })
        .from(postCommentLikes)
        .where(inArray(postCommentLikes.commentId, commentIds))
    : [];
  const commentLikeCount = new Map<string, number>();
  const commentLikedByViewer = new Set<string>();
  for (const row of commentLikeRows) {
    commentLikeCount.set(row.commentId, (commentLikeCount.get(row.commentId) ?? 0) + 1);
    if (viewerId && row.userId === viewerId) commentLikedByViewer.add(row.commentId);
  }

  const replyRows = commentIds.length
    ? await db
        .select({
          id: postCommentReplies.id,
          commentId: postCommentReplies.commentId,
          authorId: postCommentReplies.authorId,
          authorNickname: users.nickname,
          authorName: users.name,
          text: postCommentReplies.text,
          createdAt: postCommentReplies.createdAt,
        })
        .from(postCommentReplies)
        .innerJoin(users, eq(postCommentReplies.authorId, users.id))
        .where(inArray(postCommentReplies.commentId, commentIds))
        .orderBy(postCommentReplies.createdAt)
    : [];
  const replyIds = replyRows.map((r) => r.id);

  const replyLikeRows = replyIds.length
    ? await db
        .select({ replyId: postReplyLikes.replyId, userId: postReplyLikes.userId })
        .from(postReplyLikes)
        .where(inArray(postReplyLikes.replyId, replyIds))
    : [];
  const replyLikeCount = new Map<string, number>();
  const replyLikedByViewer = new Set<string>();
  for (const row of replyLikeRows) {
    replyLikeCount.set(row.replyId, (replyLikeCount.get(row.replyId) ?? 0) + 1);
    if (viewerId && row.userId === viewerId) replyLikedByViewer.add(row.replyId);
  }

  const repliesByComment = new Map<string, ReplyView[]>();
  for (const r of replyRows) {
    const list = repliesByComment.get(r.commentId) ?? [];
    list.push({
      id: r.id,
      author: r.authorNickname || r.authorName,
      text: r.text,
      liked: replyLikedByViewer.has(r.id),
      likeCount: replyLikeCount.get(r.id) ?? 0,
      isMine: viewerId === r.authorId,
    });
    repliesByComment.set(r.commentId, list);
  }

  const commentsByPost = new Map<string, CommentView[]>();
  for (const c of commentRows) {
    const list = commentsByPost.get(c.postId) ?? [];
    list.push({
      id: c.id,
      author: c.authorNickname || c.authorName,
      text: c.text,
      liked: commentLikedByViewer.has(c.id),
      likeCount: commentLikeCount.get(c.id) ?? 0,
      isMine: viewerId === c.authorId,
      replies: repliesByComment.get(c.id) ?? [],
    });
    commentsByPost.set(c.postId, list);
  }

  return postRows.map((p) => ({
    id: p.id,
    author: p.authorNickname || p.authorName,
    place: p.place,
    region: p.region,
    caption: p.caption,
    tags: p.tags as string[],
    images: (p.images as string[] | null) ?? [],
    timestamp: p.createdAt.getTime(),
    liked: likedPostIdsByViewer.has(p.id),
    likeCount: likeCountByPost.get(p.id) ?? 0,
    bookmarked: bookmarkedPostIds.has(p.id),
    isMine: viewerId === p.authorId,
    comments: commentsByPost.get(p.id) ?? [],
  }));
}

/** 사이드바 "이번 주 인기 여행지" — 실제 게시글의 place 별 개수를 집계한다. */
export async function listTrendingPlaces(limit = 3): Promise<{ name: string; count: number }[]> {
  const rows = await db
    .select({ place: posts.place, count: sql<number>`count(*)::int` })
    .from(posts)
    .groupBy(posts.place)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows.map((r) => ({ name: r.place, count: r.count }));
}

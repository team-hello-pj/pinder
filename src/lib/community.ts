'use client';

/** 커뮤니티 게시글/댓글/답글/좋아요/북마크 API 래퍼 (`/api/community/*`). */

export interface ReplyView {
  id: string;
  author: string;
  text: string;
  liked: boolean;
  likeCount: number;
}

export interface CommentView {
  id: string;
  author: string;
  text: string;
  liked: boolean;
  likeCount: number;
  replies: ReplyView[];
}

export interface PostView {
  id: string;
  author: string;
  place: string;
  region: string;
  caption: string;
  tags: string[];
  timestamp: number;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  isMine: boolean;
  comments: CommentView[];
}

export interface PostInput {
  place: string;
  region: string;
  caption: string;
  tags: string[];
}

async function postsJson(res: Response): Promise<PostView[]> {
  const data = await res.json().catch(() => null);
  return data?.posts ?? [];
}

export async function listPosts(): Promise<PostView[]> {
  const res = await fetch('/api/community/posts');
  return postsJson(res);
}

export async function createPost(input: PostInput): Promise<PostView[]> {
  const res = await fetch('/api/community/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return postsJson(res);
}

export async function updatePost(id: string, input: PostInput): Promise<PostView[]> {
  const res = await fetch(`/api/community/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return postsJson(res);
}

export async function deletePost(id: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/posts/${id}`, { method: 'DELETE' });
  return postsJson(res);
}

export async function togglePostLike(id: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/posts/${id}/like`, { method: 'POST' });
  return postsJson(res);
}

export async function togglePostBookmark(id: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/posts/${id}/bookmark`, { method: 'POST' });
  return postsJson(res);
}

export async function addComment(postId: string, text: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return postsJson(res);
}

export async function toggleCommentLike(commentId: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/comments/${commentId}/like`, { method: 'POST' });
  return postsJson(res);
}

export async function addReply(commentId: string, text: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/comments/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return postsJson(res);
}

export async function toggleReplyLike(replyId: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/replies/${replyId}/like`, { method: 'POST' });
  return postsJson(res);
}

export async function listTrendingPlaces(): Promise<{ name: string; count: number }[]> {
  const res = await fetch('/api/community/trending');
  const data = await res.json().catch(() => null);
  return data?.trending ?? [];
}

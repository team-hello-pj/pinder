'use client';

/** 커뮤니티 게시글/댓글/답글/좋아요/북마크 API 래퍼 (`/api/community/*`). */

export interface ReplyView {
  id: string;
  author: string;
  authorAvatarUrl: string | null;
  text: string;
  liked: boolean;
  likeCount: number;
  isMine: boolean;
}

export interface CommentView {
  id: string;
  author: string;
  authorAvatarUrl: string | null;
  text: string;
  liked: boolean;
  likeCount: number;
  isMine: boolean;
  replies: ReplyView[];
}

export interface PostView {
  id: string;
  author: string;
  authorAvatarUrl: string | null;
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

export interface PostInput {
  place: string;
  region: string;
  caption: string;
  tags: string[];
  /** 새 게시물 작성 시에만 필수. 수정(updatePost)에는 보내지 않으면 기존 사진이 그대로 유지된다. */
  images?: string[];
}

export const MAX_POST_IMAGES = 5;
const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_JPEG_QUALITY = 0.82;

/** 게시물 사진 리사이즈 — avatar-upload.ts 의 resizeImageFile 과 달리 정사각형으로 자르지 않고 비율을 유지한 채 긴 변만 줄인다. */
export function resizePostImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지를 처리하지 못했어요.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function postsJson(res: Response): Promise<PostView[]> {
  const data = await res.json().catch(() => null);
  // 서버가 검증 실패(400)/미인증(401)/오류(500)로 { error } 를 응답하면 { posts } 가 없어
  // data?.posts 가 그냥 undefined 로 흘러버렸다 — 실패를 "게시물 0개 응답"으로 오인해 목록이
  // 비어 보이고, 호출부는 정상 완료된 것처럼 다음 동작(모달 닫기, 완료 토스트 등)을 이어갔다.
  // 상태 코드로 실패를 명확히 구분해 호출부가 catch 로 실패를 알 수 있게 한다.
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error || '요청을 처리하지 못했어요.';
    throw new Error(message);
  }
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

export async function deleteComment(commentId: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' });
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

export async function deleteReply(replyId: string): Promise<PostView[]> {
  const res = await fetch(`/api/community/replies/${replyId}`, { method: 'DELETE' });
  return postsJson(res);
}

export async function listTrendingPlaces(): Promise<{ name: string; count: number }[]> {
  const res = await fetch('/api/community/trending');
  const data = await res.json().catch(() => null);
  return data?.trending ?? [];
}

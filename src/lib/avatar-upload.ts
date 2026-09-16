'use client';

/** 프로필 사진 API 래퍼 (`/api/account/avatar`) + 업로드 전 리사이즈. */

const MAX_DIMENSION = 200;
const JPEG_QUALITY = 0.8;

/** 이미지 파일을 정사각형으로 자르고 리사이즈해서 JPEG data URL로 만든다. */
export function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = MAX_DIMENSION;
        canvas.height = MAX_DIMENSION;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지를 처리하지 못했어요.'));
          return;
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, MAX_DIMENSION, MAX_DIMENSION);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function getMyAvatar(): Promise<string | null> {
  const res = await fetch('/api/account/avatar');
  const data = await res.json().catch(() => null);
  return data?.avatarUrl ?? null;
}

export async function updateMyAvatar(dataUrl: string): Promise<string | null> {
  const res = await fetch('/api/account/avatar', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) return null;
  return data.avatarUrl as string;
}

export async function removeMyAvatar(): Promise<boolean> {
  const res = await fetch('/api/account/avatar', { method: 'DELETE' });
  return res.ok;
}

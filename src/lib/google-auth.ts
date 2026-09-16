'use client';

import type { AuthUser } from '@/lib/auth';

/**
 * Google Identity Services(GSI) 로더 + 로그인 콜백 처리.
 * ID 토큰(JWT)은 `/api/auth/google` 로 보내 서버에서 서명을 검증한 뒤 세션을 발급받는다.
 */

let sdkPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google 스크립트 로드 실패')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

/** /api/google-config 에서 클라이언트 ID를 받아온다. */
async function fetchClientId(): Promise<string> {
  const res = await fetch('/api/google-config');
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.clientId) {
    throw new Error(data?.error ?? 'Google 클라이언트 ID를 불러오지 못했습니다.');
  }
  return data.clientId as string;
}

/**
 * Google 로그인 버튼을 지정한 컨테이너에 렌더링한다.
 * onSuccess 는 서버가 검증하고 세션을 발급한 뒤 돌려준 실제 계정 정보와 함께 호출된다.
 */
export async function renderGoogleLoginButton(
  container: HTMLElement,
  onSuccess: (user: AuthUser) => void,
  onError: (message: string) => void,
): Promise<void> {
  if (!sdkPromise) sdkPromise = loadGsiScript();
  try {
    await sdkPromise;
    const clientId = await fetchClientId();
    if (!window.google?.accounts?.id) throw new Error('Google 로그인을 초기화하지 못했습니다.');

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (!response.credential) {
          onError('Google 로그인에 실패했어요. 다시 시도해주세요.');
          return;
        }
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.user) {
            onError(data?.error ?? '구글 로그인을 확인하지 못했어요.');
            return;
          }
          onSuccess(data.user as AuthUser);
        } catch {
          onError('구글 로그인 중 오류가 발생했어요.');
        }
      },
    });
    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 320,
    });
  } catch (err) {
    sdkPromise = null;
    onError(err instanceof Error ? err.message : 'Google 로그인을 시작할 수 없어요.');
  }
}

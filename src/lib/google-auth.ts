'use client';

/**
 * Google Identity Services(GSI) 로더 + 로그인 콜백 처리.
 * legacy/Login Screen.dc.html 이 하던 것과 같은 수준으로 동작한다 — 서버 검증 없이
 * ID 토큰(JWT)이 왔다는 사실 자체를 "로그인 성공 신호"로만 쓴다.
 *
 * TODO(인증 담당): 실제 서비스에서는 이 credential(JWT)을 서버로 보내
 * google-auth-library 등으로 서명을 검증한 뒤 세션을 발급해야 한다.
 * 지금은 이 앱 전체가 아직 목업 인증(lib/auth.ts, SessionProvider) 단계라
 * 같은 신뢰 수준으로 맞춰뒀다.
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

export interface GoogleProfile {
  email: string | null;
  name: string | null;
}

/** JWT의 payload 부분만 디코드한다 (서명 검증 없음 — 위 TODO 참고). */
function decodeCredential(credential: string): GoogleProfile {
  try {
    const payload = credential.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return { email: json.email ?? null, name: json.name ?? null };
  } catch {
    return { email: null, name: null };
  }
}

/**
 * Google 로그인 버튼을 지정한 컨테이너에 렌더링한다.
 * onSuccess 는 credential(JWT)을 디코드한 프로필과 함께 호출된다.
 */
export async function renderGoogleLoginButton(
  container: HTMLElement,
  onSuccess: (profile: GoogleProfile) => void,
  onError: (message: string) => void,
): Promise<void> {
  if (!sdkPromise) sdkPromise = loadGsiScript();
  try {
    await sdkPromise;
    const clientId = await fetchClientId();
    if (!window.google?.accounts?.id) throw new Error('Google 로그인을 초기화하지 못했습니다.');

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (!response.credential) {
          onError('Google 로그인에 실패했어요. 다시 시도해주세요.');
          return;
        }
        onSuccess(decodeCredential(response.credential));
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

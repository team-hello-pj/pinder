'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { clearSession, isSessionActive, setSession } from '@/lib/storage';

interface SessionContextValue {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * 프로토타입 단계의 로그인 상태. 실제 인증 백엔드 없이 localStorage(`pd-session`) 로만
 * 로그인 여부를 기억한다 — legacy 의 `prototypeLogin` 과 같은 개념.
 * TODO(인증 담당): 실제 인증 연동 시 login()/logout() 내부만 API 호출로 교체하면 된다.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // localStorage 는 클라이언트에만 있어 서버 렌더와 맞출 수 없으므로, 마운트 후 한 번만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoggedIn(isSessionActive());
  }, []);

  const login = useCallback(() => {
    setSession();
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setIsLoggedIn(false);
  }, []);

  return (
    <SessionContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession 은 SessionProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

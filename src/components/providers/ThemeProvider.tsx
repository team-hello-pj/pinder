'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/lib/storage';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * 첫 페인트 전에 <html data-theme> 을 세팅하는 블로킹 스크립트.
 * 이게 없으면 저장된 테마가 다크여도 한 프레임 동안 라이트 테마가 번쩍인다.
 * layout.tsx 의 <head> 안에서 렌더한다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEYS.theme}');document.documentElement.dataset.theme=(t==='dark'||t==='light')?t:'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

function readInitialTheme(): Theme {
  // 서버에서는 항상 light 로 렌더하고, 클라이언트에서는 위 스크립트가 이미 적용해 둔 값을 읽는다.
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * 전역 테마. tokens.css 가 `[data-theme='dark']` 에 맞춰 CSS 변수를 교체한다.
 * 레거시와 같은 localStorage 키(`pd-theme`)를 쓰므로 기존 사용자 설정이 그대로 유지된다.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      // 저장이 막혀도(사생활 보호 모드 등) 현재 세션의 테마 전환은 정상 동작해야 한다.
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme 은 ThemeProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}

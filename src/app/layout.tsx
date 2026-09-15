import type { Metadata, Viewport } from 'next';

import { THEME_INIT_SCRIPT, ThemeProvider } from '@/components/providers/ThemeProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'p:nder — 여행 경로 플래너',
    template: '%s | p:nder',
  },
  description: '방문지를 모아 최적의 이동 순서를 만들어 주는 여행 경로 플래너',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 테마를 적용해 화면 깜빡임을 막는다. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';

import { SessionProvider } from '@/components/providers/SessionProvider';
import { THEME_INIT_SCRIPT, ThemeProvider } from '@/components/providers/ThemeProvider';
import '@/styles/globals.css';

const SITE_TITLE = 'p:nder — 여행 경로 플래너';
const SITE_DESCRIPTION = '방문지를 모아 최적의 이동 순서를 만들어 주는 여행 경로 플래너';

export const metadata: Metadata = {
  metadataBase: new URL('https://pinder-one.vercel.app'),
  title: {
    default: SITE_TITLE,
    template: '%s | p:nder',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
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
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

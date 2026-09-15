import { SiteHeader } from '@/components/layout/SiteHeader';

/**
 * 헤더가 있는 일반 화면들의 공통 레이아웃.
 * 로그인/회원가입처럼 헤더가 없는 화면은 (auth) 그룹에 둔다.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
    </>
  );
}

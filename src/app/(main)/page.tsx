import Link from 'next/link';

import { ROUTES } from '@/constants';
import { Card } from '@/components/ui';

import styles from './home.module.css';

const STEPS = [
  {
    title: '방문지 입력',
    body: '가고 싶은 장소를 검색해서 담기만 하면 됩니다. 주소도 장소명도 모두 인식합니다.',
  },
  {
    title: '조건 선택',
    body: '이동수단과 최단 시간 / 최단 거리 기준을 고르면 조건에 맞춰 동선을 계산합니다.',
  },
  {
    title: '동선 확인·공유',
    body: '완성된 일정을 지도에서 확인하고, 팀원을 초대해 함께 편집하거나 커뮤니티에 공유하세요.',
  },
];

const FEATURES = [
  { title: 'AI 도우미', body: '현재 경로를 이해하고 순서·시간·주변 장소를 조언합니다.' },
  {
    title: '상황 변경 대응',
    body: '날씨·짐·지연·교통 상황에 맞춰 순서와 이동수단을 다시 계산합니다.',
  },
  { title: '함께 편집', body: '보기/편집 권한을 나눠 팀원과 하나의 일정을 같이 다듬습니다.' },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.badge}>AI 기반 동선 플래너</span>
        <h1 className={styles.title}>
          최적의 동선,
          <br />
          <span className={styles.brand}>p:nder</span>와 함께
        </h1>
        <p className={styles.lead}>
          목적지를 입력하면 최적화된 일정과 이동 동선을 자동으로 생성해드립니다.
        </p>
        <div className={styles.ctaRow}>
          <Link href={`${ROUTES.planner}?new=1`} className={styles.primaryCta}>
            최적 동선 생성하기 →
          </Link>
          <Link href={ROUTES.explore} className={styles.secondaryCta}>
            여행지 둘러보기
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>단 3단계로 완성되는 최적의 동선</h2>
        <div className={styles.grid}>
          {STEPS.map((step, i) => (
            <Card key={step.title} className={styles.stepCard}>
              <span className={styles.stepNo}>{i + 1}</span>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardBody}>{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>계획을 끝까지 책임지는 기능</h2>
        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardBody}>{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.closing}>
        <h2 className={styles.sectionTitle}>지금 바로 시작하세요</h2>
        <p className={styles.lead}>무료로 나만의 여행 일정을 만들어보세요</p>
        <Link href={`${ROUTES.planner}?new=1`} className={styles.primaryCta}>
          최적 동선 생성하기 →
        </Link>
      </section>
    </div>
  );
}

import { AntCtaCard } from './AntCtaCard';
import { SectionReveal } from './SectionReveal';
import styles from './home.module.css';

const STATS = [
  { value: '128,400+', label: '빠진 머리카락 개수' },
  { value: '280+', label: '총 커밋 횟수' },
  { value: '38,880+', label: '박애관 체류 시간' },
];

const STEPS = [
  { num: '01', icon: 'search', title: '장소 입력', desc: '가고 싶은 장소를 입력해요' },
  { num: '02', icon: 'waypoints', title: '최적 경로 생성', desc: 'AI가 최적의 경로를 생성해줘요' },
  {
    num: '03',
    icon: 'notepad',
    title: '일정에 맞게 수정',
    desc: '세부적인 정보를 추가해 커스텀해요',
  },
] as const;

function StepIcon({ icon }: { icon: (typeof STEPS)[number]['icon'] }) {
  if (icon === 'search') {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    );
  }
  const src = icon === 'waypoints' ? '/icons/waypoints.png' : '/icons/notepad-text.png';
  return (
    <span
      className={styles.stepIconMask}
      style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
    />
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.badge}>AI 기반 동선 플래너</span>
        <h1 className={styles.title}>
          최적의 동선,
          <br />
          <span className={styles.brand}>
            p<span className={styles.brandColon}>:</span>nder
          </span>
          {'와 함께'}
        </h1>
        <p className={styles.lead}>
          목적지를 입력하면 최적화된 일정과 이동 동선을
          <br className={styles.mobileBreak} /> 자동으로 생성해드립니다.
        </p>

        <AntCtaCard />

        <div className={styles.stats}>
          {STATS.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <SectionReveal className={styles.stepsSection}>
        <h2 className={styles.stepsTitle}>
          단 3단계로 완성되는
          <br className={styles.mobileBreak} /> 최적의 동선
        </h2>
        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.num} className={styles.stepCard}>
              <span className={styles.stepNum}>{step.num}</span>
              <div className={styles.stepIconWrap}>
                <StepIcon icon={step.icon} />
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </SectionReveal>
    </div>
  );
}

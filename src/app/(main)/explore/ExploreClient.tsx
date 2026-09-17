'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { saveAiRouteHandoff } from '@/lib/ai-route-handoff';
import {
  getDestinationRoute,
  listExploreSections,
  type Destination,
  type DestinationTripLength,
  type ExploreSection,
} from '@/lib/destinations';
import { useSession } from '@/components/providers/SessionProvider';
import { Modal, PlaceholderImage } from '@/components/ui';

import { MAP_REGIONS, SECTION_PAGE_SIZE } from './data';
import styles from './explore.module.css';

const TRIP_LENGTH_OPTIONS: { length: DestinationTripLength; label: string }[] = [
  { length: 1, label: '당일치기' },
  { length: 2, label: '1박2일' },
  { length: 3, label: '2박3일' },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** legacy/Explore Destinations.dc.html 를 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function ExploreClient() {
  const router = useRouter();
  const { isLoggedIn } = useSession();
  const [rawSections, setRawSections] = useState<ExploreSection[]>([]);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  // 접힘 상태는 767px 이하에서만 CSS로 반영된다(.legendCollapsed) — PC에서는 항상 펼쳐져 보인다.
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [sectionPages, setSectionPages] = useState<Record<number, number>>({});
  const [durationModalDest, setDurationModalDest] = useState<Destination | null>(null);
  const [loadingLength, setLoadingLength] = useState<DestinationTripLength | null>(null);

  const startWithDestinationRoute = async (destId: string, tripLength: DestinationTripLength) => {
    setLoadingLength(tripLength);
    const route = await getDestinationRoute(destId, tripLength);
    setLoadingLength(null);
    if (!route) {
      window.alert('아직 준비된 동선이 없어요.');
      return;
    }
    setDurationModalDest(null);
    saveAiRouteHandoff(route);
    const tripStart = todayStr();
    const tripEnd = addDaysStr(tripStart, tripLength - 1);
    router.push(`/planner?new=1&tripStart=${tripStart}&tripEnd=${tripEnd}&mode=ai`);
  };

  const onCardClick = (dest: Destination) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    // 미리 만들어 둔 기간이 하나뿐이면(예: 드라이브 코스는 당일치기만) 굳이 묻지 않고 바로 시작한다.
    if (dest.availableTripLengths.length === 1) {
      void startWithDestinationRoute(dest.id, dest.availableTripLengths[0]);
      return;
    }
    setDurationModalDest(dest);
  };

  useEffect(() => {
    let cancelled = false;
    listExploreSections().then((list) => {
      if (!cancelled) setRawSections(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = useMemo(
    () =>
      rawSections.map((section, si) => {
        const items = section.items
          .filter((d) => !activeRegion || d.region === activeRegion)
          .map((d) => ({ ...d, imgId: d.id }));

        const pageCount = Math.max(1, Math.ceil(items.length / SECTION_PAGE_SIZE));
        const page = Math.min(sectionPages[si] ?? 0, pageCount - 1);
        const pagedItems = items.slice(
          page * SECTION_PAGE_SIZE,
          page * SECTION_PAGE_SIZE + SECTION_PAGE_SIZE,
        );

        return {
          ...section,
          items,
          pagedItems,
          hasItems: items.length > 0,
          hasMultiplePages: pageCount > 1,
          pageLabel: `${page + 1} / ${pageCount}`,
          isFirstPage: page === 0,
          isLastPage: page === pageCount - 1,
          onPrevPage: () => setSectionPages((s) => ({ ...s, [si]: Math.max(0, page - 1) })),
          onNextPage: () =>
            setSectionPages((s) => ({ ...s, [si]: Math.min(pageCount - 1, page + 1) })),
        };
      }),
    [rawSections, activeRegion, sectionPages],
  );

  const noResults = sections.length > 0 && sections.every((s) => !s.hasItems);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>여행지 탐색</h1>
      <p className={styles.subtitle}>
        지도의 핀이나 아래 목록에서 지역을 눌러 여행지를 추천받아보세요
      </p>

      <div className={styles.mapRow}>
        <div
          className={
            legendExpanded ? styles.legendOuter : `${styles.legendOuter} ${styles.legendCollapsed}`
          }
        >
          <button
            type="button"
            className={styles.legendToggle}
            onClick={() => setLegendExpanded((v) => !v)}
            aria-expanded={legendExpanded}
          >
            <span className={styles.legendToggleLabel}>지역 선택</span>
            <span aria-hidden>{legendExpanded ? '▴' : '▾'}</span>
          </button>
          <div className={styles.legendCol}>
            <button
              type="button"
              className={
                activeRegion === null
                  ? `${styles.legendItem} ${styles.legendActive}`
                  : styles.legendItem
              }
              onClick={() => setActiveRegion(null)}
            >
              전체
            </button>
            {MAP_REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={
                  activeRegion === r.key
                    ? `${styles.legendItem} ${styles.legendActive}`
                    : styles.legendItem
                }
                onClick={() => setActiveRegion(r.key)}
              >
                {r.key}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.mapWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG, next/image 최적화 불필요 */}
          <img className={styles.mapSvg} src="/korea-map.svg" alt="대한민국 지도" />
          {MAP_REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              className={activeRegion === r.key ? `${styles.pin} ${styles.pinActive}` : styles.pin}
              style={{ left: `${r.left}%`, top: `${r.top}%` }}
              onClick={() => setActiveRegion(r.key)}
            >
              <span className={styles.pinLabel}>{r.key}</span>
              <span className={styles.pinDot} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      {noResults ? <p className={styles.empty}>이 지역의 추천 여행지가 아직 없어요</p> : null}

      {sections.map(
        (section, si) =>
          section.hasItems && (
            <section key={si} className={styles.section}>
              <div className={styles.sectionHead}>
                <div className={styles.sectionHeadLeft}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <span className={styles.sectionSubtitle}>{section.subtitle}</span>
                </div>
                {section.hasMultiplePages ? (
                  <div className={styles.pager}>
                    <button
                      type="button"
                      className={styles.pagerBtn}
                      style={{ opacity: section.isFirstPage ? 0.4 : 1 }}
                      onClick={section.onPrevPage}
                      aria-label="이전 페이지"
                    >
                      ‹
                    </button>
                    <span className={styles.pagerLabel}>{section.pageLabel}</span>
                    <button
                      type="button"
                      className={styles.pagerBtn}
                      style={{ opacity: section.isLastPage ? 0.4 : 1 }}
                      onClick={section.onNextPage}
                      aria-label="다음 페이지"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>

              <div className={styles.grid}>
                {section.pagedItems.map((dest) => (
                  <div key={dest.imgId} className={styles.card}>
                    <div className={styles.cardImage}>
                      {dest.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- 정적 자산 사진, next/image 최적화 불필요
                        <img
                          className={styles.cardPhoto}
                          src={dest.imageUrl}
                          alt={`${dest.name} 사진`}
                        />
                      ) : (
                        <PlaceholderImage label={`${dest.name} 사진`} />
                      )}
                      <span className={styles.cardBadge}>{dest.badge}</span>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardHead}>
                        <span className={styles.cardName}>{dest.name}</span>
                        <span className={styles.cardRegion}>{dest.region}</span>
                      </div>
                      <p className={styles.cardDesc}>{dest.desc}</p>
                      <div className={styles.cardTags}>
                        {dest.tags.map((tag) => (
                          <span key={tag} className={styles.cardTag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      {dest.hasRoute ? (
                        <button
                          type="button"
                          className={styles.cardLink}
                          onClick={() => onCardClick(dest)}
                        >
                          이 여행지로 일정 짜기 →
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ),
      )}

      <Modal
        open={durationModalDest !== null}
        title="며칠 동안 다녀오시나요?"
        onClose={() => setDurationModalDest(null)}
      >
        <div className={styles.tripLengthList}>
          {TRIP_LENGTH_OPTIONS.filter((opt) =>
            durationModalDest?.availableTripLengths.includes(opt.length),
          ).map((opt) => (
            <button
              key={opt.length}
              type="button"
              className={styles.tripLengthOption}
              disabled={loadingLength !== null}
              onClick={() =>
                durationModalDest && startWithDestinationRoute(durationModalDest.id, opt.length)
              }
            >
              {loadingLength === opt.length ? '불러오는 중...' : opt.label}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

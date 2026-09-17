'use client';

import { useEffect, useMemo, useState } from 'react';

import { listExploreSections, type ExploreSection } from '@/lib/destinations';
import { PlaceholderImage } from '@/components/ui';

import { MAP_REGIONS, SECTION_PAGE_SIZE } from './data';
import styles from './explore.module.css';

/** legacy/Explore Destinations.dc.html 를 그대로 이식. 헤더/푸터는 (main) 레이아웃이 담당한다. */
export function ExploreClient() {
  const [rawSections, setRawSections] = useState<ExploreSection[]>([]);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(true);
  const [sectionPages, setSectionPages] = useState<Record<number, number>>({});

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
                      <PlaceholderImage label={`${dest.name} 사진`} />
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
                      <a
                        href={`/planner?new=1&destination=${encodeURIComponent(dest.name)}`}
                        className={styles.cardLink}
                      >
                        이 여행지로 일정 짜기 →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}

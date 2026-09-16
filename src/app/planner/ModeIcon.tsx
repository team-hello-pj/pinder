import type { TransportMode } from '@/types';

/** legacy(Route Planner App.dc.html)의 이동수단 라인 아이콘을 그대로 옮겼다 — currentColor 로 그려서 칩 색상을 그대로 물려받는다. */
export function ModeIcon({ mode, size = 13 }: { mode: TransportMode; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (mode === 'car') {
    return (
      <svg {...common}>
        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
        <rect x="3" y="11" width="18" height="6" rx="1.5" />
        <circle cx="7.5" cy="17.5" r="1.5" />
        <circle cx="16.5" cy="17.5" r="1.5" />
      </svg>
    );
  }
  if (mode === 'walk') {
    return (
      <svg {...common}>
        <circle cx="13" cy="4.5" r="1.6" />
        <path d="M10.5 21l1.3-6.5-2.3-2 .7-4.3 3.4 1.3 1.7 2.7 3 1" />
        <path d="M11.6 14.5L8 19" />
      </svg>
    );
  }
  if (mode === 'transit') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="13" rx="3" />
        <path d="M4 11h16" />
        <circle cx="8" cy="17.5" r="1.4" />
        <circle cx="16" cy="17.5" r="1.4" />
        <path d="M7 20l-1.5 1.5M17 20l1.5 1.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="5.5" cy="17.5" r="3.2" />
      <circle cx="18.5" cy="17.5" r="3.2" />
      <path d="M5.5 17.5L10 8h4l4.5 9.5M10 8L8.5 5.5h-2" />
      <path d="M10 8l3 5h4" />
    </svg>
  );
}

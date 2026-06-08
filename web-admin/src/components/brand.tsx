import type { ReactNode } from 'react';

/** Logo "El Hilo" (isotipo). */
export function Hilo({ size = 34, sprout = '#5E9B7E' }: { size?: number; sprout?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <path d="M12 60 C28 60 34 60 42 60 C49 60 51 42 59 42 C67 42 69 74 77 74" stroke="#FF7A59" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M77 74 c13 -1 19 -18 12 -33 c-12 5 -17 18 -12 33 z" fill={sprout} />
      <circle cx="12" cy="60" r="5.5" fill="#FF7A59" />
    </svg>
  );
}

/** Iconos de línea por módulo (manual §09). */
const ICONS: Record<string, ReactNode> = {
  inicio: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  dashboard: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 21h10M8 9l3 3 5-5" /></>,
  diario: <><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3z" /><path d="M9 8h6M9 12h4" /></>,
  ia: <><circle cx="12" cy="11" r="7" /><path d="M9 11c0-2 6-2 6 0M12 7v1" /><path d="M12 18v3M8 20h8" /></>,
  sos: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  call: <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  food: <path d="M7 4v16M7 9c5 0 5-3 10-3v9c-5 0-5 3-10 3" />,
  habits: <><path d="M3 13c4 0 4-6 8-6s4 6 8 6" /><circle cx="6" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>,
  biblioteca: <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2z" />,
  alerts: <><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
  metas: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  progreso: <><path d="M3 17l6-6 4 4 7-7" /><path d="M17 7h4v4" /></>,
  audit: <><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></>,
};
export function Ico({ k, color, size = 20 }: { k: string; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[k] ?? ICONS.dashboard}
    </svg>
  );
}

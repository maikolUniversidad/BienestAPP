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
  med: <><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" /></>,
  users: <><path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 19v-2a4 4 0 0 0-3-3.8" /></>,
  pqrs: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  tests: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  comunidad: <><circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2 20v-1a5 5 0 0 1 9-3M14 20v-1a4 4 0 0 1 7-2.8" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 6 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H2a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 3.3 6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3.3V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  audit: <><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></>,
  salud: <><path d="M20.8 6.6a4.5 4.5 0 0 0-7.8-2 4.5 4.5 0 0 0-7.8 2c-1 3 1.4 5.6 7.8 11 6.4-5.4 8.8-8 7.8-11z" /><path d="M3 12h3l1.5-3 2 5 1.5-2h2" /></>,
  kb: <><path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M14 3v5h5" /><circle cx="11" cy="13" r="2.2" /><path d="M11 15.2V18M8.5 11l-1.2-1.2M13.5 11l1.2-1.2" /></>,
  cita: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4M9 14l2 2 4-4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  firma: <><path d="M3 19c3 0 4-10 7-10s2 6 4 6 2-3 4-3" /><path d="M3 21h18" /></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>,
  his: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M9 7V4h6v3M12 11v6M9 14h6" /></>,
  factura: <><path d="M6 2h9l4 4v14l-3-2-3 2-3-2-3 2V2z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
  inventario: <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>,
};
export function Ico({ k, color, size = 20 }: { k: string; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[k] ?? ICONS.dashboard}
    </svg>
  );
}

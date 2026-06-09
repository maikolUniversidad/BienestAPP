'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return (document.documentElement.dataset.theme as Theme) || 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('theme', t); } catch { /* ignore */ }
}

/** Script inline que aplica el tema antes del primer pintado (evita el flash claro). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => { setTheme(getTheme()); }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button type="button" className={className ?? 'theme-toggle'} onClick={toggle} aria-label="Cambiar tema" title="Cambiar tema claro/oscuro">
      {theme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
    </button>
  );
}

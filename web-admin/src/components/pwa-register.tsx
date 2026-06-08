'use client';

import { useEffect } from 'react';

/** Registra el service worker para habilitar la PWA instalable. */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);
  return null;
}

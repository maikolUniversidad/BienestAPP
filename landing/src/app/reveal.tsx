'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Revela su contenido con una animación suave al entrar en viewport. */
export function Reveal({ children, delay = 0, as = 'div', className = '' }: { children: ReactNode; delay?: number; as?: any; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Tag: any = as;
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

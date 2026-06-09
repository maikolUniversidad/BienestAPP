'use client';

import { useEffect, useRef } from 'react';

export interface MapMarker { id: string; lat: number; lng: number; label: string; sub?: string; color?: string; }

const STATUS_COLOR: Record<string, string> = { available: '#5E9B7E', en_route: '#E0913A', attending: '#5B7FB9', offline: '#8A8275' };
export function statusColor(s?: string) { return STATUS_COLOR[s ?? 'offline'] ?? '#8A8275'; }

/** Mapa con OpenStreetMap + Leaflet (carga por CDN, sin claves). Marcadores clicables. */
export function HealthMap({ markers, center, zoom = 12, height = '70vh', onSelect }: {
  markers: MapMarker[]; center?: [number, number]; zoom?: number; height?: string; onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadLeaflet();
      if (cancelled || !ref.current) return;
      const L = (window as any).L;
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current).setView(center ?? [4.65, -74.1], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      layerRef.current.clearLayers();
      const L2 = (window as any).L;
      markers.forEach((m) => {
        const icon = L2.divIcon({ className: '', html: `<div style="width:18px;height:18px;border-radius:50%;background:${m.color ?? '#FF7A59'};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
        const marker = L2.marker([m.lat, m.lng], { icon }).addTo(layerRef.current);
        marker.bindPopup(`<b>${m.label}</b>${m.sub ? `<br/>${m.sub}` : ''}`);
        if (onSelect) marker.on('click', () => onSelect(m.id));
      });
      if (markers.length) {
        const b = L2.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        try { mapRef.current.fitBounds(b.pad(0.2)); } catch { /* single point */ }
      }
    })();
    return () => { cancelled = true; };
  }, [markers, center, zoom, onSelect]);

  useEffect(() => () => { try { mapRef.current?.remove(); mapRef.current = null; } catch { /* noop */ } }, []);

  return <div ref={ref} style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }} />;
}

let leafletPromise: Promise<void> | null = null;
function loadLeaflet(): Promise<void> {
  if ((window as any).L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve(); s.onerror = () => reject(new Error('leaflet load failed'));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

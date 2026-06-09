import './globals.css';
import type { Viewport } from 'next';
import { PwaRegister } from '../components/pwa-register';
import { THEME_INIT_SCRIPT } from '../components/theme-toggle';

export const metadata = {
  title: 'BienestAPP — Bienestar & Panel',
  description: 'Bienestar, salud mental y hábitos saludables con IA segura — Nueva EPS',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default' as const, title: 'BienestAPP' },
};

export const viewport: Viewport = {
  themeColor: '#1B2A4A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

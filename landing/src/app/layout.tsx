import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = { themeColor: '#1E9E8A' };

export const metadata: Metadata = {
  title: 'BienestAPP — SuperApp de Bienestar y Salud Preventiva | Nueva EPS',
  description:
    'Bienestar, salud mental, hábitos saludables y acompañamiento preventivo con IA segura, botón SOS y call center. Para afiliados de Nueva EPS.',
  icons: { icon: '/logo-ai.png' },
  openGraph: {
    title: 'BienestAPP — Tu bienestar, acompañado',
    description:
      'SuperApp de bienestar corporativo y salud preventiva con IA segura, diario emocional, botón SOS y conexión con call center.',
    type: 'website',
    images: [{ url: '/hero.png', width: 1264, height: 848, alt: 'BienestAPP' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

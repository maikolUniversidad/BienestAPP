import './globals.css';

export const metadata = {
  title: 'BienestAPP — Panel & Bienestar',
  description: 'Panel administrativo, call center y entorno de bienestar — Nueva EPS',
  icons: { icon: '/logo-ai.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

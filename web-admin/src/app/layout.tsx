export const metadata = {
  title: 'BienestAPP — Admin & Call Center',
  description: 'Panel administrativo Nueva EPS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 0 }}>{children}</body>
    </html>
  );
}

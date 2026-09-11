import './globals.css';

export const metadata = {
  title: 'Praia — Perdas & Produção',
  description: 'Registro de quebras, buffet, refeição de funcionário e produção',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';

export const metadata = {
  title: 'Praia da Tiquatira — Perdas & Produção',
  description: 'Registro de quebras, buffet, refeição de funcionário e produção',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
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

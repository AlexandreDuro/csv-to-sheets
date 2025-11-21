import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CSV vers Google Sheets',
  description: 'Upload de fichiers CSV vers Google Sheets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}


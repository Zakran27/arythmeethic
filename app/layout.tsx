import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'A Rythme Ethic - Cours à domicile et interventions en établissement',
  description: 'Accompagnement personnalisé pour élèves, parents et établissements scolaires',
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'A Rythme Ethic',
    description: 'Accompagnement personnalisé pour élèves, parents et établissements scolaires',
    images: [{ url: '/logo.jpg', width: 400, height: 400 }],
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

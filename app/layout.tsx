import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

const SITE_URL = 'https://arythmeethic.fr';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'A Rythme Ethic - Cours particuliers & interventions en établissement à Nantes',
    template: '%s · A Rythme Ethic',
  },
  description:
    'Florence Louazel accompagne les jeunes de 11 à 25 ans à Nantes Est et Thouaré-sur-Loire : cours particuliers, soutien scolaire, ateliers en établissements et associations. Accompagnement humain, bienveillant, personnalisé.',
  keywords: [
    'cours particuliers Nantes',
    'soutien scolaire Nantes',
    'cours à domicile Thouaré-sur-Loire',
    'accompagnement scolaire',
    'CESU',
    'ateliers compétences psychosociales',
    'Florence Louazel',
    'A Rythme Ethic',
  ],
  authors: [{ name: 'Florence Louazel' }],
  creator: 'Florence Louazel',
  publisher: 'A Rythme Ethic',
  alternates: { canonical: SITE_URL },
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'A Rythme Ethic - Accompagnement humain et bienveillant',
    description:
      'Cours particuliers, soutien scolaire et ateliers pour les jeunes de 11 à 25 ans. Nantes Est & Thouaré-sur-Loire.',
    url: SITE_URL,
    siteName: 'A Rythme Ethic',
    images: [{ url: '/logo.jpg', width: 400, height: 400, alt: 'A Rythme Ethic' }],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Rythme Ethic',
    description:
      'Cours particuliers et interventions en établissement à Nantes - Florence Louazel.',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: 'A Rythme Ethic',
  description:
    'Cours particuliers, soutien scolaire et interventions en établissements pour les jeunes de 11 à 25 ans.',
  url: SITE_URL,
  image: `${SITE_URL}/logo.jpg`,
  founder: {
    '@type': 'Person',
    name: 'Florence Louazel',
    jobTitle: 'Formatrice & accompagnatrice',
  },
  areaServed: [
    { '@type': 'City', name: 'Nantes' },
    { '@type': 'City', name: 'Thouaré-sur-Loire' },
  ],
  address: { '@type': 'PostalAddress', addressRegion: 'Pays de la Loire', addressCountry: 'FR' },
  inLanguage: 'fr-FR',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { AuthModal } from '@/components/site/AuthModal';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { JourneyModal } from '@/components/site/JourneyModal';
import { SiteProvider } from '@/components/site/SiteProvider';
import { Toast } from '@/components/site/Toast';
import { UNIVERSITIES } from '@/lib/data';
import { SITE_CONFIG } from '@/lib/site-config';
import './globals.css';

export const metadata: Metadata = {
  title: { default: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`, template: `%s — ${SITE_CONFIG.name}` },
  description: 'Un sito semplice per orientarsi tra atenei, preparazione, scadenze e opportunità del mondo universitario.',
  icons: { icon: 'data:,' }
};

export const viewport: Viewport = {
  themeColor: '#5a4cf0'
};

// Elenco leggero degli atenei per selettori e intestazioni (il dataset corsi resta sul server).
const universitySummaries = UNIVERSITIES.slice()
  .sort((a, b) => a.name.localeCompare(b.name, 'it'))
  .map(({ id, name, shortName, city, region, isPublic, category }) => ({ id, name, shortName, city, region, isPublic, category }));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-scroll-behavior="smooth">
      <body>
        <SiteProvider universities={universitySummaries}>
          <Header />
          {children}
          <Footer />
          <AuthModal />
          <JourneyModal />
          <Toast />
        </SiteProvider>
      </body>
    </html>
  );
}

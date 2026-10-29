import type { Metadata, Viewport } from 'next';
import { Figtree } from 'next/font/google';
import { AuthModal } from '@/components/site/AuthModal';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { JourneyModal } from '@/components/site/JourneyModal';
import { SiteProvider } from '@/components/site/SiteProvider';
import { Toast } from '@/components/site/Toast';
import { UNIVERSITIES } from '@/lib/data';
import { isEnabled } from '@/lib/features';
import { SITE_CONFIG } from '@/lib/site-config';
import './globals.css';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`, template: `%s — ${SITE_CONFIG.name}` },
  description:
    'Scopri quale università fa per te e quanto ti costa davvero, borsa compresa: confronto neutrale tra 99 atenei, con le fonti di ogni dato.',
  icons: { icon: 'data:,' }
};

export const viewport: Viewport = {
  themeColor: '#12505c'
};

// Elenco leggero degli atenei per selettori e intestazioni (il dataset corsi resta sul server).
const universitySummaries = UNIVERSITIES.slice()
  .sort((a, b) => a.name.localeCompare(b.name, 'it'))
  .map(({ id, name, shortName, city, region, isPublic, category }) => ({ id, name, shortName, city, region, isPublic, category }));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-scroll-behavior="smooth" className={figtree.variable}>
      <body>
        <SiteProvider universities={universitySummaries}>
          <Header />
          {children}
          <Footer />
          {isEnabled('account') ? (
            <>
              <AuthModal />
              <JourneyModal />
            </>
          ) : null}
          <Toast />
        </SiteProvider>
      </body>
    </html>
  );
}

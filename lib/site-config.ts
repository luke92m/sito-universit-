import { isVisible, type FeatureKey } from './features';

// Configurazione del brand (porting di js/config.js): il nome definitivo è ancora da decidere.
export const SITE_CONFIG = {
  name: 'NOME SITO',
  tagline: 'L’università, spiegata semplice.',
  note: 'nome da decidere'
};

export const SITUATION_LABELS: Record<string, string> = {
  university: 'Sono studente universitario o mi sto per immatricolare',
  enrolling: 'Mi voglio iscrivere all’università',
  curious: 'Mi interessa semplicemente il mondo universitario'
};

export const JOURNEY_PHASE_LABELS: Record<string, string> = {
  enrolled: 'Già immatricolato',
  'pre-enrolling': 'Mi sto per immatricolare'
};

export const STUDENT_TOOL_SITUATIONS = new Set(['university', 'enrolling']);

interface NavItem {
  href: string;
  label: string;
  /** Visibile solo a chi ha indicato "Mi voglio iscrivere all’università". */
  enrollingOnly?: boolean;
  feature?: FeatureKey;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/atenei', label: 'atenei' },
  { href: '/comparison', label: 'comparison' },
  { href: '/trova-corso', label: 'trova il mio corso' },
  { href: '/preparazione', label: 'preparazione', enrollingOnly: true, feature: 'preparazione' },
  { href: '/burocrazia', label: 'burocrazia', enrollingOnly: true },
  { href: '/scuole-aziende', label: 'scuole e aziende', feature: 'scuoleAziende' }
];

/** Voci della navigazione principale con le funzioni attive. */
export const visibleNavItems = (): NavItem[] => NAV_ITEMS.filter(isVisible);

interface StudentTool {
  label: string;
  slug: string;
  icon: string;
  feature?: FeatureKey;
}

const STUDENT_TOOLS: StudentTool[] = [
  { label: 'Borse di studio', slug: 'borse-di-studio', icon: 'sparkles' },
  { label: 'Scadenze', slug: 'scadenze', icon: 'calendar' },
  { label: 'Community', slug: 'community', icon: 'users', feature: 'community' },
  { label: 'Accompagnamento', slug: 'accompagnamento', icon: 'compass', feature: 'accompagnamento' },
  { label: 'Libri usati', slug: 'libri-usati', icon: 'book', feature: 'libriUsati' }
];

/** Strumenti del menu profilo con le funzioni attive. */
export const visibleStudentTools = (): StudentTool[] => STUDENT_TOOLS.filter(isVisible);

interface PublicRoute {
  path: string;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
  feature?: FeatureKey;
}

// Pagine pubbliche indicizzabili (sitemap). L'area personale è esclusa: è riservata e "noindex".
const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/trova-corso', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/comparison', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/atenei', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/burocrazia', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/preparazione', changeFrequency: 'monthly', priority: 0.5, feature: 'preparazione' },
  { path: '/scuole-aziende', changeFrequency: 'yearly', priority: 0.3, feature: 'scuoleAziende' },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 }
];

export const visiblePublicRoutes = (): PublicRoute[] => PUBLIC_ROUTES.filter(isVisible);

/** URL pubblico del sito senza barra finale (NEXT_PUBLIC_SITE_URL, in locale http://localhost:3000). */
export const siteUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export function formatDate(value: Date | string = new Date(), options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', ...options }).format(date);
}

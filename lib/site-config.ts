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

export const STUDENT_TOOLS = [
  { label: 'Borse di studio', slug: 'borse-di-studio', icon: 'sparkles' },
  { label: 'Scadenze', slug: 'scadenze', icon: 'calendar' },
  { label: 'Community', slug: 'community', icon: 'users' },
  { label: 'Accompagnamento', slug: 'accompagnamento', icon: 'compass' },
  { label: 'Libri usati', slug: 'libri-usati', icon: 'book' }
] as const;

export function formatDate(value: Date | string = new Date(), options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', ...options }).format(date);
}

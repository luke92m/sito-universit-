// Sezioni dell’area studente (condivise tra server e client).
import { isEnabled, type FeatureKey } from './features';

export const SECTION_META = {
  'dati-percorso': {
    eyebrow: 'Profilo universitario',
    title: 'Dati del percorso',
    lead: 'Controlla le informazioni usate per personalizzare strumenti, gruppi e promemoria.'
  },
  'borse-di-studio': {
    eyebrow: 'Opportunità',
    title: 'Borse di studio',
    lead: 'Fai una verifica orientativa con ISEE e residenza, oppure prosegui senza comunicare questi dati.'
  },
  scadenze: {
    eyebrow: 'Organizzazione',
    title: 'Scadenze',
    lead: isEnabled('scadenzeScraping')
      ? 'Consulta le scadenze che il sito rileva automaticamente dalle fonti ufficiali del tuo ateneo.'
      : 'Ritrova le scadenze delle borse che hai salvato e i bandi ufficiali del diritto allo studio.'
  },
  community: {
    feature: 'community',
    eyebrow: 'Persone',
    title: 'Community',
    lead: 'Comunica con account dello stesso ateneo e, quando desideri, soltanto dello stesso corso.'
  },
  accompagnamento: {
    feature: 'accompagnamento',
    eyebrow: 'Percorso',
    title: 'Accompagnamento',
    lead: 'Una guida ordinata per capire il prossimo passo del tuo percorso universitario.'
  },
  'libri-usati': {
    feature: 'libriUsati',
    eyebrow: 'Risparmio',
    title: 'Libri usati',
    lead: 'Annunci visibili soltanto nel gruppo formato da stesso ateneo e stesso corso.'
  }
} as const satisfies Record<string, { eyebrow: string; title: string; lead: string; feature?: FeatureKey }>;

export type SectionKey = keyof typeof SECTION_META;

/** Vero se la sezione non dipende da una funzione oppure se la funzione è attiva. */
export function isActiveSection(key: SectionKey): boolean {
  const meta = SECTION_META[key];
  return !('feature' in meta) || isEnabled(meta.feature);
}

/** Sezioni attive, nell'ordine delle schede. */
export const activeSections = (): SectionKey[] => (Object.keys(SECTION_META) as SectionKey[]).filter(isActiveSection);

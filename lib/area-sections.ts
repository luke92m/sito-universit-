// Sezioni dell’area studente (condivise tra server e client).
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
    lead: 'Consulta le scadenze che il sito rileva automaticamente dalle fonti ufficiali del tuo ateneo.'
  },
  community: {
    eyebrow: 'Persone',
    title: 'Community',
    lead: 'Comunica con account dello stesso ateneo e, quando desideri, soltanto dello stesso corso.'
  },
  accompagnamento: {
    eyebrow: 'Percorso',
    title: 'Accompagnamento',
    lead: 'Una guida ordinata per capire il prossimo passo del tuo percorso universitario.'
  },
  'libri-usati': {
    eyebrow: 'Risparmio',
    title: 'Libri usati',
    lead: 'Annunci visibili soltanto nel gruppo formato da stesso ateneo e stesso corso.'
  }
} as const;

export type SectionKey = keyof typeof SECTION_META;

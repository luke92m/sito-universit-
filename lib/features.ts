// Interruttori delle funzioni del sito. Il sito si concentra sulla fase di scelta dell'università:
// le funzioni spente restano nel codice (e le loro tabelle Supabase restano intatte) e si riattivano
// cambiando il valore qui. Utilizzabile da server e client.
export const FEATURES = {
  /** Esercizi per i test d'ingresso (/preparazione). */
  preparazione: false,
  /** Pagina segnaposto "Scuole e aziende" (/scuole-aziende). */
  scuoleAziende: false,
  /** Messaggi tra studenti nell'area personale. */
  community: false,
  /** Annunci di libri usati nell'area personale. */
  libriUsati: false,
  /** Guida "prossimi passi" nell'area personale. */
  accompagnamento: false,
  /** Rilevamento automatico delle scadenze dalle pagine ufficiali (/api/deadlines). */
  scadenzeScraping: false
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isEnabled = (key: FeatureKey): boolean => FEATURES[key];

/** Vero se la voce non dipende da una funzione oppure se la funzione è attiva. */
export const isVisible = (item: { feature?: FeatureKey }): boolean =>
  !item.feature || isEnabled(item.feature);

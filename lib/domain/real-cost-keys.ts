// Voci del costo reale, condivise tra calcolo (server) e interfaccia (client).
export type CostLineKey = 'tasse' | 'quota-fissa' | 'alloggio' | 'vita' | 'borsa' | 'servizi' | 'riduzione';

/** Voci che riducono il costo: borsa in denaro, servizi gratuiti della borsa e borse/riduzioni dell'ateneo. */
export const GRANT_KEYS: readonly CostLineKey[] = ['borsa', 'servizi', 'riduzione'];

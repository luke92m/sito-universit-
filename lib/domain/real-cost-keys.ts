// Voci del costo reale, condivise tra calcolo (server) e interfaccia (client).
export type CostLineKey = 'tasse' | 'quota-fissa' | 'alloggio' | 'vita' | 'borsa' | 'servizi';

/** Voci che riducono il costo: borsa in denaro e servizi gratuiti compresi nella borsa. */
export const GRANT_KEYS: readonly CostLineKey[] = ['borsa', 'servizi'];

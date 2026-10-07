'use client';

// Archiviazione locale per gli utenti non registrati (preferenze di orientamento).
// Gli utenti registrati salvano gli stessi dati su Supabase.

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nessuna azione necessaria.
  }
}

export const LOCAL_KEYS = {
  guidance: 'universitaSemplice.guestGuidance.v2',
  coursePreferences: 'universitaSemplice.guestCoursePreferences.v2'
};

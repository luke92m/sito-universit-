'use client';

// Archiviazione locale per gli utenti non registrati (preferenze di orientamento),
// esposta come store esterno per useSyncExternalStore. Gli utenti registrati usano Supabase.
import { useSyncExternalStore } from 'react';

export const LOCAL_KEYS = {
  guidance: 'universitaSemplice.guestGuidance.v2',
  coursePreferences: 'universitaSemplice.guestCoursePreferences.v2'
};

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Valore memorizzato: stessa istanza finché il contenuto non cambia (richiesto da useSyncExternalStore). */
function snapshot<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: unknown = fallback;
  try {
    value = raw ? JSON.parse(raw) : fallback;
  } catch {
    value = fallback;
  }
  cache.set(key, { raw, value });
  return value as T;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (!event.key || Object.values(LOCAL_KEYS).includes(event.key)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const notify = () => listeners.forEach((listener) => listener());

export function useLocalValue<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(key, fallback),
    () => fallback
  );
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notify();
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
  notify();
}

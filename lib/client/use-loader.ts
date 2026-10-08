'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Carica dati asincroni (es. righe Supabase) e li ricarica su richiesta.
 * `load` deve essere stabile (useCallback): cambia solo quando cambiano i parametri della query.
 */
export function useLoader<T>(load: () => Promise<T>, initial: T): [T, () => void] {
  const [data, setData] = useState<T>(initial);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    load().then((value) => {
      if (active) setData(value);
    });
    return () => {
      active = false;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return [data, reload];
}

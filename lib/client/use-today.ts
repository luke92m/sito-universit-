'use client';

import { useSyncExternalStore } from 'react';
import { formatDate } from '../site-config';

const noopSubscribe = () => () => {};

/**
 * Data odierna formattata, calcolata solo nel browser: le pagine statiche non devono
 * mostrare la data di build (sul server restituisce una stringa vuota).
 */
export function useToday(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => formatDate(new Date()),
    () => ''
  );
}

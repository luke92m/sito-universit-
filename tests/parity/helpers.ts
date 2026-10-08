import { readFileSync } from 'node:fs';
import path from 'node:path';

export function fixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')) as T;
}

/** Stessa serializzazione dello snapshot legacy (Infinity → null, undefined rimossi). */
export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Carica gli script del sito legacy in un contesto node:vm con un `window` minimale.
// Usato per estrarre i dataset e per generare gli snapshot di parità.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEGACY_JS = path.join(ROOT, 'legacy', 'js');

const DATA_SCRIPTS = [
  'config.js',
  'atenei-data.js',
  'university-courses.js',
  'course-catalog.js',
  'student-services-data.js',
  'university-finder-data.js',
  'qs-subject-rankings-2026.js',
  'censis-rankings-2026.js',
  'city-indicators-2026.js',
  'official-rankings.js',
  'university-profiles.js'
];

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

export function createLegacyContext(extraScripts = []) {
  const window = {};
  const context = vm.createContext({
    window,
    localStorage: memoryStorage(),
    console,
    Intl,
    URLSearchParams,
    URL
  });
  window.localStorage = context.localStorage;
  for (const file of [...DATA_SCRIPTS, ...extraScripts]) {
    const source = readFileSync(path.join(LEGACY_JS, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  return { window, context };
}

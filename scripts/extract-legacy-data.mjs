// Estrae i dataset statici del sito legacy in lib/data/*.json.
// Eseguire con: npm run data:extract
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createLegacyContext, ROOT } from './legacy-context.mjs';

const OUT = path.join(ROOT, 'lib', 'data');
mkdirSync(OUT, { recursive: true });

const { window } = createLegacyContext();

// JSON non rappresenta Infinity: i limiti superiori aperti diventano null
// e vengono ricostruiti in lib/data/index.ts (min valorizzato + max null => Infinity).
const plain = (value) => JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'function' ? undefined : item)));

const city = window.CITY_INDICATORS;
const outputs = {
  'universities.json': window.UNIVERSITIES,
  'university-dataset.json': window.UNIVERSITY_DATASET,
  'course-catalog.json': {
    dimensions: window.CourseCatalog.dimensions,
    questions: window.CourseCatalog.questions,
    courses: window.CourseCatalog.courses
  },
  'student-services.json': window.STUDENT_SERVICE_DATA,
  'university-finder.json': window.UNIVERSITY_FINDER_DATA,
  'qs-subject-rankings.json': window.QS_SUBJECT_RANKINGS,
  'censis-rankings.json': window.CENSIS_RANKINGS,
  'city-indicators.json': {
    version: city.version,
    roomRents: city.roomRents,
    macroSpending: city.macroSpending,
    youthQuality: city.youthQuality,
    sources: city.sources
  }
};

for (const [file, value] of Object.entries(outputs)) {
  const minified = file === 'university-dataset.json';
  writeFileSync(path.join(OUT, file), JSON.stringify(plain(value), null, minified ? 0 : 2) + '\n');
  console.log(`scritto lib/data/${file}`);
}

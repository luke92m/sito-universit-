// Genera gli snapshot di parità eseguendo la logica del sito legacy (v8) in node:vm.
// I test in tests/parity confrontano questi risultati con il porting TypeScript.
// Eseguire con: npm run parity:snapshot
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createLegacyContext, LEGACY_JS, ROOT } from './legacy-context.mjs';
import {
  COMPARISON_COURSE_CASES,
  COMPARISON_UNIVERSITY_PAIRS,
  COMPARISON_VECTOR_ANSWERS,
  COURSE_ANSWER_CASES,
  FINDER_CASES,
  RANKING_COURSE_SAMPLES
} from '../tests/parity/cases.mjs';

const OUT = path.join(ROOT, 'tests', 'parity', 'fixtures');
mkdirSync(OUT, { recursive: true });

const { window, context } = createLegacyContext();

// Stub minimi: university-finder.js richiede UniversitySite e un document senza DOM.
window.UniversitySite = {
  getUniversities: () => window.UNIVERSITIES.slice().sort((a, b) => a.name.localeCompare(b.name, 'it')),
  getUniversityCourses: (id) =>
    window.UniversityData.getCourses(id).slice().sort((a, b) => a.name.localeCompare(b.name, 'it')),
  getGuidanceProfile: () => ({}),
  updateGuidanceProfile: () => null
};
context.document = { readyState: 'complete', querySelector: () => null, querySelectorAll: () => [] };

// Espone le funzioni interne del finder senza modificare i file legacy.
const finderSource = readFileSync(path.join(LEGACY_JS, 'university-finder.js'), 'utf8').replace(
  'window.UniversityFinder = {',
  'window.__finderTest = { rankCandidates, targetFromChoice };\n  window.UniversityFinder = {'
);
vm.runInContext(finderSource, context, { filename: 'university-finder.js' });

const plain = (value) => JSON.parse(JSON.stringify(value));
const write = (file, value) => {
  writeFileSync(path.join(OUT, file), JSON.stringify(plain(value)) + '\n');
  console.log(`scritto tests/parity/fixtures/${file}`);
};

// 1. Trova la mia università
const finder = window.__finderTest;
write(
  'finder.json',
  FINDER_CASES.map((testCase) => {
    const target = finder.targetFromChoice(testCase.answers.courseChoice);
    return {
      ...testCase,
      results: finder.rankCandidates(target, testCase.answers, testCase.options || {}).slice(0, 30)
    };
  })
);

// 2. Trova il mio corso
const catalog = window.CourseCatalog;
write(
  'course-finder.json',
  COURSE_ANSWER_CASES.map((answers) => {
    const vector = catalog.vectorFromAnswers(answers);
    return { answers, vector, ranked: catalog.rankCourses(vector).map((course) => ({ slug: course.slug, score: course.score })) };
  })
);

// 3. Ranking ufficiali e abbinamento corsi reali → profili generali
const universities = window.UNIVERSITIES;
const rankings = window.OfficialRankings;
write(
  'rankings.json',
  universities.map((university) => {
    const courses = window.UniversityData.getCourses(university.id).filter((_course, index) => index % RANKING_COURSE_SAMPLES === 0);
    return {
      id: university.id,
      general: rankings.general(university),
      censisGeneral: rankings.censisGeneral(university),
      groups: window.UNIVERSITY_DATASET.groups.map((group) => rankings.forGroup(university, group)),
      courses: courses.map((course) => ({
        courseId: course.id,
        matched: catalog.matchCourse(course)?.slug || null,
        ranking: rankings.forCourse(university, course)
      }))
    };
  })
);

// 4. Schede ateneo
write('profiles.json', universities.map((university) => window.UniversityProfiles.profile(university)));

// 5. Comparison: espone le funzioni che producono le righe (HTML) del confronto.
const comparisonSource = readFileSync(path.join(LEGACY_JS, 'comparison.js'), 'utf8').replace(
  '  function setMode(mode) {',
  `  window.__comparisonTest = { universityRows, sameCourseDifferentUniversitiesRows, differentCoursesSameUniversityRows, differentCoursesDifferentUniversitiesRows };
  function setMode(mode) {`
);
vm.runInContext(comparisonSource, context, { filename: 'comparison.js' });
const comparison = window.__comparisonTest;
const byId = new Map(universities.map((university) => [university.id, university]));

write(
  'comparison-universities.json',
  COMPARISON_UNIVERSITY_PAIRS.map(([leftId, rightId]) => ({
    leftId,
    rightId,
    rows: leftId === rightId ? null : comparison.universityRows(byId.get(leftId), byId.get(rightId))
  }))
);

function resolveCourse(universityId, selector) {
  const courses = window.UniversityData.getCourses(universityId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
  if (typeof selector === 'number') return courses[selector % courses.length];
  return courses.find((course) => catalog.matchCourse(course)?.slug === selector) || courses[0];
}

const preferenceVector = catalog.vectorFromAnswers(COMPARISON_VECTOR_ANSWERS);
write(
  'comparison-courses.json',
  COMPARISON_COURSE_CASES.map(([leftId, leftSelector, rightId, rightSelector, withVector]) => {
    // Replica di handleCourseComparison(): stesso albero di scenari.
    window.localStorage.setItem(
      'universitaSemplice.coursePreferences.v1',
      JSON.stringify(withVector ? { guest: { vector: preferenceVector } } : {})
    );
    const leftUniversity = byId.get(leftId);
    const rightUniversity = byId.get(rightId);
    const leftCourse = resolveCourse(leftId, leftSelector);
    const rightCourse = resolveCourse(rightId, rightSelector);
    const sameUniversity = leftId === rightId;
    const sameGeneral = catalog.matchCourse(leftCourse)?.slug === catalog.matchCourse(rightCourse)?.slug;
    let scenario;
    let rows = null;
    if (sameUniversity && leftCourse.id === rightCourse.id) scenario = 'error';
    else if (sameUniversity) {
      scenario = 'Stessa università · corsi diversi';
      rows = comparison.differentCoursesSameUniversityRows(leftCourse, leftUniversity, rightCourse);
    } else if (sameGeneral) {
      scenario = 'Stesso corso · università diverse';
      rows = comparison.sameCourseDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity);
    } else {
      scenario = 'Corsi diversi · università diverse';
      rows = comparison.differentCoursesDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity);
    }
    return { leftId, leftCourseId: leftCourse.id, rightId, rightCourseId: rightCourse.id, withVector, scenario, rows };
  })
);

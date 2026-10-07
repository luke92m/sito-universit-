// Casi campione condivisi tra lo script di snapshot (legacy) e i test di parità (TypeScript).

const base = {
  degree: 'bachelor',
  residenceRegion: 'Lombardia',
  residenceCity: 'Pavia',
  commute: 'yes',
  relocation: 'neighbors',
  iseeRange: '24000-26000',
  language: 'italian'
};

export const FINDER_CASES = [
  { name: 'economia-pavia', answers: { ...base, courseChoice: 'course:economia-aziendale' } },
  { name: 'economia-pavia-italia', answers: { ...base, courseChoice: 'course:economia-aziendale', relocation: 'italy' } },
  { name: 'economia-pavia-telematiche', answers: { ...base, courseChoice: 'course:economia-aziendale' }, options: { includeTelematic: true, includeDistance: true } },
  { name: 'economia-distanza', answers: { ...base, courseChoice: 'course:economia-aziendale' }, options: { includeDistance: true } },
  { name: 'medicina-napoli', answers: { ...base, courseChoice: 'course:medicina-chirurgia', degree: 'single', residenceRegion: 'Campania', residenceCity: 'Napoli', relocation: 'region', iseeRange: '0-13000' } },
  { name: 'medicina-undecided-italia', answers: { ...base, courseChoice: 'course:medicina-chirurgia', degree: 'undecided', relocation: 'italy', language: 'english' } },
  { name: 'informatica-torino', answers: { ...base, courseChoice: 'course:informatica', residenceRegion: 'Piemonte', residenceCity: 'Torino', commute: 'no', relocation: 'none' } },
  { name: 'ing-informatica-bologna', answers: { ...base, courseChoice: 'course:ingegneria-informatica', residenceRegion: 'Emilia-Romagna', residenceCity: 'Bologna', relocation: 'neighbors', language: 'either' } },
  { name: 'giurisprudenza-roma', answers: { ...base, courseChoice: 'course:giurisprudenza', degree: 'single', residenceRegion: 'Lazio', residenceCity: 'Roma', iseeRange: 'over-60000' } },
  { name: 'psicologia-palermo', answers: { ...base, courseChoice: 'course:psicologia', residenceRegion: 'Sicilia', residenceCity: 'Palermo', relocation: 'italy', iseeRange: 'unknown' } },
  { name: 'psicologia-master', answers: { ...base, courseChoice: 'course:psicologia', degree: 'master', relocation: 'italy' } },
  { name: 'design-milano', answers: { ...base, courseChoice: 'course:design', residenceCity: 'Milano', relocation: 'none', language: 'english' } },
  { name: 'gruppo-economico', answers: { ...base, courseChoice: 'group:Economico', relocation: 'italy' } },
  { name: 'gruppo-scientifico-sardegna', answers: { ...base, courseChoice: 'group:Scientifico', residenceRegion: 'Sardegna', residenceCity: 'Cagliari', relocation: 'neighbors' } },
  { name: 'gruppo-medico-cagliari', answers: { ...base, courseChoice: 'group:Medico-Sanitario e Farmaceutico', degree: 'undecided', residenceRegion: 'Sardegna', residenceCity: 'Sassari', relocation: 'region', iseeRange: '13000-16000' } },
  { name: 'veterinaria-padova', answers: { ...base, courseChoice: 'course:veterinaria', degree: 'single', residenceRegion: 'Veneto', residenceCity: 'Padova', relocation: 'italy' } },
  { name: 'lingue-legacy-isee', answers: { ...base, courseChoice: 'course:lingue-mediazione', iseeRange: '22000-26000', relocation: 'italy' } },
  { name: 'citta-sconosciuta', answers: { ...base, courseChoice: 'course:scienze-biologiche', residenceRegion: 'Puglia', residenceCity: 'Paesino Inventato', relocation: 'region' } },
  { name: 'data-science-trento', answers: { ...base, courseChoice: 'course:data-science-statistica', residenceRegion: 'Trentino-Alto Adige/Südtirol', residenceCity: 'Trento', relocation: 'neighbors', language: 'english' } },
  { name: 'scienze-motorie-bari', answers: { ...base, courseChoice: 'course:scienze-motorie', residenceRegion: 'Puglia', residenceCity: 'Bari', commute: 'no', relocation: 'region' } },
  { name: 'architettura-firenze', answers: { ...base, courseChoice: 'course:ingegneria-civile-architettura', degree: 'undecided', residenceRegion: 'Toscana', residenceCity: 'Firenze', relocation: 'neighbors', iseeRange: '40000-60000' } },
  { name: 'farmacia-catania', answers: { ...base, courseChoice: 'course:farmacia', degree: 'single', residenceRegion: 'Sicilia', residenceCity: 'Catania', relocation: 'none' } },
  { name: 'gruppo-ict-telematiche', answers: { ...base, courseChoice: 'group:Informatica e Tecnologie ICT', relocation: 'none', commute: 'no' }, options: { includeTelematic: true } },
  { name: 'marketing-venezia', answers: { ...base, courseChoice: 'course:marketing-comunicazione', residenceRegion: 'Veneto', residenceCity: 'Venezia', relocation: 'region', iseeRange: '28000-scholarship-limit' } }
];

export const COURSE_ANSWER_CASES = [
  {},
  { activities: ['numbers', 'technology'], subjects: ['math'], problem: 'system', studyStyle: 'models', workplace: 'company', priority: 'practical' },
  { activities: ['health', 'people', 'nature'], subjects: ['bio-chem', 'psychology'], problem: 'care', studyStyle: 'lab', workplace: 'hospital', priority: 'impact' },
  { activities: ['communication', 'design'], subjects: ['art', 'literature-languages'], problem: 'message', studyStyle: 'projects', workplace: 'creative', priority: 'express' },
  { activities: ['justice', 'international'], subjects: ['law-history'], problem: 'rights', studyStyle: 'reading', workplace: 'institutions', priority: 'international' },
  { activities: ['nature'], subjects: ['bio-chem'], problem: 'planet', studyStyle: 'field', workplace: 'territory', priority: 'sustainability' },
  { activities: ['people'], subjects: ['psychology'], problem: 'care', studyStyle: 'field', workplace: 'education', priority: 'impact' },
  { activities: ['numbers'], subjects: ['economics', 'math'], problem: 'organisation', studyStyle: 'models', workplace: 'company', priority: 'understand' }
];

/** Un corso ogni N per ateneo nello snapshot dei ranking (mantiene il fixture compatto). */
export const RANKING_COURSE_SAMPLES = 7;

const UNIVERSITY_SAMPLE = [
  'ateneo-03701', 'ateneo-02801', 'ateneo-01503', 'ateneo-01801', 'ateneo-05801',
  'ateneo-06301', 'ateneo-05814', 'ateneo-06603', 'ateneo-01510', 'ateneo-06307'
];

export const COMPARISON_UNIVERSITY_PAIRS = UNIVERSITY_SAMPLE.flatMap((left, index) =>
  UNIVERSITY_SAMPLE.slice(index + 1, index + 4).map((right) => [left, right])
).concat([['ateneo-03701', 'ateneo-03701']]);

/** [ateneo A, indice corso A, ateneo B, indice corso B, usa vettore preferenze] */
export const COMPARISON_COURSE_CASES = [
  ['ateneo-03701', 0, 'ateneo-03701', 5, false],
  ['ateneo-03701', 10, 'ateneo-03701', 11, true],
  ['ateneo-03701', 3, 'ateneo-03701', 3, false],
  ['ateneo-02801', 20, 'ateneo-02801', 40, true],
  ['ateneo-03701', 'economia-aziendale', 'ateneo-02801', 'economia-aziendale', false],
  ['ateneo-01503', 'economia-aziendale', 'ateneo-01801', 'economia-aziendale', true],
  ['ateneo-05801', 'giurisprudenza', 'ateneo-06301', 'giurisprudenza', false],
  ['ateneo-05801', 'medicina-chirurgia', 'ateneo-01510', 'professioni-sanitarie', true],
  ['ateneo-03701', 'informatica', 'ateneo-05814', 'economia-aziendale', false],
  ['ateneo-06307', 0, 'ateneo-01801', 7, true],
  ['ateneo-01801', 15, 'ateneo-06301', 33, false],
  ['ateneo-02801', 'psicologia', 'ateneo-05801', 'psicologia', true],
  ['ateneo-03701', 'design', 'ateneo-05801', 'scienze-comunicazione', false],
  ['ateneo-06301', 'ingegneria-meccanica', 'ateneo-02801', 'ingegneria-informatica', true]
];

export const COMPARISON_VECTOR_ANSWERS = {
  activities: ['numbers', 'people'],
  subjects: ['economics', 'psychology'],
  problem: 'organisation',
  studyStyle: 'projects',
  workplace: 'company',
  priority: 'practical'
};

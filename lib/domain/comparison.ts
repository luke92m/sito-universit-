// Porting di legacy/js/comparison.js: righe del confronto tra atenei e tra corsi.
// Gira sul server; restituisce strutture serializzabili (Rich) invece di HTML.
import { CENSIS_RANKINGS as censis, STUDENT_SERVICES as studentServices, UNIVERSITIES, getCourses, getMetrics } from '../data';
import type { Course, CourseProfile, ScoreVector, University } from '../types';
import { studentMonthlyEstimate, youth } from './city-indicators';
import { matchCourse, scoreActualCourse } from './course-catalog';
import { forCourse, general } from './official-rankings';
import { br, chip, link, paragraph, strong, text, type Rich } from './rich-text';

export interface ComparisonValue {
  value: Rich;
  note: Rich;
  tag: string;
}

export interface ComparisonRow {
  label: string;
  hint: string;
  left: ComparisonValue;
  right: ComparisonValue;
}

export interface ComparisonResult {
  title: string;
  description: string;
  leftTitle: string;
  rightTitle: string;
  scenario: string;
  rows: ComparisonRow[];
}

export type ComparisonError = { error: string };

function normalize(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function formatNumber(value: unknown): string {
  if (value == null || Number.isNaN(Number(value))) return 'n.d.';
  return new Intl.NumberFormat('it-IT').format(Number(value));
}

function formatEuro(value: unknown): string {
  if (value == null || Number.isNaN(Number(value))) return 'n.d.';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    Number(value)
  );
}

function formatPercent(value: unknown, digits = 1): string {
  if (value == null || Number.isNaN(Number(value))) return 'n.d.';
  return `${Number(value).toFixed(digits).replace('.', ',')}%`;
}

const plain = (value: string, note = '', tag = ''): ComparisonValue => ({
  value: [text(value)],
  note: note ? [text(note)] : [],
  tag
});

const rich = (value: Rich, note: Rich = [], tag = ''): ComparisonValue => ({ value, note, tag });

const byId = new Map(UNIVERSITIES.map((university) => [university.id, university]));

/** Atenei ordinati come nei selettori legacy (facoltativamente solo quelli con corsi). */
export function comparisonUniversities(withCoursesOnly = false): University[] {
  return UNIVERSITIES.filter((university) => !withCoursesOnly || getCourses(university.id).length > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
}

export function comparisonCourses(universityId: string): Course[] {
  return getCourses(universityId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
}

/** Corso preferito iniziale (es. Economia aziendale) per l'ateneo indicato. */
export function preferredCourseId(universityId: string, profileSlug: string | null): string {
  const courses = comparisonCourses(universityId);
  if (!courses.length) return '';
  if (profileSlug) {
    const preferred = courses.find((course) => matchCourse(course)?.slug === profileSlug);
    if (preferred) return preferred.id;
  }
  return courses[0].id;
}

export function defaultUniversityId(shortName: string, fallbackIndex = 0, withCoursesOnly = false): string {
  const list = comparisonUniversities(withCoursesOnly);
  return list.find((university) => university.shortName === shortName)?.id || list[fallbackIndex]?.id || '';
}

function officialSite(university: University): string {
  return studentServices.officialDomains?.[university.id] || '#';
}

export function courseOfficialLink(course: Pick<Course, 'name' | 'classCode'>, university: Pick<University, 'id'>): string {
  const params = new URLSearchParams({
    universityId: university.id,
    course: course.name,
    classCode: course.classCode || ''
  });
  return `/api/course-link?${params.toString()}`;
}

function rankingValue(university: University): ComparisonValue {
  const ranking = general(university);
  const source = ranking.sourceFamily || 'Ufficiale';
  return rich(
    [link(ranking.url || officialSite(university), ranking.summary || ranking.label)],
    [text(ranking.note || 'Ranking ufficiale disponibile')],
    source
  );
}

function reputationValue(university: University): ComparisonValue {
  const ranking = general(university);
  let label = 'Posizionamento ufficiale non disponibile';
  if (ranking.source === 'qs-general') {
    label =
      ranking.score >= 90
        ? 'Prestigio internazionale molto elevato'
        : ranking.score >= 80
          ? 'Prestigio internazionale elevato'
          : 'Presenza nel ranking internazionale QS';
  } else if (ranking.source === 'censis-general') {
    label =
      ranking.score >= 48
        ? 'Posizionamento nazionale molto forte nella propria categoria'
        : 'Posizionamento nazionale CENSIS nella propria categoria';
  }
  return plain(label, ranking.summary || ranking.note, ranking.sourceFamily || 'Ufficiale');
}

function supportValue(university: University): ComparisonValue {
  const metrics = getMetrics(university.id);
  const students = Number(metrics.students || 0);
  const exemptions = Number(metrics.fullExemptions || 0) + Number(metrics.partialExemptions || 0);
  const scholarships = Number(metrics.scholarshipsUniversityMur || 0);
  const censisRecord = censis.general?.[university.id];
  if (students > 0) {
    const rate = (exemptions / students) * 100;
    const note =
      `${formatNumber(exemptions)} esoneri totali/parziali su ${formatNumber(students)} iscritti` +
      (censisRecord?.scholarships != null ? ` · indicatore CENSIS borse ${censisRecord.scholarships}/110` : '');
    return rich(
      [text(`${formatNumber(scholarships)} borse di ateneo · ${formatPercent(rate)} esoneri`)],
      [text(`${note}. Non equivale alla probabilità individuale di ottenere il beneficio.`)],
      'MUR 2025 + CENSIS'
    );
  }
  if (censisRecord?.scholarships != null) {
    return plain(
      `Indicatore borse CENSIS ${censisRecord.scholarships}/110`,
      'Dato comparativo della categoria CENSIS; consulta il bando ufficiale per requisiti e importi.',
      'CENSIS 2026/27'
    );
  }
  return rich(
    [link(officialSite(university), 'Consulta borse e agevolazioni ufficiali')],
    [text('Il dataset aggregato non consente un tasso omogeneo per questo ateneo.')],
    'Fonte ateneo'
  );
}

function mobilityValue(university: University): ComparisonValue {
  const metrics = getMetrics(university.id);
  const out = Number(metrics.mobilityOut || 0);
  const incoming = Number(metrics.mobilityIn || 0);
  const censisRecord = censis.general?.[university.id];
  if (out || incoming) {
    const extra =
      censisRecord?.international != null
        ? ` · indicatore CENSIS internazionalizzazione ${censisRecord.international}/110`
        : '';
    return rich(
      [text(`Uscita ${formatNumber(out)} · entrata ${formatNumber(incoming)}`)],
      [
        text(
          `Studenti in mobilità censiti dal MUR${extra}. I singoli partner vanno verificati nella pagina Erasmus dell’ateneo.`
        )
      ],
      'MUR 2025 + CENSIS'
    );
  }
  if (censisRecord?.international != null) {
    return plain(
      `Internazionalizzazione ${censisRecord.international}/110`,
      'Indicatore CENSIS; partner e accordi specifici sono pubblicati dall’ateneo.',
      'CENSIS 2026/27'
    );
  }
  return rich(
    [link(officialSite(university), 'Apri la mobilità internazionale dell’ateneo')],
    [text('Nessun flusso comparabile è presente nel dataset aggregato.')],
    'Fonte ateneo'
  );
}

function campusValue(university: University): ComparisonValue {
  const metrics = getMetrics(university.id);
  const canteens = Number(metrics.canteens || 0);
  const residences = Number(metrics.residencesDirect || 0) + Number(metrics.residencesPartner || 0);
  const censisRecord = censis.general?.[university.id];
  const suffix = censisRecord?.structures != null ? ` · strutture CENSIS ${censisRecord.structures}/110` : '';
  return plain(
    `${canteens} mense · ${residences} residenze censite`,
    `${canteens || residences ? 'Strutture dirette o convenzionate registrate dal MUR' : 'Nessuna struttura diretta censita; possono esistere servizi regionali'}${suffix}`,
    'MUR 2025 + CENSIS'
  );
}

function housingValue(university: University): ComparisonValue {
  const metrics = getMetrics(university.id);
  const structures = Number(metrics.residencesDirect || 0) + Number(metrics.residencesPartner || 0);
  const places = Number(metrics.residencePlacesDirect || 0) + Number(metrics.residencePlacesPartner || 0);
  const contributions = Number(metrics.housingContributions || 0) + Number(metrics.housingAssigned || 0);
  return plain(
    `${formatNumber(places)} posti · ${formatNumber(contributions)} interventi`,
    `${structures} strutture dirette/convenzionate; gli alloggi degli enti regionali possono non essere inclusi.`,
    'MUR 2025'
  );
}

function tuitionValue(university: University): ComparisonValue {
  const metrics = getMetrics(university.id);
  if (metrics.tuitionAllStudents != null) {
    return plain(
      `${formatEuro(metrics.tuitionAllStudents)} / anno`,
      metrics.tuitionPayers != null
        ? `media su tutti gli iscritti; media dei soli paganti ${formatEuro(metrics.tuitionPayers)}`
        : 'media effettiva su tutti gli iscritti',
      'MUR 2025'
    );
  }
  return rich(
    [link(officialSite(university), 'Apri il tariffario ufficiale')],
    [text('Contribuzione non disponibile nel file aggregato MUR collegato.')],
    'Fonte ateneo'
  );
}

function cityContext(university: University, city = '') {
  const effectiveCity = city || university.city;
  return {
    city: effectiveCity,
    province: university.province || effectiveCity,
    estimate: studentMonthlyEstimate(effectiveCity, university.macroArea),
    youth: youth(university.province || effectiveCity, effectiveCity)
  };
}

function costOfLivingValue(university: University, city = ''): ComparisonValue {
  const { estimate } = cityContext(university, city);
  return plain(
    `circa ${formatEuro(estimate.monthly)} / mese`,
    `stima comparativa: camera ${formatEuro(estimate.rent)} + spese non abitative ${formatEuro(estimate.nonHousing)}; base ISTAT ${formatEuro(estimate.householdSpending)} mensili per famiglia nella ripartizione ${university.macroArea}`,
    'ISTAT 2024 + Immobiliare.it 2026'
  );
}

function roomRentValue(university: University, city = ''): ComparisonValue {
  const context = cityContext(university, city);
  const { estimate } = context;
  return plain(
    `${formatEuro(estimate.rent)} / mese`,
    estimate.rentExact
      ? `prezzo medio richiesto per una stanza singola a ${context.city}`
      : `valore territoriale prudenziale: ${context.city} non è tra le città pubblicate nello studio`,
    'Immobiliare.it Insights 2026'
  );
}

function youthValue(university: University, city = ''): ComparisonValue {
  const context = cityContext(university, city);
  if (!context.youth) {
    return plain(
      'Provincia non presente nella selezione locale',
      'Consulta la classifica completa delle 107 province.',
      'Sole 24 Ore 2025'
    );
  }
  return plain(
    `#${context.youth.rank} su ${context.youth.total}`,
    `indice “Qualità della vita dei giovani” ${context.youth.score.toFixed(2).replace('.', ',')} punti per la provincia di ${context.youth.province}`,
    'Sole 24 Ore 2025'
  );
}

function studentLifeValue(university: University, city = ''): ComparisonValue {
  const context = cityContext(university, city);
  const metrics = getMetrics(university.id);
  const students = Number(metrics.students || 0);
  const mobility = Number(metrics.mobilityOut || 0) + Number(metrics.mobilityIn || 0);
  let label =
    students >= 40000
      ? 'Ecosistema universitario molto ampio'
      : students >= 18000
        ? 'Ecosistema universitario ampio'
        : students >= 6000
          ? 'Comunità universitaria di dimensione media'
          : 'Comunità universitaria più raccolta';
  if (context.youth && context.youth.rank <= 25) label += ' in un contesto giovanile favorevole';
  else if (context.youth && context.youth.rank >= 80)
    label += ' in un contesto giovanile più debole nell’indice territoriale';
  return plain(
    label,
    `${formatNumber(students)} iscritti censiti · ${formatNumber(mobility)} movimenti internazionali · provincia ${context.youth ? `#${context.youth.rank}/107 per i giovani` : 'da verificare'}`,
    'Sintesi MUR + Sole 24 Ore'
  );
}

function workConnectionValue(university: University): ComparisonValue {
  const record = censis.general?.[university.id];
  if (record?.employability != null) {
    return plain(
      `Occupabilità CENSIS ${record.employability}/110`,
      `indicatore ufficiale della categoria “${record.group}”; misura l’ateneo, non il singolo corso né la sola città`,
      'CENSIS 2026/27'
    );
  }
  const ranking = general(university);
  return rich(
    [link(officialSite(university), 'Apri career service e rapporti con le imprese')],
    [
      text(
        `Il CENSIS non pubblica un indicatore separato di occupabilità per questa tipologia; contesto disponibile: ${ranking.summary || 'ranking non disponibile'}.`
      )
    ],
    'Fonte ateneo'
  );
}

function universityRows(left: University, right: University): ComparisonRow[] {
  const row = (label: string, hint: string, fn: (university: University) => ComparisonValue): ComparisonRow => ({
    label,
    hint,
    left: fn(left),
    right: fn(right)
  });
  return [
    row('Ranking generale', 'QS quando presente; altrimenti CENSIS nella categoria omogenea', rankingValue),
    row('Reputazione', 'Lettura del ranking ufficiale disponibile', reputationValue),
    row('Borse e agevolazioni', 'Borse, esoneri e indicatore CENSIS', supportValue),
    row('Erasmus e periodi all’estero', 'Flussi MUR e internazionalizzazione CENSIS', mobilityValue),
    row('Campus e servizi', 'Mense, residenze e strutture', campusValue),
    row('Studentati', 'Posti e interventi abitativi censiti', housingValue),
    row('Rata universitaria annuale', 'Contribuzione media effettiva', tuitionValue),
    row('Costo della vita', 'Stima comparativa da fonti nazionali e immobiliari', (u) => costOfLivingValue(u)),
    row('Camera singola in affitto', 'Prezzo medio mensile richiesto', (u) => roomRentValue(u)),
    row('Qualità della vita dei giovani', 'Indice provinciale su 12 parametri', (u) => youthValue(u)),
    row(
      'Vita studentesca fuori dall’ateneo',
      'Sintesi su dimensione, mobilità e contesto giovanile',
      (u) => studentLifeValue(u)
    ),
    row(
      'Connessione con il lavoro',
      'Indicatore CENSIS di occupabilità o career service ufficiale',
      workConnectionValue
    )
  ];
}

export function compareUniversities(leftId: string, rightId: string): ComparisonResult | ComparisonError | null {
  const left = byId.get(leftId);
  const right = byId.get(rightId);
  if (!left || !right) return null;
  if (left.id === right.id) return { error: 'Scegli due università diverse.' };
  return {
    title: 'Confronto tra università',
    description:
      'Il confronto usa ranking ufficiali e indicatori MUR, CENSIS, ISTAT, Immobiliare.it Insights e Sole 24 Ore, dichiarando sempre la fonte e i limiti.',
    leftTitle: left.name,
    rightTitle: right.name,
    rows: universityRows(left, right),
    scenario: `${left.city} · ${right.city}`
  };
}

function admissionValue(course: Course): ComparisonValue {
  const access = normalize(course.access);
  if (access.includes('libero'))
    return plain('Accesso libero', 'verificare comunque requisiti e scadenze del bando', 'MUR offerta');
  if (access.includes('nazionale'))
    return plain('Programmazione nazionale', 'ammissione selettiva secondo regole nazionali', 'MUR offerta');
  if (access.includes('locale'))
    return plain('Programmazione locale', 'posti e selezione definiti dall’ateneo', 'MUR offerta');
  return plain(course.access || 'Da verificare', 'modalità di accesso del corso', 'MUR offerta');
}

function inferCourseLanguage(course: Course): string {
  const name = normalize(course?.name);
  const englishSignals = [
    'business', 'management', 'economics', 'finance', 'engineering', 'science', 'artificial intelligence',
    'data', 'international', 'marketing', 'medicine', 'design', 'computer'
  ];
  const italianSignals = [
    'scienze', 'ingegneria', 'economia', 'giurisprudenza', 'laurea', 'comunicazione', 'aziendale', 'medicina e chirurgia'
  ];
  const english = englishSignals.some((signal) => name.includes(signal));
  const italian = italianSignals.some((signal) => name.includes(signal));
  if (english && !italian) return 'Probabilmente inglese';
  if (italian && !english) return 'Probabilmente italiano';
  return 'Lingua da confermare';
}

function languageValue(course: Course, university: University): ComparisonValue {
  return rich(
    [text(`${inferCourseLanguage(course)} · `), link(courseOfficialLink(course, university), 'verifica sul corso ufficiale')],
    [text('La denominazione del corso è un indizio; fa fede la pagina ufficiale dell’offerta formativa.')],
    'Fonte ateneo'
  );
}

function employmentValue(course: Course, university: University): ComparisonValue {
  const record = censis.general?.[university.id];
  if (record?.employability != null) {
    return rich(
      [text(`Occupabilità ateneo ${record.employability}/110`)],
      [
        text(
          `Indicatore CENSIS della categoria “${record.group}”. È un proxy ufficiale dell’ateneo, non la percentuale occupata a 12 mesi del singolo corso.`
        )
      ],
      'CENSIS 2026/27'
    );
  }
  return rich(
    [link(courseOfficialLink(course, university), 'Apri la scheda ufficiale del corso')],
    [
      text(
        'Per questo corso il prototipo non dispone di una percentuale omogenea a 12 mesi; verifica i dati AlmaLaurea o il rapporto occupazionale pubblicato dall’ateneo.'
      )
    ],
    'Fonte ateneo / AlmaLaurea'
  );
}

function specialisationValue(course: Course, university: University): ComparisonValue {
  if (course.level === 'magistrale' || course.level === 'ciclo-unico') {
    return rich(
      [text(`Percorso già ${course.level === 'ciclo-unico' ? 'a ciclo unico' : 'magistrale'}`)],
      [
        text('Per dottorati, scuole di specializzazione o master consulta la '),
        link(courseOfficialLink(course, university), 'pagina ufficiale'),
        text('.')
      ],
      'MUR offerta'
    );
  }
  const ranking = forCourse(university, course);
  if (ranking.source === 'censis-teaching') {
    return rich(
      [text(ranking.summary)],
      [
        text(
          'La graduatoria CENSIS della didattica incorpora la progressione di carriera e i rapporti internazionali; non equivale alla quota di laureati che prosegue entro un anno.'
        )
      ],
      'CENSIS 2026/27'
    );
  }
  const profile = matchCourse(course);
  return rich(
    [
      text(
        profile
          ? `Prosecuzione tipica: lauree magistrali dell’area ${profile.group}`
          : 'Prosecuzione da verificare nel piano formativo'
      )
    ],
    [
      text('Consulta gli sbocchi e i percorsi successivi nella '),
      link(courseOfficialLink(course, university), 'scheda ufficiale del corso'),
      text('.')
    ],
    'Profilo MUR + ateneo'
  );
}

function subjectRankingValue(course: Course, university: University): ComparisonValue {
  const subject = forCourse(university, course);
  const generalRanking = general(university);
  const subjectLink = subject.url || officialSite(university);
  const generalCopy =
    generalRanking.source === 'unavailable'
      ? 'prestigio generale non classificato'
      : `${generalRanking.label}: ${generalRanking.summary}`;
  return rich(
    [link(subjectLink, subject.summary || subject.label)],
    [text(subject.note || ''), br(), strong('Contesto dell’ateneo:'), text(` ${generalCopy}.`)],
    subject.sourceFamily || 'Ufficiale'
  );
}

function interestValue(course: Course, vector: ScoreVector | null): ComparisonValue | null {
  if (!vector) return null;
  const score = scoreActualCourse(course, vector);
  const profile = matchCourse(course);
  return plain(`${score}%`, `compatibilità con il profilo salvato “${profile?.name || course.name}”`, 'Preferenze');
}

function subjectsDifference(
  profile: CourseProfile | null,
  otherProfile: CourseProfile | null,
  course: Course,
  university: University
): ComparisonValue {
  const href = courseOfficialLink(course, university);
  if (!profile || !otherProfile) {
    return rich(
      [link(href, 'Apri il piano di studi ufficiale')],
      [text('Il profilo editoriale non è sufficiente per estrarre differenze affidabili tra gli esami.')],
      'Fonte ateneo'
    );
  }
  const other = new Set(otherProfile.subjects.map((subject) => normalize(subject)));
  const unique = profile.subjects.filter((subject) => !other.has(normalize(subject))).slice(0, 5);
  if (!unique.length) {
    return rich(
      [link(href, 'Confronta il piano di studi ufficiale')],
      [text('I profili generali non mostrano differenze nette; fanno fede gli insegnamenti pubblicati dall’ateneo.')],
      'Fonte ateneo'
    );
  }
  return rich(
    unique.map((subject) => chip(subject)),
    [text('Materie distintive del profilo generale. '), link(href, 'Verifica gli esami ufficiali'), text('.')],
    'Profilo + fonte ateneo'
  );
}

function objectiveValue(profile: CourseProfile | null, course: Course, university: University): ComparisonValue {
  const objective =
    profile?.objective ||
    `Approfondire le competenze dell’area ${course.group || 'disciplinare'} indicate dal piano di studi.`;
  return rich(
    [text(objective)],
    [
      text('Sintesi orientativa dal profilo del corso. '),
      link(courseOfficialLink(course, university), 'Leggi gli obiettivi ufficiali dell’ateneo'),
      text('.')
    ],
    'Profilo corso + fonte ateneo'
  );
}

const FOCUS_PATTERNS: [string, string][] = [
  ['management', 'gestione strategica e organizzazione d’impresa'],
  ['aziendal', 'amministrazione, controllo e gestione aziendale'],
  ['finanz', 'finanza, mercati e decisioni quantitative'],
  ['marketing', 'mercati, consumatori e comunicazione commerciale'],
  ['innovaz', 'innovazione e trasformazione dei modelli organizzativi'],
  ['internaz', 'dimensione internazionale e contesti globali'],
  ['sostenib', 'sostenibilità e impatto ambientale/sociale'],
  ['digital', 'processi digitali e tecnologie applicate'],
  ['data', 'analisi dei dati e metodi quantitativi'],
  ['informat', 'software, sistemi informativi e calcolo'],
  ['aerospaz', 'sistemi aeronautici e spaziali'],
  ['meccanic', 'macchine, energia e processi industriali'],
  ['biomed', 'applicazioni biomediche e sanitarie'],
  ['comunicaz', 'media, contenuti e processi comunicativi'],
  ['turism', 'gestione dei sistemi turistici e territoriali'],
  ['pubblic', 'organizzazioni e amministrazioni pubbliche'],
  ['giurid', 'norme, istituzioni e ragionamento giuridico'],
  ['ambient', 'ambiente, territorio e transizione ecologica']
];

function courseFocuses(course: Course): string[] {
  const haystack = normalize(`${course.name} ${course.className || ''}`);
  return FOCUS_PATTERNS.filter(([needle]) => haystack.includes(needle)).map(([, label]) => label);
}

function whyChoose(course: Course, university: University, otherCourse: Course): ComparisonValue {
  const profile = matchCourse(course);
  const otherProfile = matchCourse(otherCourse);
  const objective = profile?.objective || `sviluppare competenze nell’area ${course.group}`;
  const focuses = courseFocuses(course);
  const otherFocuses = new Set(courseFocuses(otherCourse));
  const uniqueFocus = focuses.filter((item) => !otherFocuses.has(item));
  const otherUnique = Array.from(otherFocuses).filter((item) => !focuses.includes(item));

  let contrast: string;
  if (profile?.slug && profile.slug === otherProfile?.slug) {
    if (uniqueFocus.length || otherUnique.length) {
      contrast = `Rispetto a “${otherCourse.name}”, questa denominazione mette maggiormente l’accento su ${uniqueFocus[0] || 'il proprio taglio applicativo'}, mentre l’alternativa evidenzia ${otherUnique[0] || 'un’impostazione più generale'}.`;
    } else {
      contrast =
        'I due corsi condividono un obiettivo generale molto simile. La differenza reale dipende soprattutto dagli insegnamenti obbligatori, dai laboratori e dagli sbocchi dichiarati nei rispettivi piani di studio.';
    }
  } else {
    contrast = `Si distingue da “${otherCourse.name}” perché concentra la formazione su ${uniqueFocus[0] || profile?.group || course.group}, mentre l’altro percorso mira soprattutto a ${otherProfile?.objective || otherUnique[0] || otherCourse.group}.`;
  }

  return rich(
    [
      paragraph([strong('Obiettivo:'), text(` ${objective}`)], 'comparison-objective-copy'),
      paragraph([text(contrast)]),
      link(courseOfficialLink(course, university), 'Verifica obiettivi e piano di studi ufficiali')
    ],
    [
      text(
        `Sintesi costruita sul profilo generale e sulla denominazione del corso di ${university.shortName}; non riassume ranking, costi o ammissione.`
      )
    ],
    'Confronto obiettivi'
  );
}

function courseIdentity(course: Course, university: University): string {
  return `${course.name} — ${university.shortName}`;
}

function interestRow(left: Course, right: Course, vector: ScoreVector | null): ComparisonRow[] {
  const leftInterest = interestValue(left, vector);
  const rightInterest = interestValue(right, vector);
  return leftInterest && rightInterest
    ? [{ label: 'Interesse personale', hint: 'Da “Trova il mio corso”', left: leftInterest, right: rightInterest }]
    : [];
}

function commonCourseRows(
  leftCourse: Course,
  leftUniversity: University,
  rightCourse: Course,
  rightUniversity: University,
  vector: ScoreVector | null,
  includeInterest = true
): ComparisonRow[] {
  const rows: ComparisonRow[] = includeInterest ? interestRow(leftCourse, rightCourse, vector) : [];
  rows.push(
    {
      label: 'Lingua',
      hint: 'Lingua principale di erogazione',
      left: languageValue(leftCourse, leftUniversity),
      right: languageValue(rightCourse, rightUniversity)
    },
    {
      label: 'Occupabilità ed esiti professionali',
      hint: 'Indicatore ufficiale disponibile; non sempre percentuale del singolo corso a 12 mesi',
      left: employmentValue(leftCourse, leftUniversity),
      right: employmentValue(rightCourse, rightUniversity)
    },
    {
      label: 'Progressione e prosecuzione degli studi',
      hint: 'CENSIS della didattica o percorsi ufficiali successivi',
      left: specialisationValue(leftCourse, leftUniversity),
      right: specialisationValue(rightCourse, rightUniversity)
    }
  );
  return rows;
}

function sameCourseDifferentUniversitiesRows(
  leftCourse: Course,
  leftUniversity: University,
  rightCourse: Course,
  rightUniversity: University,
  vector: ScoreVector | null
): ComparisonRow[] {
  return [
    {
      label: 'Ranking ufficiale del corso',
      hint: 'QS per materia; fallback CENSIS didattica o generale',
      left: subjectRankingValue(leftCourse, leftUniversity),
      right: subjectRankingValue(rightCourse, rightUniversity)
    },
    {
      label: 'Reputazione dell’università',
      hint: 'QS generale; fallback CENSIS nella categoria omogenea',
      left: reputationValue(leftUniversity),
      right: reputationValue(rightUniversity)
    },
    {
      label: 'Facilità di ammissione',
      hint: 'Tipo di accesso dichiarato',
      left: admissionValue(leftCourse),
      right: admissionValue(rightCourse)
    },
    ...commonCourseRows(leftCourse, leftUniversity, rightCourse, rightUniversity, vector, false),
    {
      label: 'Rata annuale',
      hint: 'Contribuzione media dell’ateneo',
      left: tuitionValue(leftUniversity),
      right: tuitionValue(rightUniversity)
    },
    {
      label: 'Perché scegliere questa sede',
      hint: 'Obiettivo del corso e differenze formative',
      left: whyChoose(leftCourse, leftUniversity, rightCourse),
      right: whyChoose(rightCourse, rightUniversity, leftCourse)
    }
  ];
}

function differentCoursesSameUniversityRows(
  leftCourse: Course,
  university: University,
  rightCourse: Course,
  vector: ScoreVector | null
): ComparisonRow[] {
  const leftProfile = matchCourse(leftCourse);
  const rightProfile = matchCourse(rightCourse);
  const rows = commonCourseRows(leftCourse, university, rightCourse, university, vector, true);
  if (leftCourse.group === rightCourse.group) {
    rows.push({
      label: 'Principali materie distintive',
      hint: `Entrambi nell’area ${leftCourse.group}`,
      left: subjectsDifference(leftProfile, rightProfile, leftCourse, university),
      right: subjectsDifference(rightProfile, leftProfile, rightCourse, university)
    });
  }
  rows.push({
    label: 'Obiettivo formativo',
    hint: 'Che cosa prova a costruire il percorso',
    left: objectiveValue(leftProfile, leftCourse, university),
    right: objectiveValue(rightProfile, rightCourse, university)
  });
  return rows;
}

function differentCoursesDifferentUniversitiesRows(
  leftCourse: Course,
  leftUniversity: University,
  rightCourse: Course,
  rightUniversity: University,
  vector: ScoreVector | null
): ComparisonRow[] {
  const leftProfile = matchCourse(leftCourse);
  const rightProfile = matchCourse(rightCourse);
  const rows = interestRow(leftCourse, rightCourse, vector);
  rows.push(
    {
      label: 'Ranking del corso e dell’ateneo',
      hint: 'Materia QS o CENSIS, con contesto generale dell’ateneo',
      left: subjectRankingValue(leftCourse, leftUniversity),
      right: subjectRankingValue(rightCourse, rightUniversity)
    },
    {
      label: 'Occupabilità ed esiti professionali',
      hint: 'Indicatore ufficiale disponibile; non sempre percentuale del singolo corso a 12 mesi',
      left: employmentValue(leftCourse, leftUniversity),
      right: employmentValue(rightCourse, rightUniversity)
    },
    {
      label: 'Progressione e prosecuzione degli studi',
      hint: 'CENSIS della didattica o percorsi ufficiali successivi',
      left: specialisationValue(leftCourse, leftUniversity),
      right: specialisationValue(rightCourse, rightUniversity)
    },
    {
      label: 'Lingua',
      hint: 'Lingua principale di erogazione',
      left: languageValue(leftCourse, leftUniversity),
      right: languageValue(rightCourse, rightUniversity)
    }
  );
  if (leftCourse.group === rightCourse.group) {
    rows.push({
      label: 'Principali materie distintive',
      hint: `Entrambi nell’area ${leftCourse.group}`,
      left: subjectsDifference(leftProfile, rightProfile, leftCourse, leftUniversity),
      right: subjectsDifference(rightProfile, leftProfile, rightCourse, rightUniversity)
    });
  }
  rows.push(
    {
      label: 'Obiettivo formativo',
      hint: 'Direzione generale del percorso',
      left: objectiveValue(leftProfile, leftCourse, leftUniversity),
      right: objectiveValue(rightProfile, rightCourse, rightUniversity)
    },
    {
      label: 'Perché scegliere questa alternativa',
      hint: 'Obiettivo del corso e differenze formative',
      left: whyChoose(leftCourse, leftUniversity, rightCourse),
      right: whyChoose(rightCourse, rightUniversity, leftCourse)
    },
    {
      label: 'Rata annuale',
      hint: 'Contribuzione media dell’ateneo',
      left: tuitionValue(leftUniversity),
      right: tuitionValue(rightUniversity)
    },
    {
      label: 'Costo della vita',
      hint: 'Stima comparativa della città del corso',
      left: costOfLivingValue(leftUniversity, leftCourse.city),
      right: costOfLivingValue(rightUniversity, rightCourse.city)
    },
    {
      label: 'Camera singola in affitto',
      hint: 'Prezzo medio mensile richiesto',
      left: roomRentValue(leftUniversity, leftCourse.city),
      right: roomRentValue(rightUniversity, rightCourse.city)
    },
    {
      label: 'Vita fuori dall’università',
      hint: 'Sintesi da dimensione universitaria e contesto giovanile',
      left: studentLifeValue(leftUniversity, leftCourse.city),
      right: studentLifeValue(rightUniversity, rightCourse.city)
    },
    {
      label: 'Qualità della vita dei giovani',
      hint: 'Indice provinciale su 12 parametri',
      left: youthValue(leftUniversity, leftCourse.city),
      right: youthValue(rightUniversity, rightCourse.city)
    }
  );
  return rows;
}

export function compareCourses(
  leftUniversityId: string,
  leftCourseId: string,
  rightUniversityId: string,
  rightCourseId: string,
  vector: ScoreVector | null = null
): ComparisonResult | ComparisonError | null {
  const leftUniversity = byId.get(leftUniversityId);
  const rightUniversity = byId.get(rightUniversityId);
  const leftCourse = leftUniversity ? getCourses(leftUniversity.id).find((course) => course.id === leftCourseId) : null;
  const rightCourse = rightUniversity
    ? getCourses(rightUniversity.id).find((course) => course.id === rightCourseId)
    : null;
  if (!leftUniversity || !rightUniversity || !leftCourse || !rightCourse) return null;

  const leftProfile = matchCourse(leftCourse);
  const rightProfile = matchCourse(rightCourse);
  const sameUniversity = leftUniversity.id === rightUniversity.id;
  const sameGeneralCourse = leftProfile?.slug === rightProfile?.slug;

  if (sameUniversity && leftCourse.id === rightCourse.id) return { error: 'Scegli due corsi diversi.' };

  let rows: ComparisonRow[];
  let scenario: string;
  let description: string;
  if (sameUniversity) {
    scenario = 'Stessa università · corsi diversi';
    description = `Due percorsi diversi all’interno di ${leftUniversity.name}.`;
    rows = differentCoursesSameUniversityRows(leftCourse, leftUniversity, rightCourse, vector);
  } else if (sameGeneralCourse) {
    scenario = 'Stesso corso · università diverse';
    description = `Il prototipo ha ricondotto entrambi i corsi al profilo generale “${leftProfile?.name}”.`;
    rows = sameCourseDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity, vector);
  } else {
    scenario = 'Corsi diversi · università diverse';
    description = 'Il confronto combina caratteristiche del corso, dell’ateneo e della città.';
    rows = differentCoursesDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity, vector);
  }

  return {
    title: 'Confronto tra corsi',
    description,
    leftTitle: courseIdentity(leftCourse, leftUniversity),
    rightTitle: courseIdentity(rightCourse, rightUniversity),
    rows,
    scenario
  };
}

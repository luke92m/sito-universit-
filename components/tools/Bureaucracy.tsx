'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSite } from '@/components/site/SiteProvider';
import { UniversityCombobox } from '@/components/site/UniversityCombobox';
import { saveContext } from '@/lib/client/contexts';
import { journeyOf, type UniversitySummary } from '@/lib/client/types';
import { useUniversityCourses, type CourseOption, type UniversityCoursesPayload } from '@/lib/client/use-courses';
import { STUDENT_SERVICES } from '@/lib/data/student-services';
import { generalCoursesSorted } from '@/lib/domain/course-catalog';
import { formatDate } from '@/lib/site-config';
import { AccessGate, LoadingGate } from './AccessGate';

interface SelectedCourse {
  name: string;
  classCode: string;
  group: string;
  area: string;
  access: string;
  delivery: string;
  city: string;
  level: string;
}

function euro(value: number | null | undefined): string {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'Dato medio non disponibile';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(number);
}

// Porting di findTestArea(): associazione orientativa tra corso e famiglia TOLC.
function findTestArea(course: SelectedCourse) {
  const haystack = `${course.group || ''} ${course.area || ''} ${course.name || ''}`.toLowerCase();
  const aliases: [string, string[]][] = [
    ['engineering', ['ingegner', 'informatica', 'ict', 'architettura']],
    ['economics', ['econom', 'management', 'statistic']],
    ['health', ['medic', 'sanitari', 'farmac', 'infermier', 'fisioterap']],
    ['psychology', ['psicolog']],
    ['agriculture', ['agrar', 'forest', 'veterinar']],
    ['social', ['politic', 'social', 'comunicazione', 'giurid']],
    ['humanities', ['letter', 'lingu', 'educazione', 'formazione', 'arte', 'design']],
    ['science', ['scientific', 'biolog', 'chimic', 'fisic', 'matematic', 'ambient']]
  ];
  const areaId = aliases.find(([, words]) => words.some((word) => haystack.includes(word)))?.[0] || 'humanities';
  return STUDENT_SERVICES.testAreas.find((area) => area.id === areaId) || null;
}

function accessSummary(course: SelectedCourse, university: UniversitySummary) {
  const access = String(course.access || '').toLowerCase();
  if (access.includes('nazionale')) {
    return {
      title: 'Accesso programmato nazionale',
      text: 'La graduatoria, i posti e le modalità sono disciplinati da procedure nazionali e dal bando dell’ateneo. Il diploma è necessario; eventuali punteggi scolastici vanno verificati nel bando.'
    };
  }
  if (access.includes('locale')) {
    return {
      title: 'Accesso programmato locale',
      text: 'L’ateneo stabilisce posti, prova, soglia e graduatoria. Consulta il bando del corso: la media delle superiori può essere irrilevante oppure usata soltanto in casi specifici.'
    };
  }
  if (access.includes('libero')) {
    return {
      title: 'Accesso indicato come libero',
      text: 'Può comunque essere previsto un test di verifica iniziale o un TOLC con eventuali obblighi formativi aggiuntivi. Il bando ufficiale resta decisivo.'
    };
  }
  return {
    title: university.isPublic ? 'Procedura da verificare nel bando' : 'Test interno o procedura da verificare',
    text: 'Il dataset non permette di confermare la procedura attuale. Controlla requisiti, eventuale test, colloquio, graduatoria e uso dei voti scolastici sulla pagina ufficiale del corso.'
  };
}

const CHECKLIST = [
  ['Diploma o titolo valido', 'Controlla requisiti per titoli italiani, esteri o ancora da conseguire.'],
  ['Identità digitale e documento', 'SPID/CIE quando richiesti, documento, codice fiscale e recapiti.'],
  ['Registrazione al portale', 'Crea l’account sull’area studenti dell’ateneo e completa i dati anagrafici.'],
  ['Test, graduatoria o verifica iniziale', 'Segui il bando per iscrizione, pagamento, data, soglia e pubblicazione esiti.'],
  ['ISEE universitario ed eventuali allegati', 'Servono per contribuzione ridotta e per molte misure di diritto allo studio.'],
  ['Pagamento e immatricolazione', 'Verifica prima rata, scadenza, marca da bollo e caricamento dei documenti.']
];

function BureaucracyResult({
  university,
  course,
  payload
}: {
  university: UniversitySummary;
  course: SelectedCourse;
  payload: UniversityCoursesPayload;
}) {
  const access = accessSummary(course, university);
  const testArea = findTestArea(course);
  const universityUrl = STUDENT_SERVICES.officialDomains?.[university.id] || STUDENT_SERVICES.sources?.universitaly || '#';
  const coursePageUrl = `/api/course-link?${new URLSearchParams({
    universityId: university.id,
    course: course.name,
    classCode: course.classCode || ''
  }).toString()}`;
  const scholarshipUrl = `/area-studente/borse-di-studio?${new URLSearchParams({ ateneo: university.id, corso: course.name }).toString()}`;
  const averageTuition = payload.tuition.payers || payload.tuition.allStudents;
  const delivery = course.delivery && course.delivery !== 'da verificare' ? course.delivery : 'Modalità da verificare';

  return (
    <section className="bureaucracy-result">
      <header className="bureaucracy-result-header">
        <div>
          <span className="eyebrow">Scheda orientativa</span>
          <h2>{course.name}</h2>
          <p>
            {university.name} · {university.city}
          </p>
        </div>
        <span className="data-year-badge">dati aggregati {payload.academicYear || '2024/2025'}</span>
      </header>

      <div className="bureaucracy-summary-grid">
        <article>
          <span>Accesso</span>
          <strong>{access.title}</strong>
          <p>{access.text}</p>
        </article>
        <article>
          <span>Prova di area</span>
          <strong>{testArea?.tolc || 'Da verificare'}</strong>
          <p>
            {university.isPublic
              ? 'Possibile riferimento TOLC; verifica se il corso lo richiede.'
              : 'L’ateneo può utilizzare un test interno; confronta il programma con la macroarea.'}
          </p>
        </article>
        <article>
          <span>Contribuzione media</span>
          <strong>{euro(averageTuition)}</strong>
          <p>Media aggregata del dataset, non preventivo personale. ISEE, esoneri e fascia modificano l’importo reale.</p>
        </article>
        <article>
          <span>Modalità didattica</span>
          <strong>{delivery}</strong>
          <p>
            {course.level || 'Livello da verificare'} · sede indicata: {course.city || university.city}
          </p>
        </article>
      </div>

      <div className="bureaucracy-columns">
        <article className="service-card checklist-card">
          <span className="eyebrow">Documenti e informazioni</span>
          <h3>Checklist prima della domanda</h3>
          <ul className="document-checklist">
            {CHECKLIST.map(([title, copy], index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="service-card next-actions-card">
          <span className="eyebrow">Azioni successive</span>
          <h3>Passa dai dati al bando ufficiale</h3>
          <div className="action-link-stack">
            <a href={coursePageUrl} target="_blank" rel="noreferrer">
              <strong>Apri la pagina ufficiale del corso</strong>
              <span>Il sito individua la pagina del corso nel portale dell’ateneo e la apre direttamente →</span>
            </a>
            <a href={universityUrl} target="_blank" rel="noreferrer">
              <strong>Apri il sito dell’ateneo</strong>
              <span>Fonte primaria da usare prima di inviare la domanda →</span>
            </a>
            <Link href={scholarshipUrl}>
              <strong>Verifica le borse di studio</strong>
              <span>Ateneo e corso vengono passati come campione di ricerca →</span>
            </Link>
          </div>
        </article>
      </div>

      <section className="source-disclaimer">
        <strong>Questa scheda non è una pratica di immatricolazione.</strong>
        <p>
          È una sintesi orientativa costruita con dati aggregati e regole generali. Importi, test, uso della media
          scolastica, documenti e scadenze possono cambiare: la pagina ufficiale e il bando del corso prevalgono sempre.
        </p>
      </section>
    </section>
  );
}

export function Bureaucracy() {
  const { user, loading, getUniversity } = useSite();
  const [universityId, setUniversityId] = useState('');
  const [courseValue, setCourseValue] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{
    university: UniversitySummary;
    course: SelectedCourse;
    payload: UniversityCoursesPayload;
  } | null>(null);
  const [today, setToday] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);
  const preferredCourseName = useRef('');
  const payload = useUniversityCourses(universityId);

  useEffect(() => setToday(formatDate(new Date())), []);
  useEffect(() => {
    const journey = journeyOf(user);
    if (journey?.universityId) {
      setUniversityId((current) => current || journey.universityId);
      preferredCourseName.current = journey.courseName || '';
    }
  }, [user]);

  // Preseleziona il corso del profilo quando l'elenco è disponibile.
  useEffect(() => {
    if (payload.loading || !preferredCourseName.current) return;
    const match = payload.courses.find((course) => course.name === preferredCourseName.current);
    if (match) setCourseValue(`actual::${match.id}`);
    preferredCourseName.current = '';
  }, [payload.loading, payload.courses]);

  if (loading) return <LoadingGate />;
  if (!user || user.profile.situation !== 'enrolling') {
    const copy =
      'Nel profilo seleziona “Mi voglio iscrivere all’università” per vedere Preparazione e Burocrazia nel menu principale.';
    return (
      <AccessGate
        reason={user ? 'profile' : 'login'}
        eyebrow="Percorso personale"
        loginTitle="Accedi per costruire la tua checklist di immatricolazione."
        profileTitle="Burocrazia è visibile a chi sta scegliendo l’università."
        loginCopy={copy}
        profileCopy={copy}
        secondary={{ href: '/atenei', label: 'Esplora gli atenei' }}
      />
    );
  }

  const generalCourses = generalCoursesSorted();
  const resolveCourse = (university: UniversitySummary): SelectedCourse | null => {
    if (courseValue.startsWith('actual::')) {
      const id = courseValue.slice('actual::'.length);
      const course = payload.courses.find((entry: CourseOption) => entry.id === id);
      return course ? { ...course } : null;
    }
    if (courseValue.startsWith('general::')) {
      const slug = courseValue.slice('general::'.length);
      const course = generalCourses.find((entry) => entry.slug === slug);
      if (!course) return null;
      return {
        name: course.name,
        classCode: '',
        group: course.group || 'Area da verificare',
        area: course.group || 'Area da verificare',
        access: 'da verificare',
        delivery: 'da verificare',
        city: university.city,
        level: 'laurea'
      };
    }
    return null;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const university = getUniversity(universityId);
    const course = university ? resolveCourse(university) : null;
    if (!university || !course) {
      setMessage('Seleziona un ateneo e un corso.');
      return;
    }
    setMessage('');
    await saveContext(user.id, 'bureaucracy', { universityId: university.id, courseName: course.name });
    setResult({ university, course, payload });
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <>
      <section className="tool-hero tool-hero-compact">
        <div>
          <span className="eyebrow">Immatricolazione</span>
          <h1>La burocrazia, in ordine.</h1>
          <p>
            Scegli corso e ateneo per ottenere una checklist orientativa, capire quali verifiche fare e raggiungere le fonti
            ufficiali.
          </p>
        </div>
        <aside className="today-card">
          <span>Verifica effettuata il</span>
          <strong>{today}</strong>
          <small>Le scadenze ufficiali non vengono inventate.</small>
        </aside>
      </section>

      <section className="service-card bureaucracy-selector-card">
        <div className="service-card-heading">
          <div>
            <span className="eyebrow">Campione di ricerca</span>
            <h2>Quale immatricolazione vuoi verificare?</h2>
          </div>
        </div>
        <form className="service-form" onSubmit={submit} noValidate>
          <label className="field field-wide">
            <span>Ateneo</span>
            <UniversityCombobox
              value={universityId}
              onChange={(id) => {
                setUniversityId(id);
                setCourseValue('');
              }}
              ariaLabel="Ateneo"
              required
            />
          </label>
          <label className="field field-wide">
            <span>Corso</span>
            <select value={courseValue} onChange={(event) => setCourseValue(event.target.value)} required>
              {!universityId ? <option value="">Seleziona prima l’ateneo</option> : null}
              {universityId && payload.loading ? <option value="">Caricamento dei corsi…</option> : null}
              {universityId && !payload.loading && payload.courses.length ? (
                <>
                  <option value="">Seleziona un corso</option>
                  {payload.courses.map((course) => (
                    <option key={course.id} value={`actual::${course.id}`}>
                      {course.name} · {course.level}
                    </option>
                  ))}
                </>
              ) : null}
              {universityId && !payload.loading && !payload.courses.length ? (
                <>
                  <option value="">Seleziona un corso generale</option>
                  {generalCourses.map((course) => (
                    <option key={course.slug} value={`general::${course.slug}`}>
                      {course.name}
                    </option>
                  ))}
                </>
              ) : null}
            </select>
          </label>
          <p className="service-form-note field-wide">
            La banca dati dei corsi è riferita all’anno accademico indicato nel progetto. Prima della domanda verifica che il
            corso sia attivo nell’anno di tuo interesse.
          </p>
          <p className="form-message field-wide" role="alert" data-type={message ? 'error' : undefined}>
            {message}
          </p>
          <button className="button button-primary field-wide" type="submit">
            Crea la checklist
          </button>
        </form>
      </section>

      <div ref={resultRef}>
        {result ? <BureaucracyResult university={result.university} course={result.course} payload={result.payload} /> : null}
      </div>
    </>
  );
}

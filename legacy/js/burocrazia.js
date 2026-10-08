(() => {
  'use strict';

  const app = window.UniversitySite;
  const serviceData = window.STUDENT_SERVICE_DATA || {};
  const $ = (selector, parent = document) => parent.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function euro(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 'Dato medio non disponibile';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(number);
  }

  function universityOptions(selected = '') {
    return app.getUniversities()
      .map((university) => `<option value="${university.id}"${university.id === selected ? ' selected' : ''}>${escapeHtml(university.name)} — ${escapeHtml(university.city)}</option>`)
      .join('');
  }

  function renderLocked(host, reason) {
    const title = reason === 'login'
      ? 'Accedi per costruire la tua checklist di immatricolazione.'
      : 'Burocrazia è visibile a chi sta scegliendo l’università.';
    host.innerHTML = `
      <section class="access-gate">
        <span class="eyebrow">Percorso personale</span>
        <h1>${escapeHtml(title)}</h1>
        <p>Nel profilo seleziona “Mi voglio iscrivere all’università” per vedere Preparazione e Burocrazia nel menu principale.</p>
        <div class="inline-actions">
          ${reason === 'login' ? '<button class="button button-primary" type="button" data-open-bureaucracy-auth>Accedi o registrati</button>' : ''}
          <a class="button button-secondary" href="atenei.html">Esplora gli atenei</a>
        </div>
      </section>`;
    $('[data-open-bureaucracy-auth]')?.addEventListener('click', () => app.openAuth('register'));
  }

  function courseOptionValue(course) {
    return `actual::${course.id}`;
  }

  function fillCourses(universityId, selectedCourseName = '') {
    const select = $('#bureaucracyCourse');
    if (!select) return;
    const actual = app.getUniversityCourses(universityId);
    if (actual.length) {
      select.innerHTML = `<option value="">Seleziona un corso</option>${actual.map((course) => `<option value="${escapeHtml(courseOptionValue(course))}"${course.name === selectedCourseName ? ' selected' : ''}>${escapeHtml(course.name)} · ${escapeHtml(course.level)}</option>`).join('')}`;
      return;
    }
    select.innerHTML = `<option value="">Seleziona un corso generale</option>${app.getGeneralCourses().map((course) => `<option value="general::${escapeHtml(course.slug || course.name)}"${course.name === selectedCourseName ? ' selected' : ''}>${escapeHtml(course.name)}</option>`).join('')}`;
  }

  function resolveSelectedCourse(universityId, value) {
    if (!value) return null;
    if (value.startsWith('actual::')) {
      const id = value.slice('actual::'.length);
      return app.getUniversityCourses(universityId).find((course) => course.id === id) || null;
    }
    if (value.startsWith('general::')) {
      const key = value.slice('general::'.length);
      const course = app.getGeneralCourses().find((entry) => (entry.slug || entry.name) === key);
      if (!course) return null;
      return {
        id: `general:${key}`,
        name: course.name,
        group: course.group || course.area || 'Area da verificare',
        area: course.area || course.group || 'Area da verificare',
        access: 'da verificare',
        delivery: 'da verificare',
        city: app.getUniversityById(universityId)?.city || '',
        level: course.level || 'laurea'
      };
    }
    return null;
  }

  function findTestArea(course) {
    const haystack = `${course?.group || ''} ${course?.area || ''} ${course?.name || ''}`.toLowerCase();
    const aliases = [
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
    return (serviceData.testAreas || []).find((area) => area.id === areaId) || null;
  }

  function accessSummary(course, university) {
    const access = String(course?.access || '').toLowerCase();
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
      title: university?.isPublic ? 'Procedura da verificare nel bando' : 'Test interno o procedura da verificare',
      text: 'Il dataset non permette di confermare la procedura attuale. Controlla requisiti, eventuale test, colloquio, graduatoria e uso dei voti scolastici sulla pagina ufficiale del corso.'
    };
  }

  function officialCourseLink(university, course) {
    const params = new URLSearchParams({
      universityId: university.id,
      course: course.name,
      classCode: course.classCode || ''
    });
    return `api/course-link?${params.toString()}`;
  }

  function renderResult(university, course) {
    const universityData = window.UniversityData?.getUniversityData?.(university.id) || {};
    const metrics = universityData.metrics || {};
    const access = accessSummary(course, university);
    const testArea = findTestArea(course);
    const universityUrl = serviceData.officialDomains?.[university.id] || serviceData.sources?.universitaly || '#';
    const coursePageUrl = officialCourseLink(university, course);
    const scholarshipUrl = `area-studente.html?sezione=borse-di-studio&ateneo=${encodeURIComponent(university.id)}&corso=${encodeURIComponent(course.name)}`;
    const averageTuition = metrics.tuitionPayers || metrics.tuitionAllStudents;
    const delivery = course.delivery && course.delivery !== 'da verificare' ? course.delivery : 'Modalità da verificare';

    return `
      <section class="bureaucracy-result">
        <header class="bureaucracy-result-header">
          <div><span class="eyebrow">Scheda orientativa</span><h2>${escapeHtml(course.name)}</h2><p>${escapeHtml(university.name)} · ${escapeHtml(university.city)}</p></div>
          <span class="data-year-badge">dati aggregati ${escapeHtml(window.UniversityData?.dataset?.academicYear || '2024/2025')}</span>
        </header>

        <div class="bureaucracy-summary-grid">
          <article><span>Accesso</span><strong>${escapeHtml(access.title)}</strong><p>${escapeHtml(access.text)}</p></article>
          <article><span>Prova di area</span><strong>${escapeHtml(testArea?.tolc || 'Da verificare')}</strong><p>${university.isPublic ? 'Possibile riferimento TOLC; verifica se il corso lo richiede.' : 'L’ateneo può utilizzare un test interno; confronta il programma con la macroarea.'}</p></article>
          <article><span>Contribuzione media</span><strong>${escapeHtml(euro(averageTuition))}</strong><p>Media aggregata del dataset, non preventivo personale. ISEE, esoneri e fascia modificano l’importo reale.</p></article>
          <article><span>Modalità didattica</span><strong>${escapeHtml(delivery)}</strong><p>${escapeHtml(course.level || 'Livello da verificare')} · sede indicata: ${escapeHtml(course.city || university.city)}</p></article>
        </div>

        <div class="bureaucracy-columns">
          <article class="service-card checklist-card">
            <span class="eyebrow">Documenti e informazioni</span>
            <h3>Checklist prima della domanda</h3>
            <ul class="document-checklist">
              <li><span>1</span><div><strong>Diploma o titolo valido</strong><p>Controlla requisiti per titoli italiani, esteri o ancora da conseguire.</p></div></li>
              <li><span>2</span><div><strong>Identità digitale e documento</strong><p>SPID/CIE quando richiesti, documento, codice fiscale e recapiti.</p></div></li>
              <li><span>3</span><div><strong>Registrazione al portale</strong><p>Crea l’account sull’area studenti dell’ateneo e completa i dati anagrafici.</p></div></li>
              <li><span>4</span><div><strong>Test, graduatoria o verifica iniziale</strong><p>Segui il bando per iscrizione, pagamento, data, soglia e pubblicazione esiti.</p></div></li>
              <li><span>5</span><div><strong>ISEE universitario ed eventuali allegati</strong><p>Servono per contribuzione ridotta e per molte misure di diritto allo studio.</p></div></li>
              <li><span>6</span><div><strong>Pagamento e immatricolazione</strong><p>Verifica prima rata, scadenza, marca da bollo e caricamento dei documenti.</p></div></li>
            </ul>
          </article>

          <article class="service-card next-actions-card">
            <span class="eyebrow">Azioni successive</span>
            <h3>Passa dai dati al bando ufficiale</h3>
            <div class="action-link-stack">
              <a href="${escapeHtml(coursePageUrl)}" target="_blank" rel="noreferrer"><strong>Apri la pagina ufficiale del corso</strong><span>Il sito individua la pagina del corso nel portale dell’ateneo e la apre direttamente →</span></a>
              <a href="${escapeHtml(universityUrl)}" target="_blank" rel="noreferrer"><strong>Apri il sito dell’ateneo</strong><span>Fonte primaria da usare prima di inviare la domanda →</span></a>
              <a href="${escapeHtml(scholarshipUrl)}"><strong>Verifica le borse di studio</strong><span>Ateneo e corso vengono passati come campione di ricerca →</span></a>
            </div>
          </article>
        </div>

        <section class="source-disclaimer">
          <strong>Questa scheda non è una pratica di immatricolazione.</strong>
          <p>È una sintesi orientativa costruita con dati aggregati e regole generali. Importi, test, uso della media scolastica, documenti e scadenze possono cambiare: la pagina ufficiale e il bando del corso prevalgono sempre.</p>
        </section>
      </section>`;
  }

  function renderTool(host, user) {
    const defaultUniversity = user?.journey?.universityId || '';
    host.innerHTML = `
      <section class="tool-hero tool-hero-compact">
        <div>
          <span class="eyebrow">Immatricolazione</span>
          <h1>La burocrazia, in ordine.</h1>
          <p>Scegli corso e ateneo per ottenere una checklist orientativa, capire quali verifiche fare e raggiungere le fonti ufficiali.</p>
        </div>
        <aside class="today-card"><span>Verifica effettuata il</span><strong>${escapeHtml(app.formatDate(new Date()))}</strong><small>Le scadenze ufficiali non vengono inventate.</small></aside>
      </section>

      <section class="service-card bureaucracy-selector-card">
        <div class="service-card-heading"><div><span class="eyebrow">Campione di ricerca</span><h2>Quale immatricolazione vuoi verificare?</h2></div></div>
        <form id="bureaucracyForm" class="service-form" novalidate>
          <label class="field field-wide"><span>Ateneo</span><select id="bureaucracyUniversity" data-university-select required><option value="">Seleziona un ateneo</option>${universityOptions(defaultUniversity)}</select></label>
          <label class="field field-wide"><span>Corso</span><select id="bureaucracyCourse" required><option value="">Seleziona prima l’ateneo</option></select></label>
          <p class="service-form-note field-wide">La banca dati dei corsi è riferita all’anno accademico indicato nel progetto. Prima della domanda verifica che il corso sia attivo nell’anno di tuo interesse.</p>
          <p class="form-message field-wide" id="bureaucracyMessage" role="alert"></p>
          <button class="button button-primary field-wide" type="submit">Crea la checklist</button>
        </form>
      </section>

      <div id="bureaucracyResultHost"></div>`;

    const universitySelect = $('#bureaucracyUniversity');
    app.enhanceUniversitySelect?.(universitySelect);
    universitySelect?.addEventListener('change', () => fillCourses(universitySelect.value));
    if (defaultUniversity) fillCourses(defaultUniversity, user?.journey?.courseName || '');

    $('#bureaucracyForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const university = app.getUniversityById(universitySelect.value);
      const course = resolveSelectedCourse(universitySelect.value, $('#bureaucracyCourse').value);
      const message = $('#bureaucracyMessage');
      message.textContent = '';
      if (!university || !course) {
        message.textContent = 'Seleziona un ateneo e un corso.';
        message.dataset.type = 'error';
        return;
      }
      const currentUser = app.getCurrentUser();
      if (currentUser?.email) {
        const contexts = app.safeStorageGet('universitaSemplice.bureaucracyContexts.v1', {});
        contexts[currentUser.email] = {
          universityId: university.id,
          courseName: course.name,
          savedAt: new Date().toISOString()
        };
        app.safeStorageSet('universitaSemplice.bureaucracyContexts.v1', contexts);
      }
      $('#bureaucracyResultHost').innerHTML = renderResult(university, course);
      $('#bureaucracyResultHost')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function render() {
    const host = $('[data-bureaucracy-app]');
    if (!host || !app) return;
    const user = app.getCurrentUser();
    if (!user) {
      renderLocked(host, 'login');
      return;
    }
    if (user.situation !== 'enrolling') {
      renderLocked(host, 'profile');
      return;
    }
    renderTool(host, user);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  document.addEventListener('universitysite:userchange', render);
})();

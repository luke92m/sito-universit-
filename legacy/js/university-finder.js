(() => {
  'use strict';

  const app = window.UniversitySite;
  const catalog = window.CourseCatalog;
  const finderData = window.UNIVERSITY_FINDER_DATA || {};
  const serviceData = window.STUDENT_SERVICE_DATA || {};
  const qsSubjectData = window.QS_SUBJECT_RANKINGS || {};
  const officialRankings = window.OfficialRankings;
  const universityData = window.UniversityData;
  if (!app || !catalog || !universityData || !officialRankings) return;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const STEPS = ['course', 'degree', 'residence', 'commute', 'relocation', 'isee', 'language'];
  const STEP_TITLES = {
    course: 'Partiamo dal corso o dalla macroarea',
    degree: 'Definiamo il tipo di laurea',
    residence: 'Valutiamo la tua posizione geografica',
    commute: 'Consideriamo il pendolarismo',
    relocation: 'Capiremo quanto lontano cercare',
    isee: 'Mettiamo i costi in prospettiva',
    language: 'Completiamo con la lingua del corso'
  };

  const DEGREE_LABELS = {
    bachelor: 'Laurea triennale',
    single: 'Laurea magistrale a ciclo unico',
    master: 'Laurea magistrale biennale',
    undecided: 'Non l’ho ancora deciso'
  };

  const RELOCATION_LABELS = {
    none: 'Non voglio trasferirmi',
    region: 'Posso trasferirmi nella mia regione',
    neighbors: 'Posso considerare anche le regioni confinanti',
    italy: 'Posso trasferirmi in tutta Italia'
  };

  const LANGUAGE_LABELS = {
    italian: 'Preferisco corsi in italiano',
    english: 'Preferisco corsi in inglese',
    either: 'La lingua è indifferente'
  };

  const state = {
    step: 0,
    answers: {},
    residenceEditing: true,
    iseeEditing: true,
    includeTelematic: false,
    includeDistance: false,
    target: null,
    allResults: [],
    results: [],
    launchSource: 'menu'
  };

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function getCourseProfile(slug) {
    return catalog.courses.find((course) => course.slug === slug) || null;
  }

  const LEGACY_ISEE_VALUES = {
    '13000-18000': '16000-18000',
    '18000-22000': '20000-22000',
    '22000-26000': '24000-26000',
    '26000-limit': '28000-scholarship-limit',
    'over-limit': '30000-40000'
  };

  function normalizedIseeValue(value) {
    return LEGACY_ISEE_VALUES[value] || value || '';
  }

  function getIseeRange(value) {
    const normalized = normalizedIseeValue(value);
    return (serviceData.iseeRanges || []).find((range) => range.value === normalized) || null;
  }

  function formatCurrency(value, maximumFractionDigits = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 'dato non disponibile';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits
    }).format(number);
  }

  function setUniversityMessage(text = '', type = '') {
    const message = $('#universityFinderMessage');
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
  }

  function profileDefaults(courseSlug = '') {
    const stored = app.getGuidanceProfile?.() || {};
    const saved = catalog.getSavedPreferences?.();
    const savedSlug = saved?.recommendations?.find((item) => getCourseProfile(item.slug))?.slug || '';
    const choice = courseSlug ? `course:${courseSlug}` : stored.lastCourseChoice || (savedSlug ? `course:${savedSlug}` : '');
    return {
      courseChoice: choice,
      degree: stored.preferredDegree || '',
      residenceRegion: stored.residenceRegion || '',
      residenceCity: stored.residenceCity || '',
      commute: stored.commutePreference || '',
      relocation: stored.relocationScope || '',
      iseeRange: normalizedIseeValue(stored.iseeRange || ''),
      language: stored.languagePreference || ''
    };
  }

  function resetUniversityFinder(options = {}) {
    const defaults = profileDefaults(options.courseSlug || '');
    state.step = 0;
    state.answers = defaults;
    state.residenceEditing = !(defaults.residenceRegion && defaults.residenceCity);
    state.iseeEditing = !defaults.iseeRange;
    state.includeTelematic = false;
    state.includeDistance = false;
    state.target = null;
    state.allResults = [];
    state.results = [];
    state.launchSource = options.source || 'menu';
    const form = $('#universityFinderForm');
    const layout = $('#universityFinderLayout');
    const result = $('#universityFinderResult');
    if (form) form.hidden = false;
    if (layout) layout.hidden = false;
    if (result) result.hidden = true;
    renderUniversityStep();
  }

  function switchMode(mode, options = {}) {
    const coursePanel = $('#courseFinderPanel');
    const universityPanel = $('#universityFinderPanel');
    const courseButton = $('#finderModeCourse');
    const universityButton = $('#finderModeUniversity');
    const universityMode = mode === 'university';

    if (coursePanel) coursePanel.hidden = universityMode;
    if (universityPanel) universityPanel.hidden = !universityMode;
    courseButton?.classList.toggle('is-active', !universityMode);
    universityButton?.classList.toggle('is-active', universityMode);
    courseButton?.setAttribute('aria-pressed', String(!universityMode));
    universityButton?.setAttribute('aria-pressed', String(universityMode));

    if (universityMode) {
      resetUniversityFinder(options);
      universityPanel?.scrollIntoView({ behavior: options.instant ? 'auto' : 'smooth', block: 'start' });
      try { history.replaceState(null, '', '#trova-universita'); } catch (_error) { /* no-op */ }
    } else {
      coursePanel?.scrollIntoView({ behavior: options.instant ? 'auto' : 'smooth', block: 'start' });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_error) { /* no-op */ }
    }
  }

  function savedCourseChoices() {
    const currentResult = window.CourseFinder?.getResult?.();
    const saved = catalog.getSavedPreferences?.();
    const items = [];
    const seen = new Set();

    const add = (item, source) => {
      const profile = getCourseProfile(item?.slug);
      if (!profile || seen.has(profile.slug)) return;
      seen.add(profile.slug);
      items.push({ profile, score: Number(item?.score) || null, source });
    };

    currentResult?.recommendations?.forEach((item) => add(item, 'test appena completato'));
    saved?.recommendations?.forEach((item) => add(item, 'preferenze ricordate'));
    return items;
  }

  function courseChoiceOptions(selected = '') {
    const saved = savedCourseChoices();
    const savedSlugs = new Set(saved.map((item) => item.profile.slug));
    const groups = Array.from(new Set(catalog.courses.map((course) => course.group))).sort((a, b) => a.localeCompare(b, 'it'));

    const savedOptions = saved.length ? `
      <optgroup label="Corsi emersi dalle tue preferenze">
        ${saved.map(({ profile, score }) => `<option value="course:${escapeHtml(profile.slug)}"${selected === `course:${profile.slug}` ? ' selected' : ''}>${escapeHtml(profile.name)}${score ? ` — ${score}%` : ''}</option>`).join('')}
      </optgroup>` : '';

    const allCourseOptions = catalog.courses
      .filter((course) => !savedSlugs.has(course.slug))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'it'))
      .map((course) => `<option value="course:${escapeHtml(course.slug)}"${selected === `course:${course.slug}` ? ' selected' : ''}>${escapeHtml(course.name)}</option>`)
      .join('');

    const groupOptions = groups
      .map((group) => `<option value="group:${escapeHtml(group)}"${selected === `group:${group}` ? ' selected' : ''}>${escapeHtml(group)}</option>`)
      .join('');

    return `
      <option value="">Seleziona un corso o una macroarea</option>
      ${savedOptions}
      <optgroup label="Tutti i corsi generali">${allCourseOptions}</optgroup>
      <optgroup label="Macroaree">${groupOptions}</optgroup>
    `;
  }

  function optionCards(name, options, selected) {
    return `<div class="quiz-options">${options.map((option) => `
      <label class="quiz-option${selected === option.value ? ' is-selected' : ''}">
        <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}"${selected === option.value ? ' checked' : ''}>
        <span class="quiz-option-control" aria-hidden="true"></span>
        <span class="quiz-option-copy"><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.hint)}</small></span>
      </label>`).join('')}</div>`;
  }

  function renderCourseQuestion() {
    const saved = savedCourseChoices();
    const savedNote = saved.length
      ? `<div class="finder-prefill-note"><span>Preferenze disponibili</span><strong>Puoi eseguire il test con uno qualunque dei ${saved.length} corsi emersi o salvati.</strong></div>`
      : `<div class="finder-prefill-note is-neutral"><span>Nessun test precedente necessario</span><strong>Scegli direttamente un corso generale oppure una macroarea.</strong></div>`;

    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Quale corso o macroarea ti interessa?</legend>
        <p>Questa scelta determina quali università e quali percorsi verranno analizzati.</p>
        ${savedNote}
        <label class="field university-course-select-field">
          <span>Corso o macroarea</span>
          <select id="universityCourseChoice">${courseChoiceOptions(state.answers.courseChoice)}</select>
        </label>
      </fieldset>`;
  }

  function renderDegreeQuestion() {
    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Quale titolo vuoi ottenere?</legend>
        <p>Il sito controllerà che l’ateneo offra un percorso coerente con il livello scelto.</p>
        ${optionCards('universityDegree', [
          { value: 'bachelor', label: 'Laurea triennale', hint: 'Il primo percorso universitario, normalmente di tre anni.' },
          { value: 'single', label: 'Laurea a ciclo unico', hint: 'Percorsi come medicina, giurisprudenza, veterinaria o architettura.' },
          { value: 'master', label: 'Laurea magistrale', hint: 'Un percorso biennale successivo alla laurea triennale.' },
          { value: 'undecided', label: 'Non ho ancora deciso', hint: 'Non escludere nessun livello in questa fase.' }
        ], state.answers.degree)}
      </fieldset>`;
  }

  function regionOptions(selected = '') {
    return (serviceData.regions || [])
      .map((region) => `<option value="${escapeHtml(region)}"${region === selected ? ' selected' : ''}>${escapeHtml(region)}</option>`)
      .join('');
  }

  function renderResidenceQuestion() {
    const hasStored = state.answers.residenceRegion && state.answers.residenceCity && !state.residenceEditing;
    if (hasStored) {
      return `
        <fieldset class="quiz-fieldset university-question-fieldset">
          <legend>Conferma la tua residenza.</legend>
          <p>Abbiamo trovato questi dati già inseriti nel sito. Premi “Conferma e continua” oppure modificali.</p>
          <div class="profile-confirmation-card">
            <div><span>Dati già disponibili</span><strong>${escapeHtml(state.answers.residenceCity)} · ${escapeHtml(state.answers.residenceRegion)}</strong><small>Usati soltanto per stimare distanza e possibilità di pendolarismo.</small></div>
            <button class="button button-secondary" id="editFinderResidence" type="button">Modifica</button>
          </div>
        </fieldset>`;
    }

    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Dove risiedi?</legend>
        <p>Regione e città permettono di stimare quali sedi potresti raggiungere con un treno regionale in meno di un’ora e mezza.</p>
        <div class="university-inline-fields">
          <label class="field"><span>Regione di residenza</span><select id="finderResidenceRegion"><option value="">Seleziona</option>${regionOptions(state.answers.residenceRegion)}</select></label>
          <label class="field"><span>Comune o città</span><input id="finderResidenceCity" type="text" value="${escapeHtml(state.answers.residenceCity)}" placeholder="Es. Pavia"></label>
        </div>
        <p class="service-form-note">La raggiungibilità ferroviaria è una stima del prototipo: prima di scegliere dovrai controllare orari, cambi e stazione effettiva.</p>
      </fieldset>`;
  }

  function renderCommuteQuestion() {
    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Prenderesti in considerazione il pendolarismo?</legend>
        <p>Per pendolarismo intendiamo una percorrenza stimata entro 90 minuti usando treni regionali o regionali veloci, senza alta velocità.</p>
        ${optionCards('universityCommute', [
          { value: 'yes', label: 'Sì, posso fare il pendolare', hint: 'Considera solo regionali e regionali veloci entro 1 ora e 30 minuti. Nel punteggio vale quanto un trasferimento compatibile.' },
          { value: 'no', label: 'No, preferisco evitare', hint: 'Mostra sedi nella mia città o opzioni compatibili con il trasferimento. I corsi a distanza restano esclusi salvo tua scelta nei risultati.' }
        ], state.answers.commute)}
        <p class="service-form-note">Restare nella città di residenza riceve un piccolo vantaggio. Fare il pendolare o trasferirsi, quando entrambe le opzioni sono compatibili con le tue risposte, hanno invece lo stesso peso geografico.</p>
      </fieldset>`;
  }

  function renderRelocationQuestion() {
    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Se necessario, quanto lontano potresti trasferirti?</legend>
        <p>La risposta amplia o restringe l’area in cui cercare le università.</p>
        ${optionCards('universityRelocation', [
          { value: 'none', label: 'Non voglio trasferirmi', hint: 'Restano soltanto sedi locali o raggiungibili con regionali entro 90 minuti, se hai accettato il pendolarismo.' },
          { value: 'region', label: 'Nella mia regione', hint: 'Posso cambiare città, ma restando nella stessa regione.' },
          { value: 'neighbors', label: 'Anche in regioni confinanti', hint: 'Valuta la mia regione e quelle direttamente confinanti.' },
          { value: 'italy', label: 'In tutta Italia', hint: 'La distanza non deve escludere un’università molto adatta.' }
        ], state.answers.relocation)}
      </fieldset>`;
  }

  function renderIseeQuestion() {
    const range = getIseeRange(state.answers.iseeRange);
    if (range && !state.iseeEditing) {
      return `
        <fieldset class="quiz-fieldset university-question-fieldset">
          <legend>Conferma la tua fascia ISEE.</legend>
          <p>Abbiamo trovato una fascia già usata nel sito. Serve soltanto per pesare costi e possibilità di agevolazione.</p>
          <div class="profile-confirmation-card">
            <div><span>Fascia già disponibile</span><strong>${escapeHtml(range.label)}</strong><small>L’ISEE non viene trattato come reddito disponibile: è usato come indicatore orientativo.</small></div>
            <button class="button button-secondary" id="editFinderIsee" type="button">Modifica</button>
          </div>
        </fieldset>`;
    }

    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Qual è la tua fascia ISEE universitaria?</legend>
        <p>Il sito confronterà in modo orientativo retta, costo della città e presenza di borse o esoneri.</p>
        <label class="field university-course-select-field"><span>Fascia ISEE</span><select id="finderIseeRange"><option value="">Seleziona</option>${(serviceData.iseeRanges || []).map((item) => `<option value="${escapeHtml(item.value)}"${item.value === state.answers.iseeRange ? ' selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select></label>
        <p class="service-form-note">Puoi scegliere “Non conosco ancora il mio ISEE”. I dati restano nel localStorage di questo dispositivo.</p>
      </fieldset>`;
  }

  function renderLanguageQuestion() {
    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>In quale lingua preferisci studiare?</legend>
        <p>Quando la lingua può essere ricavata dall’offerta formativa, verrà usata nel punteggio.</p>
        ${optionCards('universityLanguage', [
          { value: 'italian', label: 'Italiano', hint: 'Privilegia i percorsi indicati in lingua italiana.' },
          { value: 'english', label: 'Inglese', hint: 'Privilegia i percorsi il cui titolo o scheda indica l’inglese.' },
          { value: 'either', label: 'Indifferente', hint: 'La lingua non modifica il punteggio finale.' }
        ], state.answers.language)}
      </fieldset>`;
  }

  function renderUniversityStep() {
    const host = $('#universityQuestionHost');
    if (!host) return;
    const key = STEPS[state.step];
    const renderers = {
      course: renderCourseQuestion,
      degree: renderDegreeQuestion,
      residence: renderResidenceQuestion,
      commute: renderCommuteQuestion,
      relocation: renderRelocationQuestion,
      isee: renderIseeQuestion,
      language: renderLanguageQuestion
    };
    host.innerHTML = renderers[key]();

    $('#universityStepLabel').textContent = `Domanda ${state.step + 1} di ${STEPS.length}`;
    $('#universityProgressTitle').textContent = STEP_TITLES[key];
    $('#universityProgressBar').style.width = `${((state.step + 1) / STEPS.length) * 100}%`;
    $('#universityFinderBack').disabled = state.step === 0;
    const next = $('#universityFinderNext');
    next.textContent = state.step === STEPS.length - 1 ? 'Trova la mia università' : ((key === 'residence' && !state.residenceEditing) || (key === 'isee' && !state.iseeEditing) ? 'Conferma e continua' : 'Continua');
    setUniversityMessage();

    host.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener('change', () => {
        const map = { universityDegree: 'degree', universityCommute: 'commute', universityRelocation: 'relocation', universityLanguage: 'language' };
        state.answers[map[input.name]] = input.value;
        host.querySelectorAll(`input[name="${input.name}"]`).forEach((candidate) => candidate.closest('.quiz-option')?.classList.toggle('is-selected', candidate.checked));
      });
    });

    $('#editFinderResidence')?.addEventListener('click', () => {
      state.residenceEditing = true;
      renderUniversityStep();
    });
    $('#editFinderIsee')?.addEventListener('click', () => {
      state.iseeEditing = true;
      renderUniversityStep();
    });
  }

  function captureStep() {
    const key = STEPS[state.step];
    if (key === 'course') state.answers.courseChoice = $('#universityCourseChoice')?.value || '';
    if (key === 'residence' && state.residenceEditing) {
      state.answers.residenceRegion = $('#finderResidenceRegion')?.value || '';
      state.answers.residenceCity = $('#finderResidenceCity')?.value.trim() || '';
    }
    if (key === 'isee' && state.iseeEditing) state.answers.iseeRange = $('#finderIseeRange')?.value || '';
  }

  function validateStep() {
    const key = STEPS[state.step];
    if (key === 'course' && !state.answers.courseChoice) return 'Seleziona un corso o una macroarea.';
    if (key === 'degree' && !state.answers.degree) return 'Seleziona il tipo di laurea che vuoi ottenere.';
    if (key === 'residence' && (!state.answers.residenceRegion || !state.answers.residenceCity)) return 'Indica regione e città di residenza.';
    if (key === 'commute' && !state.answers.commute) return 'Indica se puoi fare il pendolare.';
    if (key === 'relocation' && !state.answers.relocation) return 'Indica la tua disponibilità a trasferirti.';
    if (key === 'isee' && !state.answers.iseeRange) return 'Seleziona una fascia ISEE oppure “non conosco ancora il mio ISEE”.';
    if (key === 'language' && !state.answers.language) return 'Indica la lingua preferita.';
    return '';
  }

  function nextUniversityStep(event) {
    event.preventDefault();
    captureStep();
    const error = validateStep();
    if (error) {
      setUniversityMessage(error, 'error');
      return;
    }
    if (state.step < STEPS.length - 1) {
      state.step += 1;
      renderUniversityStep();
      $('#universityFinderForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    buildUniversityResults();
  }

  function previousUniversityStep() {
    if (state.step === 0) return;
    captureStep();
    state.step -= 1;
    renderUniversityStep();
  }

  function targetFromChoice(choice) {
    if (choice.startsWith('course:')) {
      const profile = getCourseProfile(choice.slice(7));
      return profile ? { type: 'course', label: profile.name, group: profile.group, profile } : null;
    }
    if (choice.startsWith('group:')) {
      const group = choice.slice(6);
      return group ? { type: 'group', label: group, group, profile: null } : null;
    }
    return null;
  }

  function isCycleUnique(course) {
    const code = String(course.classCode || '').toUpperCase().replace(/\s/g, '');
    return course.level === 'ciclo-unico' || /^(LMG\/01|LM-4CU|LM-41|LM-42|LM-13)/.test(code);
  }

  function degreeMatches(course, degree) {
    if (degree === 'undecided') return true;
    const cycle = isCycleUnique(course);
    if (degree === 'single') return cycle;
    if (degree === 'master') return course.level === 'magistrale' && !cycle;
    if (degree === 'bachelor') {
      return course.level === 'triennale' || (!cycle && /^L(?:-|\/|\d)/i.test(String(course.classCode || '')) && !/^LM/i.test(String(course.classCode || '')));
    }
    return true;
  }

  function inferCourseLanguage(course) {
    const name = normalize(course.name);
    const englishHits = ['engineering', 'economics', 'business', 'finance', 'international', 'computer', 'data science', 'medicine and surgery', 'psychology', 'management engineering', 'global', 'sustainable', 'food science', 'design and'].filter((term) => name.includes(term)).length;
    const italianHits = ['scienze', 'ingegneria', 'economia', 'laurea', 'della', 'delle', 'degli', 'medicina e', 'giurisprudenza'].filter((term) => name.includes(term)).length;
    return englishHits > italianHits && englishHits > 0 ? 'english' : 'italian';
  }

  const COURSE_TOKEN_STOPWORDS = new Set([
    'a', 'ad', 'al', 'alla', 'alle', 'con', 'da', 'dal', 'dalla', 'de', 'dei', 'del', 'della', 'delle',
    'di', 'e', 'ed', 'for', 'in', 'il', 'la', 'le', 'lo', 'of', 'per', 'the', 'un', 'una', 'and',
    'corso', 'laurea', 'scienze', 'science', 'studi', 'studies'
  ]);

  const MATCH_TIER_LABELS = {
    exact: 'Corrispondenza esatta',
    close: 'Corrispondenza molto vicina',
    class: 'Stessa classe, focus diverso',
    macro: 'Solo stessa macroarea',
    group: 'Coerente con la macroarea scelta'
  };

  const REGIONAL_SUPPORT_AGENCIES = {
    Abruzzo: 'ADSU territoriali',
    Basilicata: 'ARDSU Basilicata',
    Calabria: 'Enti regionali per il diritto allo studio',
    Campania: 'ADISURC',
    'Emilia-Romagna': 'ER.GO',
    'Friuli-Venezia Giulia': 'ARDiS FVG',
    Lazio: 'DiSCo Lazio',
    Liguria: 'ALiSEO',
    Lombardia: 'Diritto allo studio degli atenei lombardi',
    Marche: 'ERDIS Marche',
    Molise: 'ESU Molise',
    Piemonte: 'EDISU Piemonte',
    Puglia: 'ADISU Puglia',
    Sardegna: 'ERSU territoriali',
    Sicilia: 'ERSU territoriali',
    Toscana: 'DSU Toscana',
    'Trentino-Alto Adige/Südtirol': 'Opera Universitaria / enti provinciali',
    Umbria: 'ADiSU Umbria',
    "Valle d'Aosta": 'Regione Valle d’Aosta',
    Veneto: 'ESU territoriali'
  };

  let supportBenchmarkCache = null;

  function cleanCourseTitle(value) {
    return normalize(String(value || '').replace(/\([^)]*\)/g, ' '));
  }

  function normalizedClassCode(value) {
    return String(value || '').toUpperCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
  }

  function titleTokens(value) {
    return new Set(cleanCourseTitle(value).split(' ').filter((token) => token.length > 1 && !COURSE_TOKEN_STOPWORDS.has(token)));
  }

  function setSimilarity(left, right) {
    if (!left.size || !right.size) return 0;
    let intersection = 0;
    left.forEach((token) => { if (right.has(token)) intersection += 1; });
    return intersection / Math.max(left.size, right.size);
  }

  function isDistanceCourse(course) {
    const delivery = normalize(course?.delivery);
    return delivery.includes('distanza') || delivery.includes('online') || delivery.includes('telematic');
  }

  function courseMatch(course, target) {
    if (!course || course.group !== target.group) {
      return { score: 0, tier: 'none', label: 'Non coerente', reason: 'Macroarea differente.', similarity: 0, classHit: false };
    }

    if (target.type === 'group') {
      const matched = catalog.matchCourse(course);
      const specificity = matched?.group === target.group ? 1 : 0;
      const score = 68 + Math.min(6, specificity * 3 + Math.round(Math.log10(Math.max(1, Number(course.enrolled || 0))) * 0.8));
      return {
        score: clamp(score, 60, 74),
        tier: 'group',
        label: MATCH_TIER_LABELS.group,
        reason: `Il corso appartiene alla macroarea ${target.group}; il punteggio varia in base alla specificità del titolo.`,
        similarity: 0,
        classHit: false
      };
    }

    const profile = target.profile;
    const title = cleanCourseTitle(course.name);
    const canonical = cleanCourseTitle(profile.name);
    const aliases = [profile.name, ...(profile.keywords || [])]
      .map(cleanCourseTitle)
      .filter(Boolean);
    const titleTokenSet = titleTokens(course.name);
    const canonicalTokens = titleTokens(profile.name);
    const profileTokenSet = new Set(aliases.flatMap((alias) => Array.from(titleTokens(alias))));
    const canonicalSimilarity = setSimilarity(titleTokenSet, canonicalTokens);
    const profileSimilarity = setSimilarity(titleTokenSet, profileTokenSet);
    const similarity = Math.max(canonicalSimilarity, profileSimilarity);
    const exactCanonical = title === canonical;
    const exactAlias = aliases.some((alias) => title === alias);
    const containedAlias = aliases
      .filter((alias) => alias.split(' ').length >= 2)
      .sort((a, b) => b.length - a.length)
      .find((alias) => title.includes(alias));
    const courseClass = normalizedClassCode(course.classCode);
    const classHit = (profile.classCodes || []).some((code) => {
      const expected = normalizedClassCode(code);
      return courseClass === expected || courseClass.startsWith(`${expected}/`) || courseClass.startsWith(`${expected}-`);
    });
    const matched = catalog.matchCourse(course);
    const catalogHit = matched?.slug === profile.slug;

    const classRequired = Boolean(profile.classCodes?.length);
    const classCompatible = !classRequired || classHit;

    if ((exactCanonical || exactAlias) && classCompatible) {
      return {
        score: 100,
        tier: 'exact',
        label: MATCH_TIER_LABELS.exact,
        reason: `Il titolo del corso coincide con “${profile.name}” o con una denominazione pienamente equivalente, nella classe di laurea attesa.`,
        classHit,
        similarity
      };
    }

    if ((exactCanonical || exactAlias) && !classCompatible) {
      return {
        score: 90,
        tier: 'close',
        label: MATCH_TIER_LABELS.close,
        reason: 'Il titolo coincide, ma la classe di laurea è diversa da quella normalmente associata al corso scelto.',
        classHit,
        similarity
      };
    }

    if ((containedAlias && classHit) || (catalogHit && classHit && similarity >= 0.60)) {
      const score = Math.round(clamp(90 + similarity * 5, 90, 95));
      return {
        score,
        tier: 'close',
        label: MATCH_TIER_LABELS.close,
        reason: containedAlias
          ? `Il titolo contiene “${containedAlias}”, ma aggiunge un focus o una specializzazione.`
          : 'Titolo, parole chiave e classe di laurea sono molto vicini al corso desiderato.',
        classHit,
        similarity
      };
    }

    if (classHit) {
      const score = Math.round(clamp(75 + similarity * 16, 75, 89));
      return {
        score,
        tier: 'class',
        label: MATCH_TIER_LABELS.class,
        reason: `La classe ${course.classCode || 'del corso'} è compatibile, ma il titolo indica un focus diverso.`,
        classHit,
        similarity
      };
    }

    const score = Math.round(clamp(60 + similarity * 16, 60, 74));
    return {
      score,
      tier: 'macro',
      label: MATCH_TIER_LABELS.macro,
      reason: `Il corso è nella stessa macroarea ${target.group}, ma classe e focus non coincidono.`,
      classHit,
      similarity
    };
  }

  function coordinateFor(value, region = '') {
    const normalized = normalize(value);
    const entries = Object.entries(finderData.cityCoordinates || {});
    const direct = finderData.cityCoordinates?.[normalized];
    if (direct) return { coords: direct, precision: 'city' };
    const partial = entries.find(([key]) => normalized.length >= 4 && (key.includes(normalized) || normalized.includes(key)));
    if (partial) return { coords: partial[1], precision: 'city' };
    const regionCoords = finderData.regionCenters?.[region];
    return regionCoords ? { coords: regionCoords, precision: 'region' } : null;
  }

  function haversineKm(a, b) {
    const toRad = (value) => value * Math.PI / 180;
    const radius = 6371;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function estimateCommute(residence, destination, residenceRegion, destinationRegion) {
    if (!residence || !destination) return { minutes: null, precision: 'unknown' };
    const islands = new Set(['Sardegna', 'Sicilia']);
    if (residenceRegion !== destinationRegion && (islands.has(residenceRegion) || islands.has(destinationRegion))) return { minutes: Infinity, precision: 'city' };
    const distance = haversineKm(residence.coords, destination.coords);
    if (distance < 8) return { minutes: 20, precision: residence.precision === 'city' && destination.precision === 'city' ? 'city' : 'region' };
    const railDistance = distance * 1.18;
    const borderPenalty = residenceRegion === destinationRegion ? 0 : 12;
    const minutes = Math.round((15 + borderPenalty + (railDistance / 72) * 60) / 5) * 5;
    return { minutes, precision: residence.precision === 'city' && destination.precision === 'city' ? 'city' : 'region' };
  }

  function geographyFit(university, course, answers) {
    if (isDistanceCourse(course)) {
      return { allowed: true, score: 90, label: 'Corso a distanza: nessun trasferimento necessario', commute: null, online: true, sameCity: false, mode: 'online' };
    }

    const residence = coordinateFor(answers.residenceCity, answers.residenceRegion);
    const destination = coordinateFor(course.city || university.city, university.region);
    const commute = estimateCommute(residence, destination, answers.residenceRegion, university.region);
    const sameCity = normalize(answers.residenceCity) === normalize(course.city || university.city);
    const commuteLimit = Number(finderData.methodology?.regionalCommuteLimitMinutes) || 90;
    const canCommute = answers.commute === 'yes' && Number.isFinite(commute.minutes) && commute.minutes <= commuteLimit;

    if (sameCity) return { allowed: true, score: 100, label: 'Sede nella tua città', commute, online: false, sameCity: true, mode: 'home' };
    if (canCommute) {
      return {
        allowed: true,
        score: 90,
        label: `Pendolarismo compatibile: circa ${commute.minutes} minuti stimati con regionali o regionali veloci`,
        commute,
        online: false,
        sameCity: false,
        mode: 'commute'
      };
    }

    const neighbors = finderData.regionNeighbors?.[answers.residenceRegion] || [];
    if (answers.relocation === 'region' && university.region === answers.residenceRegion) return { allowed: true, score: 90, label: 'Trasferimento compatibile nella tua regione', commute, online: false, sameCity: false, mode: 'relocation' };
    if (answers.relocation === 'neighbors' && university.region === answers.residenceRegion) return { allowed: true, score: 90, label: 'Trasferimento compatibile nella tua regione', commute, online: false, sameCity: false, mode: 'relocation' };
    if (answers.relocation === 'neighbors' && neighbors.includes(university.region)) return { allowed: true, score: 90, label: 'Trasferimento compatibile in una regione confinante', commute, online: false, sameCity: false, mode: 'relocation' };
    if (answers.relocation === 'italy') {
      return {
        allowed: true,
        score: 90,
        label: university.region === answers.residenceRegion ? 'Trasferimento compatibile nella tua regione' : 'Trasferimento compatibile con la disponibilità nazionale',
        commute,
        online: false,
        sameCity: false,
        mode: 'relocation'
      };
    }

    return { allowed: false, score: 0, label: 'Fuori dall’area geografica indicata', commute, online: false, sameCity: false, mode: 'excluded' };
  }

  function resultWeights(geography) {
    if (geography?.sameCity) {
      return { course: 0.30, geography: 0.20, ranking: 0.23, cost: 0.18, language: 0.04, support: 0.05 };
    }
    return { course: 0.30, geography: 0.18, ranking: 0.25, cost: 0.18, language: 0.04, support: 0.05 };
  }

  function costForCity(city, macroArea) {
    const normalized = normalize(city);
    const match = Object.entries(finderData.cityCosts || {}).find(([key]) => {
      const clean = normalize(key);
      return clean === normalized || (normalized.length >= 5 && (clean.includes(normalized) || normalized.includes(clean)));
    });
    const raw = match?.[1] || finderData.macroDefaultCost?.[macroArea] || [900, 400, 'medio'];
    return { monthly: Number(raw[0]) || 900, rent: Number(raw[1]) || 400, tier: raw[2] || 'medio', estimated: true };
  }

  function tuitionFor(university) {
    const metrics = universityData.getMetrics(university.id);
    const value = Number(metrics.tuitionAllStudents || metrics.tuitionPayers || 0);
    if (value > 0) return value;
    if (university.category === 'Telematica') return 2500;
    return university.isPublic ? 1600 : 6500;
  }

  function supportRawMetrics(university) {
    const metrics = universityData.getMetrics(university.id);
    const students = Math.max(1, Number(metrics.students || 0));
    const scholarships = Math.max(0, Number(metrics.scholarshipsUniversityMur || 0));
    const full = Math.max(0, Number(metrics.fullExemptions || 0));
    const partial = Math.max(0, Number(metrics.partialExemptions || 0));
    const housingAssigned = Math.max(0, Number(metrics.housingAssigned || 0));
    const housingContributions = Math.max(0, Number(metrics.housingContributions || 0));
    const housingPlaces = Math.max(0, Number(metrics.residencePlacesDirect || 0)) + Math.max(0, Number(metrics.residencePlacesPartner || 0));
    const canteenPlaces = Math.max(0, Number(metrics.canteenPlaces || 0));
    const beneficiaryProxy = Math.min(students, scholarships + full + partial + housingAssigned + housingContributions);
    return {
      students,
      scholarships,
      full,
      partial,
      housingAssigned,
      housingContributions,
      housingPlaces,
      canteenPlaces,
      beneficiaryRate: beneficiaryProxy / students * 100,
      scholarshipRate: scholarships / students * 1000,
      exemptionRate: (full + partial * 0.35) / students * 1000,
      housingRate: (housingAssigned + housingContributions + housingPlaces * 0.35) / students * 1000,
      qualityProxy: (scholarships * 1.15 + full * 1.35 + housingAssigned * 0.45 + housingContributions * 0.35) / students * 1000,
      meritProxy: (scholarships * 0.75 + full * 0.35) / students * 1000
    };
  }

  function supportBenchmarks() {
    if (supportBenchmarkCache) return supportBenchmarkCache;
    const rows = app.getUniversities().map(supportRawMetrics);
    const keys = ['beneficiaryRate', 'scholarshipRate', 'exemptionRate', 'housingRate', 'qualityProxy', 'meritProxy'];
    supportBenchmarkCache = Object.fromEntries(keys.map((key) => [key, rows.map((row) => Number(row[key]) || 0).sort((a, b) => a - b)]));
    return supportBenchmarkCache;
  }

  function comparativeScore(value, values, options = {}) {
    const floor = options.floor ?? 16;
    const ceiling = options.ceiling ?? 92;
    const number = Number(value) || 0;
    if (number <= 0 || !values.length) return floor;
    const lowerOrEqual = values.filter((entry) => entry <= number).length;
    const percentile = lowerOrEqual / values.length;
    return clamp(floor + percentile * (ceiling - floor), floor, ceiling);
  }

  function supportScore(university, answers) {
    const raw = supportRawMetrics(university);
    const benchmarks = supportBenchmarks();
    const beneficiary = comparativeScore(raw.beneficiaryRate, benchmarks.beneficiaryRate, { floor: 18, ceiling: 92 });
    const quality = comparativeScore(raw.qualityProxy, benchmarks.qualityProxy, { floor: 16, ceiling: 90 });
    const housing = comparativeScore(raw.housingRate, benchmarks.housingRate, { floor: 12, ceiling: 90 });
    const exemptions = comparativeScore(raw.exemptionRate, benchmarks.exemptionRate, { floor: 14, ceiling: 91 });
    const regional = REGIONAL_SUPPORT_AGENCIES[university.region] ? 72 : 48;
    const selectedRange = getIseeRange(answers.iseeRange);
    const lowIsee = selectedRange?.min != null && selectedRange.min <= Number(serviceData.nationalThresholds?.isee || 28339.88);
    const isee = lowIsee
      ? clamp(exemptions * 0.58 + beneficiary * 0.28 + regional * 0.14, 15, 91)
      : clamp(quality * 0.40 + beneficiary * 0.20 + 42, 15, 86);
    const meritBase = comparativeScore(raw.meritProxy, benchmarks.meritProxy, { floor: 15, ceiling: 88 });
    const highIsee = selectedRange?.min != null && selectedRange.min > 30000;
    const merit = highIsee ? clamp(meritBase + 4, 15, 90) : meritBase;
    const score = clamp(
      beneficiary * 0.30 +
      quality * 0.20 +
      housing * 0.15 +
      exemptions * 0.15 +
      regional * 0.10 +
      isee * 0.05 +
      merit * 0.05,
      12,
      93
    );

    return {
      score,
      agency: REGIONAL_SUPPORT_AGENCIES[university.region] || 'Ente territoriale da verificare',
      raw,
      breakdown: { beneficiary, quality, housing, exemptions, regional, isee, merit },
      note: 'Indice comparativo su dati aggregati: non misura l’idoneità personale e alcune categorie possono sovrapporsi.'
    };
  }

  function iseeBudget(value) {
    const range = getIseeRange(value);
    if (!range || range.min == null) return 18000;
    if (!Number.isFinite(range.max)) return 60000;
    const midpoint = (Number(range.min) + Number(range.max)) / 2;
    // L’ISEE non è un budget di spesa: questa trasformazione serve soltanto a
    // graduare il peso di rette e città, mantenendo separata la stima economica.
    return clamp(6500 + midpoint * 0.72, 10000, 52000);
  }

  function affordability(university, course, answers, support) {
    const tuition = tuitionFor(university);
    const cityCost = costForCity(course.city || university.city, university.macroArea);
    const online = isDistanceCourse(course);
    const livingAnnual = online ? 1200 : cityCost.monthly * 10;
    const annual = tuition + livingAnnual;
    const budget = iseeBudget(answers.iseeRange);
    const ratio = annual / Math.max(1, budget);
    const base = 100 - Math.max(0, ratio - 0.45) * 42 - Math.max(0, ratio - 1) * 28;
    const selectedRange = getIseeRange(answers.iseeRange);
    const lowIsee = selectedRange?.max != null && selectedRange.max <= 22000;
    const aidOffset = lowIsee ? support.score * 0.065 : support.score * 0.025;
    return {
      score: clamp(base + aidOffset, 12, 100),
      tuition,
      cityCost,
      annual,
      budget,
      ratio,
      online,
      needsAid: lowIsee && (annual > budget * 0.88 || cityCost.tier === 'molto alto' || tuition > 4500),
      support: support.score
    };
  }

  function rankMidpoint(record) {
    if (Number(record?.rank) > 0) return Number(record.rank);
    if (Array.isArray(record?.band) && record.band.length === 2) return (Number(record.band[0]) + Number(record.band[1])) / 2;
    return null;
  }

  function rankLabel(record) {
    if (Number(record?.rank) > 0) return `#${Number(record.rank)}`;
    if (Array.isArray(record?.band) && record.band.length === 2) return `${record.band[0]}–${record.band[1]}`;
    return 'n.d.';
  }

  function rankToScore(record) {
    if (Number(record?.score) > 0) return clamp(Number(record.score), 20, 99);
    const rank = rankMidpoint(record);
    if (!Number.isFinite(rank)) return null;
    if (rank <= 10) return clamp(96 - (rank - 1) * 0.75, 20, 99);
    if (rank <= 50) return clamp(89.25 - (rank - 10) * 0.34, 20, 99);
    if (rank <= 100) return clamp(75.65 - (rank - 50) * 0.22, 20, 99);
    if (rank <= 200) return clamp(64.65 - (rank - 100) * 0.16, 20, 99);
    if (rank <= 500) return clamp(48.65 - (rank - 200) * 0.085, 20, 99);
    return clamp(23.15 - (rank - 500) * 0.02, 12, 99);
  }

  function subjectSelections(target) {
    if (target.type === 'course' && target.profile?.slug) {
      return qsSubjectData.courseSubjects?.[target.profile.slug] || qsSubjectData.groupSubjects?.[target.group] || [];
    }
    return qsSubjectData.groupSubjects?.[target.group] || [];
  }

  function rankingFit(university, target, degree = '') {
    return officialRankings.forTarget(university, target, degree);
  }

  function languageFit(course, preference) {
    const inferred = inferCourseLanguage(course);
    if (preference === 'either') return { score: 100, inferred, label: inferred === 'english' ? 'Titolo del corso in inglese' : 'Titolo del corso in italiano' };
    const match = inferred === preference;
    return {
      score: match ? 100 : 48,
      inferred,
      label: match ? `Lingua coerente con la preferenza: ${preference === 'english' ? 'inglese' : 'italiano'}` : 'Lingua da verificare nella pagina ufficiale del corso'
    };
  }

  function rankCandidates(target, answers, options = {}) {
    const includeDistance = Boolean(options.includeDistance);
    const includeTelematic = Boolean(options.includeTelematic);
    const candidates = [];

    app.getUniversities().forEach((university) => {
      const relevant = app.getUniversityCourses(university.id)
        .filter((course) => degreeMatches(course, answers.degree))
        .filter((course) => includeDistance || !isDistanceCourse(course) || (includeTelematic && university.category === 'Telematica'))
        .map((course) => ({ course, match: courseMatch(course, target) }))
        .filter((entry) => entry.match.score >= 60);

      if (!relevant.length) return;
      const support = supportScore(university, answers);
      const ranking = rankingFit(university, target, answers.degree);

      const evaluated = relevant
        .map((entry) => {
          const geography = geographyFit(university, entry.course, answers);
          if (!geography.allowed) return null;
          const cost = affordability(university, entry.course, answers, support);
          const language = languageFit(entry.course, answers.language);
          const weights = resultWeights(geography);
          const contributions = {
            course: entry.match.score * weights.course,
            geography: geography.score * weights.geography,
            ranking: ranking.score * weights.ranking,
            cost: cost.score * weights.cost,
            language: language.score * weights.language,
            support: support.score * weights.support
          };
          const totalRaw = Object.values(contributions).reduce((sum, value) => sum + value, 0);

          return {
            university,
            course: entry.course,
            courseMatch: entry.match,
            geography,
            cost,
            ranking,
            language,
            support,
            weights,
            contributions,
            totalRaw,
            total: Math.round(totalRaw),
            target
          };
        })
        .filter(Boolean)
        .sort((a, b) =>
          b.totalRaw - a.totalRaw ||
          b.courseMatch.score - a.courseMatch.score ||
          Number(b.geography.sameCity) - Number(a.geography.sameCity) ||
          Number(b.course.enrolled || 0) - Number(a.course.enrolled || 0) ||
          String(a.course.name || '').localeCompare(String(b.course.name || ''), 'it')
        );

      if (evaluated.length) candidates.push(evaluated[0]);
    });

    return candidates.sort((a, b) =>
      b.totalRaw - a.totalRaw ||
      b.courseMatch.score - a.courseMatch.score ||
      a.university.name.localeCompare(b.university.name, 'it')
    );
  }

  function filteredUniversityResults() {
    return state.includeTelematic
      ? state.allResults
      : state.allResults.filter((item) => item.university.category !== 'Telematica');
  }

  function visibleUniversityResults() {
    return filteredUniversityResults().slice(0, 5);
  }

  function rankingText(item) {
    return officialRankings.shortLabel(item.ranking);
  }

  function rankingSourceText(item) {
    if (item.ranking.source === 'qs-subject') return 'QS per materia: fonte prioritaria per valutare il corso';
    if (item.ranking.source === 'censis-teaching') return 'Fallback ufficiale CENSIS della didattica';
    if (item.ranking.source === 'censis-general') return 'Fallback ufficiale CENSIS generale, nella categoria omogenea dell’ateneo';
    return 'Nessun ranking ufficiale collegato: nessun indice interno sostitutivo';
  }

  function courseLink(item) {
    const params = new URLSearchParams({
      universityId: item.university.id,
      course: item.course.name,
      classCode: item.course.classCode || ''
    });
    return `api/course-link?${params.toString()}`;
  }

  function scholarshipLink(item) {
    const params = new URLSearchParams({ universityId: item.university.id });
    return `api/scholarship-link?${params.toString()}`;
  }

  function scholarshipInternalLink(item) {
    const params = new URLSearchParams({
      sezione: 'borse-di-studio',
      ateneo: item.university.id,
      corso: item.course.name
    });
    return `area-studente.html?${params.toString()}`;
  }

  function scoreRows(item) {
    return [
      { key: 'course', label: 'Compatibilità del corso', score: item.courseMatch.score },
      { key: 'geography', label: 'Compatibilità geografica', score: item.geography.score },
      { key: 'ranking', label: 'Ranking ufficiale', score: item.ranking.score },
      { key: 'cost', label: 'Sostenibilità economica', score: item.cost.score },
      { key: 'language', label: 'Lingua', score: item.language.score },
      { key: 'support', label: 'Borse e sostegni', score: item.support.score }
    ];
  }

  function calculationDetails(item) {
    const rankingLinks = item.ranking.official
      ? `<ul class="university-ranking-source-list">${item.ranking.details.map((detail) => {
          const visible = detail.rank || (detail.position ? `#${detail.position}` : '');
          const scoreCopy = Number.isFinite(Number(detail.score)) ? `punteggio algoritmo ${Number(detail.score).toFixed(1)}` : (Number.isFinite(Number(detail.rawScore)) ? `punteggio fonte ${Number(detail.rawScore).toFixed(1)}` : 'dato ufficiale');
          const weightCopy = Number.isFinite(Number(detail.weight)) ? ` · peso relativo ${Math.round(detail.weight * 100)}%` : '';
          return `<li><a href="${escapeHtml(detail.url || item.ranking.url || '#')}" target="_blank" rel="noreferrer">${escapeHtml(detail.label)} ${escapeHtml(visible)}</a><span>${escapeHtml(scoreCopy + weightCopy)}</span></li>`;
        }).join('')}</ul>`
      : `<p class="university-calculation-note">${escapeHtml(item.ranking.note)}</p>`;
    const support = item.support.breakdown;
    const supportItems = [
      ['Beneficiari', support.beneficiary],
      ['Qualità/copertura', support.quality],
      ['Alloggi', support.housing],
      ['Esoneri', support.exemptions],
      ['Sistema regionale', support.regional],
      ['Sostegno ISEE', support.isee],
      ['Merito', support.merit]
    ];

    return `
      <details class="university-calculation-details">
        <summary>Vedi il calcolo completo</summary>
        <div class="university-calculation-body">
          <div class="university-score-table" role="table" aria-label="Calcolo del punteggio">
            <div class="university-score-row is-header" role="row"><span>Parametro</span><span>Punteggio</span><span>Peso</span><span>Contributo</span></div>
            ${scoreRows(item).map((row) => `<div class="university-score-row" role="row"><strong>${escapeHtml(row.label)}</strong><span>${row.score.toFixed(1)}</span><span>${Math.round(item.weights[row.key] * 100)}%</span><span>${item.contributions[row.key].toFixed(2)}</span></div>`).join('')}
            <div class="university-score-row is-total" role="row"><strong>Totale</strong><span></span><span>100%</span><span>${item.totalRaw.toFixed(2)}</span></div>
          </div>

          <section class="university-calculation-section">
            <h4>Corrispondenza del corso</h4>
            <p><strong>${escapeHtml(item.courseMatch.label)} · ${item.courseMatch.score}/100.</strong> ${escapeHtml(item.courseMatch.reason)}</p>
          </section>

          <section class="university-calculation-section">
            <h4>Ranking</h4>
            <p>${escapeHtml(item.ranking.note)}</p>
            ${rankingLinks}
          </section>

          <section class="university-calculation-section">
            <h4>Borse e sostegni · ${item.support.score.toFixed(1)}/100</h4>
            <div class="university-support-breakdown">${supportItems.map(([label, score]) => `<span><strong>${escapeHtml(label)}</strong><small>${score.toFixed(1)}</small></span>`).join('')}</div>
            <p class="university-calculation-note">Ente regionale di riferimento: ${escapeHtml(item.support.agency)}. ${escapeHtml(item.support.note)}</p>
          </section>
        </div>
      </details>`;
  }

  function universityResultCard(item, index) {
    const costWarning = item.cost.needsAid ? `
      <div class="university-aid-warning">
        <strong>Questa opzione può restare valida, ma il costo è impegnativo per la fascia ISEE indicata.</strong>
        <p>La presenza relativa di borse ed esoneri attenua la penalizzazione, senza garantire l’idoneità. Verifica requisiti e scadenze sul canale ufficiale.</p>
        <a href="${escapeHtml(scholarshipLink(item))}" target="_blank" rel="noreferrer">Apri la pagina ufficiale delle borse</a>
      </div>` : '';

    const costCity = item.cost.online ? 'corso a distanza' : `${formatCurrency(item.cost.cityCost.monthly)}/mese stimati`;
    const commutePrecision = item.geography.commute?.precision === 'region' ? ' · stima basata sul centro regionale' : '';
    const geographyDetail = item.geography.mode === 'commute'
      ? `Stima con regionali o regionali veloci, senza alta velocità${commutePrecision}`
      : item.geography.sameCity
        ? 'La sede nella città di residenza riceve un piccolo vantaggio'
        : item.geography.online
          ? 'Corso a distanza incluso su richiesta'
          : 'Pendolarismo compatibile e trasferimento hanno lo stesso peso geografico';

    return `
      <article class="university-match-card">
        <div class="university-match-rank"><span>${String(index + 1).padStart(2, '0')}</span><strong>${item.total}%</strong><small>affinità</small></div>
        <div class="university-match-content">
          <div class="university-match-heading">
            <div><span class="course-result-group">${escapeHtml(item.courseMatch.label)}</span><h3>${escapeHtml(item.university.name)}</h3><p>${escapeHtml(item.course.name)} · ${escapeHtml(item.course.city || item.university.city)}${item.cost.online ? ' · a distanza' : ''}</p></div>
            <span class="university-type-chip">${escapeHtml(item.university.category === 'Scuola superiore' ? 'Istituto superiore' : item.university.category)}</span>
          </div>

          <div class="university-match-metrics">
            <article><span>Ranking</span><strong>${escapeHtml(rankingText(item))}</strong><small>${escapeHtml(rankingSourceText(item))}</small></article>
            <article><span>Geografia</span><strong>${escapeHtml(item.geography.label)}</strong><small>${escapeHtml(geographyDetail)}</small></article>
            <article><span>Costo orientativo</span><strong>${escapeHtml(costCity)} · retta media ${escapeHtml(formatCurrency(item.cost.tuition))}/anno</strong><small>Totale annuo stimato ${escapeHtml(formatCurrency(item.cost.annual))}; non è un preventivo personale</small></article>
            <article><span>Lingua</span><strong>${escapeHtml(item.language.label)}</strong><small>Da confermare nella scheda ufficiale</small></article>
          </div>

          <ul class="university-match-reasons">
            <li>Corso: <strong>${item.courseMatch.score}%</strong> · ${escapeHtml(item.courseMatch.label.toLowerCase())}.</li>
            <li>Ranking ufficiale: <strong>${item.ranking.score.toFixed(1)}%</strong>.</li>
            <li>Sostenibilità: <strong>${item.cost.score.toFixed(1)}%</strong>.</li>
            <li>Borse e sostegni: <strong>${item.support.score.toFixed(1)}%</strong>.</li>
          </ul>

          ${costWarning}
          ${calculationDetails(item)}

          <div class="university-match-actions">
            <a class="button button-primary" href="${escapeHtml(courseLink(item))}" target="_blank" rel="noreferrer">Apri il corso ufficiale</a>
            <a class="button button-secondary" href="${escapeHtml(scholarshipLink(item))}" target="_blank" rel="noreferrer">Borse ufficiali</a>
            <a class="text-button" href="${escapeHtml(scholarshipInternalLink(item))}">Verifica la borsa con il tuo profilo</a>
          </div>
        </div>
      </article>`;
  }

  function extendedRankingMarkup() {
    const extended = filteredUniversityResults().slice(0, 30);
    if (extended.length <= 5) return '';
    return `
      <details class="university-extended-ranking">
        <summary>Mostra la classifica sintetica fino a 30 università</summary>
        <div class="university-extended-list">
          ${extended.map((item, index) => `
            <article class="university-extended-row">
              <span class="university-extended-position">${index + 1}</span>
              <div><strong>${escapeHtml(item.university.name)}</strong><small>${escapeHtml(item.course.name)} · ${escapeHtml(item.course.city || item.university.city)}</small></div>
              <span class="university-extended-match">${escapeHtml(item.courseMatch.label)} · ${item.courseMatch.score}</span>
              <span class="university-extended-ranking-copy">${escapeHtml(officialRankings.shortLabel(item.ranking))}</span>
              <strong class="university-extended-score">${item.total}%</strong>
            </article>`).join('')}
        </div>
      </details>`;
  }

  function renderUniversityResults(target, options = {}) {
    const resultSection = $('#universityFinderResult');
    const layout = $('#universityFinderLayout');
    if (!resultSection) return;
    if (layout) layout.hidden = true;
    resultSection.hidden = false;

    const results = visibleUniversityResults();
    state.results = results;
    const filtered = filteredUniversityResults();
    const courseLabel = target.type === 'course' ? `corso ${target.label}` : `area ${target.label}`;

    $('#universityResultSummary').innerHTML = `
      <span class="eyebrow">Risultato personalizzato</span>
      <h2>Le università più adatte al tuo profilo.</h2>
      <p>Classifica per ${escapeHtml(courseLabel)}, ${escapeHtml(DEGREE_LABELS[state.answers.degree] || '')}, residenza a ${escapeHtml(state.answers.residenceCity)} e preferenze economiche e geografiche indicate.</p>
      <div class="result-method-note"><strong>${results.length} opzioni principali</strong><span>Corso 30% · geografia 18% · ranking QS per materia 25% · sostenibilità 18% · lingua 4% · borse 5%. Nella città di residenza: geografia 20% e ranking 23%.</span></div>
      <div class="university-result-controls">
        <label class="university-telematic-toggle" for="includeTelematicResults">
          <input id="includeTelematicResults" type="checkbox"${state.includeTelematic ? ' checked' : ''}>
          <span class="university-toggle-control" aria-hidden="true"><span></span></span>
          <span class="university-toggle-copy">
            <strong>Considera anche le università telematiche</strong>
            <small>${state.includeTelematic ? 'Attivato. Gli atenei telematici e i loro corsi online partecipano alla classifica.' : 'Disattivato di default.'}</small>
          </span>
        </label>
        <label class="university-telematic-toggle" for="includeDistanceResults">
          <input id="includeDistanceResults" type="checkbox"${state.includeDistance ? ' checked' : ''}>
          <span class="university-toggle-control" aria-hidden="true"><span></span></span>
          <span class="university-toggle-copy">
            <strong>Considera anche i corsi a distanza</strong>
            <small>${state.includeDistance ? 'Attivato. Possono essere scelti corsi online offerti anche da atenei tradizionali.' : 'Disattivato di default, separatamente dal filtro sugli atenei telematici.'}</small>
          </span>
        </label>
      </div>`;

    const list = $('#universityResultList');
    if (!results.length) {
      const telematicOnly = !state.includeTelematic && state.allResults.some((item) => item.university.category === 'Telematica');
      list.innerHTML = `
        <div class="university-no-results">
          <span class="eyebrow">Nessuna corrispondenza sufficiente</span>
          <h3>${telematicOnly ? 'Le opzioni disponibili sono telematiche.' : 'Le preferenze geografiche sono troppo restrittive per il corso scelto.'}</h3>
          <p>${telematicOnly ? 'Attiva l’opzione qui sopra per includerle nella classifica.' : 'Torna indietro e prova a consentire il trasferimento in regioni confinanti o in tutta Italia.'}</p>
        </div>`;
    } else {
      list.innerHTML = results.map(universityResultCard).join('') + extendedRankingMarkup();
    }

    $('#includeTelematicResults')?.addEventListener('change', (event) => {
      state.includeTelematic = Boolean(event.currentTarget.checked);
      state.allResults = rankCandidates(target, state.answers, { includeDistance: state.includeDistance, includeTelematic: state.includeTelematic });
      renderUniversityResults(target, { preserveScroll: true });
    });

    $('#includeDistanceResults')?.addEventListener('change', (event) => {
      state.includeDistance = Boolean(event.currentTarget.checked);
      state.allResults = rankCandidates(target, state.answers, { includeDistance: state.includeDistance, includeTelematic: state.includeTelematic });
      renderUniversityResults(target, { preserveScroll: true });
    });

    if (!filtered.length && !results.length) state.results = [];
    if (!options.preserveScroll) resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildUniversityResults() {
    const target = targetFromChoice(state.answers.courseChoice);
    if (!target) {
      setUniversityMessage('Il corso selezionato non è più disponibile. Torna alla prima domanda.', 'error');
      return;
    }

    app.updateGuidanceProfile?.({
      residenceRegion: state.answers.residenceRegion,
      residenceCity: state.answers.residenceCity,
      iseeRange: state.answers.iseeRange,
      preferredDegree: state.answers.degree,
      commutePreference: state.answers.commute,
      relocationScope: state.answers.relocation,
      languagePreference: state.answers.language,
      lastCourseChoice: state.answers.courseChoice,
      lastUniversityFinderAt: new Date().toISOString()
    });

    state.includeTelematic = false;
    state.includeDistance = false;
    state.target = target;
    state.allResults = rankCandidates(target, state.answers, { includeDistance: false, includeTelematic: false });
    state.results = visibleUniversityResults();
    renderUniversityResults(target);
  }

  function restartUniversityFinder() {
    resetUniversityFinder({ source: 'restart' });
    $('#universityFinderPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    if (!$('#universityFinderPanel')) return;
    $('#finderModeCourse')?.addEventListener('click', () => switchMode('course'));
    $('#finderModeUniversity')?.addEventListener('click', () => switchMode('university', { source: 'menu' }));
    $('#universityFinderForm')?.addEventListener('submit', nextUniversityStep);
    $('#universityFinderBack')?.addEventListener('click', previousUniversityStep);
    $('#restartUniversityFinder')?.addEventListener('click', restartUniversityFinder);
    $('#switchBackToCourse')?.addEventListener('click', () => switchMode('course'));
    $('#startUniversityFromResult')?.addEventListener('click', () => {
      const result = window.CourseFinder?.getResult?.();
      const courseSlug = result?.recommendations?.[0]?.slug || '';
      switchMode('university', { source: 'course-result', courseSlug });
    });
    const params = new URLSearchParams(location.search);
    if (location.hash === '#trova-universita' || params.get('mode') === 'university') switchMode('university', { source: 'direct', instant: true });
    else resetUniversityFinder({ source: 'menu' });
  }

  window.UniversityFinder = {
    switchMode,
    reset: resetUniversityFinder,
    getResults: () => state.results.slice(),
    getAllResults: () => state.allResults.slice()
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

(() => {
  'use strict';

  const app = window.UniversitySite;
  const catalog = window.CourseCatalog;
  const finderData = window.UNIVERSITY_FINDER_DATA || {};
  const serviceData = window.STUDENT_SERVICE_DATA || {};
  const universityData = window.UniversityData;
  if (!app || !catalog || !universityData) return;

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

  function getIseeRange(value) {
    return (serviceData.iseeRanges || []).find((range) => range.value === value) || null;
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
      iseeRange: stored.iseeRange || '',
      language: stored.languagePreference || ''
    };
  }

  function resetUniversityFinder(options = {}) {
    const defaults = profileDefaults(options.courseSlug || '');
    state.step = 0;
    state.answers = defaults;
    state.residenceEditing = !(defaults.residenceRegion && defaults.residenceCity);
    state.iseeEditing = !defaults.iseeRange;
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
        <p>Se rispondi sì, verranno privilegiate sedi con una percorrenza regionale stimata entro 90 minuti.</p>
        ${optionCards('universityCommute', [
          { value: 'yes', label: 'Sì, posso fare il pendolare', hint: 'Considera treni non ad alta velocità fino a circa 1 ora e 30 minuti.' },
          { value: 'no', label: 'No, preferisco evitare', hint: 'Mostra sedi nella mia città, corsi a distanza o opzioni compatibili con il trasferimento.' }
        ], state.answers.commute)}
      </fieldset>`;
  }

  function renderRelocationQuestion() {
    return `
      <fieldset class="quiz-fieldset university-question-fieldset">
        <legend>Se necessario, quanto lontano potresti trasferirti?</legend>
        <p>La risposta amplia o restringe l’area in cui cercare le università.</p>
        ${optionCards('universityRelocation', [
          { value: 'none', label: 'Non voglio trasferirmi', hint: 'Restano soltanto sedi locali, pendolari compatibili e corsi a distanza.' },
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

  function courseMatch(course, target) {
    if (!course || course.group !== target.group) return 0;
    if (target.type === 'group') return 88;
    const matched = catalog.matchCourse(course);
    if (matched?.slug === target.profile.slug) return 100;
    const normalizedName = normalize(course.name);
    const keywordHits = (target.profile.keywords || []).filter((keyword) => normalizedName.includes(normalize(keyword))).length;
    const classHit = (target.profile.classCodes || []).some((code) => String(course.classCode || '').toUpperCase().startsWith(String(code).toUpperCase()));
    return clamp(67 + keywordHits * 5 + (classHit ? 8 : 0), 67, 92);
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
    const isOnline = normalize(course.delivery).includes('distanza');
    if (isOnline) return { allowed: true, score: 94, label: 'Corso a distanza: nessun trasferimento necessario', commute: null, online: true };

    const residence = coordinateFor(answers.residenceCity, answers.residenceRegion);
    const destination = coordinateFor(course.city || university.city, university.region);
    const commute = estimateCommute(residence, destination, answers.residenceRegion, university.region);
    const sameCity = normalize(answers.residenceCity) === normalize(course.city || university.city);
    const canCommute = answers.commute === 'yes' && Number.isFinite(commute.minutes) && commute.minutes <= 90;

    if (sameCity) return { allowed: true, score: 100, label: 'Sede nella tua città', commute, online: false };
    if (canCommute) {
      return {
        allowed: true,
        score: clamp(98 - commute.minutes * 0.38, 62, 94),
        label: `Pendolarismo stimato: circa ${commute.minutes} minuti con servizi regionali`,
        commute,
        online: false
      };
    }

    const neighbors = finderData.regionNeighbors?.[answers.residenceRegion] || [];
    if (answers.relocation === 'region' && university.region === answers.residenceRegion) return { allowed: true, score: 80, label: 'Trasferimento nella stessa regione', commute, online: false };
    if (answers.relocation === 'neighbors' && university.region === answers.residenceRegion) return { allowed: true, score: 84, label: 'Sede nella tua regione', commute, online: false };
    if (answers.relocation === 'neighbors' && neighbors.includes(university.region)) return { allowed: true, score: 72, label: 'Trasferimento in una regione confinante', commute, online: false };
    if (answers.relocation === 'italy') {
      const score = university.region === answers.residenceRegion ? 86 : neighbors.includes(university.region) ? 76 : 62;
      return { allowed: true, score, label: university.region === answers.residenceRegion ? 'Sede nella tua regione' : 'Trasferimento compatibile con la disponibilità nazionale', commute, online: false };
    }

    return { allowed: false, score: 0, label: 'Fuori dall’area geografica indicata', commute, online: false };
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

  function supportScore(university) {
    const metrics = universityData.getMetrics(university.id);
    const students = Math.max(1, Number(metrics.students || 0));
    const scholarships = Number(metrics.scholarshipsUniversityMur || 0);
    const full = Number(metrics.fullExemptions || 0);
    const partial = Number(metrics.partialExemptions || 0);
    const housing = Number(metrics.housingAssigned || 0) + Number(metrics.housingContributions || 0);
    const weightedRate = (scholarships * 1.4 + full * 1.2 + partial * 0.32 + housing * 0.45) / students;
    return clamp(24 + Math.sqrt(Math.max(0, weightedRate)) * 210, 20, 100);
  }

  function iseeSensitivity(value) {
    return {
      '0-13000': 1.35,
      '13000-18000': 1.22,
      '18000-22000': 1.08,
      '22000-26000': 0.94,
      '26000-limit': 0.84,
      'over-limit': 0.68,
      unknown: 0.92
    }[value] || 0.92;
  }

  function affordability(university, course, answers, support) {
    const tuition = tuitionFor(university);
    const cityCost = costForCity(course.city || university.city, university.macroArea);
    const online = normalize(course.delivery).includes('distanza');
    const livingAnnual = online ? 1200 : cityCost.monthly * 10;
    const annual = tuition + livingAnnual;
    const sensitivity = iseeSensitivity(answers.iseeRange);
    const raw = 101 - ((annual - 5000) / 23000) * 74 - (sensitivity - 0.8) * 22;
    const scholarshipOffset = support * Math.max(0, sensitivity - 0.75) * 0.2;
    return {
      score: clamp(raw + scholarshipOffset, 8, 100),
      tuition,
      cityCost,
      annual,
      online,
      needsAid: sensitivity >= 1.08 && (annual > 13500 || cityCost.tier === 'molto alto' || tuition > 4500),
      support
    };
  }

  function rankingFit(university, group) {
    const stats = universityData.getGroupStats(university.id, group);
    const qsRank = Number(university.qsRankValue);
    let qsScore = null;
    if (Number.isFinite(qsRank) && qsRank > 0) {
      if (qsRank <= 100) qsScore = 100 - qsRank * 0.24;
      else if (qsRank <= 500) qsScore = 76 - (qsRank - 100) * 0.085;
      else qsScore = 42 - (qsRank - 500) * 0.025;
      qsScore = clamp(qsScore, 12, 98);
    }
    const subjectScore = stats ? clamp(Number(stats.index || 0), 5, 100) : null;
    const score = subjectScore != null && qsScore != null ? subjectScore * 0.62 + qsScore * 0.38 : subjectScore ?? qsScore ?? 28;
    return { score, stats, qsRank: Number.isFinite(qsRank) && qsRank > 0 ? qsRank : null };
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

  function rankCandidates(target, answers) {
    const candidates = [];
    app.getUniversities().forEach((university) => {
      const relevant = app.getUniversityCourses(university.id)
        .filter((course) => degreeMatches(course, answers.degree))
        .map((course) => ({ course, match: courseMatch(course, target) }))
        .filter((entry) => entry.match >= 67)
        .sort((a, b) => b.match - a.match || b.course.enrolled - a.course.enrolled);

      if (!relevant.length) return;
      const best = relevant[0];
      const geography = geographyFit(university, best.course, answers);
      if (!geography.allowed) return;
      const support = supportScore(university);
      const cost = affordability(university, best.course, answers, support);
      const ranking = rankingFit(university, target.group);
      const language = languageFit(best.course, answers.language);
      const total = Math.round(
        best.match * 0.30 +
        geography.score * 0.22 +
        ranking.score * 0.19 +
        cost.score * 0.18 +
        language.score * 0.07 +
        support * 0.04
      );

      candidates.push({
        university,
        course: best.course,
        courseMatch: best.match,
        geography,
        cost,
        ranking,
        language,
        support,
        total,
        target
      });
    });

    const sorted = candidates.sort((a, b) => b.total - a.total || b.courseMatch - a.courseMatch || a.university.name.localeCompare(b.university.name, 'it'));
    const nonTelematic = sorted.filter((item) => item.university.category !== 'Telematica');
    const telematic = sorted.filter((item) => item.university.category === 'Telematica');
    if (answers.relocation === 'none' && nonTelematic.length < 3) return sorted.slice(0, 5);
    const output = nonTelematic.slice(0, 5);
    if (telematic.length && output.length < 5) output.push(telematic[0]);
    return output.sort((a, b) => b.total - a.total).slice(0, 5);
  }

  function rankingText(item) {
    const parts = [];
    if (item.ranking.qsRank) parts.push(`QS generale #${item.university.qsRank}`);
    if (item.ranking.stats) parts.push(`area ${item.target.group}: #${item.ranking.stats.rank} su ${item.ranking.stats.rankedUniversities}`);
    return parts.length ? parts.join(' · ') : 'Ranking disciplinare non collegato';
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

  function universityResultCard(item, index) {
    const costWarning = item.cost.needsAid ? `
      <div class="university-aid-warning">
        <strong>Questa opzione può restare valida, ma il costo è impegnativo per la fascia ISEE indicata.</strong>
        <p>La presenza di borse ed esoneri ha attenuato la penalizzazione. Verifica subito requisiti e scadenze sul canale ufficiale.</p>
        <a href="${escapeHtml(scholarshipLink(item))}" target="_blank" rel="noreferrer">Apri la pagina ufficiale delle borse</a>
      </div>` : '';

    const courseMatchLabel = item.courseMatch >= 96 ? 'Corso molto coerente' : 'Percorso affine nella stessa area';
    const costCity = item.cost.online ? 'corso a distanza' : `${formatCurrency(item.cost.cityCost.monthly)}/mese stimati`;
    const commutePrecision = item.geography.commute?.precision === 'region' ? ' · stima basata sul centro regionale' : '';

    return `
      <article class="university-match-card">
        <div class="university-match-rank"><span>${String(index + 1).padStart(2, '0')}</span><strong>${item.total}%</strong><small>affinità</small></div>
        <div class="university-match-content">
          <div class="university-match-heading">
            <div><span class="course-result-group">${escapeHtml(courseMatchLabel)}</span><h3>${escapeHtml(item.university.name)}</h3><p>${escapeHtml(item.course.name)} · ${escapeHtml(item.course.city || item.university.city)}</p></div>
            <span class="university-type-chip">${escapeHtml(item.university.category === 'Scuola superiore' ? 'Istituto superiore' : item.university.category)}</span>
          </div>

          <div class="university-match-metrics">
            <article><span>Ranking</span><strong>${escapeHtml(rankingText(item))}</strong><small>QS per materia non collegato: fallback dichiarato</small></article>
            <article><span>Geografia</span><strong>${escapeHtml(item.geography.label)}</strong><small>${item.geography.commute?.minutes && Number.isFinite(item.geography.commute.minutes) ? `Percorrenza regionale stimata${escapeHtml(commutePrecision)}` : escapeHtml(RELOCATION_LABELS[state.answers.relocation] || '')}</small></article>
            <article><span>Costo orientativo</span><strong>${escapeHtml(costCity)} · retta media ${escapeHtml(formatCurrency(item.cost.tuition))}/anno</strong><small>Stima comparativa, non preventivo personale</small></article>
            <article><span>Lingua</span><strong>${escapeHtml(item.language.label)}</strong><small>Da confermare nella scheda ufficiale</small></article>
          </div>

          <ul class="university-match-reasons">
            <li>Compatibilità del corso: <strong>${item.courseMatch}%</strong>.</li>
            <li>Indice di sostenibilità economica orientativa: <strong>${Math.round(item.cost.score)}%</strong>.</li>
            <li>Presenza relativa di borse, esoneri o sostegni nel dataset: <strong>${Math.round(item.support)}%</strong>.</li>
          </ul>

          ${costWarning}

          <div class="university-match-actions">
            <a class="button button-primary" href="${escapeHtml(courseLink(item))}" target="_blank" rel="noreferrer">Apri il corso ufficiale</a>
            <a class="button button-secondary" href="${escapeHtml(scholarshipLink(item))}" target="_blank" rel="noreferrer">Borse ufficiali</a>
            <a class="text-button" href="${escapeHtml(scholarshipInternalLink(item))}">Verifica la borsa con il tuo profilo</a>
          </div>
        </div>
      </article>`;
  }

  function renderUniversityResults(target, results) {
    const resultSection = $('#universityFinderResult');
    const layout = $('#universityFinderLayout');
    if (!resultSection) return;
    if (layout) layout.hidden = true;
    resultSection.hidden = false;

    const courseLabel = target.type === 'course' ? `corso ${target.label}` : `area ${target.label}`;
    $('#universityResultSummary').innerHTML = `
      <span class="eyebrow">Risultato personalizzato</span>
      <h2>Le università più adatte al tuo profilo.</h2>
      <p>Classifica per ${escapeHtml(courseLabel)}, ${escapeHtml(DEGREE_LABELS[state.answers.degree] || '')}, residenza a ${escapeHtml(state.answers.residenceCity)} e preferenze economiche e geografiche indicate.</p>
      <div class="result-method-note"><strong>${results.length} opzioni mostrate</strong><span>Ordine decrescente di affinità. Il punteggio non sostituisce bandi, orari ferroviari o dati ufficiali dei corsi.</span></div>`;

    const list = $('#universityResultList');
    if (!results.length) {
      list.innerHTML = `
        <div class="university-no-results">
          <span class="eyebrow">Nessuna corrispondenza sufficiente</span>
          <h3>Le preferenze geografiche sono troppo restrittive per il corso scelto.</h3>
          <p>Torna indietro e prova a consentire il trasferimento in regioni confinanti o in tutta Italia.</p>
        </div>`;
    } else {
      list.innerHTML = results.map(universityResultCard).join('');
    }
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    state.results = rankCandidates(target, state.answers);
    renderUniversityResults(target, state.results);
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

  window.UniversityFinder = { switchMode, reset: resetUniversityFinder, getResults: () => state.results.slice() };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

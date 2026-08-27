(() => {
  'use strict';

  const data = window.STUDENT_SERVICE_DATA || {};
  const app = window.UniversitySite;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  const STORAGE = {
    scholarships: 'universitaSemplice.scholarships.v1',
    deadlines: 'universitaSemplice.deadlines.v1',
    community: 'universitaSemplice.community.v1',
    communityContexts: 'universitaSemplice.communityContexts.v1',
    books: 'universitaSemplice.books.v1',
    bookContexts: 'universitaSemplice.bookContexts.v1'
  };

  const SECTION_META = {
    'dati-percorso': {
      eyebrow: 'Profilo universitario',
      title: 'Dati del percorso',
      lead: 'Controlla le informazioni usate per personalizzare strumenti, gruppi e promemoria.'
    },
    'borse-di-studio': {
      eyebrow: 'Opportunità',
      title: 'Borse di studio',
      lead: 'Fai una verifica orientativa con ISEE e residenza, oppure prosegui senza comunicare questi dati.'
    },
    scadenze: {
      eyebrow: 'Organizzazione',
      title: 'Scadenze',
      lead: 'Raccogli date importanti e visualizza quanto manca rispetto a oggi.'
    },
    community: {
      eyebrow: 'Persone',
      title: 'Community',
      lead: 'Comunica con account dello stesso ateneo e, quando desideri, soltanto dello stesso corso.'
    },
    accompagnamento: {
      eyebrow: 'Percorso',
      title: 'Accompagnamento',
      lead: 'Una guida ordinata per capire il prossimo passo del tuo percorso universitario.'
    },
    'libri-usati': {
      eyebrow: 'Risparmio',
      title: 'Libri usati',
      lead: 'Annunci visibili soltanto nel gruppo formato da stesso ateneo e stesso corso.'
    }
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function uniqueId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function readStore(key, fallback) {
    return app?.safeStorageGet?.(key, fallback) ?? fallback;
  }

  function writeStore(key, value) {
    return app?.safeStorageSet?.(key, value) ?? false;
  }

  function getOwnerEmail() {
    return app?.getCurrentUser?.()?.email || '';
  }

  function getOwnedItems(key) {
    const store = readStore(key, {});
    const owner = getOwnerEmail();
    const items = store && typeof store === 'object' ? store[owner] : [];
    return Array.isArray(items) ? items : [];
  }

  function setOwnedItems(key, items) {
    const store = readStore(key, {});
    const owner = getOwnerEmail();
    const next = store && typeof store === 'object' ? store : {};
    next[owner] = items;
    return writeStore(key, next);
  }

  function getUniversity(id) {
    return app?.getUniversityById?.(id) || null;
  }

  function universityOptions(selected = '') {
    return app.getUniversities()
      .map((university) => `<option value="${university.id}"${university.id === selected ? ' selected' : ''}>${escapeHtml(university.name)} — ${escapeHtml(university.city)}</option>`)
      .join('');
  }

  function generalCourseOptions(selected = '') {
    return app.getGeneralCourses()
      .map((course) => `<option value="${escapeHtml(course.name)}"${course.name === selected ? ' selected' : ''}>${escapeHtml(course.name)}</option>`)
      .join('');
  }

  function currentDateCard() {
    return `
      <aside class="today-card" aria-label="Data di riferimento">
        <span>Data di riferimento</span>
        <strong>${escapeHtml(app.formatDate(new Date()))}</strong>
        <small>I conteggi temporali si ricalcolano automaticamente.</small>
      </aside>
    `;
  }

  function tabsTemplate(active) {
    const tabs = [
      ['dati-percorso', 'Dati del percorso'],
      ['borse-di-studio', 'Borse di studio'],
      ['scadenze', 'Scadenze'],
      ['community', 'Community'],
      ['accompagnamento', 'Accompagnamento'],
      ['libri-usati', 'Libri usati']
    ];
    return `<nav class="student-area-tabs" aria-label="Sezioni del profilo">${tabs
      .map(([key, label]) => `<a href="area-studente.html?sezione=${key}" class="${active === key ? 'is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`)
      .join('')}</nav>`;
  }

  function renderLocked(host, reason = 'login') {
    const title = reason === 'profile' ? 'Questa area è riservata a studenti e futuri studenti.' : 'Accedi per aprire la tua area personale.';
    const copy = reason === 'profile'
      ? 'Il profilo “mi interessa il mondo universitario” può usare atenei, orientamento e comparatore, ma non gli strumenti personali.'
      : 'Registrazione e accesso sono necessari per associare promemoria e preferenze al tuo profilo.';
    host.innerHTML = `
      <section class="student-area-locked">
        <span class="eyebrow">Area personale</span>
        <h1>${title}</h1>
        <p>${copy}</p>
        <button class="button button-primary" type="button" id="lockedAuthButton">${reason === 'profile' ? 'Modifica o crea un altro profilo' : 'Accedi o registrati'}</button>
      </section>
    `;
    $('#lockedAuthButton')?.addEventListener('click', () => app.openAuth(reason === 'profile' ? 'register' : 'login'));
  }

  function renderShell(host, section, content) {
    const meta = SECTION_META[section] || SECTION_META['borse-di-studio'];
    document.title = `${meta.title} — ${(window.SITE_CONFIG || {}).name || 'NOME SITO'}`;
    host.innerHTML = `
      <section class="student-area-hero">
        <div>
          <span class="eyebrow">${meta.eyebrow}</span>
          <h1>${meta.title}</h1>
          <p class="page-lead">${meta.lead}</p>
        </div>
        ${currentDateCard()}
      </section>
      ${tabsTemplate(section)}
      <div class="student-area-content">${content}</div>
    `;
  }

  function renderJourney(host, user) {
    const journey = user.journey || null;
    const university = journey ? getUniversity(journey.universityId) : null;
    const isUniversityProfile = user.situation === 'university';
    const content = `
      <section class="service-card service-card-emphasis">
        <div class="service-card-heading">
          <div><span class="eyebrow">Profilo attivo</span><h2>${isUniversityProfile ? 'Il tuo percorso universitario' : 'Il tuo percorso di orientamento'}</h2></div>
          <span class="valid-account-badge">Account locale attivo</span>
        </div>
        ${isUniversityProfile ? `
          <div class="journey-summary-grid">
            <article><span>Stato</span><strong>${escapeHtml(app.journeyPhaseLabels[journey?.phase] || 'Da completare')}</strong></article>
            <article><span>Ateneo</span><strong>${escapeHtml(university?.name || 'Non indicato')}</strong></article>
            <article><span>Corso</span><strong>${escapeHtml(journey?.courseName || 'Non indicato')}</strong></article>
            <article><span>Anno</span><strong>${journey?.phase === 'enrolled' && journey?.year ? `${journey.year}° anno` : 'Non applicabile'}</strong></article>
          </div>
          <button class="button button-primary" type="button" id="editJourneyFromArea">${journey ? 'Modifica i dati' : 'Completa i dati'}</button>
        ` : `
          <p>Hai indicato che vuoi iscriverti all’università. Per te il menu principale mostra anche <strong>Preparazione</strong> e <strong>Burocrazia</strong>.</p>
          <div class="journey-quick-links">
            <a class="button button-primary" href="preparazione.html">Apri Preparazione</a>
            <a class="button button-secondary" href="burocrazia.html">Apri Burocrazia</a>
          </div>
        `}
      </section>
      <section class="service-card data-privacy-card">
        <span class="eyebrow">Dati e limiti del prototipo</span>
        <h2>Che cosa viene salvato?</h2>
        <p>Account, percorso, scadenze, messaggi e annunci vengono conservati nel <strong>localStorage</strong> di questo browser. Non vengono inviati a un server.</p>
        <p>Per una pubblicazione reale serviranno consenso privacy, verifica email, autenticazione sicura, database, moderazione e regole di conservazione dei dati.</p>
      </section>
    `;
    renderShell(host, 'dati-percorso', content);
    $('#editJourneyFromArea')?.addEventListener('click', () => app.openJourneyEditor());
  }

  function rangeOptions(ranges) {
    return ranges.map((range) => `<option value="${range.value}">${escapeHtml(range.label)}</option>`).join('');
  }

  function findRange(ranges, value) {
    return ranges.find((range) => range.value === value) || null;
  }

  function residenceProfile(university, region, city) {
    if (!university || !region) return 'profilo non stimabile';
    if (city && normalize(city) === normalize(university.city)) return 'in sede (stima)';
    if (normalize(region) === normalize(university.region)) return 'pendolare (stima)';
    return 'fuori sede (stima)';
  }

  function scholarshipVerdict(iseeRange, ispeRange) {
    if (!iseeRange || !ispeRange || iseeRange.max == null || ispeRange.max == null) return 'unknown';
    const limits = data.nationalThresholds;
    if (iseeRange.min > limits.isee || ispeRange.min > limits.ispe) return 'unlikely';
    if (iseeRange.max <= limits.isee && ispeRange.max <= limits.ispe) return 'possible';
    return 'uncertain';
  }

  function scholarshipResultTemplate(verdict, university, residenceRegion, residenceCity, profile) {
    const ateneoPortal = data.officialDomains?.[university.id] || data.sources?.universitaly || '#';
    const regional = data.regionalPortals?.[university.region] || { name: 'Portale MUR diritto allo studio', url: data.sources?.murScholarships || '#' };
    const copy = {
      possible: {
        icon: '✓',
        title: 'Potresti avere i requisiti economici per presentare domanda.',
        text: 'Le fasce ISEE e ISPE indicate rientrano nei limiti massimi nazionali. La graduatoria ufficiale dipende anche da merito, documenti, residenza e regole del bando competente.'
      },
      unlikely: {
        icon: '!',
        title: 'Le fasce indicate sembrano superare almeno un limite nazionale.',
        text: 'Potrebbero comunque esistere agevolazioni diverse dalla borsa DSU. Controlla il bando dell’ateneo e dell’ente regionale.'
      },
      uncertain: {
        icon: '?',
        title: 'La fascia selezionata attraversa una soglia di riferimento.',
        text: 'Per una verifica migliore serve il valore preciso dell’ISEE/ISPE universitario e il bando ufficiale.'
      },
      unknown: {
        icon: '?',
        title: 'Non ci sono abbastanza dati per una verifica orientativa.',
        text: 'Puoi comunque aprire i portali ufficiali e controllare requisiti e scadenze.'
      }
    }[verdict];

    return `
      <section class="scholarship-result scholarship-${verdict}" id="scholarshipResultCard">
        <div class="result-symbol">${copy.icon}</div>
        <div class="scholarship-result-body">
          <span class="eyebrow">Esito orientativo</span>
          <h2>${copy.title}</h2>
          <p>${copy.text}</p>
          <div class="result-facts-grid">
            <article><span>Ateneo</span><strong>${escapeHtml(university.name)}</strong></article>
            <article><span>Profilo di residenza</span><strong>${escapeHtml(profile)}</strong></article>
            <article><span>Ente di riferimento</span><strong>${escapeHtml(regional.name)}</strong></article>
            <article><span>Anno accademico</span><strong>${escapeHtml(data.academicYear || '2026/2027')}</strong></article>
          </div>
          <div class="save-scholarship-row">
            <label class="field compact-field"><span>Scadenza letta nel bando <small>(facoltativa)</small></span><input id="scholarshipDeadline" type="date"></label>
            <button class="button button-primary" id="saveScholarship" type="button">Salva questa opportunità</button>
            <a class="button button-secondary" href="${escapeHtml(regional.url)}" target="_blank" rel="noreferrer">Portale borsa ufficiale</a>
            <a class="text-link" href="${escapeHtml(ateneoPortal)}" target="_blank" rel="noreferrer">Sito dell’ateneo →</a>
          </div>
          <p class="micro-note">Residenza comunicata: ${escapeHtml(residenceCity || 'comune non indicato')}, ${escapeHtml(residenceRegion)}. La classificazione in sede/pendolare/fuori sede è soltanto una stima: il bando usa comuni, distanze e tempi di percorrenza propri.</p>
        </div>
      </section>
    `;
  }

  function savedScholarshipsTemplate(items) {
    if (!items.length) return '<p class="empty-state">Non hai ancora salvato opportunità.</p>';
    return `<div class="saved-opportunity-list">${items
      .slice()
      .sort((a, b) => String(a.deadline || '9999').localeCompare(String(b.deadline || '9999')))
      .map((item) => {
        const university = getUniversity(item.universityId);
        return `<article class="saved-opportunity">
          <div><span>${item.deadline ? app.formatDate(item.deadline) : 'Scadenza da inserire'}</span><strong>${escapeHtml(university?.name || item.universityName || 'Ateneo')}</strong><small>${escapeHtml(item.statusLabel || 'Verifica orientativa salvata')}</small></div>
          <div class="saved-opportunity-actions"><a href="${escapeHtml(item.portalUrl || '#')}" target="_blank" rel="noreferrer">Apri portale</a><button type="button" data-delete-scholarship="${item.id}">Elimina</button></div>
        </article>`;
      })
      .join('')}</div>`;
  }

  function renderScholarships(host, user, params) {
    const defaultUniversityId = params.get('ateneo') || user.journey?.universityId || app.getUniversities()[0]?.id || '';
    const content = `
      <section class="service-card decision-card">
        <div><span class="eyebrow">Scelta dei dati</span><h2>Decidi tu quanto condividere</h2><p>I dati economici restano nel browser di questo dispositivo. Puoi rifiutare: in quel caso il sito non calcolerà una possibile idoneità.</p></div>
        <div class="privacy-choice-list">
          <label class="privacy-choice is-selected"><input type="radio" name="scholarshipPrivacy" value="share" checked><span>Uso i dati per una verifica orientativa</span></label>
          <label class="privacy-choice"><input type="radio" name="scholarshipPrivacy" value="decline"><span>Preferisco non comunicarli</span></label>
        </div>
      </section>

      <section class="service-card" id="scholarshipFormCard">
        <div class="service-card-heading"><div><span class="eyebrow">Verifica preliminare</span><h2>Inserisci i dati essenziali</h2></div><span class="data-year-badge">a.a. ${escapeHtml(data.academicYear || '')}</span></div>
        <form id="scholarshipForm" class="service-form" novalidate>
          <label class="field field-wide"><span>Ateneo di riferimento</span><select id="scholarshipUniversity"><option value="">Seleziona</option>${universityOptions(defaultUniversityId)}</select></label>
          <label class="field"><span>Fascia ISEE universitario</span><select id="scholarshipIsee">${rangeOptions(data.iseeRanges || [])}</select></label>
          <label class="field"><span>Fascia ISPE <small>(facoltativa ma rilevante)</small></span><select id="scholarshipIspe">${rangeOptions(data.ispeRanges || [])}</select></label>
          <label class="field"><span>Regione di residenza</span><select id="scholarshipResidenceRegion"><option value="">Seleziona</option>${(data.regions || []).map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('')}</select></label>
          <label class="field"><span>Comune di residenza</span><input id="scholarshipResidenceCity" type="text" placeholder="Es. Roma"></label>
          <p class="service-form-note field-wide">Gli intervalli seguono il limite massimo nazionale MUR ${escapeHtml(data.academicYear || '')}. Il bando regionale o dell’ateneo può prevedere soglie inferiori, requisiti di merito, documenti e scadenze ulteriori.</p>
          <p class="form-message field-wide" id="scholarshipMessage" role="alert"></p>
          <button class="button button-primary field-wide" type="submit">Verifica la possibilità</button>
        </form>
      </section>

      <section class="service-card declined-data-card" id="scholarshipDeclined" hidden>
        <span class="eyebrow">Nessuna verifica automatica</span>
        <h2>Puoi cercare comunque una borsa di studio.</h2>
        <p>Non salveremo né useremo ISEE, ISPE o residenza. Apri il portale nazionale MUR o il sito dell’ateneo e consulta il bando ufficiale.</p>
        <div class="inline-actions"><a class="button button-primary" href="${escapeHtml(data.sources?.murScholarships || '#')}" target="_blank" rel="noreferrer">Apri il diritto allo studio MUR</a><a class="button button-secondary" href="${escapeHtml(data.officialDomains?.[defaultUniversityId] || data.sources?.universitaly || '#')}" target="_blank" rel="noreferrer">Apri l’ateneo</a></div>
      </section>

      <div id="scholarshipResultHost"></div>

      <section class="service-card">
        <div class="service-card-heading"><div><span class="eyebrow">Salvate</span><h2>Le tue opportunità</h2></div><small>Usate anche nelle scadenze</small></div>
        <div id="savedScholarships">${savedScholarshipsTemplate(getOwnedItems(STORAGE.scholarships))}</div>
      </section>

      <section class="source-disclaimer">
        <strong>Verifica orientativa, non domanda ufficiale.</strong>
        <p>Per il ${escapeHtml(data.academicYear || '2026/2027')} il limite massimo nazionale è ISEE €${Number(data.nationalThresholds?.isee || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} e ISPE €${Number(data.nationalThresholds?.ispe || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}. La concessione dipende dal bando competente.</p>
        <a href="${escapeHtml(data.sources?.murIseeDecree || '#')}" target="_blank" rel="noreferrer">Apri il decreto MUR</a>
      </section>
    `;
    renderShell(host, 'borse-di-studio', content);

    const privacyInputs = $$('input[name="scholarshipPrivacy"]');
    privacyInputs.forEach((input) => input.addEventListener('change', () => {
      $$('.privacy-choice').forEach((choice) => choice.classList.toggle('is-selected', choice.contains($('input:checked', choice))));
      const share = $('input[name="scholarshipPrivacy"]:checked')?.value === 'share';
      $('#scholarshipFormCard').hidden = !share;
      $('#scholarshipDeclined').hidden = share;
      if (!share) $('#scholarshipResultHost').innerHTML = '';
    }));

    $('#scholarshipForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const university = getUniversity($('#scholarshipUniversity').value);
      const iseeRange = findRange(data.iseeRanges || [], $('#scholarshipIsee').value);
      const ispeRange = findRange(data.ispeRanges || [], $('#scholarshipIspe').value);
      const residenceRegion = $('#scholarshipResidenceRegion').value;
      const residenceCity = $('#scholarshipResidenceCity').value.trim();
      const message = $('#scholarshipMessage');
      message.textContent = '';
      if (!university || !residenceRegion) {
        message.textContent = 'Seleziona ateneo e regione di residenza.';
        message.dataset.type = 'error';
        return;
      }
      const verdict = scholarshipVerdict(iseeRange, ispeRange);
      const profile = residenceProfile(university, residenceRegion, residenceCity);
      $('#scholarshipResultHost').innerHTML = scholarshipResultTemplate(verdict, university, residenceRegion, residenceCity, profile);
      $('#scholarshipResultCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      $('#saveScholarship')?.addEventListener('click', () => {
        const regional = data.regionalPortals?.[university.region] || { url: data.sources?.murScholarships || '#' };
        const items = getOwnedItems(STORAGE.scholarships);
        items.push({
          id: uniqueId('scholarship'),
          universityId: university.id,
          universityName: university.name,
          courseName: params.get('corso') || user.journey?.courseName || null,
          deadline: $('#scholarshipDeadline')?.value || null,
          portalUrl: regional.url,
          status: verdict,
          statusLabel: $('#scholarshipResultCard h2')?.textContent || 'Verifica orientativa',
          savedAt: new Date().toISOString()
        });
        if (setOwnedItems(STORAGE.scholarships, items)) {
          $('#savedScholarships').innerHTML = savedScholarshipsTemplate(items);
          bindScholarshipDeletes();
          app.showToast('Opportunità salvata nelle tue scadenze.');
        }
      });
    });

    function bindScholarshipDeletes() {
      $$('[data-delete-scholarship]').forEach((button) => button.addEventListener('click', () => {
        const next = getOwnedItems(STORAGE.scholarships).filter((item) => item.id !== button.dataset.deleteScholarship);
        setOwnedItems(STORAGE.scholarships, next);
        $('#savedScholarships').innerHTML = savedScholarshipsTemplate(next);
        bindScholarshipDeletes();
      }));
    }
    bindScholarshipDeletes();
  }

  function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function relativeDeadline(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return { label: 'Data non valida', tone: 'muted', days: Infinity };
    const diff = Math.round((date - startOfToday()) / 86400000);
    if (diff < 0) return { label: `Scaduta da ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'giorno' : 'giorni'}`, tone: 'danger', days: diff };
    if (diff === 0) return { label: 'Scade oggi', tone: 'danger', days: 0 };
    if (diff === 1) return { label: 'Scade domani', tone: 'warning', days: 1 };
    if (diff <= 14) return { label: `Mancano ${diff} giorni`, tone: 'warning', days: diff };
    return { label: `Mancano ${diff} giorni`, tone: 'success', days: diff };
  }

  function combinedDeadlines() {
    const personal = getOwnedItems(STORAGE.deadlines).map((item) => ({ ...item, source: 'personal' }));
    const scholarships = getOwnedItems(STORAGE.scholarships)
      .filter((item) => item.deadline)
      .map((item) => ({
        id: `saved-${item.id}`,
        title: `Borsa di studio — ${getUniversity(item.universityId)?.shortName || item.universityName || 'ateneo'}`,
        date: item.deadline,
        category: 'borsa',
        notes: 'Opportunità salvata nella sezione Borse di studio.',
        source: 'scholarship'
      }));
    return [...personal, ...scholarships].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function deadlinesListTemplate(items) {
    if (!items.length) return '<p class="empty-state">Non ci sono ancora scadenze. Aggiungi una data oppure salva una borsa di studio.</p>';
    return `<div class="deadline-list">${items.map((item) => {
      const relative = relativeDeadline(item.date);
      return `<article class="deadline-item deadline-${relative.tone}">
        <div class="deadline-date"><strong>${new Date(`${item.date}T00:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</strong><span>${new Date(`${item.date}T00:00:00`).getFullYear()}</span></div>
        <div class="deadline-copy"><span class="deadline-category">${escapeHtml(item.category || 'altro')}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.notes || '')}</p></div>
        <div class="deadline-status"><strong>${relative.label}</strong>${item.source === 'personal' ? `<button type="button" data-delete-deadline="${item.id}">Elimina</button>` : '<small>Da borsa salvata</small>'}</div>
      </article>`;
    }).join('')}</div>`;
  }

  function renderDeadlines(host, user) {
    const categoryOptions = user.situation === 'enrolling'
      ? [['immatricolazione', 'Immatricolazione'], ['test', 'Test d’ingresso'], ['borsa', 'Borsa di studio'], ['burocrazia', 'Documento o procedura'], ['altro', 'Altro']]
      : [['rata', 'Rata universitaria'], ['esame', 'Esame'], ['borsa', 'Borsa di studio'], ['burocrazia', 'Documento o procedura'], ['altro', 'Altro']];
    const content = `
      <section class="service-card">
        <div class="service-card-heading"><div><span class="eyebrow">Nuovo promemoria</span><h2>Aggiungi una data importante</h2></div><small>Calcolo rispetto a oggi</small></div>
        <form id="deadlineForm" class="service-form compact-service-form">
          <label class="field"><span>Titolo</span><input id="deadlineTitle" type="text" placeholder="Es. Seconda rata" required></label>
          <label class="field"><span>Categoria</span><select id="deadlineCategory">${categoryOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
          <label class="field"><span>Data</span><input id="deadlineDate" type="date" required></label>
          <label class="field field-wide"><span>Nota <small>(facoltativa)</small></span><input id="deadlineNotes" type="text" placeholder="Documento, importo o luogo da ricordare"></label>
          <p class="form-message field-wide" id="deadlineMessage"></p>
          <button class="button button-primary field-wide" type="submit">Salva la scadenza</button>
        </form>
      </section>
      <section class="service-card">
        <div class="service-card-heading"><div><span class="eyebrow">Calendario personale</span><h2>Le prossime date</h2></div><span class="data-year-badge">${escapeHtml(app.formatDate(new Date()))}</span></div>
        <div id="deadlinesList">${deadlinesListTemplate(combinedDeadlines())}</div>
      </section>
      <section class="source-disclaimer"><strong>Le date non vengono inventate dal sito.</strong><p>Inseriscile dal bando, dal portale studenti o dal calendario esami. In una versione online, un backend potrà sincronizzarle con fonti ufficiali quando disponibili.</p></section>
    `;
    renderShell(host, 'scadenze', content);

    const deadlineParams = new URLSearchParams(window.location.search);
    if (deadlineParams.get('titolo')) $('#deadlineTitle').value = deadlineParams.get('titolo');
    if (deadlineParams.get('categoria')) {
      const requestedCategory = deadlineParams.get('categoria');
      const categorySelect = $('#deadlineCategory');
      if (categorySelect && Array.from(categorySelect.options).some((option) => option.value === requestedCategory)) {
        categorySelect.value = requestedCategory;
      }
    }

    function refresh() {
      $('#deadlinesList').innerHTML = deadlinesListTemplate(combinedDeadlines());
      $$('[data-delete-deadline]').forEach((button) => button.addEventListener('click', () => {
        const next = getOwnedItems(STORAGE.deadlines).filter((item) => item.id !== button.dataset.deleteDeadline);
        setOwnedItems(STORAGE.deadlines, next);
        refresh();
      }));
    }

    $('#deadlineForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = $('#deadlineTitle').value.trim();
      const date = $('#deadlineDate').value;
      const message = $('#deadlineMessage');
      if (!title || !date) {
        message.textContent = 'Inserisci titolo e data.';
        message.dataset.type = 'error';
        return;
      }
      const items = getOwnedItems(STORAGE.deadlines);
      items.push({
        id: uniqueId('deadline'),
        title,
        date,
        category: $('#deadlineCategory').value,
        notes: $('#deadlineNotes').value.trim(),
        createdAt: new Date().toISOString()
      });
      if (setOwnedItems(STORAGE.deadlines, items)) {
        event.currentTarget.reset();
        message.textContent = '';
        refresh();
        app.showToast('Scadenza salvata.');
      }
    });
    refresh();
  }

  function getContext(storageKey, user) {
    if (user.journey?.universityId) {
      return { universityId: user.journey.universityId, courseName: user.journey.courseName || '' };
    }
    const contexts = readStore(storageKey, {});
    return contexts?.[user.email] || null;
  }

  function setContext(storageKey, user, context) {
    const contexts = readStore(storageKey, {});
    contexts[user.email] = context;
    writeStore(storageKey, contexts);
  }

  function contextSetupTemplate(kind, current) {
    return `
      <section class="service-card context-setup-card">
        <span class="eyebrow">Gruppo di riferimento</span>
        <h2>${kind === 'community' ? 'Scegli l’ateneo in cui vuoi entrare nella community' : 'Indica ateneo e corso per vedere gli annunci compatibili'}</h2>
        <form id="contextSetupForm" class="service-form compact-service-form">
          <label class="field field-wide"><span>Ateneo</span><select id="contextUniversity"><option value="">Seleziona</option>${universityOptions(current?.universityId || '')}</select></label>
          <label class="field field-wide"><span>Corso</span><select id="contextCourse"><option value="">Seleziona un corso</option>${generalCourseOptions(current?.courseName || '')}</select></label>
          <p class="form-message field-wide" id="contextMessage"></p>
          <button class="button button-primary field-wide" type="submit">Salva il gruppo</button>
        </form>
      </section>
    `;
  }

  function allCommunityMessages() {
    const messages = readStore(STORAGE.community, []);
    return Array.isArray(messages) ? messages : [];
  }

  function communityMessagesTemplate(context, sameCourse) {
    const messages = allCommunityMessages()
      .filter((message) => message.universityId === context.universityId)
      .filter((message) => !sameCourse || (context.courseName && normalize(message.courseName) === normalize(context.courseName)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!messages.length) {
      return `<div class="community-empty"><strong>Ancora nessun messaggio in questo gruppo.</strong><p>Puoi essere il primo a iniziare una conversazione. In questa demo i messaggi sono condivisi solo tra gli account creati nello stesso browser.</p></div>`;
    }
    return messages.map((message) => `<article class="community-message">
      <div class="community-avatar">${escapeHtml((message.authorAlias || 'S').charAt(0).toUpperCase())}</div>
      <div><div class="community-message-meta"><strong>${escapeHtml(message.authorAlias || 'Studente')}</strong><span>Account locale attivo</span><time>${escapeHtml(app.formatDate(message.createdAt, { hour: '2-digit', minute: '2-digit' }))}</time></div><p>${escapeHtml(message.text)}</p><small>${escapeHtml(message.courseName || 'Gruppo generale dell’ateneo')}</small></div>
    </article>`).join('');
  }

  function renderCommunity(host, user) {
    let context = getContext(STORAGE.communityContexts, user);
    const university = context ? getUniversity(context.universityId) : null;
    const content = `
      ${!context ? contextSetupTemplate('community', null) : ''}
      <section class="service-card community-card" id="communityMain"${context ? '' : ' hidden'}>
        <div class="service-card-heading">
          <div><span class="eyebrow">Gruppo verificato dal profilo</span><h2 id="communityGroupTitle">${escapeHtml(university?.name || 'Community')}</h2><p id="communityGroupCourse">${escapeHtml(context?.courseName || 'Tutti i corsi')}</p></div>
          <span class="valid-account-badge">Account valido nella demo</span>
        </div>
        <div class="community-toolbar">
          <label class="toggle-row"><input id="sameCourseFilter" type="checkbox"${context?.courseName ? '' : ' disabled'}><span>Mostra solo lo stesso corso</span></label>
          ${!user.journey?.universityId ? '<button class="text-button" type="button" id="changeCommunityContext">Cambia gruppo</button>' : ''}
        </div>
        <div class="community-message-list" id="communityMessages">${context ? communityMessagesTemplate(context, false) : ''}</div>
        <form class="community-compose" id="communityForm">
          <label for="communityText">Scrivi nel gruppo</label>
          <textarea id="communityText" rows="3" maxlength="800" placeholder="Fai una domanda o condividi un’informazione utile…"></textarea>
          <p class="form-message" id="communityMessage"></p>
          <button class="button button-primary" type="submit">Pubblica</button>
        </form>
      </section>
      <section class="source-disclaimer"><strong>Community dimostrativa locale.</strong><p>Per permettere a persone su dispositivi diversi di comunicare servono database, moderazione, segnalazioni, verifica email, regole di condotta e strumenti anti-abuso.</p></section>
    `;
    renderShell(host, 'community', content);

    function bindContextForm() {
      $('#contextSetupForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const universityId = $('#contextUniversity').value;
        const courseName = $('#contextCourse').value;
        if (!universityId) {
          $('#contextMessage').textContent = 'Seleziona un ateneo.';
          return;
        }
        setContext(STORAGE.communityContexts, user, { universityId, courseName });
        renderCommunity(host, app.getCurrentUser());
      });
    }
    bindContextForm();

    if (!context) return;

    function refreshMessages() {
      const sameCourse = $('#sameCourseFilter')?.checked || false;
      $('#communityMessages').innerHTML = communityMessagesTemplate(context, sameCourse);
    }

    $('#sameCourseFilter')?.addEventListener('change', refreshMessages);
    $('#changeCommunityContext')?.addEventListener('click', () => {
      const contexts = readStore(STORAGE.communityContexts, {});
      delete contexts[user.email];
      writeStore(STORAGE.communityContexts, contexts);
      renderCommunity(host, app.getCurrentUser());
    });
    $('#communityForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = $('#communityText').value.trim();
      if (!text) {
        $('#communityMessage').textContent = 'Scrivi un messaggio prima di pubblicare.';
        return;
      }
      const messages = allCommunityMessages();
      messages.push({
        id: uniqueId('message'),
        universityId: context.universityId,
        courseName: context.courseName || '',
        authorEmail: user.email,
        authorAlias: user.email.split('@')[0],
        text,
        createdAt: new Date().toISOString()
      });
      writeStore(STORAGE.community, messages);
      event.currentTarget.reset();
      $('#communityMessage').textContent = '';
      refreshMessages();
      app.showToast('Messaggio pubblicato nella demo locale.');
    });
  }

  function allBookListings() {
    const listings = readStore(STORAGE.books, []);
    return Array.isArray(listings) ? listings : [];
  }

  function bookListingsTemplate(context, currentEmail) {
    const listings = allBookListings()
      .filter((item) => item.universityId === context.universityId && normalize(item.courseName) === normalize(context.courseName))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (!listings.length) return '<p class="empty-state">Nessun annuncio per questo ateneo e corso. Puoi pubblicare il primo.</p>';
    return `<div class="book-listing-grid">${listings.map((item) => `<article class="book-listing-card">
      <div class="book-listing-top"><span class="book-type book-${item.type}">${item.type === 'sell' ? 'Vendo' : 'Cerco'}</span><strong>${item.price ? `€${Number(item.price).toLocaleString('it-IT')}` : 'Prezzo da concordare'}</strong></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.author || 'Autore non indicato')}</p>
      <div class="book-details"><span>${escapeHtml(item.condition || 'Condizione non indicata')}</span><span>${escapeHtml(item.notes || '')}</span></div>
      <footer><small>${escapeHtml(item.ownerAlias || 'Studente')} · account locale attivo</small>${item.ownerEmail === currentEmail ? `<button type="button" data-delete-book="${item.id}">Elimina</button>` : `<button type="button" data-contact-book="${item.id}">Contatta</button>`}</footer>
    </article>`).join('')}</div>`;
  }

  function renderBooks(host, user) {
    let context = getContext(STORAGE.bookContexts, user);
    const hasExactContext = context?.universityId && context?.courseName;
    const university = hasExactContext ? getUniversity(context.universityId) : null;
    const content = `
      ${!hasExactContext ? contextSetupTemplate('books', context) : ''}
      <section class="service-card" id="booksMain"${hasExactContext ? '' : ' hidden'}>
        <div class="service-card-heading"><div><span class="eyebrow">Gruppo compatibile</span><h2>${escapeHtml(university?.name || '')}</h2><p>${escapeHtml(context?.courseName || '')}</p></div><span class="valid-account-badge">Stesso ateneo + stesso corso</span></div>
        ${!user.journey?.universityId ? '<button class="text-button" id="changeBookContext" type="button">Cambia gruppo</button>' : ''}
        <form id="bookForm" class="service-form book-form">
          <label class="field"><span>Tipo di annuncio</span><select id="bookType"><option value="sell">Vendo un libro</option><option value="buy">Cerco un libro</option></select></label>
          <label class="field"><span>Titolo</span><input id="bookTitle" type="text" required></label>
          <label class="field"><span>Autore</span><input id="bookAuthor" type="text"></label>
          <label class="field"><span>Prezzo € <small>(facoltativo)</small></span><input id="bookPrice" type="number" min="0" step="0.01"></label>
          <label class="field"><span>Condizione</span><select id="bookCondition"><option value="Come nuovo">Come nuovo</option><option value="Buono stato">Buono stato</option><option value="Con sottolineature">Con sottolineature</option><option value="Da valutare">Da valutare</option></select></label>
          <label class="field field-wide"><span>Nota</span><input id="bookNotes" type="text" placeholder="Edizione, modalità di consegna, informazioni utili"></label>
          <p class="form-message field-wide" id="bookMessage"></p>
          <button class="button button-primary field-wide" type="submit">Pubblica l’annuncio</button>
        </form>
      </section>
      <section class="service-card" id="bookListingsCard"${hasExactContext ? '' : ' hidden'}>
        <div class="service-card-heading"><div><span class="eyebrow">Bacheca</span><h2>Annunci del tuo gruppo</h2></div></div>
        <div id="bookListings">${hasExactContext ? bookListingsTemplate(context, user.email) : ''}</div>
      </section>
      <section class="source-disclaimer"><strong>Mercatino dimostrativo locale.</strong><p>Una versione pubblica richiede moderazione degli annunci, protezione dei contatti, segnalazioni, termini di utilizzo e misure antifrode. Il sito non gestisce pagamenti.</p></section>
    `;
    renderShell(host, 'libri-usati', content);

    $('#contextSetupForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const universityId = $('#contextUniversity').value;
      const courseName = $('#contextCourse').value;
      if (!universityId || !courseName) {
        $('#contextMessage').textContent = 'Per i libri usati sono obbligatori ateneo e corso.';
        return;
      }
      setContext(STORAGE.bookContexts, user, { universityId, courseName });
      renderBooks(host, app.getCurrentUser());
    });

    if (!hasExactContext) return;

    function refreshListings() {
      $('#bookListings').innerHTML = bookListingsTemplate(context, user.email);
      $$('[data-delete-book]').forEach((button) => button.addEventListener('click', () => {
        const next = allBookListings().filter((item) => item.id !== button.dataset.deleteBook);
        writeStore(STORAGE.books, next);
        refreshListings();
      }));
      $$('[data-contact-book]').forEach((button) => button.addEventListener('click', () => {
        const item = allBookListings().find((entry) => entry.id === button.dataset.contactBook);
        if (item) app.showToast(`Contatto demo: ${item.ownerEmail}`);
      }));
    }

    $('#changeBookContext')?.addEventListener('click', () => {
      const contexts = readStore(STORAGE.bookContexts, {});
      delete contexts[user.email];
      writeStore(STORAGE.bookContexts, contexts);
      renderBooks(host, app.getCurrentUser());
    });

    $('#bookForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = $('#bookTitle').value.trim();
      if (!title) {
        $('#bookMessage').textContent = 'Inserisci il titolo del libro.';
        return;
      }
      const listings = allBookListings();
      listings.push({
        id: uniqueId('book'),
        universityId: context.universityId,
        courseName: context.courseName,
        type: $('#bookType').value,
        title,
        author: $('#bookAuthor').value.trim(),
        price: $('#bookPrice').value ? Number($('#bookPrice').value) : null,
        condition: $('#bookCondition').value,
        notes: $('#bookNotes').value.trim(),
        ownerEmail: user.email,
        ownerAlias: user.email.split('@')[0],
        createdAt: new Date().toISOString()
      });
      writeStore(STORAGE.books, listings);
      event.currentTarget.reset();
      $('#bookMessage').textContent = '';
      refreshListings();
      app.showToast('Annuncio pubblicato nel gruppo locale.');
    });
    refreshListings();
  }

  function renderAccompaniment(host, user) {
    const items = user.situation === 'enrolling'
      ? [
          ['Scopri', 'Completa “Trova il mio corso” e salva le preferenze utili al comparatore.', 'trova-corso.html'],
          ['Confronta', 'Metti a confronto atenei e corsi usando criteri accademici ed economici.', 'comparison.html'],
          ['Preparati', 'Svolgi esercizi originali coerenti con la macroarea e con il TOLC di riferimento.', 'preparazione.html'],
          ['Organizza', 'Apri Burocrazia, controlla il bando e salva le scadenze reali.', 'burocrazia.html']
        ]
      : [
          ['Aggiorna', 'Mantieni corretti ateneo, corso e anno nel tuo profilo.', 'area-studente.html?sezione=dati-percorso'],
          ['Controlla', 'Inserisci rate, esami e procedure nella sezione Scadenze.', 'area-studente.html?sezione=scadenze'],
          ['Cerca', 'Verifica borse di studio e salva quelle da approfondire.', 'area-studente.html?sezione=borse-di-studio'],
          ['Confrontati', 'Usa community e libri usati nel gruppo corretto.', 'area-studente.html?sezione=community']
        ];
    const content = `
      <section class="service-card accompaniment-card">
        <span class="eyebrow">Prossimi passi</span>
        <h2>Un percorso semplice, una fase alla volta</h2>
        <div class="accompaniment-list">${items.map(([title, copy, href], index) => `<a href="${href}" class="accompaniment-step"><span>0${index + 1}</span><div><strong>${title}</strong><p>${copy}</p></div><b>→</b></a>`).join('')}</div>
      </section>
      <section class="source-disclaimer"><strong>Non sostituisce segreteria, bando o tutor ufficiale.</strong><p>Usa questo spazio per ordinare le informazioni, poi verifica sempre requisiti e procedure sui canali dell’ateneo.</p></section>
    `;
    renderShell(host, 'accompagnamento', content);
  }

  function render() {
    const host = $('[data-student-area], [data-area-content]');
    if (!host || !app) return;
    const user = app.getCurrentUser();
    if (!user) {
      renderLocked(host, 'login');
      return;
    }
    if (!app.isStudentToolUser(user)) {
      renderLocked(host, 'profile');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const section = SECTION_META[params.get('sezione')] ? params.get('sezione') : 'borse-di-studio';
    if (section === 'dati-percorso') renderJourney(host, user);
    else if (section === 'borse-di-studio') renderScholarships(host, user, params);
    else if (section === 'scadenze') renderDeadlines(host, user);
    else if (section === 'community') renderCommunity(host, user);
    else if (section === 'libri-usati') renderBooks(host, user);
    else renderAccompaniment(host, user);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  document.addEventListener('universitysite:userchange', render);
})();

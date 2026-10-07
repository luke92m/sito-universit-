(() => {
  'use strict';

  const universities = Array.isArray(window.UNIVERSITIES) ? window.UNIVERSITIES.slice() : [];
  const universityData = window.UniversityData;
  const courseCatalog = window.CourseCatalog;
  const officialRankings = window.OfficialRankings;
  const cityIndicators = window.CITY_INDICATORS;
  const studentServices = window.STUDENT_SERVICE_DATA || {};
  const censis = window.CENSIS_RANKINGS || {};
  if (!universities.length || !universityData || !courseCatalog || !officialRankings || !cityIndicators) return;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const byId = new Map(universities.map((university) => [university.id, university]));
  const state = { mode: 'universities' };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function formatNumber(value) {
    if (value == null || Number.isNaN(Number(value))) return 'n.d.';
    return new Intl.NumberFormat('it-IT').format(Number(value));
  }

  function formatEuro(value) {
    if (value == null || Number.isNaN(Number(value))) return 'n.d.';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(Number(value));
  }

  function formatPercent(value, digits = 1) {
    if (value == null || Number.isNaN(Number(value))) return 'n.d.';
    return `${Number(value).toFixed(digits).replace('.', ',')}%`;
  }

  function universityOption(university) {
    return `<option value="${escapeHtml(university.id)}">${escapeHtml(university.name)} — ${escapeHtml(university.city)}</option>`;
  }

  function sortedUniversities(withCoursesOnly = false) {
    return universities
      .filter((university) => !withCoursesOnly || universityData.getCourses(university.id).length > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
  }

  function fillUniversitySelect(select, withCoursesOnly = false) {
    if (!select) return;
    select.innerHTML = sortedUniversities(withCoursesOnly).map(universityOption).join('');
  }

  function findUniversityId(shortName, fallbackIndex = 0, withCoursesOnly = false) {
    const list = sortedUniversities(withCoursesOnly);
    return list.find((university) => university.shortName === shortName)?.id || list[fallbackIndex]?.id || '';
  }

  function courseOption(course) {
    const levelLabels = {
      triennale: 'laurea', magistrale: 'magistrale', 'ciclo-unico': 'ciclo unico', altro: 'corso'
    };
    const suffix = [course.classCode, levelLabels[course.level]].filter(Boolean).join(' · ');
    return `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}${suffix ? ` — ${escapeHtml(suffix)}` : ''}</option>`;
  }

  function fillCourseSelect(universitySelect, courseSelect, preferredProfileSlug = null) {
    const universityId = universitySelect.value;
    const courses = universityData.getCourses(universityId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));

    if (!courses.length) {
      courseSelect.innerHTML = '<option value="">Nessun corso di laurea nel dataset collegato</option>';
      courseSelect.disabled = true;
      return;
    }

    courseSelect.disabled = false;
    courseSelect.innerHTML = courses.map(courseOption).join('');
    if (preferredProfileSlug) {
      const preferred = courses.find((course) => courseCatalog.matchCourse(course)?.slug === preferredProfileSlug);
      if (preferred) courseSelect.value = preferred.id;
    }
  }

  function dataTag(label, tone = '') {
    return `<span class="comparison-source-tag${tone ? ` is-${tone}` : ''}">${escapeHtml(label)}</span>`;
  }

  function valueBlock(value, note = '', tag = '') {
    return `
      <div class="comparison-value">
        <strong>${escapeHtml(value)}</strong>
        ${note ? `<small>${escapeHtml(note)}</small>` : ''}
        ${tag ? dataTag(tag, tag === 'Da integrare' ? 'pending' : '') : ''}
      </div>
    `;
  }

  function htmlValueBlock(value, note = '', tag = '') {
    return `
      <div class="comparison-value">
        <strong>${value}</strong>
        ${note ? `<small>${note}</small>` : ''}
        ${tag ? dataTag(tag, tag === 'Da integrare' ? 'pending' : '') : ''}
      </div>
    `;
  }

  function renderComparison(title, description, leftTitle, rightTitle, rows, scenarioLabel = '') {
    const host = $('#comparisonResults');
    if (!host) return;

    host.innerHTML = `
      <div class="comparison-result-heading">
        <div>
          ${scenarioLabel ? `<span class="scenario-label">${escapeHtml(scenarioLabel)}</span>` : ''}
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description)}</p>
        </div>
        <button class="comparison-print-button" type="button" id="printComparison">Stampa / salva PDF</button>
      </div>
      <div class="comparison-table" role="table" aria-label="${escapeHtml(title)}">
        <div class="comparison-row comparison-table-head" role="row">
          <div role="columnheader">Criterio</div>
          <div role="columnheader"><span>A</span>${escapeHtml(leftTitle)}</div>
          <div role="columnheader"><span>B</span>${escapeHtml(rightTitle)}</div>
        </div>
        ${rows.map((row) => `
          <div class="comparison-row" role="row">
            <div class="comparison-criterion" role="rowheader">
              <strong>${escapeHtml(row.label)}</strong>
              ${row.hint ? `<small>${escapeHtml(row.hint)}</small>` : ''}
            </div>
            <div role="cell">${row.left}</div>
            <div role="cell">${row.right}</div>
          </div>
        `).join('')}
      </div>
    `;

    $('#printComparison')?.addEventListener('click', () => window.print());
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function officialSite(university) {
    return studentServices.officialDomains?.[university.id] || '#';
  }

  function rankingValue(university) {
    const ranking = officialRankings.general(university);
    const source = ranking.sourceFamily || 'Ufficiale';
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(ranking.url || officialSite(university))}" target="_blank" rel="noreferrer">${escapeHtml(ranking.summary || ranking.label)}</a>`,
      escapeHtml(ranking.note || 'Ranking ufficiale disponibile'),
      source
    );
  }

  function reputationValue(university) {
    const ranking = officialRankings.general(university);
    let label = 'Posizionamento ufficiale non disponibile';
    if (ranking.source === 'qs-general') {
      label = ranking.score >= 90 ? 'Prestigio internazionale molto elevato' : ranking.score >= 80 ? 'Prestigio internazionale elevato' : 'Presenza nel ranking internazionale QS';
    } else if (ranking.source === 'censis-general') {
      label = ranking.score >= 48 ? 'Posizionamento nazionale molto forte nella propria categoria' : 'Posizionamento nazionale CENSIS nella propria categoria';
    }
    return valueBlock(label, ranking.summary || ranking.note, ranking.sourceFamily || 'Ufficiale');
  }

  function supportValue(university) {
    const metrics = universityData.getMetrics(university.id);
    const students = Number(metrics.students || 0);
    const exemptions = Number(metrics.fullExemptions || 0) + Number(metrics.partialExemptions || 0);
    const scholarships = Number(metrics.scholarshipsUniversityMur || 0);
    const censisRecord = censis.general?.[university.id];
    if (students > 0) {
      const rate = exemptions / students * 100;
      const note = `${formatNumber(exemptions)} esoneri totali/parziali su ${formatNumber(students)} iscritti` +
        (censisRecord?.scholarships != null ? ` · indicatore CENSIS borse ${censisRecord.scholarships}/110` : '');
      return htmlValueBlock(
        `${formatNumber(scholarships)} borse di ateneo · ${formatPercent(rate)} esoneri`,
        `${escapeHtml(note)}. Non equivale alla probabilità individuale di ottenere il beneficio.`,
        'MUR 2025 + CENSIS'
      );
    }
    if (censisRecord?.scholarships != null) {
      return valueBlock(`Indicatore borse CENSIS ${censisRecord.scholarships}/110`, 'Dato comparativo della categoria CENSIS; consulta il bando ufficiale per requisiti e importi.', 'CENSIS 2026/27');
    }
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(officialSite(university))}" target="_blank" rel="noreferrer">Consulta borse e agevolazioni ufficiali</a>`,
      'Il dataset aggregato non consente un tasso omogeneo per questo ateneo.',
      'Fonte ateneo'
    );
  }

  function mobilityValue(university) {
    const metrics = universityData.getMetrics(university.id);
    const out = Number(metrics.mobilityOut || 0);
    const incoming = Number(metrics.mobilityIn || 0);
    const censisRecord = censis.general?.[university.id];
    if (out || incoming) {
      const extra = censisRecord?.international != null ? ` · indicatore CENSIS internazionalizzazione ${censisRecord.international}/110` : '';
      return htmlValueBlock(
        `Uscita ${formatNumber(out)} · entrata ${formatNumber(incoming)}`,
        `Studenti in mobilità censiti dal MUR${escapeHtml(extra)}. I singoli partner vanno verificati nella pagina Erasmus dell’ateneo.`,
        'MUR 2025 + CENSIS'
      );
    }
    if (censisRecord?.international != null) {
      return valueBlock(`Internazionalizzazione ${censisRecord.international}/110`, 'Indicatore CENSIS; partner e accordi specifici sono pubblicati dall’ateneo.', 'CENSIS 2026/27');
    }
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(officialSite(university))}" target="_blank" rel="noreferrer">Apri la mobilità internazionale dell’ateneo</a>`,
      'Nessun flusso comparabile è presente nel dataset aggregato.',
      'Fonte ateneo'
    );
  }

  function campusValue(university) {
    const metrics = universityData.getMetrics(university.id);
    const canteens = Number(metrics.canteens || 0);
    const residences = Number(metrics.residencesDirect || 0) + Number(metrics.residencesPartner || 0);
    const censisRecord = censis.general?.[university.id];
    const suffix = censisRecord?.structures != null ? ` · strutture CENSIS ${censisRecord.structures}/110` : '';
    return valueBlock(
      `${canteens} mense · ${residences} residenze censite`,
      `${canteens || residences ? 'Strutture dirette o convenzionate registrate dal MUR' : 'Nessuna struttura diretta censita; possono esistere servizi regionali'}${suffix}`,
      'MUR 2025 + CENSIS'
    );
  }

  function housingValue(university) {
    const metrics = universityData.getMetrics(university.id);
    const structures = Number(metrics.residencesDirect || 0) + Number(metrics.residencesPartner || 0);
    const places = Number(metrics.residencePlacesDirect || 0) + Number(metrics.residencePlacesPartner || 0);
    const contributions = Number(metrics.housingContributions || 0) + Number(metrics.housingAssigned || 0);
    return valueBlock(
      `${formatNumber(places)} posti · ${formatNumber(contributions)} interventi`,
      `${structures} strutture dirette/convenzionate; gli alloggi degli enti regionali possono non essere inclusi.`,
      'MUR 2025'
    );
  }

  function tuitionValue(university) {
    const metrics = universityData.getMetrics(university.id);
    if (metrics.tuitionAllStudents != null) {
      return valueBlock(
        `${formatEuro(metrics.tuitionAllStudents)} / anno`,
        metrics.tuitionPayers != null ? `media su tutti gli iscritti; media dei soli paganti ${formatEuro(metrics.tuitionPayers)}` : 'media effettiva su tutti gli iscritti',
        'MUR 2025'
      );
    }
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(officialSite(university))}" target="_blank" rel="noreferrer">Apri il tariffario ufficiale</a>`,
      'Contribuzione non disponibile nel file aggregato MUR collegato.',
      'Fonte ateneo'
    );
  }

  function cityContext(university, city = '') {
    const effectiveCity = city || university.city;
    return {
      city: effectiveCity,
      province: university.province || effectiveCity,
      estimate: cityIndicators.studentMonthlyEstimate(effectiveCity, university.macroArea),
      youth: cityIndicators.youth(university.province || effectiveCity, effectiveCity)
    };
  }

  function costOfLivingValue(university, city = '') {
    const context = cityContext(university, city);
    const estimate = context.estimate;
    return valueBlock(
      `circa ${formatEuro(estimate.monthly)} / mese`,
      `stima comparativa: camera ${formatEuro(estimate.rent)} + spese non abitative ${formatEuro(estimate.nonHousing)}; base ISTAT ${formatEuro(estimate.householdSpending)} mensili per famiglia nella ripartizione ${university.macroArea}`,
      'ISTAT 2024 + Immobiliare.it 2026'
    );
  }

  function roomRentValue(university, city = '') {
    const context = cityContext(university, city);
    const estimate = context.estimate;
    return valueBlock(
      `${formatEuro(estimate.rent)} / mese`,
      estimate.rentExact ? `prezzo medio richiesto per una stanza singola a ${context.city}` : `valore territoriale prudenziale: ${context.city} non è tra le città pubblicate nello studio`,
      'Immobiliare.it Insights 2026'
    );
  }

  function youthValue(university, city = '') {
    const context = cityContext(university, city);
    if (!context.youth) {
      return valueBlock('Provincia non presente nella selezione locale', 'Consulta la classifica completa delle 107 province.', 'Sole 24 Ore 2025');
    }
    return valueBlock(
      `#${context.youth.rank} su ${context.youth.total}`,
      `indice “Qualità della vita dei giovani” ${context.youth.score.toFixed(2).replace('.', ',')} punti per la provincia di ${context.youth.province}`,
      'Sole 24 Ore 2025'
    );
  }

  function studentLifeValue(university, city = '') {
    const context = cityContext(university, city);
    const metrics = universityData.getMetrics(university.id);
    const students = Number(metrics.students || 0);
    const mobility = Number(metrics.mobilityOut || 0) + Number(metrics.mobilityIn || 0);
    let label = students >= 40000 ? 'Ecosistema universitario molto ampio' : students >= 18000 ? 'Ecosistema universitario ampio' : students >= 6000 ? 'Comunità universitaria di dimensione media' : 'Comunità universitaria più raccolta';
    if (context.youth?.rank <= 25) label += ' in un contesto giovanile favorevole';
    else if (context.youth?.rank >= 80) label += ' in un contesto giovanile più debole nell’indice territoriale';
    return valueBlock(
      label,
      `${formatNumber(students)} iscritti censiti · ${formatNumber(mobility)} movimenti internazionali · provincia ${context.youth ? `#${context.youth.rank}/107 per i giovani` : 'da verificare'}`,
      'Sintesi MUR + Sole 24 Ore'
    );
  }

  function workConnectionValue(university) {
    const record = censis.general?.[university.id];
    if (record?.employability != null) {
      return valueBlock(
        `Occupabilità CENSIS ${record.employability}/110`,
        `indicatore ufficiale della categoria “${record.group}”; misura l’ateneo, non il singolo corso né la sola città`,
        'CENSIS 2026/27'
      );
    }
    const ranking = officialRankings.general(university);
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(officialSite(university))}" target="_blank" rel="noreferrer">Apri career service e rapporti con le imprese</a>`,
      `Il CENSIS non pubblica un indicatore separato di occupabilità per questa tipologia; contesto disponibile: ${escapeHtml(ranking.summary || 'ranking non disponibile')}.`,
      'Fonte ateneo'
    );
  }

  function universityRows(left, right) {
    return [
      { label: 'Ranking generale', hint: 'QS quando presente; altrimenti CENSIS nella categoria omogenea', left: rankingValue(left), right: rankingValue(right) },
      { label: 'Reputazione', hint: 'Lettura del ranking ufficiale disponibile', left: reputationValue(left), right: reputationValue(right) },
      { label: 'Borse e agevolazioni', hint: 'Borse, esoneri e indicatore CENSIS', left: supportValue(left), right: supportValue(right) },
      { label: 'Erasmus e periodi all’estero', hint: 'Flussi MUR e internazionalizzazione CENSIS', left: mobilityValue(left), right: mobilityValue(right) },
      { label: 'Campus e servizi', hint: 'Mense, residenze e strutture', left: campusValue(left), right: campusValue(right) },
      { label: 'Studentati', hint: 'Posti e interventi abitativi censiti', left: housingValue(left), right: housingValue(right) },
      { label: 'Rata universitaria annuale', hint: 'Contribuzione media effettiva', left: tuitionValue(left), right: tuitionValue(right) },
      { label: 'Costo della vita', hint: 'Stima comparativa da fonti nazionali e immobiliari', left: costOfLivingValue(left), right: costOfLivingValue(right) },
      { label: 'Camera singola in affitto', hint: 'Prezzo medio mensile richiesto', left: roomRentValue(left), right: roomRentValue(right) },
      { label: 'Qualità della vita dei giovani', hint: 'Indice provinciale su 12 parametri', left: youthValue(left), right: youthValue(right) },
      { label: 'Vita studentesca fuori dall’ateneo', hint: 'Sintesi su dimensione, mobilità e contesto giovanile', left: studentLifeValue(left), right: studentLifeValue(right) },
      { label: 'Connessione con il lavoro', hint: 'Indicatore CENSIS di occupabilità o career service ufficiale', left: workConnectionValue(left), right: workConnectionValue(right) }
    ];
  }

  function handleUniversityComparison(event) {
    event.preventDefault();
    const left = byId.get($('#universityA').value);
    const right = byId.get($('#universityB').value);
    if (!left || !right) return;
    if (left.id === right.id) {
      window.UniversitySite?.showToast?.('Scegli due università diverse.');
      return;
    }
    renderComparison(
      'Confronto tra università',
      'Il confronto usa ranking ufficiali e indicatori MUR, CENSIS, ISTAT, Immobiliare.it Insights e Sole 24 Ore, dichiarando sempre la fonte e i limiti.',
      left.name,
      right.name,
      universityRows(left, right),
      `${left.city} · ${right.city}`
    );
  }

  function admissionValue(course) {
    const access = normalize(course.access);
    if (access.includes('libero')) return valueBlock('Accesso libero', 'verificare comunque requisiti e scadenze del bando', 'MUR offerta');
    if (access.includes('nazionale')) return valueBlock('Programmazione nazionale', 'ammissione selettiva secondo regole nazionali', 'MUR offerta');
    if (access.includes('locale')) return valueBlock('Programmazione locale', 'posti e selezione definiti dall’ateneo', 'MUR offerta');
    return valueBlock(course.access || 'Da verificare', 'modalità di accesso del corso', 'MUR offerta');
  }

  function courseOfficialLink(course, university) {
    const params = new URLSearchParams({
      universityId: university.id,
      course: course.name,
      classCode: course.classCode || ''
    });
    return `api/course-link?${params.toString()}`;
  }

  function inferCourseLanguage(course) {
    const name = normalize(course?.name);
    const englishSignals = ['business', 'management', 'economics', 'finance', 'engineering', 'science', 'artificial intelligence', 'data', 'international', 'marketing', 'medicine', 'design', 'computer'];
    const italianSignals = ['scienze', 'ingegneria', 'economia', 'giurisprudenza', 'laurea', 'comunicazione', 'aziendale', 'medicina e chirurgia'];
    const english = englishSignals.some((signal) => name.includes(signal));
    const italian = italianSignals.some((signal) => name.includes(signal));
    if (english && !italian) return 'Probabilmente inglese';
    if (italian && !english) return 'Probabilmente italiano';
    return 'Lingua da confermare';
  }

  function languageValue(course, university) {
    const inferred = inferCourseLanguage(course);
    return htmlValueBlock(
      `${escapeHtml(inferred)} · <a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">verifica sul corso ufficiale</a>`,
      'La denominazione del corso è un indizio; fa fede la pagina ufficiale dell’offerta formativa.',
      'Fonte ateneo'
    );
  }

  function employmentValue(course, university) {
    const record = censis.general?.[university.id];
    if (record?.employability != null) {
      return htmlValueBlock(
        `Occupabilità ateneo ${escapeHtml(record.employability)}/110`,
        `Indicatore CENSIS della categoria “${escapeHtml(record.group)}”. È un proxy ufficiale dell’ateneo, non la percentuale occupata a 12 mesi del singolo corso.`,
        'CENSIS 2026/27'
      );
    }
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">Apri la scheda ufficiale del corso</a>`,
      'Per questo corso il prototipo non dispone di una percentuale omogenea a 12 mesi; verifica i dati AlmaLaurea o il rapporto occupazionale pubblicato dall’ateneo.',
      'Fonte ateneo / AlmaLaurea'
    );
  }

  function specialisationValue(course, university) {
    if (course.level === 'magistrale' || course.level === 'ciclo-unico') {
      return htmlValueBlock(
        `Percorso già ${course.level === 'ciclo-unico' ? 'a ciclo unico' : 'magistrale'}`,
        `Per dottorati, scuole di specializzazione o master consulta la <a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">pagina ufficiale</a>.`,
        'MUR offerta'
      );
    }
    const ranking = officialRankings.forCourse(university, course);
    if (ranking.source === 'censis-teaching') {
      return htmlValueBlock(
        `${escapeHtml(ranking.summary)}`,
        'La graduatoria CENSIS della didattica incorpora la progressione di carriera e i rapporti internazionali; non equivale alla quota di laureati che prosegue entro un anno.',
        'CENSIS 2026/27'
      );
    }
    const profile = courseCatalog.matchCourse(course);
    return htmlValueBlock(
      `${profile ? `Prosecuzione tipica: lauree magistrali dell’area ${escapeHtml(profile.group)}` : 'Prosecuzione da verificare nel piano formativo'}`,
      `Consulta gli sbocchi e i percorsi successivi nella <a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">scheda ufficiale del corso</a>.`,
      'Profilo MUR + ateneo'
    );
  }

  function subjectRankingValue(course, university) {
    const subject = officialRankings.forCourse(university, course);
    const general = officialRankings.general(university);
    const subjectLink = subject.url || officialSite(university);
    const generalCopy = general.source === 'unavailable' ? 'prestigio generale non classificato' : `${general.label}: ${general.summary}`;
    return htmlValueBlock(
      `<a class="comparison-data-link" href="${escapeHtml(subjectLink)}" target="_blank" rel="noreferrer">${escapeHtml(subject.summary || subject.label)}</a>`,
      `${escapeHtml(subject.note || '')}<br><strong>Contesto dell’ateneo:</strong> ${escapeHtml(generalCopy)}.`,
      subject.sourceFamily || 'Ufficiale'
    );
  }

  function interestValue(course) {
    const preferences = courseCatalog.getSavedPreferences();
    if (!preferences?.vector) return null;
    const score = courseCatalog.scoreActualCourse(course, preferences);
    const profile = courseCatalog.matchCourse(course);
    return valueBlock(`${score}%`, `compatibilità con il profilo salvato “${profile?.name || course.name}”`, 'Preferenze');
  }

  function subjectsDifference(profile, otherProfile, course, university) {
    if (!profile || !otherProfile) {
      return htmlValueBlock(
        `<a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">Apri il piano di studi ufficiale</a>`,
        'Il profilo editoriale non è sufficiente per estrarre differenze affidabili tra gli esami.',
        'Fonte ateneo'
      );
    }
    const other = new Set(otherProfile.subjects.map((subject) => normalize(subject)));
    const unique = profile.subjects.filter((subject) => !other.has(normalize(subject))).slice(0, 5);
    if (!unique.length) {
      return htmlValueBlock(
        `<a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">Confronta il piano di studi ufficiale</a>`,
        'I profili generali non mostrano differenze nette; fanno fede gli insegnamenti pubblicati dall’ateneo.',
        'Fonte ateneo'
      );
    }
    return htmlValueBlock(
      unique.map((subject) => `<span class="comparison-subject-chip">${escapeHtml(subject)}</span>`).join(''),
      `Materie distintive del profilo generale. <a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">Verifica gli esami ufficiali</a>.`,
      'Profilo + fonte ateneo'
    );
  }
  function objectiveValue(profile, course, university) {
    const objective = profile?.objective || `Approfondire le competenze dell’area ${course.group || 'disciplinare'} indicate dal piano di studi.`;
    return htmlValueBlock(
      `${escapeHtml(objective)}`,
      `Sintesi orientativa dal profilo del corso. <a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">Leggi gli obiettivi ufficiali dell’ateneo</a>.`,
      'Profilo corso + fonte ateneo'
    );
  }

  const FOCUS_PATTERNS = [
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

  function courseFocuses(course) {
    const haystack = normalize(`${course.name} ${course.className || ''}`);
    return FOCUS_PATTERNS.filter(([needle]) => haystack.includes(needle)).map(([, label]) => label);
  }

  function whyChoose(course, university, otherCourse, otherUniversity) {
    const profile = courseCatalog.matchCourse(course);
    const otherProfile = courseCatalog.matchCourse(otherCourse);
    const objective = profile?.objective || `sviluppare competenze nell’area ${course.group}`;
    const focuses = courseFocuses(course);
    const otherFocuses = new Set(courseFocuses(otherCourse));
    const uniqueFocus = focuses.filter((item) => !otherFocuses.has(item));
    const otherUnique = Array.from(otherFocuses).filter((item) => !focuses.includes(item));

    let contrast;
    if (profile?.slug && profile.slug === otherProfile?.slug) {
      if (uniqueFocus.length || otherUnique.length) {
        contrast = `Rispetto a “${otherCourse.name}”, questa denominazione mette maggiormente l’accento su ${uniqueFocus[0] || 'il proprio taglio applicativo'}, mentre l’alternativa evidenzia ${otherUnique[0] || 'un’impostazione più generale'}.`;
      } else {
        contrast = `I due corsi condividono un obiettivo generale molto simile. La differenza reale dipende soprattutto dagli insegnamenti obbligatori, dai laboratori e dagli sbocchi dichiarati nei rispettivi piani di studio.`;
      }
    } else {
      contrast = `Si distingue da “${otherCourse.name}” perché concentra la formazione su ${uniqueFocus[0] || profile?.group || course.group}, mentre l’altro percorso mira soprattutto a ${otherProfile?.objective || otherUnique[0] || otherCourse.group}.`;
    }

    return htmlValueBlock(
      `<p class="comparison-objective-copy"><strong>Obiettivo:</strong> ${escapeHtml(objective)}</p><p>${escapeHtml(contrast)}</p><a class="comparison-data-link" href="${escapeHtml(courseOfficialLink(course, university))}" target="_blank" rel="noreferrer">Verifica obiettivi e piano di studi ufficiali</a>`,
      `Sintesi costruita sul profilo generale e sulla denominazione del corso di ${escapeHtml(university.shortName)}; non riassume ranking, costi o ammissione.`,
      'Confronto obiettivi'
    );
  }

  function courseIdentity(course, university) {
    return `${course.name} — ${university.shortName}`;
  }

  function commonCourseRows(leftCourse, leftUniversity, rightCourse, rightUniversity, includeInterest = true) {
    const rows = [];
    if (includeInterest) {
      const leftInterest = interestValue(leftCourse);
      const rightInterest = interestValue(rightCourse);
      if (leftInterest && rightInterest) {
        rows.push({ label: 'Interesse personale', hint: 'Da “Trova il mio corso”', left: leftInterest, right: rightInterest });
      }
    }
    rows.push(
      { label: 'Lingua', hint: 'Lingua principale di erogazione', left: languageValue(leftCourse, leftUniversity), right: languageValue(rightCourse, rightUniversity) },
      { label: 'Occupabilità ed esiti professionali', hint: 'Indicatore ufficiale disponibile; non sempre percentuale del singolo corso a 12 mesi', left: employmentValue(leftCourse, leftUniversity), right: employmentValue(rightCourse, rightUniversity) },
      { label: 'Progressione e prosecuzione degli studi', hint: 'CENSIS della didattica o percorsi ufficiali successivi', left: specialisationValue(leftCourse, leftUniversity), right: specialisationValue(rightCourse, rightUniversity) }
    );
    return rows;
  }

  function sameCourseDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity) {
    return [
      { label: 'Ranking ufficiale del corso', hint: 'QS per materia; fallback CENSIS didattica o generale', left: subjectRankingValue(leftCourse, leftUniversity), right: subjectRankingValue(rightCourse, rightUniversity) },
      { label: 'Reputazione dell’università', hint: 'QS generale; fallback CENSIS nella categoria omogenea', left: reputationValue(leftUniversity), right: reputationValue(rightUniversity) },
      { label: 'Facilità di ammissione', hint: 'Tipo di accesso dichiarato', left: admissionValue(leftCourse), right: admissionValue(rightCourse) },
      ...commonCourseRows(leftCourse, leftUniversity, rightCourse, rightUniversity, false),
      { label: 'Rata annuale', hint: 'Contribuzione media dell’ateneo', left: tuitionValue(leftUniversity), right: tuitionValue(rightUniversity) },
      { label: 'Perché scegliere questa sede', hint: 'Obiettivo del corso e differenze formative', left: whyChoose(leftCourse, leftUniversity, rightCourse, rightUniversity), right: whyChoose(rightCourse, rightUniversity, leftCourse, leftUniversity) }
    ];
  }

  function differentCoursesSameUniversityRows(leftCourse, university, rightCourse) {
    const leftProfile = courseCatalog.matchCourse(leftCourse);
    const rightProfile = courseCatalog.matchCourse(rightCourse);
    const rows = commonCourseRows(leftCourse, university, rightCourse, university, true);
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

  function differentCoursesDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity) {
    const leftProfile = courseCatalog.matchCourse(leftCourse);
    const rightProfile = courseCatalog.matchCourse(rightCourse);
    const rows = [];
    const leftInterest = interestValue(leftCourse);
    const rightInterest = interestValue(rightCourse);
    if (leftInterest && rightInterest) rows.push({ label: 'Interesse personale', hint: 'Da “Trova il mio corso”', left: leftInterest, right: rightInterest });
    rows.push(
      { label: 'Ranking del corso e dell’ateneo', hint: 'Materia QS o CENSIS, con contesto generale dell’ateneo', left: subjectRankingValue(leftCourse, leftUniversity), right: subjectRankingValue(rightCourse, rightUniversity) },
      { label: 'Occupabilità ed esiti professionali', hint: 'Indicatore ufficiale disponibile; non sempre percentuale del singolo corso a 12 mesi', left: employmentValue(leftCourse, leftUniversity), right: employmentValue(rightCourse, rightUniversity) },
      { label: 'Progressione e prosecuzione degli studi', hint: 'CENSIS della didattica o percorsi ufficiali successivi', left: specialisationValue(leftCourse, leftUniversity), right: specialisationValue(rightCourse, rightUniversity) },
      { label: 'Lingua', hint: 'Lingua principale di erogazione', left: languageValue(leftCourse, leftUniversity), right: languageValue(rightCourse, rightUniversity) }
    );
    if (leftCourse.group === rightCourse.group) {
      rows.push({ label: 'Principali materie distintive', hint: `Entrambi nell’area ${leftCourse.group}`, left: subjectsDifference(leftProfile, rightProfile, leftCourse, leftUniversity), right: subjectsDifference(rightProfile, leftProfile, rightCourse, rightUniversity) });
    }
    rows.push(
      { label: 'Obiettivo formativo', hint: 'Direzione generale del percorso', left: objectiveValue(leftProfile, leftCourse, leftUniversity), right: objectiveValue(rightProfile, rightCourse, rightUniversity) },
      { label: 'Perché scegliere questa alternativa', hint: 'Obiettivo del corso e differenze formative', left: whyChoose(leftCourse, leftUniversity, rightCourse, rightUniversity), right: whyChoose(rightCourse, rightUniversity, leftCourse, leftUniversity) },
      { label: 'Rata annuale', hint: 'Contribuzione media dell’ateneo', left: tuitionValue(leftUniversity), right: tuitionValue(rightUniversity) },
      { label: 'Costo della vita', hint: 'Stima comparativa della città del corso', left: costOfLivingValue(leftUniversity, leftCourse.city), right: costOfLivingValue(rightUniversity, rightCourse.city) },
      { label: 'Camera singola in affitto', hint: 'Prezzo medio mensile richiesto', left: roomRentValue(leftUniversity, leftCourse.city), right: roomRentValue(rightUniversity, rightCourse.city) },
      { label: 'Vita fuori dall’università', hint: 'Sintesi da dimensione universitaria e contesto giovanile', left: studentLifeValue(leftUniversity, leftCourse.city), right: studentLifeValue(rightUniversity, rightCourse.city) },
      { label: 'Qualità della vita dei giovani', hint: 'Indice provinciale su 12 parametri', left: youthValue(leftUniversity, leftCourse.city), right: youthValue(rightUniversity, rightCourse.city) }
    );
    return rows;
  }

  function handleCourseComparison(event) {
    event.preventDefault();
    const leftUniversity = byId.get($('#courseUniversityA').value);
    const rightUniversity = byId.get($('#courseUniversityB').value);
    const leftCourse = universityData.getCourse(leftUniversity?.id, $('#courseA').value);
    const rightCourse = universityData.getCourse(rightUniversity?.id, $('#courseB').value);
    if (!leftUniversity || !rightUniversity || !leftCourse || !rightCourse) return;

    const leftProfile = courseCatalog.matchCourse(leftCourse);
    const rightProfile = courseCatalog.matchCourse(rightCourse);
    const sameUniversity = leftUniversity.id === rightUniversity.id;
    const sameGeneralCourse = leftProfile?.slug === rightProfile?.slug;

    if (sameUniversity && leftCourse.id === rightCourse.id) {
      window.UniversitySite?.showToast?.('Scegli due corsi diversi.');
      return;
    }

    let rows;
    let scenario;
    let description;
    if (sameUniversity) {
      scenario = 'Stessa università · corsi diversi';
      description = `Due percorsi diversi all’interno di ${leftUniversity.name}.`;
      rows = differentCoursesSameUniversityRows(leftCourse, leftUniversity, rightCourse);
    } else if (sameGeneralCourse) {
      scenario = 'Stesso corso · università diverse';
      description = `Il prototipo ha ricondotto entrambi i corsi al profilo generale “${leftProfile.name}”.`;
      rows = sameCourseDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity);
    } else {
      scenario = 'Corsi diversi · università diverse';
      description = 'Il confronto combina caratteristiche del corso, dell’ateneo e della città.';
      rows = differentCoursesDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity);
    }

    renderComparison(
      'Confronto tra corsi',
      description,
      courseIdentity(leftCourse, leftUniversity),
      courseIdentity(rightCourse, rightUniversity),
      rows,
      scenario
    );
  }

  function setMode(mode) {
    state.mode = mode === 'courses' ? 'courses' : 'universities';
    const courses = state.mode === 'courses';
    $('#universityComparisonForm').hidden = courses;
    $('#courseComparisonForm').hidden = !courses;
    $$('.comparison-mode-button').forEach((button) => {
      const active = button.dataset.comparisonMode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $('#comparisonResults').innerHTML = '';
    const url = new URL(window.location.href);
    url.searchParams.set('mode', state.mode);
    window.history.replaceState({}, '', url);
  }

  function renderPreferenceStatus() {
    const host = $('#comparisonPreferenceStatus');
    if (!host) return;
    const preferences = courseCatalog.getSavedPreferences();
    const top = preferences?.recommendations?.[0];
    if (!top) {
      host.innerHTML = `
        <div>
          <span class="preference-status-icon">?</span>
          <p><strong>Nessuna preferenza salvata.</strong> Nel confronto tra corsi il parametro “interesse personale” verrà ignorato.</p>
        </div>
        <a href="trova-corso.html">Fai il questionario</a>
      `;
      return;
    }
    host.innerHTML = `
      <div>
        <span class="preference-status-icon">✓</span>
        <p><strong>Preferenze attive:</strong> ${escapeHtml(top.name)} (${escapeHtml(top.score)}%). Saranno usate nei confronti tra corsi.</p>
      </div>
      <button type="button" id="forgetComparisonPreferences">Dimentica</button>
    `;
    $('#forgetComparisonPreferences')?.addEventListener('click', () => {
      courseCatalog.forgetPreferences();
      renderPreferenceStatus();
      $('#comparisonResults').innerHTML = '';
      window.UniversitySite?.showToast?.('Preferenze rimosse dal browser.');
    });
  }

  function initCourseSelectors() {
    const universityA = $('#courseUniversityA');
    const universityB = $('#courseUniversityB');
    const courseA = $('#courseA');
    const courseB = $('#courseB');
    fillUniversitySelect(universityA, true);
    fillUniversitySelect(universityB, true);
    universityA.value = findUniversityId('Bologna', 0, true);
    universityB.value = findUniversityId('Padova', 1, true);
    window.UniversitySite?.enhanceUniversitySelect?.(universityA);
    window.UniversitySite?.enhanceUniversitySelect?.(universityB);
    fillCourseSelect(universityA, courseA, 'economia-aziendale');
    fillCourseSelect(universityB, courseB, 'economia-aziendale');

    const updateRememberedProfile = (universitySelect, courseSelect) => {
      const course = universityData.getCourse(universitySelect.value, courseSelect.value);
      courseSelect.dataset.profileSlug = courseCatalog.matchCourse(course)?.slug || '';
    };

    updateRememberedProfile(universityA, courseA);
    updateRememberedProfile(universityB, courseB);

    courseA.addEventListener('change', () => updateRememberedProfile(universityA, courseA));
    courseB.addEventListener('change', () => updateRememberedProfile(universityB, courseB));

    universityA.addEventListener('change', () => {
      fillCourseSelect(universityA, courseA, courseA.dataset.profileSlug || null);
      updateRememberedProfile(universityA, courseA);
    });
    universityB.addEventListener('change', () => {
      fillCourseSelect(universityB, courseB, courseB.dataset.profileSlug || null);
      updateRememberedProfile(universityB, courseB);
    });
  }

  function init() {
    const universityA = $('#universityA');
    const universityB = $('#universityB');
    if (!universityA || !universityB) return;

    fillUniversitySelect(universityA);
    fillUniversitySelect(universityB);
    universityA.value = findUniversityId('Bologna', 0);
    universityB.value = findUniversityId('Padova', 1);
    window.UniversitySite?.enhanceUniversitySelect?.(universityA);
    window.UniversitySite?.enhanceUniversitySelect?.(universityB);
    initCourseSelectors();

    $$('.comparison-mode-button').forEach((button) => {
      button.addEventListener('click', () => setMode(button.dataset.comparisonMode));
    });
    $('#universityComparisonForm').addEventListener('submit', handleUniversityComparison);
    $('#courseComparisonForm').addEventListener('submit', handleCourseComparison);
    renderPreferenceStatus();

    const mode = new URLSearchParams(window.location.search).get('mode');
    setMode(mode === 'courses' ? 'courses' : 'universities');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

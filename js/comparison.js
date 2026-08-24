(() => {
  'use strict';

  const universities = Array.isArray(window.UNIVERSITIES) ? window.UNIVERSITIES.slice() : [];
  const universityData = window.UniversityData;
  const courseCatalog = window.CourseCatalog;
  if (!universities.length || !universityData || !courseCatalog) return;

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

  function unknownValue(note) {
    return valueBlock('Dato non ancora collegato', note, 'Da integrare');
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

  function rankingValue(university) {
    if (!university.qsRank) return valueBlock('Non classificato', 'QS World University Rankings 2027', 'QS 2027');
    return valueBlock(`#${university.qsRank}`, university.qsScore != null ? `punteggio ${Number(university.qsScore).toFixed(1)}` : 'ranking generale', 'QS 2027');
  }

  function reputationValue(university) {
    const rank = university.qsRankValue;
    if (rank == null) return valueBlock('Non valutabile con questo indicatore', 'assenza nel ranking generale QS collegato', 'Proxy QS');
    let label = 'Presenza internazionale';
    if (rank <= 150) label = 'Visibilità internazionale molto alta';
    else if (rank <= 350) label = 'Visibilità internazionale alta';
    else if (rank <= 700) label = 'Buona visibilità internazionale';
    return valueBlock(label, 'proxy basato sul ranking generale, non su un sondaggio proprietario', 'Proxy QS');
  }

  function supportValue(universityId) {
    const metrics = universityData.getMetrics(universityId);
    if (!metrics.students) return unknownValue('mancano iscritti o interventi comparabili nel dataset collegato');
    const exemptions = Number(metrics.fullExemptions || 0) + Number(metrics.partialExemptions || 0);
    const rate = exemptions / metrics.students * 100;
    const scholarships = Number(metrics.scholarshipsUniversityMur || 0);
    return htmlValueBlock(
      `${formatNumber(scholarships)} borse · ${formatPercent(rate)} esoneri`,
      `${formatNumber(exemptions)} esoneri totali/parziali dichiarati su ${formatNumber(metrics.students)} iscritti; non equivale a probabilità individuale`,
      'MUR 2025'
    );
  }

  function mobilityValue(universityId) {
    const metrics = universityData.getMetrics(universityId);
    const out = metrics.mobilityOut;
    const incoming = metrics.mobilityIn;
    if (out == null && incoming == null) return unknownValue('elenco partner e flussi non disponibili per questo ateneo');
    return htmlValueBlock(
      `Uscita ${formatNumber(out || 0)} · entrata ${formatNumber(incoming || 0)}`,
      'numero di studenti in mobilità; l’elenco delle università partner deve essere collegato separatamente',
      'MUR 2025'
    );
  }

  function campusValue(universityId) {
    const metrics = universityData.getMetrics(universityId);
    const canteens = Number(metrics.canteens || 0);
    const residences = Number(metrics.residencesDirect || 0) + Number(metrics.residencesPartner || 0);
    if (!canteens && !residences) {
      return valueBlock('Nessuna struttura diretta censita', 'possono esistere servizi regionali DSU o strutture non incluse', 'MUR 2025');
    }
    return valueBlock(`${canteens} mense · ${residences} residenze`, 'strutture gestite direttamente o in convenzione censite dal MUR', 'MUR 2025');
  }

  function housingValue(universityId) {
    const metrics = universityData.getMetrics(universityId);
    const structures = Number(metrics.residencesDirect || 0) + Number(metrics.residencesPartner || 0);
    const places = Number(metrics.residencePlacesDirect || 0) + Number(metrics.residencePlacesPartner || 0);
    if (!structures && !places) return valueBlock('Nessun posto censito', 'esclusi gli alloggi del diritto allo studio regionale', 'MUR 2025');
    return valueBlock(`${formatNumber(places)} posti`, `${structures} strutture dirette o convenzionate`, 'MUR 2025');
  }

  function tuitionValue(universityId) {
    const metrics = universityData.getMetrics(universityId);
    if (metrics.tuitionAllStudents == null) return unknownValue('contribuzione media non disponibile nel file collegato');
    return valueBlock(
      `${formatEuro(metrics.tuitionAllStudents)} / anno`,
      metrics.tuitionPayers != null ? `media su tutti gli iscritti; media dei soli paganti ${formatEuro(metrics.tuitionPayers)}` : 'media effettiva su tutti gli iscritti',
      'MUR 2025'
    );
  }

  function cityUnknown(university, metric) {
    return unknownValue(`${metric} per ${university.city}: collegare una fonte urbana omogenea e aggiornata`);
  }

  function universityRows(left, right) {
    return [
      { label: 'Ranking generale', hint: 'Posizione internazionale complessiva', left: rankingValue(left), right: rankingValue(right) },
      { label: 'Reputazione', hint: 'Indicatore preliminare, non una misura assoluta', left: reputationValue(left), right: reputationValue(right) },
      { label: 'Borse e agevolazioni', hint: 'Numeri dichiarati e copertura esoneri', left: supportValue(left.id), right: supportValue(right.id) },
      { label: 'Erasmus e periodi all’estero', hint: 'Flussi di mobilità; partner da integrare', left: mobilityValue(left.id), right: mobilityValue(right.id) },
      { label: 'Campus e servizi', hint: 'Mense e residenze censite', left: campusValue(left.id), right: campusValue(right.id) },
      { label: 'Studentati', hint: 'Posti direttamente gestiti o convenzionati', left: housingValue(left.id), right: housingValue(right.id) },
      { label: 'Rata universitaria annuale', hint: 'Contribuzione media effettiva', left: tuitionValue(left.id), right: tuitionValue(right.id) },
      { label: 'Costo della vita', hint: 'Città sede principale', left: cityUnknown(left, 'costo della vita'), right: cityUnknown(right, 'costo della vita') },
      { label: 'Camera singola in affitto', hint: 'Prezzo medio mensile', left: cityUnknown(left, 'affitto medio'), right: cityUnknown(right, 'affitto medio') },
      { label: 'Qualità della vita dei giovani', hint: 'Indicatore urbano', left: cityUnknown(left, 'qualità della vita giovanile'), right: cityUnknown(right, 'qualità della vita giovanile') },
      { label: 'Vita studentesca fuori dall’ateneo', hint: 'Associazioni, eventi e socialità', left: cityUnknown(left, 'vita studentesca'), right: cityUnknown(right, 'vita studentesca') },
      { label: 'Connessione con il lavoro in città', hint: 'Rapporto con imprese e territorio', left: cityUnknown(left, 'integrazione università-lavoro'), right: cityUnknown(right, 'integrazione università-lavoro') }
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
      'I dati mancanti restano visibili come promemoria per le prossime integrazioni.',
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

  function languageValue(course) {
    return unknownValue(`lingua non presente nel dataset collegato per “${course.name}”`);
  }

  function employmentValue(course) {
    return unknownValue(`collegare un dato occupazionale a 12 mesi per classe, corso e ateneo`);
  }

  function specialisationValue(course) {
    if (course.level === 'magistrale' || course.level === 'ciclo-unico') {
      return valueBlock('Parametro non prioritario', 'il corso è già magistrale o a ciclo unico; valutare eventuale post-laurea', 'Regola prototipo');
    }
    return unknownValue('collegare la quota che prosegue con laurea magistrale o altra specializzazione entro un anno');
  }

  function subjectRankingValue(course, university) {
    const stats = universityData.getGroupStats(university.id, course.group);
    if (!stats) {
      return unknownValue(`ranking europeo per ${course.group} non collegato; nessun indice interno disponibile`);
    }
    return htmlValueBlock(
      `Ranking europeo: non collegato<br><span class="comparison-inline-index">Indice interno #${escapeHtml(stats.rank)} / ${escapeHtml(stats.rankedUniversities)}</span>`,
      `indice sperimentale ${Number(stats.index).toFixed(1).replace('.', ',')}/100 per l’area ${escapeHtml(course.group)}; non è un ranking accademico ufficiale`,
      'Indice prototipo'
    );
  }

  function interestValue(course) {
    const preferences = courseCatalog.getSavedPreferences();
    if (!preferences?.vector) return null;
    const score = courseCatalog.scoreActualCourse(course, preferences);
    const profile = courseCatalog.matchCourse(course);
    return valueBlock(`${score}%`, `compatibilità con il profilo salvato “${profile?.name || course.name}”`, 'Preferenze');
  }

  function subjectsDifference(profile, otherProfile) {
    if (!profile || !otherProfile) return unknownValue('profilo didattico non disponibile');
    const other = new Set(otherProfile.subjects.map((subject) => normalize(subject)));
    const unique = profile.subjects.filter((subject) => !other.has(normalize(subject))).slice(0, 5);
    if (!unique.length) return valueBlock('Nessuna differenza netta nel profilo generale', 'confrontare i piani di studio ufficiali', 'Indicativo');
    return htmlValueBlock(
      unique.map((subject) => `<span class="comparison-subject-chip">${escapeHtml(subject)}</span>`).join(''),
      'materie indicative del profilo generale, non elenco ufficiale degli esami',
      'Indicativo'
    );
  }

  function objectiveValue(profile) {
    if (!profile) return unknownValue('obiettivo formativo non disponibile');
    return valueBlock(profile.objective, 'sintesi generale del tipo di corso, non testo ufficiale dell’ateneo', 'Profilo corso');
  }

  function whyChoose(course, university, otherCourse, otherUniversity) {
    const reasons = [];
    const interest = interestValue(course);
    const interestOther = interestValue(otherCourse);
    if (interest && interestOther) {
      const score = courseCatalog.scoreActualCourse(course);
      const otherScore = courseCatalog.scoreActualCourse(otherCourse);
      if (score > otherScore) reasons.push(`È più vicino alle preferenze salvate (${score}% contro ${otherScore}%).`);
    }

    const rank = university.qsRankValue;
    const otherRank = otherUniversity.qsRankValue;
    if (rank != null && (otherRank == null || rank < otherRank)) reasons.push('L’ateneo ha una posizione migliore nel ranking generale QS collegato.');

    const tuition = universityData.getMetrics(university.id).tuitionAllStudents;
    const otherTuition = universityData.getMetrics(otherUniversity.id).tuitionAllStudents;
    if (tuition != null && otherTuition != null && tuition < otherTuition) reasons.push(`La contribuzione media è più bassa di circa ${formatEuro(otherTuition - tuition)} l’anno.`);

    if (normalize(course.access).includes('libero') && !normalize(otherCourse.access).includes('libero')) reasons.push('Il corso risulta ad accesso libero nel dataset MUR.');

    const places = Number(universityData.getMetrics(university.id).residencePlacesDirect || 0) + Number(universityData.getMetrics(university.id).residencePlacesPartner || 0);
    const otherPlaces = Number(universityData.getMetrics(otherUniversity.id).residencePlacesDirect || 0) + Number(universityData.getMetrics(otherUniversity.id).residencePlacesPartner || 0);
    if (places > otherPlaces && places > 0) reasons.push(`Sono censiti più posti in residenze dirette o convenzionate (${formatNumber(places)}).`);

    if (!reasons.length) reasons.push('La scelta dipende soprattutto dal piano di studio, dalla città e dai servizi che devono ancora essere approfonditi.');
    return htmlValueBlock(
      `<ul class="comparison-reasons">${reasons.slice(0, 3).map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`,
      'lettura automatica dei dati disponibili, da verificare prima di decidere',
      'Sintesi prototipo'
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
      { label: 'Lingua', hint: 'Lingua principale di erogazione', left: languageValue(leftCourse), right: languageValue(rightCourse) },
      { label: 'Occupazione entro un anno', hint: 'Ex studenti che lavorano', left: employmentValue(leftCourse), right: employmentValue(rightCourse) },
      { label: 'Prosecuzione degli studi entro un anno', hint: 'Magistrale o altra specializzazione', left: specialisationValue(leftCourse), right: specialisationValue(rightCourse) }
    );
    return rows;
  }

  function sameCourseDifferentUniversitiesRows(leftCourse, leftUniversity, rightCourse, rightUniversity) {
    return [
      { label: 'Ranking europeo del corso', hint: 'Area disciplinare o macroargomento', left: subjectRankingValue(leftCourse, leftUniversity), right: subjectRankingValue(rightCourse, rightUniversity) },
      { label: 'Reputazione dell’università', hint: 'Proxy dal QS generale', left: reputationValue(leftUniversity), right: reputationValue(rightUniversity) },
      { label: 'Facilità di ammissione', hint: 'Tipo di accesso dichiarato', left: admissionValue(leftCourse), right: admissionValue(rightCourse) },
      ...commonCourseRows(leftCourse, leftUniversity, rightCourse, rightUniversity, false),
      { label: 'Rata annuale', hint: 'Contribuzione media dell’ateneo', left: tuitionValue(leftUniversity.id), right: tuitionValue(rightUniversity.id) },
      { label: 'Perché scegliere questa sede', hint: 'Sintesi dei dati oggi disponibili', left: whyChoose(leftCourse, leftUniversity, rightCourse, rightUniversity), right: whyChoose(rightCourse, rightUniversity, leftCourse, leftUniversity) }
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
        left: subjectsDifference(leftProfile, rightProfile),
        right: subjectsDifference(rightProfile, leftProfile)
      });
    }
    rows.push({
      label: 'Obiettivo formativo',
      hint: 'Che cosa prova a costruire il percorso',
      left: objectiveValue(leftProfile),
      right: objectiveValue(rightProfile)
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
      { label: 'Ranking del corso e dell’ateneo', hint: 'Materia da integrare; QS generale già collegato', left: subjectRankingValue(leftCourse, leftUniversity), right: subjectRankingValue(rightCourse, rightUniversity) },
      { label: 'Occupazione entro un anno', hint: 'Ex studenti che lavorano', left: employmentValue(leftCourse), right: employmentValue(rightCourse) },
      { label: 'Prosecuzione degli studi entro un anno', hint: 'Magistrale o altra specializzazione', left: specialisationValue(leftCourse), right: specialisationValue(rightCourse) },
      { label: 'Lingua', hint: 'Lingua principale di erogazione', left: languageValue(leftCourse), right: languageValue(rightCourse) }
    );
    if (leftCourse.group === rightCourse.group) {
      rows.push({ label: 'Principali materie distintive', hint: `Entrambi nell’area ${leftCourse.group}`, left: subjectsDifference(leftProfile, rightProfile), right: subjectsDifference(rightProfile, leftProfile) });
    }
    rows.push(
      { label: 'Obiettivo formativo', hint: 'Direzione generale del percorso', left: objectiveValue(leftProfile), right: objectiveValue(rightProfile) },
      { label: 'Perché scegliere questa alternativa', hint: 'Sintesi automatica', left: whyChoose(leftCourse, leftUniversity, rightCourse, rightUniversity), right: whyChoose(rightCourse, rightUniversity, leftCourse, leftUniversity) },
      { label: 'Rata annuale', hint: 'Contribuzione media dell’ateneo', left: tuitionValue(leftUniversity.id), right: tuitionValue(rightUniversity.id) },
      { label: 'Costo della vita', hint: 'Città del corso', left: cityUnknown(leftUniversity, 'costo della vita'), right: cityUnknown(rightUniversity, 'costo della vita') },
      { label: 'Camera singola in affitto', hint: 'Prezzo medio mensile', left: cityUnknown(leftUniversity, 'affitto medio'), right: cityUnknown(rightUniversity, 'affitto medio') },
      { label: 'Vita fuori dall’università', hint: 'Socialità, cultura e servizi', left: cityUnknown(leftUniversity, 'vita studentesca'), right: cityUnknown(rightUniversity, 'vita studentesca') },
      { label: 'Qualità della vita dei giovani', hint: 'Indicatore urbano', left: cityUnknown(leftUniversity, 'qualità della vita giovanile'), right: cityUnknown(rightUniversity, 'qualità della vita giovanile') }
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

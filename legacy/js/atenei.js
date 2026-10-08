(() => {
  'use strict';

  const universities = Array.isArray(window.UNIVERSITIES) ? window.UNIVERSITIES.slice() : [];
  const universityData = window.UniversityData || null;
  const officialRankings = window.OfficialRankings || null;
  const universityProfiles = window.UniversityProfiles || null;
  const state = {
    mode: 'alphabetical',
    region: 'Abruzzo',
    department: 'Economico',
    institutionType: 'all',
    search: ''
  };

  const modeLabels = {
    alphabetical: 'Alfabetico',
    region: 'Regione',
    ranking: 'Ranking ufficiali',
    department: 'Dipartimento'
  };

  const typeLabels = {
    all: 'tutti gli atenei',
    public: 'le università pubbliche',
    private: 'le università private',
    online: 'le università telematiche',
    institute: 'gli istituti superiori'
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const integerFormatter = new Intl.NumberFormat('it-IT');

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

  function alphaSort(a, b) {
    return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });
  }

  function rankSort(a, b) {
    const left = officialRankings?.general?.(a);
    const right = officialRankings?.general?.(b);
    if ((left?.tier || 0) !== (right?.tier || 0)) return (right?.tier || 0) - (left?.tier || 0);
    if ((left?.score || 0) !== (right?.score || 0)) return (right?.score || 0) - (left?.score || 0);
    return alphaSort(a, b);
  }

  function groupStats(university) {
    return universityData?.getGroupStats?.(university.id, state.department) || null;
  }

  function departmentRanking(university) {
    return officialRankings?.forGroup?.(university, state.department) || null;
  }

  function departmentSort(a, b) {
    const left = departmentRanking(a);
    const right = departmentRanking(b);
    if ((left?.tier || 0) !== (right?.tier || 0)) return (right?.tier || 0) - (left?.tier || 0);
    if ((left?.score || 0) !== (right?.score || 0)) return (right?.score || 0) - (left?.score || 0);
    return alphaSort(a, b);
  }

  function institutionType(university) {
    const category = normalize(university.category);
    if (category.includes('telematica')) return 'online';
    if (category.includes('scuola superiore')) return 'institute';
    if (university.isPublic) return 'public';
    return 'private';
  }

  function displayCategory(category) {
    return normalize(category) === 'scuola superiore' ? 'Istituto superiore' : category;
  }

  function departmentNames(university) {
    if (!universityData) return [];
    return universityData.getDepartmentNames().filter((group) => universityData.hasGroup(university.id, group));
  }

  function currentResults() {
    let results = universities.slice();

    if (state.institutionType !== 'all') {
      results = results.filter((university) => institutionType(university) === state.institutionType);
    }

    if (state.mode === 'region') {
      results = results.filter((university) => university.region === state.region);
    }

    if (state.mode === 'department') {
      results = results.filter((university) => universityData?.hasGroup?.(university.id, state.department));
    }

    const query = normalize(state.search);
    if (query) {
      results = results.filter((university) => {
        const groups = departmentNames(university).join(' ');
        const haystack = normalize(
          `${university.name} ${university.shortName} ${university.city} ${university.province} ${university.region} ${university.category} ${groups}`
        );
        return haystack.includes(query);
      });
    }

    if (state.mode === 'ranking') return results.sort(rankSort);
    if (state.mode === 'department') return results.sort(departmentSort);
    return results.sort(alphaSort);
  }

  function categoryClass(category) {
    return normalize(displayCategory(category)).replace(/\s+/g, '-');
  }

  function rankingTemplate(university) {
    const ranking = officialRankings?.general?.(university);
    if (!ranking || ranking.source === 'unavailable') {
      return '<div class="qs-pill is-unranked"><span>Ranking ufficiale</span><strong>n.d.</strong></div>';
    }
    const label = ranking.source === 'qs-general' ? 'QS 2027' : 'CENSIS 2026/27';
    return `
      <div class="qs-pill${ranking.source === 'censis-general' ? ' is-censis' : ''}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(ranking.summary)}</strong></div>
      <span class="score-note">${escapeHtml(ranking.source === 'censis-general' ? 'categoria omogenea per dimensione/tipologia' : 'ranking internazionale generale')}</span>
    `;
  }

  function departmentRankingTemplate(university) {
    const ranking = departmentRanking(university);
    const stats = groupStats(university);
    if (!ranking) return '';
    const courseCount = Number(stats?.courseCount) || 0;
    const enrolled = Number(stats?.enrolled) || 0;
    const courseWord = courseCount === 1 ? 'corso' : 'corsi';
    const label = ranking.source === 'qs-subject' ? `QS by Subject ${ranking.year}` : ranking.source.startsWith('censis') ? 'CENSIS 2026/27' : 'Ranking ufficiale';
    return `
      <div class="area-pill${ranking.source.startsWith('censis') ? ' is-censis' : ''}" title="${escapeHtml(ranking.note || '')}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(ranking.summary || 'n.d.')}</strong>
      </div>
      <span class="score-note">${escapeHtml(courseCount)} ${courseWord} · ${escapeHtml(integerFormatter.format(enrolled))} iscritti</span>
    `;
  }

  function cardTemplate(university, index) {
    const category = displayCategory(university.category);
    const rightColumn = state.mode === 'department'
      ? departmentRankingTemplate(university)
      : rankingTemplate(university);

    return `
      <article class="university-card" id="${escapeHtml(university.id)}" data-university-id="${escapeHtml(university.id)}" role="button" tabindex="0" aria-label="Apri la scheda di ${escapeHtml(university.name)}">
        <div class="university-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
        <div class="university-main">
          <div class="university-badges">
            <span class="type-badge type-${categoryClass(university.category)}">${escapeHtml(category)}</span>
          </div>
          <h2>${escapeHtml(university.name)}</h2>
          <p class="university-location">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>
            <span>${escapeHtml(university.city)}, ${escapeHtml(university.region)}</span>
          </p>
        </div>
        <div class="university-ranking">
          ${rightColumn}
          <span class="university-open-hint">Apri scheda →</span>
        </div>
      </article>
    `;
  }

  function ensureProfileModal() {
    let modal = $('#universityProfileModal');
    if (modal) return modal;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="university-profile-modal" id="universityProfileModal" hidden>
        <button class="university-profile-backdrop" type="button" data-close-profile aria-label="Chiudi la scheda"></button>
        <section class="university-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="universityProfileTitle">
          <button class="university-profile-close" type="button" data-close-profile aria-label="Chiudi">×</button>
          <div id="universityProfileContent"></div>
        </section>
      </div>
    `);
    modal = $('#universityProfileModal');
    $$('[data-close-profile]', modal).forEach((button) => button.addEventListener('click', closeUniversityProfile));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.hidden) closeUniversityProfile();
    });
    return modal;
  }

  function closeUniversityProfile() {
    const modal = $('#universityProfileModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('has-profile-modal');
  }

  function strengthRows(profile) {
    const rows = profile.strengths?.rows || [];
    if (!rows.length) return '<p class="university-profile-empty">Nessuna area ufficiale collegata per questo ateneo.</p>';
    return `<div class="university-strength-list">${rows.map((item) => `
      <a class="university-strength-item" href="${escapeHtml(item.url || profile.officialUrl)}" target="_blank" rel="noreferrer">
        <span>${escapeHtml(item.source)}</span>
        <strong>${escapeHtml(item.label)}</strong>
        <small>${escapeHtml(item.visibleRank)}</small>
      </a>
    `).join('')}</div>`;
  }

  function openUniversityProfile(universityId) {
    const university = universities.find((item) => item.id === universityId);
    if (!university || !universityProfiles) return;
    const profile = universityProfiles.profile(university);
    const ranking = officialRankings?.general?.(university);
    const metrics = universityData?.getMetrics?.(university.id) || {};
    const courses = universityData?.getCourses?.(university.id) || [];
    const groups = new Set(courses.map((course) => course.group).filter(Boolean));
    const modal = ensureProfileModal();
    const host = $('#universityProfileContent');
    const category = displayCategory(university.category);
    const rankingCopy = ranking?.source === 'unavailable' ? 'Nessun ranking ufficiale collegato' : `${ranking.label}: ${ranking.summary}`;

    host.innerHTML = `
      <header class="university-profile-header">
        <div>
          <span class="type-badge type-${categoryClass(university.category)}">${escapeHtml(category)}</span>
          <p>${escapeHtml(university.city)}, ${escapeHtml(university.region)}</p>
          <h2 id="universityProfileTitle">${escapeHtml(university.name)}</h2>
        </div>
        <div class="university-profile-ranking">
          <span>Ranking disponibile</span>
          <strong>${escapeHtml(rankingCopy)}</strong>
          <small>${escapeHtml(ranking?.note || '')}</small>
        </div>
      </header>

      <div class="university-profile-facts">
        <article><span>Studenti censiti</span><strong>${escapeHtml(metrics.students ? integerFormatter.format(metrics.students) : 'n.d.')}</strong></article>
        <article><span>Corsi collegati</span><strong>${escapeHtml(courses.length)}</strong></article>
        <article><span>Aree disciplinari</span><strong>${escapeHtml(groups.size)}</strong></article>
        <article><span>Tipologia</span><strong>${escapeHtml(category)}</strong></article>
      </div>

      <section class="university-profile-section">
        <span class="eyebrow">Descrizione generale</span>
        <p>${escapeHtml(profile.overview)}</p>
      </section>

      <section class="university-profile-section">
        <span class="eyebrow">Storia in breve</span>
        <p>${escapeHtml(profile.history)}</p>
      </section>

      <section class="university-profile-section">
        <span class="eyebrow">Aree più forti o rappresentative</span>
        <h3>${profile.strengths?.kind === 'ranking' ? 'Ranking ufficiali disponibili' : 'Aree con maggiore presenza nell’offerta'}</h3>
        ${strengthRows(profile)}
        <p class="micro-note">Quando QS o CENSIS non coprono l’area, la scheda mostra soltanto la consistenza dell’offerta MUR e la dichiara come tale: non è una classifica di qualità.</p>
      </section>

      <footer class="university-profile-actions">
        <a class="button button-primary" href="${escapeHtml(profile.officialUrl)}" target="_blank" rel="noreferrer">Apri il sito ufficiale</a>
        <a class="button button-secondary" href="comparison.html?mode=universities">Confronta questo ateneo</a>
      </footer>
    `;
    modal.hidden = false;
    document.body.classList.add('has-profile-modal');
    $('.university-profile-close', modal)?.focus();
  }

  function emptyTemplate() {
    return `
      <div class="catalog-empty">
        <span aria-hidden="true">?</span>
        <h2>Nessun ateneo trovato</h2>
        <p>Prova a cambiare ricerca, area, regione o tipologia di ateneo.</p>
        <button class="button button-secondary" id="resetCatalog" type="button">Azzera i filtri</button>
      </div>
    `;
  }

  function searchSuffix() {
    const query = state.search.trim();
    return query ? ` · ricerca “${escapeHtml(query)}”` : '';
  }

  function resultDescription(results) {
    const resultCount = results.length;
    const noun = resultCount === 1 ? 'ateneo' : 'atenei';
    const typeCopy = typeLabels[state.institutionType] || typeLabels.all;
    const suffix = searchSuffix();

    if (state.mode === 'region') {
      return `<strong>${resultCount}</strong> ${noun} tra ${typeCopy} in <strong>${escapeHtml(state.region)}</strong>${suffix}`;
    }
    if (state.mode === 'ranking') {
      const qsCount = results.filter((item) => officialRankings?.general?.(item)?.source === 'qs-general').length;
      const censisCount = results.filter((item) => officialRankings?.general?.(item)?.source === 'censis-general').length;
      return `<strong>${resultCount}</strong> risultati tra ${typeCopy}: <strong>${qsCount}</strong> con QS e <strong>${censisCount}</strong> con fallback CENSIS${suffix}`;
    }
    if (state.mode === 'department') {
      return `<strong>${resultCount}</strong> ${noun} tra ${typeCopy} con corsi nell’area <strong>${escapeHtml(state.department)}</strong>, ordinati con QS per materia e fallback CENSIS ufficiale${suffix}`;
    }
    return `<strong>${resultCount}</strong> ${noun} tra ${typeCopy} in ordine alfabetico${suffix}`;
  }

  function closeFilterPanel() {
    const toggle = $('#filterToggle');
    const panel = $('#filterPanel');
    if (!toggle || !panel) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function render() {
    const list = $('#universityList');
    const meta = $('#catalogMeta');
    const activeLabel = $('#activeFilterLabel');
    const regionControl = $('#regionControl');
    const departmentControl = $('#departmentControl');
    const visibleCount = $('#visibleCatalogCount');
    if (!list || !meta || !activeLabel || !regionControl || !departmentControl) return;

    const results = currentResults();
    list.innerHTML = results.length ? results.map(cardTemplate).join('') : emptyTemplate();
    meta.innerHTML = resultDescription(results);
    activeLabel.textContent = modeLabels[state.mode];
    regionControl.hidden = state.mode !== 'region';
    departmentControl.hidden = state.mode !== 'department';
    if (visibleCount) visibleCount.textContent = String(results.length);

    $$('.filter-option').forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    $('#resetCatalog')?.addEventListener('click', resetFilters);
    $$('.university-card', list).forEach((card) => {
      const open = () => openUniversityProfile(card.dataset.universityId);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function resetFilters() {
    state.mode = 'alphabetical';
    state.region = $('#regionSelect')?.options?.[0]?.value || 'Abruzzo';
    state.department = $('#departmentSelect')?.querySelector('option[value="Economico"]') ? 'Economico' : ($('#departmentSelect')?.options?.[0]?.value || '');
    state.institutionType = 'all';
    state.search = '';

    const searchInput = $('#universitySearch');
    const regionSelect = $('#regionSelect');
    const departmentSelect = $('#departmentSelect');
    const institutionTypeSelect = $('#institutionTypeSelect');
    if (searchInput) searchInput.value = '';
    if (regionSelect) regionSelect.value = state.region;
    if (departmentSelect) departmentSelect.value = state.department;
    if (institutionTypeSelect) institutionTypeSelect.value = state.institutionType;
    closeFilterPanel();
    render();
  }

  function initRegions() {
    const select = $('#regionSelect');
    if (!select) return;
    const regions = [...new Set(universities.map((university) => university.region))].sort((a, b) =>
      a.localeCompare(b, 'it', { sensitivity: 'base' })
    );

    select.innerHTML = regions
      .map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`)
      .join('');
    state.region = regions[0] || '';
    select.value = state.region;
  }

  function initDepartments() {
    const select = $('#departmentSelect');
    if (!select) return;
    const departments = universityData?.getDepartmentNames?.() || [];
    select.innerHTML = departments
      .map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`)
      .join('');
    state.department = departments.includes('Economico') ? 'Economico' : (departments[0] || '');
    select.value = state.department;
  }

  function initFilters() {
    const toggle = $('#filterToggle');
    const panel = $('#filterPanel');
    const search = $('#universitySearch');
    const regionSelect = $('#regionSelect');
    const departmentSelect = $('#departmentSelect');
    const institutionTypeSelect = $('#institutionTypeSelect');
    if (!toggle || !panel || !search || !regionSelect || !departmentSelect || !institutionTypeSelect) return;

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
    });

    panel.addEventListener('click', (event) => event.stopPropagation());

    $$('.filter-option', panel).forEach((button) => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.mode;
        render();

        if (state.mode === 'region') {
          regionSelect.focus();
        } else if (state.mode === 'department') {
          departmentSelect.focus();
        } else {
          closeFilterPanel();
        }
      });
    });

    regionSelect.addEventListener('change', () => {
      state.region = regionSelect.value;
      render();
      closeFilterPanel();
    });

    departmentSelect.addEventListener('change', () => {
      state.department = departmentSelect.value;
      render();
      closeFilterPanel();
    });

    institutionTypeSelect.addEventListener('change', () => {
      state.institutionType = institutionTypeSelect.value;
      render();
    });

    search.addEventListener('input', () => {
      state.search = search.value;
      render();
    });

    document.addEventListener('click', closeFilterPanel);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeFilterPanel();
    });
  }

  function init() {
    const total = $('#catalogTotal');
    if (total) total.textContent = String(universities.length);
    initRegions();
    initDepartments();
    initFilters();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(() => {
  'use strict';

  const universities = Array.isArray(window.UNIVERSITIES) ? window.UNIVERSITIES.slice() : [];
  const universityData = window.UniversityData || null;
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
    ranking: 'Ranking QS',
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
    if (a.qsRankValue == null && b.qsRankValue == null) return alphaSort(a, b);
    if (a.qsRankValue == null) return 1;
    if (b.qsRankValue == null) return -1;
    if (a.qsRankValue !== b.qsRankValue) return a.qsRankValue - b.qsRankValue;
    return alphaSort(a, b);
  }

  function groupStats(university) {
    return universityData?.getGroupStats?.(university.id, state.department) || null;
  }

  function departmentSort(a, b) {
    const left = groupStats(a);
    const right = groupStats(b);
    if (!left && !right) return alphaSort(a, b);
    if (!left) return 1;
    if (!right) return -1;
    if (left.rank !== right.rank) return Number(left.rank || Infinity) - Number(right.rank || Infinity);
    if (left.index !== right.index) return Number(right.index || 0) - Number(left.index || 0);
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
    const rank = university.qsRank
      ? `<div class="qs-pill"><span>QS 2027</span><strong>#${escapeHtml(university.qsRank)}</strong></div>`
      : '<div class="qs-pill is-unranked"><span>QS 2027</span><strong>n.d.</strong></div>';

    const score = university.qsScore != null
      ? `<span class="score-note">punteggio ${escapeHtml(Number(university.qsScore).toFixed(1).replace('.', ','))}</span>`
      : '';

    return `${rank}${score}`;
  }

  function departmentRankingTemplate(university) {
    const stats = groupStats(university);
    if (!stats) return '';
    const rank = Number(stats.rank) || 0;
    const total = Number(stats.rankedUniversities) || 0;
    const score = Number(stats.index) || 0;
    const courseCount = Number(stats.courseCount) || 0;
    const enrolled = Number(stats.enrolled) || 0;
    const courseWord = courseCount === 1 ? 'corso' : 'corsi';

    return `
      <div class="area-pill" title="Indice interno sperimentale del prototipo">
        <span>Indice area</span>
        <strong>#${escapeHtml(rank)}${total ? ` / ${escapeHtml(total)}` : ''}</strong>
      </div>
      <span class="score-note">${escapeHtml(score.toFixed(1).replace('.', ','))}/100 · ${escapeHtml(courseCount)} ${courseWord} · ${escapeHtml(integerFormatter.format(enrolled))} iscritti</span>
    `;
  }

  function cardTemplate(university, index) {
    const category = displayCategory(university.category);
    const rightColumn = state.mode === 'department'
      ? departmentRankingTemplate(university)
      : rankingTemplate(university);

    return `
      <article class="university-card" id="${escapeHtml(university.id)}">
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
        </div>
      </article>
    `;
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
      const ranked = results.filter((item) => item.qsRank).length;
      return `<strong>${resultCount}</strong> risultati tra ${typeCopy}: <strong>${ranked}</strong> presenti nel QS 2027, poi gli altri in ordine alfabetico${suffix}`;
    }
    if (state.mode === 'department') {
      return `<strong>${resultCount}</strong> ${noun} tra ${typeCopy} con corsi nell’area <strong>${escapeHtml(state.department)}</strong>, ordinati per indice sperimentale${suffix}`;
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

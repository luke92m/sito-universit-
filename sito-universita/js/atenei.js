(() => {
  'use strict';

  const universities = Array.isArray(window.UNIVERSITIES) ? window.UNIVERSITIES.slice() : [];
  const state = {
    mode: 'alphabetical',
    region: 'Abruzzo',
    search: ''
  };

  const modeLabels = {
    alphabetical: 'Alfabetico',
    region: 'Regione',
    ranking: 'Ranking QS'
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value)
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

  function currentResults() {
    let results = universities.slice();

    if (state.mode === 'region') {
      results = results.filter((university) => university.region === state.region);
    }

    const query = normalize(state.search);
    if (query) {
      results = results.filter((university) => {
        const haystack = normalize(
          `${university.name} ${university.shortName} ${university.city} ${university.province} ${university.region} ${university.category}`
        );
        return haystack.includes(query);
      });
    }

    return results.sort(state.mode === 'ranking' ? rankSort : alphaSort);
  }

  function categoryClass(category) {
    return normalize(category).replace(/\s+/g, '-');
  }

  function cardTemplate(university, index) {
    const rank = university.qsRank
      ? `<div class="qs-pill"><span>QS 2027</span><strong>#${escapeHtml(university.qsRank)}</strong></div>`
      : '<div class="qs-pill is-unranked"><span>QS 2027</span><strong>n.d.</strong></div>';

    const ownership = university.isPublic ? 'Pubblico' : 'Non statale';
    const score = university.qsScore != null
      ? `<span class="score-note">punteggio ${escapeHtml(Number(university.qsScore).toFixed(1))}</span>`
      : '';

    return `
      <article class="university-card" id="${escapeHtml(university.id)}">
        <div class="university-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
        <div class="university-main">
          <div class="university-badges">
            <span class="type-badge type-${categoryClass(university.category)}">${escapeHtml(university.category)}</span>
            <span class="ownership-badge">${ownership}</span>
          </div>
          <h2>${escapeHtml(university.name)}</h2>
          <p class="university-location">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>
            <span>${escapeHtml(university.city)}, ${escapeHtml(university.region)}</span>
          </p>
        </div>
        <div class="university-ranking">
          ${rank}
          ${score}
        </div>
      </article>
    `;
  }

  function emptyTemplate() {
    return `
      <div class="catalog-empty">
        <span aria-hidden="true">?</span>
        <h2>Nessun ateneo trovato</h2>
        <p>Prova a modificare la ricerca o a scegliere un’altra regione.</p>
        <button class="button button-secondary" id="resetCatalog" type="button">Azzera i filtri</button>
      </div>
    `;
  }

  function resultDescription(results) {
    const resultCount = results.length;
    const noun = resultCount === 1 ? 'ateneo' : 'atenei';

    if (state.mode === 'region') {
      return `<strong>${resultCount}</strong> ${noun} in <strong>${escapeHtml(state.region)}</strong>`;
    }
    if (state.mode === 'ranking') {
      const ranked = results.filter((item) => item.qsRank).length;
      return `<strong>${ranked}</strong> classificati nel QS 2027, seguiti dagli altri atenei in ordine alfabetico`;
    }
    return `<strong>${resultCount}</strong> ${noun} in ordine alfabetico`;
  }

  function render() {
    const list = $('#universityList');
    const meta = $('#catalogMeta');
    const activeLabel = $('#activeFilterLabel');
    const regionControl = $('#regionControl');
    if (!list || !meta || !activeLabel || !regionControl) return;

    const results = currentResults();
    list.innerHTML = results.length ? results.map(cardTemplate).join('') : emptyTemplate();
    meta.innerHTML = resultDescription(results);
    activeLabel.textContent = modeLabels[state.mode];
    regionControl.hidden = state.mode !== 'region';

    $$('.filter-option').forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    $('#resetCatalog')?.addEventListener('click', resetFilters);
  }

  function resetFilters() {
    state.mode = 'alphabetical';
    state.region = 'Abruzzo';
    state.search = '';
    const searchInput = $('#universitySearch');
    const regionSelect = $('#regionSelect');
    if (searchInput) searchInput.value = '';
    if (regionSelect) regionSelect.value = state.region;
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

  function initFilters() {
    const toggle = $('#filterToggle');
    const panel = $('#filterPanel');
    const search = $('#universitySearch');
    const select = $('#regionSelect');
    if (!toggle || !panel || !search || !select) return;

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
        if (state.mode !== 'region') {
          panel.hidden = true;
          toggle.setAttribute('aria-expanded', 'false');
        }
        render();
      });
    });

    select.addEventListener('change', () => {
      state.region = select.value;
      render();
    });

    search.addEventListener('input', () => {
      state.search = search.value;
      render();
    });

    document.addEventListener('click', () => {
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function init() {
    const total = $('#catalogTotal');
    if (total) total.textContent = String(universities.length);
    initRegions();
    initFilters();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

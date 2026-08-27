(() => {
  'use strict';

  const config = window.SITE_CONFIG || {
    name: 'NOME SITO',
    tagline: "L’università, spiegata semplice."
  };

  const STORAGE_KEYS = {
    users: 'universitaSemplice.users.v1',
    session: 'universitaSemplice.session.v1'
  };

  const SITUATION_LABELS = {
    university: 'Sono studente universitario o mi sto per immatricolare',
    enrolling: "Mi voglio iscrivere all’università",
    curious: 'Mi interessa semplicemente il mondo universitario'
  };

  const JOURNEY_PHASE_LABELS = {
    enrolled: 'Già immatricolato',
    'pre-enrolling': 'Mi sto per immatricolare'
  };

  const STUDENT_TOOL_SITUATIONS = new Set(['university', 'enrolling']);

  const STUDENT_TOOLS = [
    { label: 'Borse di studio', slug: 'borse-di-studio', icon: 'sparkles' },
    { label: 'Scadenze', slug: 'scadenze', icon: 'calendar' },
    { label: 'Community', slug: 'community', icon: 'users' },
    { label: 'Accompagnamento', slug: 'accompagnamento', icon: 'compass' },
    { label: 'Libri usati', slug: 'libri-usati', icon: 'book' }
  ];

  const ICONS = {
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13ZM6 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20m5.5-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5m1 9c1.9 0 3.5 1.6 3.5 3.5V20"/></svg>',
    compass: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm16 0A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 9.9-9.9-3.2-3.2L5 15.8 4 20Zm9.7-12.9 3.2 3.2M15.8 5l1.1-1.1a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L19 8.2"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9"/></svg>'
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  function safeStorageGet(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      showToast('Il browser non consente di salvare i dati locali.');
      return false;
    }
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  async function hashPassword(password) {
    const value = String(password);
    if (window.crypto?.subtle && window.TextEncoder) {
      const bytes = new TextEncoder().encode(value);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }

    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  function getUsers() {
    const users = safeStorageGet(STORAGE_KEYS.users, []);
    return Array.isArray(users) ? users : [];
  }

  function getSessionEmail() {
    const session = safeStorageGet(STORAGE_KEYS.session, null);
    return session?.email ? normalizeEmail(session.email) : null;
  }

  function getCurrentUser() {
    const email = getSessionEmail();
    if (!email) return null;
    return getUsers().find((user) => user.email === email) || null;
  }

  function setSession(email) {
    return safeStorageSet(STORAGE_KEYS.session, { email: normalizeEmail(email) });
  }

  function clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEYS.session);
    } catch (_error) {
      // Nessuna azione necessaria.
    }
  }

  function updateCurrentUser(patch) {
    const email = getSessionEmail();
    if (!email) return null;
    const users = getUsers();
    const index = users.findIndex((user) => user.email === email);
    if (index < 0) return null;
    const next = {
      ...users[index],
      ...(typeof patch === 'function' ? patch(users[index]) : patch),
      updatedAt: new Date().toISOString()
    };
    users[index] = next;
    return safeStorageSet(STORAGE_KEYS.users, users) ? next : null;
  }

  function getUniversities() {
    return Array.isArray(window.UNIVERSITIES)
      ? window.UNIVERSITIES.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'))
      : [];
  }

  function getUniversityById(id) {
    return getUniversities().find((university) => university.id === id) || null;
  }

  function getUniversityCourses(universityId) {
    const courses = window.UniversityData?.getCourses?.(universityId) || [];
    return courses.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  function getGeneralCourses() {
    const courses = window.CourseCatalog?.courses || [];
    return courses.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  function formatDate(value = new Date(), options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...options
    }).format(date);
  }

  function formatJourneySummary(user) {
    const journey = user?.journey;
    if (!journey) return '';
    const university = getUniversityById(journey.universityId);
    const parts = [];
    if (journey.phase) parts.push(JOURNEY_PHASE_LABELS[journey.phase] || journey.phase);
    if (university) parts.push(university.shortName || university.name);
    if (journey.year && journey.phase === 'enrolled') parts.push(`${journey.year}° anno`);
    return parts.join(' · ');
  }

  function headerTemplate(page) {
    const user = getCurrentUser();
    const showEnrollingTools = user?.situation === 'enrolling';
    const navItems = [
      { key: 'atenei', label: 'atenei', href: 'atenei.html' },
      { key: 'comparison', label: 'comparison', href: 'comparison.html' },
      { key: 'trova-corso', label: 'trova il mio corso', href: 'trova-corso.html' },
      { key: 'preparazione', label: 'preparazione', href: 'preparazione.html', conditional: true },
      { key: 'burocrazia', label: 'burocrazia', href: 'burocrazia.html', conditional: true },
      { key: 'scuole-aziende', label: 'scuole e aziende', href: 'scuole-aziende.html' }
    ];

    const links = navItems
      .map((item) => {
        const hidden = item.conditional && !showEnrollingTools ? ' hidden' : '';
        const conditional = item.conditional ? ' data-enrolling-nav' : '';
        return `<a class="nav-link${page === item.key ? ' is-active' : ''}" href="${item.href}"${
          page === item.key ? ' aria-current="page"' : ''
        }${conditional}${hidden}>${item.label}</a>`;
      })
      .join('');

    return `
      <header class="site-header">
        <div class="header-shell">
          <a class="brand" href="index.html" aria-label="Vai alla homepage di ${config.name}">
            <span class="brand-mark" aria-hidden="true">u</span>
            <span class="brand-copy">
              <span class="brand-name" data-site-name>${config.name}</span>
              <span class="brand-note">nome da decidere</span>
            </span>
          </a>

          <button class="mobile-nav-button" id="mobileNavButton" type="button" aria-expanded="false" aria-controls="primaryNav" aria-label="Apri il menu">
            ${ICONS.menu}
          </button>

          <nav class="primary-nav" id="primaryNav" aria-label="Navigazione principale">
            ${links}
          </nav>

          <div class="profile-wrap">
            <button class="profile-button" id="profileButton" type="button" aria-haspopup="dialog" aria-expanded="false">
              <span class="profile-icon">${ICONS.profile}</span>
              <span class="profile-label" id="profileLabel">profilo</span>
              <span class="profile-chevron">${ICONS.chevron}</span>
            </button>
            <div class="profile-dropdown" id="profileDropdown" role="menu" hidden></div>
          </div>
        </div>
      </header>
    `;
  }

  function universityOptionsTemplate(selected = '') {
    const options = getUniversities()
      .map((university) => `<option value="${university.id}"${university.id === selected ? ' selected' : ''}>${university.name} — ${university.city}</option>`)
      .join('');
    return `<option value="">Seleziona un ateneo</option>${options}`;
  }


  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function enhanceUniversitySelect(select) {
    if (!select) return null;
    if (select._universityCombobox) {
      select._universityCombobox.refresh();
      return select._universityCombobox;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'university-combobox';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'university-combobox-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = select.dataset.searchPlaceholder || "Scrivi il nome dell’ateneo";
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const fieldLabel = select.closest('label')?.querySelector(':scope > span')?.textContent?.trim();
    input.setAttribute('aria-label', fieldLabel || select.getAttribute('aria-label') || 'Cerca e seleziona un ateneo');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'university-combobox-toggle';
    toggle.setAttribute('aria-label', 'Mostra tutti gli atenei');
    toggle.innerHTML = ICONS.chevron;

    const list = document.createElement('div');
    list.className = 'university-combobox-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    const listId = `university-list-${Math.random().toString(36).slice(2, 9)}`;
    list.id = listId;
    input.setAttribute('aria-controls', listId);

    wrapper.append(input, toggle, list);
    select.insertAdjacentElement('afterend', wrapper);
    select.classList.add('university-native-select');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    let visibleOptions = [];
    let activeIndex = -1;

    function optionRecords() {
      return Array.from(select.options)
        .filter((option) => option.value)
        .map((option) => {
          const university = getUniversityById(option.value);
          return {
            value: option.value,
            label: option.textContent.trim(),
            name: university?.name || option.textContent.split('—')[0].trim(),
            city: university?.city || '',
            disabled: option.disabled
          };
        });
    }

    function filteredRecords(query) {
      const records = optionRecords();
      const term = normalizeSearch(query);
      if (!term) return records;
      const beginning = records.filter((record) => normalizeSearch(record.name).startsWith(term));
      if (beginning.length) return beginning;
      const wordBeginning = records.filter((record) => normalizeSearch(record.name).split(/\s+/).some((word) => word.startsWith(term)));
      if (wordBeginning.length) return wordBeginning;
      return records.filter((record) => normalizeSearch(record.name).includes(term));
    }

    function closeList(resetInput = false) {
      list.hidden = true;
      wrapper.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
      if (resetInput) syncFromSelect();
    }

    function setActive(index) {
      const buttons = Array.from(list.querySelectorAll('[role="option"]'));
      if (!buttons.length) return;
      activeIndex = Math.max(0, Math.min(index, buttons.length - 1));
      buttons.forEach((button, buttonIndex) => button.classList.toggle('is-active', buttonIndex === activeIndex));
      const active = buttons[activeIndex];
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }

    function choose(record) {
      if (!record || record.disabled) return;
      select.value = record.value;
      input.value = record.label;
      input.dataset.selectedValue = record.value;
      closeList(false);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    }

    function renderList(query = '') {
      visibleOptions = filteredRecords(query);
      list.replaceChildren();
      if (!visibleOptions.length) {
        const empty = document.createElement('p');
        empty.className = 'university-combobox-empty';
        empty.textContent = 'Nessun ateneo corrisponde a questa ricerca.';
        list.appendChild(empty);
      } else {
        visibleOptions.forEach((record, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.id = `${listId}-option-${index}`;
          button.className = 'university-combobox-option';
          button.setAttribute('role', 'option');
          button.setAttribute('aria-selected', String(record.value === select.value));
          button.disabled = record.disabled;
          const name = document.createElement('strong');
          name.textContent = record.name;
          const detail = document.createElement('small');
          detail.textContent = record.city || record.label.replace(record.name, '').replace(/^\s*—\s*/, '');
          button.append(name, detail);
          button.addEventListener('mousedown', (event) => event.preventDefault());
          button.addEventListener('click', () => choose(record));
          list.appendChild(button);
        });
      }
      list.hidden = false;
      wrapper.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      if (wrapper.closest('.auth-dialog')) {
        window.requestAnimationFrame(() => list.scrollIntoView({ block: 'center' }));
      }
    }

    function syncFromSelect() {
      const selected = optionRecords().find((record) => record.value === select.value);
      input.value = selected?.label || '';
      input.dataset.selectedValue = selected?.value || '';
      input.disabled = select.disabled;
      toggle.disabled = select.disabled;
      input.setAttribute('aria-required', String(select.required));
    }

    function refresh() {
      syncFromSelect();
      if (!list.hidden) renderList(input.value === optionRecords().find((record) => record.value === select.value)?.label ? '' : input.value);
    }

    input.addEventListener('focus', () => renderList(''));
    input.addEventListener('click', () => renderList(''));
    input.addEventListener('input', () => {
      if (input.value !== optionRecords().find((record) => record.value === select.value)?.label) {
        select.value = '';
        input.dataset.selectedValue = '';
      }
      renderList(input.value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (list.hidden) renderList(input.value);
        setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (list.hidden) renderList(input.value);
        setActive(activeIndex <= 0 ? visibleOptions.length - 1 : activeIndex - 1);
      } else if (event.key === 'Enter' && !list.hidden && activeIndex >= 0) {
        event.preventDefault();
        choose(visibleOptions[activeIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeList(true);
      }
    });
    input.addEventListener('blur', () => window.setTimeout(() => closeList(true), 120));
    toggle.addEventListener('mousedown', (event) => event.preventDefault());
    toggle.addEventListener('click', () => {
      if (list.hidden) {
        input.focus();
        renderList('');
      } else closeList(true);
    });
    select.addEventListener('change', syncFromSelect);

    const observer = new MutationObserver(refresh);
    observer.observe(select, { childList: true, subtree: true, attributes: true });

    const controller = { refresh, close: closeList, input, list };
    select._universityCombobox = controller;
    syncFromSelect();
    return controller;
  }

  function refreshUniversitySelect(select) {
    return enhanceUniversitySelect(select)?.refresh();
  }

  function authModalTemplate() {
    return `
      <div class="auth-modal" id="authModal" aria-hidden="true" hidden>
        <div class="modal-backdrop" data-close-auth></div>
        <section class="auth-dialog auth-dialog-large" role="dialog" aria-modal="true" aria-labelledby="authTitle">
          <button class="modal-close" type="button" data-close-auth aria-label="Chiudi">
            ${ICONS.close}
          </button>

          <div class="auth-heading">
            <span class="eyebrow" id="authEyebrow">Bentornato</span>
            <h2 id="authTitle">Accedi al tuo profilo</h2>
            <p id="authDescription">Ritrova gli strumenti e le informazioni che ti interessano.</p>
          </div>

          <form class="auth-form" id="loginForm" novalidate>
            <label class="field">
              <span>Email</span>
              <input id="loginEmail" name="email" type="email" autocomplete="email" placeholder="nome@email.it" required>
            </label>
            <label class="field">
              <span>Password</span>
              <input id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="La tua password" required>
            </label>
            <p class="form-message" id="loginMessage" role="alert" aria-live="polite"></p>
            <button class="button button-primary button-full" type="submit">Accedi ${ICONS.arrow}</button>
            <p class="auth-switch">Non hai ancora un profilo? <button type="button" data-auth-view="register">Registrati</button></p>
          </form>

          <form class="auth-form" id="registerForm" novalidate hidden>
            <label class="field">
              <span>Email</span>
              <input id="registerEmail" name="email" type="email" autocomplete="email" placeholder="nome@email.it" required>
            </label>
            <label class="field">
              <span>Password</span>
              <input id="registerPassword" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="Almeno 8 caratteri" required>
            </label>

            <fieldset class="situation-fieldset">
              <legend>Qual è la tua situazione?</legend>
              <label class="situation-option">
                <input type="radio" name="situation" value="university" required>
                <span class="radio-ui" aria-hidden="true"></span>
                <span>Sono studente universitario o mi sto per immatricolare</span>
              </label>
              <label class="situation-option">
                <input type="radio" name="situation" value="enrolling" required>
                <span class="radio-ui" aria-hidden="true"></span>
                <span>Mi voglio iscrivere all’università</span>
              </label>
              <label class="situation-option">
                <input type="radio" name="situation" value="curious" required>
                <span class="radio-ui" aria-hidden="true"></span>
                <span>Mi interessa semplicemente il mondo universitario</span>
              </label>
            </fieldset>

            <section class="journey-form-panel" id="registerJourneyFields" hidden>
              <div class="journey-form-heading">
                <strong>Il tuo percorso universitario</strong>
                <small>Questi dati rendono utili scadenze, community e libri usati.</small>
              </div>

              <fieldset class="compact-radio-fieldset">
                <legend>A che punto sei?</legend>
                <div class="compact-radio-row">
                  <label class="choice-pill">
                    <input type="radio" name="journeyPhase" value="enrolled">
                    <span>Già immatricolato</span>
                  </label>
                  <label class="choice-pill">
                    <input type="radio" name="journeyPhase" value="pre-enrolling">
                    <span>Mi sto per immatricolare</span>
                  </label>
                </div>
              </fieldset>

              <label class="field">
                <span>Ateneo</span>
                <select id="registerUniversity" name="universityId" data-university-select>${universityOptionsTemplate()}</select>
              </label>

              <label class="field">
                <span>Corso di studio <small>(facoltativo, ma necessario per i libri usati)</small></span>
                <select id="registerCourse" name="courseName">
                  <option value="">Seleziona prima l’ateneo</option>
                </select>
              </label>

              <label class="field" id="registerYearField" hidden>
                <span>Anno di studi</span>
                <select id="registerStudyYear" name="studyYear">
                  <option value="">Seleziona l’anno</option>
                  <option value="1">1° anno</option>
                  <option value="2">2° anno</option>
                  <option value="3">3° anno</option>
                  <option value="4">4° anno</option>
                  <option value="5">5° anno</option>
                  <option value="6">6° anno o successivo</option>
                </select>
              </label>
            </section>

            <p class="form-message" id="registerMessage" role="alert" aria-live="polite"></p>
            <button class="button button-primary button-full" type="submit">Crea il profilo ${ICONS.arrow}</button>
            <p class="privacy-note">Demo locale: non usare una password reale. Per la pubblicazione serviranno autenticazione sicura, verifica email, backend e database.</p>
            <p class="auth-switch">Hai già un profilo? <button type="button" data-auth-view="login">Accedi</button></p>
          </form>
        </section>
      </div>
    `;
  }

  function journeyModalTemplate() {
    return `
      <div class="auth-modal" id="journeyModal" aria-hidden="true" hidden>
        <div class="modal-backdrop" data-close-journey></div>
        <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="journeyModalTitle">
          <button class="modal-close" type="button" data-close-journey aria-label="Chiudi">${ICONS.close}</button>
          <div class="auth-heading">
            <span class="eyebrow">Profilo universitario</span>
            <h2 id="journeyModalTitle">Modifica i dati del percorso</h2>
            <p>Queste informazioni vengono salvate soltanto nel browser di questo dispositivo.</p>
          </div>
          <form class="auth-form" id="journeyEditForm" novalidate>
            <fieldset class="compact-radio-fieldset">
              <legend>A che punto sei?</legend>
              <div class="compact-radio-row">
                <label class="choice-pill"><input type="radio" name="editJourneyPhase" value="enrolled"><span>Già immatricolato</span></label>
                <label class="choice-pill"><input type="radio" name="editJourneyPhase" value="pre-enrolling"><span>Mi sto per immatricolare</span></label>
              </div>
            </fieldset>
            <label class="field"><span>Ateneo</span><select id="editJourneyUniversity" data-university-select>${universityOptionsTemplate()}</select></label>
            <label class="field"><span>Corso di studio <small>(facoltativo)</small></span><select id="editJourneyCourse"><option value="">Seleziona prima l’ateneo</option></select></label>
            <label class="field" id="editJourneyYearField" hidden><span>Anno di studi</span><select id="editJourneyYear"><option value="">Seleziona l’anno</option><option value="1">1° anno</option><option value="2">2° anno</option><option value="3">3° anno</option><option value="4">4° anno</option><option value="5">5° anno</option><option value="6">6° anno o successivo</option></select></label>
            <p class="form-message" id="journeyEditMessage" role="alert" aria-live="polite"></p>
            <button class="button button-primary button-full" type="submit">Salva il percorso</button>
          </form>
        </section>
      </div>
    `;
  }

  function footerTemplate() {
    return `
      <footer class="site-footer">
        <div class="footer-shell">
          <a class="footer-brand" href="index.html"><span class="brand-mark small" aria-hidden="true">u</span><span data-site-name>${config.name}</span></a>
          <p>Un punto di partenza semplice per orientarsi nel mondo universitario.</p>
          <span class="footer-status">Oggi ${formatDate(new Date())}</span>
        </div>
      </footer>
    `;
  }

  function injectLayout() {
    const headerHost = $('[data-site-header]');
    if (headerHost) headerHost.innerHTML = headerTemplate(headerHost.dataset.page || '');
    if (!$('#authModal')) document.body.insertAdjacentHTML('beforeend', authModalTemplate());
    if (!$('#journeyModal')) document.body.insertAdjacentHTML('beforeend', journeyModalTemplate());
    const footerHost = $('[data-site-footer]');
    if (footerHost) footerHost.innerHTML = footerTemplate();
    $$('[data-site-name]').forEach((node) => { node.textContent = config.name; });
    $$('[data-current-date]').forEach((node) => { node.textContent = formatDate(new Date()); });
  }

  function showToast(message) {
    let toast = $('#siteToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'siteToast';
      toast.className = 'site-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
  }

  function setMessage(element, text, type = 'error') {
    if (!element) return;
    element.textContent = text;
    element.dataset.type = type;
  }

  function clearMessages() {
    $$('.form-message').forEach((message) => {
      message.textContent = '';
      delete message.dataset.type;
    });
  }

  function fillCourseSelect(select, universityId, selectedValue = '') {
    if (!select) return;
    const actualCourses = universityId ? getUniversityCourses(universityId) : [];
    const seen = new Set();
    const options = [];

    actualCourses.forEach((course) => {
      const key = course.name.trim().toLocaleLowerCase('it');
      if (seen.has(key)) return;
      seen.add(key);
      options.push({ value: course.name, label: course.name });
    });

    if (!options.length) {
      getGeneralCourses().forEach((course) => options.push({ value: course.name, label: course.name }));
    }

    select.innerHTML = `<option value="">${universityId ? 'Corso non indicato' : 'Seleziona prima l’ateneo'}</option>${options
      .map((option) => `<option value="${option.value.replace(/"/g, '&quot;')}">${option.label}</option>`)
      .join('')}`;

    if (selectedValue) {
      const existing = Array.from(select.options).find((option) => option.value === selectedValue);
      if (!existing) {
        const option = document.createElement('option');
        option.value = selectedValue;
        option.textContent = selectedValue;
        select.appendChild(option);
      }
      select.value = selectedValue;
    }
  }

  function setAuthView(view) {
    const isRegister = view === 'register';
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    if (!loginForm || !registerForm) return;

    loginForm.hidden = isRegister;
    registerForm.hidden = !isRegister;
    $('#authEyebrow').textContent = isRegister ? 'Inizia da qui' : 'Bentornato';
    $('#authTitle').textContent = isRegister ? 'Crea il tuo profilo' : 'Accedi al tuo profilo';
    $('#authDescription').textContent = isRegister
      ? 'Dicci in quale momento del percorso ti trovi: personalizzeremo menu e strumenti.'
      : 'Ritrova gli strumenti e le informazioni che ti interessano.';
    clearMessages();

    window.setTimeout(() => {
      const firstInput = isRegister ? $('#registerEmail') : $('#loginEmail');
      firstInput?.focus();
    }, 30);
  }

  function openAuth(view = 'login') {
    const modal = $('#authModal');
    if (!modal) return;
    setAuthView(view);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeAuth() {
    const modal = $('#authModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    $('#profileButton')?.focus();
  }

  function openJourneyEditor() {
    const user = getCurrentUser();
    if (!user || user.situation !== 'university') return;
    const modal = $('#journeyModal');
    if (!modal) return;
    const journey = user.journey || {};
    const phase = journey.phase || 'enrolled';
    const radio = $(`input[name="editJourneyPhase"][value="${phase}"]`);
    if (radio) radio.checked = true;
    $('#editJourneyUniversity').value = journey.universityId || '';
    refreshUniversitySelect($('#editJourneyUniversity'));
    fillCourseSelect($('#editJourneyCourse'), journey.universityId || '', journey.courseName || '');
    $('#editJourneyYear').value = journey.year ? String(journey.year) : '';
    syncJourneyEditFields();
    clearMessages();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeJourneyEditor() {
    const modal = $('#journeyModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function closeProfileDropdown() {
    const dropdown = $('#profileDropdown');
    const button = $('#profileButton');
    if (!dropdown || !button) return;
    dropdown.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  function toolLinkTemplate(tool) {
    return `
      <a class="profile-tool" href="area-studente.html?sezione=${encodeURIComponent(tool.slug)}" role="menuitem">
        <span class="tool-icon">${ICONS[tool.icon]}</span>
        <span>${tool.label}</span>
        <span class="tool-arrow">${ICONS.arrow}</span>
      </a>
    `;
  }

  function updateConditionalNav() {
    const show = getCurrentUser()?.situation === 'enrolling';
    $$('[data-enrolling-nav]').forEach((link) => { link.hidden = !show; });
  }

  function renderProfile() {
    const user = getCurrentUser();
    const label = $('#profileLabel');
    const button = $('#profileButton');
    const dropdown = $('#profileDropdown');
    if (!label || !button || !dropdown) return;

    updateConditionalNav();

    if (!user) {
      label.textContent = 'profilo';
      button.classList.remove('is-logged-in');
      button.setAttribute('aria-haspopup', 'dialog');
      dropdown.innerHTML = '';
      dropdown.hidden = true;
      return;
    }

    const localPart = user.email.split('@')[0] || 'profilo';
    label.textContent = localPart.length > 15 ? `${localPart.slice(0, 14)}…` : localPart;
    button.classList.add('is-logged-in');
    button.setAttribute('aria-haspopup', 'menu');

    const userBlock = document.createElement('div');
    userBlock.className = 'profile-user-block';
    const avatar = document.createElement('span');
    avatar.className = 'profile-avatar';
    avatar.textContent = localPart.charAt(0).toUpperCase();
    const userCopy = document.createElement('span');
    userCopy.className = 'profile-user-copy';
    const email = document.createElement('strong');
    email.textContent = user.email;
    const situation = document.createElement('small');
    const journeySummary = formatJourneySummary(user);
    situation.textContent = journeySummary || SITUATION_LABELS[user.situation] || 'Profilo personale';
    userCopy.append(email, situation);
    userBlock.append(avatar, userCopy);

    dropdown.replaceChildren(userBlock);

    if (user.situation === 'university') {
      const editJourney = document.createElement('button');
      editJourney.type = 'button';
      editJourney.className = 'profile-edit-journey';
      editJourney.innerHTML = `${ICONS.edit}<span>${user.journey ? 'Modifica i dati del percorso' : 'Completa i dati del percorso'}</span>`;
      editJourney.addEventListener('click', () => {
        closeProfileDropdown();
        openJourneyEditor();
      });
      dropdown.appendChild(editJourney);
    }

    if (STUDENT_TOOL_SITUATIONS.has(user.situation)) {
      const sectionLabel = document.createElement('p');
      sectionLabel.className = 'profile-section-label';
      sectionLabel.textContent = 'Il tuo spazio';
      dropdown.appendChild(sectionLabel);

      const tools = document.createElement('div');
      tools.className = 'profile-tools';
      tools.innerHTML = STUDENT_TOOLS.map(toolLinkTemplate).join('');
      dropdown.appendChild(tools);
    } else {
      const info = document.createElement('p');
      info.className = 'profile-curious-note';
      info.textContent = 'Il profilo è attivo. Puoi esplorare liberamente tutti i contenuti generali del sito.';
      dropdown.appendChild(info);
    }

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'profile-logout';
    logout.setAttribute('role', 'menuitem');
    logout.innerHTML = `${ICONS.logout}<span>Esci dal profilo</span>`;
    logout.addEventListener('click', () => {
      clearSession();
      closeProfileDropdown();
      renderProfile();
      showToast('Hai effettuato la disconnessione.');
      document.dispatchEvent(new CustomEvent('universitysite:userchange'));
    });
    dropdown.appendChild(logout);
  }

  function toggleProfile() {
    const user = getCurrentUser();
    if (!user) {
      openAuth('login');
      return;
    }

    const dropdown = $('#profileDropdown');
    const button = $('#profileButton');
    if (!dropdown || !button) return;
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    button.setAttribute('aria-expanded', String(willOpen));
  }

  function syncRegisterJourneyFields() {
    const situation = $('input[name="situation"]:checked')?.value;
    const panel = $('#registerJourneyFields');
    if (!panel) return;
    panel.hidden = situation !== 'university';
    if (situation === 'university' && !$('input[name="journeyPhase"]:checked')) {
      const defaultPhase = $('input[name="journeyPhase"][value="enrolled"]');
      if (defaultPhase) defaultPhase.checked = true;
    }
    syncRegisterYearField();
  }

  function syncRegisterYearField() {
    const phase = $('input[name="journeyPhase"]:checked')?.value;
    const field = $('#registerYearField');
    if (field) field.hidden = phase !== 'enrolled';
  }

  function syncJourneyEditFields() {
    const phase = $('input[name="editJourneyPhase"]:checked')?.value;
    const field = $('#editJourneyYearField');
    if (field) field.hidden = phase !== 'enrolled';
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = normalizeEmail($('#loginEmail')?.value);
    const password = $('#loginPassword')?.value || '';
    const message = $('#loginMessage');

    if (!email || !password) {
      setMessage(message, 'Inserisci email e password.');
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = getUsers().find((candidate) => candidate.email === email);
    if (!user || user.passwordHash !== passwordHash) {
      setMessage(message, 'Email o password non corretti.');
      return;
    }

    setSession(email);
    event.currentTarget.reset();
    closeAuth();
    renderProfile();
    showToast('Accesso effettuato. Bentornato!');
    document.dispatchEvent(new CustomEvent('universitysite:userchange'));
  }

  async function handleRegistration(event) {
    event.preventDefault();
    const email = normalizeEmail($('#registerEmail')?.value);
    const password = $('#registerPassword')?.value || '';
    const situation = $('input[name="situation"]:checked', event.currentTarget)?.value;
    const message = $('#registerMessage');

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setMessage(message, 'Inserisci un indirizzo email valido.');
      return;
    }
    if (password.length < 8) {
      setMessage(message, 'La password deve contenere almeno 8 caratteri.');
      return;
    }
    if (!situation || !Object.prototype.hasOwnProperty.call(SITUATION_LABELS, situation)) {
      setMessage(message, 'Seleziona la situazione che ti rappresenta.');
      return;
    }

    let journey = null;
    if (situation === 'university') {
      const phase = $('input[name="journeyPhase"]:checked', event.currentTarget)?.value;
      const universityId = $('#registerUniversity')?.value || '';
      const courseName = $('#registerCourse')?.value || '';
      const year = $('#registerStudyYear')?.value || '';
      if (!phase) {
        setMessage(message, 'Indica se sei già immatricolato o se stai per immatricolarti.');
        return;
      }
      if (!universityId) {
        setMessage(message, 'Seleziona l’ateneo del tuo percorso.');
        return;
      }
      if (phase === 'enrolled' && !year) {
        setMessage(message, 'Indica in quale anno di studi ti trovi.');
        return;
      }
      journey = {
        phase,
        universityId,
        courseName: courseName || null,
        year: phase === 'enrolled' ? Number(year) : null
      };
    }

    const users = getUsers();
    if (users.some((user) => user.email === email)) {
      setMessage(message, 'Esiste già un profilo con questa email. Prova ad accedere.');
      return;
    }

    const passwordHash = await hashPassword(password);
    users.push({
      email,
      passwordHash,
      situation,
      journey,
      createdAt: new Date().toISOString()
    });

    if (!safeStorageSet(STORAGE_KEYS.users, users)) return;
    setSession(email);
    event.currentTarget.reset();
    $('#registerJourneyFields').hidden = true;
    closeAuth();
    renderProfile();
    showToast('Profilo creato con successo.');
    document.dispatchEvent(new CustomEvent('universitysite:userchange'));
  }

  function handleJourneyEdit(event) {
    event.preventDefault();
    const message = $('#journeyEditMessage');
    const phase = $('input[name="editJourneyPhase"]:checked', event.currentTarget)?.value;
    const universityId = $('#editJourneyUniversity')?.value || '';
    const courseName = $('#editJourneyCourse')?.value || '';
    const year = $('#editJourneyYear')?.value || '';
    if (!phase || !universityId) {
      setMessage(message, 'Indica lo stato del percorso e seleziona un ateneo.');
      return;
    }
    if (phase === 'enrolled' && !year) {
      setMessage(message, 'Indica in quale anno di studi ti trovi.');
      return;
    }

    const updated = updateCurrentUser({
      journey: {
        phase,
        universityId,
        courseName: courseName || null,
        year: phase === 'enrolled' ? Number(year) : null
      }
    });
    if (!updated) {
      setMessage(message, 'Non è stato possibile salvare i dati.');
      return;
    }
    closeJourneyEditor();
    renderProfile();
    showToast('Dati del percorso aggiornati.');
    document.dispatchEvent(new CustomEvent('universitysite:userchange'));
  }

  function initAuth() {
    $('#profileButton')?.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleProfile();
    });

    $$('[data-close-auth]').forEach((button) => button.addEventListener('click', closeAuth));
    $$('[data-close-journey]').forEach((button) => button.addEventListener('click', closeJourneyEditor));
    $$('[data-auth-view]').forEach((button) => {
      button.addEventListener('click', () => setAuthView(button.dataset.authView));
    });

    $('#loginForm')?.addEventListener('submit', handleLogin);
    $('#registerForm')?.addEventListener('submit', handleRegistration);
    $('#journeyEditForm')?.addEventListener('submit', handleJourneyEdit);

    $$('input[name="situation"]').forEach((input) => input.addEventListener('change', syncRegisterJourneyFields));
    $$('input[name="journeyPhase"]').forEach((input) => input.addEventListener('change', syncRegisterYearField));
    $$('input[name="editJourneyPhase"]').forEach((input) => input.addEventListener('change', syncJourneyEditFields));

    $('#registerUniversity')?.addEventListener('change', (event) => fillCourseSelect($('#registerCourse'), event.target.value));
    $('#editJourneyUniversity')?.addEventListener('change', (event) => fillCourseSelect($('#editJourneyCourse'), event.target.value));
    enhanceUniversitySelect($('#registerUniversity'));
    enhanceUniversitySelect($('#editJourneyUniversity'));

    document.addEventListener('click', (event) => {
      const profileWrap = $('.profile-wrap');
      if (profileWrap && !profileWrap.contains(event.target)) closeProfileDropdown();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!$('#authModal')?.hidden) closeAuth();
      if (!$('#journeyModal')?.hidden) closeJourneyEditor();
      closeProfileDropdown();
    });

    renderProfile();
  }

  function initMobileNav() {
    const button = $('#mobileNavButton');
    const nav = $('#primaryNav');
    if (!button || !nav) return;

    button.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute('aria-label', isOpen ? 'Chiudi il menu' : 'Apri il menu');
      button.innerHTML = isOpen ? ICONS.close : ICONS.menu;
    });

    $$('.nav-link', nav).forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'Apri il menu');
        button.innerHTML = ICONS.menu;
      });
    });
  }

  function initAuthTriggers() {
    $$('[data-open-auth]').forEach((button) => {
      button.addEventListener('click', () => {
        if (getCurrentUser()) toggleProfile();
        else openAuth(button.dataset.openAuth || 'login');
      });
    });
  }

  function initHomeActions() {
    const profileCta = $('#heroProfileCta');
    if (!profileCta) return;
    profileCta.addEventListener('click', () => {
      if (getCurrentUser()) toggleProfile();
      else openAuth('register');
    });
  }

  function init() {
    injectLayout();
    initAuth();
    initMobileNav();
    initAuthTriggers();
    initHomeActions();
  }

  window.UniversitySite = {
    getCurrentUser,
    getUsers,
    updateCurrentUser,
    getUniversities,
    getUniversityById,
    getUniversityCourses,
    getGeneralCourses,
    formatDate,
    openAuth,
    openJourneyEditor,
    showToast,
    renderProfile,
    safeStorageGet,
    safeStorageSet,
    enhanceUniversitySelect,
    refreshUniversitySelect,
    situationLabels: SITUATION_LABELS,
    journeyPhaseLabels: JOURNEY_PHASE_LABELS,
    isStudentToolUser(user = getCurrentUser()) {
      return Boolean(user && STUDENT_TOOL_SITUATIONS.has(user.situation));
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

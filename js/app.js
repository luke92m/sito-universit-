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
    university: 'Sono studente universitario',
    enrolling: "Mi voglio iscrivere all’università",
    curious: 'Mi interessa semplicemente il mondo universitario'
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

    // Fallback deterministico per browser molto vecchi. È solo una demo locale.
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
      // No action needed.
    }
  }

  function headerTemplate(page) {
    const navItems = [
      { key: 'atenei', label: 'atenei', href: 'atenei.html' },
      { key: 'comparison', label: 'comparison', href: 'comparison.html' },
      { key: 'trova-corso', label: 'trova il mio corso', href: 'trova-corso.html' },
      { key: 'preparazione', label: 'preparazione', href: 'preparazione.html' },
      { key: 'scuole-aziende', label: 'scuole e aziende', href: 'scuole-aziende.html' }
    ];

    const links = navItems
      .map(
        (item) => `<a class="nav-link${page === item.key ? ' is-active' : ''}" href="${item.href}"${
          page === item.key ? ' aria-current="page"' : ''
        }>${item.label}</a>`
      )
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

  function authModalTemplate() {
    return `
      <div class="auth-modal" id="authModal" aria-hidden="true" hidden>
        <div class="modal-backdrop" data-close-auth></div>
        <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">
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
                <span>Sono studente universitario</span>
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

            <p class="form-message" id="registerMessage" role="alert" aria-live="polite"></p>
            <button class="button button-primary button-full" type="submit">Crea il profilo ${ICONS.arrow}</button>
            <p class="privacy-note">Demo locale: non usare una password reale. Per la pubblicazione servirà un sistema di autenticazione sicuro lato server.</p>
            <p class="auth-switch">Hai già un profilo? <button type="button" data-auth-view="login">Accedi</button></p>
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
          <span class="footer-status">Prototipo</span>
        </div>
      </footer>
    `;
  }

  function injectLayout() {
    const headerHost = $('[data-site-header]');
    if (headerHost) {
      headerHost.innerHTML = headerTemplate(headerHost.dataset.page || '');
    }

    if (!$('#authModal')) {
      document.body.insertAdjacentHTML('beforeend', authModalTemplate());
    }

    const footerHost = $('[data-site-footer]');
    if (footerHost) {
      footerHost.innerHTML = footerTemplate();
    }

    $$('[data-site-name]').forEach((node) => {
      node.textContent = config.name;
    });
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
      ? 'Dicci in quale momento del percorso ti trovi: personalizzeremo il tuo spazio.'
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

  function renderProfile() {
    const user = getCurrentUser();
    const label = $('#profileLabel');
    const button = $('#profileButton');
    const dropdown = $('#profileDropdown');
    if (!label || !button || !dropdown) return;

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
    situation.textContent = SITUATION_LABELS[user.situation] || 'Profilo personale';
    userCopy.append(email, situation);
    userBlock.append(avatar, userCopy);

    dropdown.replaceChildren(userBlock);

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
      info.textContent = 'Il profilo è attivo. Puoi esplorare liberamente tutti i contenuti del sito.';
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
      createdAt: new Date().toISOString()
    });

    if (!safeStorageSet(STORAGE_KEYS.users, users)) return;
    setSession(email);
    event.currentTarget.reset();
    closeAuth();
    renderProfile();
    showToast('Profilo creato con successo.');
  }

  function initAuth() {
    $('#profileButton')?.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleProfile();
    });

    $$('[data-close-auth]').forEach((button) => button.addEventListener('click', closeAuth));
    $$('[data-auth-view]').forEach((button) => {
      button.addEventListener('click', () => setAuthView(button.dataset.authView));
    });

    $('#loginForm')?.addEventListener('submit', handleLogin);
    $('#registerForm')?.addEventListener('submit', handleRegistration);

    document.addEventListener('click', (event) => {
      const profileWrap = $('.profile-wrap');
      if (profileWrap && !profileWrap.contains(event.target)) closeProfileDropdown();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!$('#authModal')?.hidden) closeAuth();
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
        if (getCurrentUser()) {
          toggleProfile();
        } else {
          openAuth(button.dataset.openAuth || 'login');
        }
      });
    });
  }

  function initAreaPage() {
    const host = $('[data-area-content]');
    if (!host) return;

    const sections = {
      'borse-di-studio': {
        eyebrow: 'Opportunità',
        title: 'Borse di studio',
        description: 'Uno spazio dedicato a bandi, requisiti, importi e documenti da preparare.',
        items: ['Bandi nazionali e regionali', 'Requisiti economici e di merito', 'Promemoria per la domanda']
      },
      scadenze: {
        eyebrow: 'Organizzazione',
        title: 'Scadenze',
        description: 'Raccogli qui le date da non perdere durante il tuo percorso universitario.',
        items: ['Immatricolazioni e tasse', 'Domande per agevolazioni', 'Sessioni ed esami']
      },
      community: {
        eyebrow: 'Persone',
        title: 'Community',
        description: 'Confrontati con studenti e futuri studenti in uno spazio pensato per domande concrete.',
        items: ['Gruppi per ateneo', 'Esperienze degli studenti', 'Domande e risposte']
      },
      accompagnamento: {
        eyebrow: 'Percorso',
        title: 'Accompagnamento',
        description: 'Una guida passo dopo passo, dall’orientamento fino alla laurea.',
        items: ['Scelta del corso', 'Primi passi da matricola', 'Metodo e vita universitaria']
      },
      'libri-usati': {
        eyebrow: 'Risparmio',
        title: 'Libri usati',
        description: 'Uno spazio per trovare e scambiare testi universitari in modo semplice.',
        items: ['Ricerca per corso o esame', 'Annunci tra studenti', 'Preferiti e contatti']
      }
    };

    const params = new URLSearchParams(window.location.search);
    const key = params.get('sezione') || 'borse-di-studio';
    const section = sections[key] || sections['borse-di-studio'];
    document.title = `${section.title} — ${config.name}`;

    host.innerHTML = `
      <span class="eyebrow">${section.eyebrow}</span>
      <h1>${section.title}</h1>
      <p class="page-lead">${section.description}</p>
      <div class="coming-grid">
        ${section.items
          .map(
            (item, index) => `
              <article class="coming-card">
                <span class="coming-number">0${index + 1}</span>
                <h2>${item}</h2>
                <p>Sezione predisposta per il prossimo sviluppo del sito.</p>
              </article>
            `
          )
          .join('')}
      </div>
      <a class="text-link" href="index.html">Torna alla homepage ${ICONS.arrow}</a>
    `;
  }

  function initHomeActions() {
    const profileCta = $('#heroProfileCta');
    if (!profileCta) return;
    profileCta.addEventListener('click', () => {
      if (getCurrentUser()) {
        toggleProfile();
      } else {
        openAuth('register');
      }
    });
  }

  function init() {
    injectLayout();
    initAuth();
    initMobileNav();
    initAuthTriggers();
    initAreaPage();
    initHomeActions();
  }

  window.UniversitySite = {
    getCurrentUser,
    openAuth,
    showToast,
    renderProfile
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

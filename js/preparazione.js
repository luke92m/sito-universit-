(() => {
  'use strict';

  const app = window.UniversitySite;
  const serviceData = window.STUDENT_SERVICE_DATA || {};
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function universityOptions(selected = '') {
    return app.getUniversities()
      .map((university) => `<option value="${university.id}"${university.id === selected ? ' selected' : ''}>${escapeHtml(university.name)} — ${escapeHtml(university.city)}</option>`)
      .join('');
  }

  function areaOptions(selected = '') {
    return (serviceData.testAreas || [])
      .map((area) => `<option value="${area.id}"${area.id === selected ? ' selected' : ''}>${escapeHtml(area.label)}</option>`)
      .join('');
  }

  function renderLocked(host, reason) {
    const title = reason === 'login'
      ? 'Accedi per usare la preparazione personalizzata.'
      : 'Questa sezione è riservata a chi vuole iscriversi all’università.';
    const copy = reason === 'login'
      ? 'Nel profilo puoi indicare “Mi voglio iscrivere all’università” e sbloccare esercizi e strumenti di orientamento.'
      : 'Puoi aggiornare la tua situazione creando un nuovo profilo demo oppure continuare a consultare Atenei, Comparison e Trova il mio corso.';
    host.innerHTML = `
      <section class="access-gate">
        <span class="eyebrow">Accesso personalizzato</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(copy)}</p>
        <div class="inline-actions">
          ${reason === 'login' ? '<button class="button button-primary" type="button" data-open-prep-auth>Accedi o registrati</button>' : ''}
          <a class="button button-secondary" href="trova-corso.html">Trova il mio corso</a>
        </div>
      </section>`;
    $('[data-open-prep-auth]')?.addEventListener('click', () => app.openAuth('register'));
  }

  function renderSetup(host, user) {
    const defaultUniversity = user?.journey?.universityId || '';
    host.innerHTML = `
      <section class="tool-hero tool-hero-compact">
        <div>
          <span class="eyebrow">Preparazione personalizzata</span>
          <h1>Allenati per il test d’ingresso.</h1>
          <p>Seleziona ateneo e macroarea. Il sito propone una simulazione fissa e uguale per tutti gli utenti, coerente con il TOLC di riferimento oppure con un test interno di area.</p>
        </div>
        <aside class="today-card">
          <span>Data di riferimento</span>
          <strong>${escapeHtml(app.formatDate(new Date()))}</strong>
          <small>Controlla sempre il bando più recente dell’ateneo.</small>
        </aside>
      </section>

      <section class="tool-grid tool-grid-main">
        <article class="service-card">
          <div class="service-card-heading">
            <div><span class="eyebrow">Configura la prova</span><h2>Da dove vuoi partire?</h2></div>
            <span class="data-year-badge">esercizi originali</span>
          </div>
          <form id="preparationSetupForm" class="service-form" novalidate>
            <label class="field field-wide">
              <span>Ateneo che ti interessa</span>
              <select id="preparationUniversity" required>
                <option value="">Seleziona un ateneo</option>
                ${universityOptions(defaultUniversity)}
              </select>
            </label>
            <label class="field field-wide">
              <span>Dipartimento o macroarea</span>
              <select id="preparationArea" required>
                <option value="">Seleziona una macroarea</option>
                ${areaOptions()}
              </select>
            </label>
            <label class="field">
              <span>Tipo di prova indicato nel bando</span>
              <select id="preparationMode">
                <option value="auto">Rilevamento orientativo</option>
                <option value="tolc">TOLC CISIA</option>
                <option value="internal">Test interno dell’ateneo</option>
              </select>
            </label>
            <label class="field">
              <span>Numero di domande</span>
              <select id="preparationQuestionCount">
                <option value="5">5 domande</option>
              </select>
            </label>
            <p class="service-form-note field-wide">Il prototipo non copia quesiti protetti dal web: usa un archivio originale e deterministico. Le sezioni reali, i tempi, le penalità e le soglie vanno verificati nel bando e sul portale CISIA.</p>
            <p class="form-message field-wide" id="preparationSetupMessage" role="alert"></p>
            <button class="button button-primary field-wide" type="submit">Crea la simulazione</button>
          </form>
        </article>

        <aside class="service-card info-stack-card">
          <span class="eyebrow">Come funziona</span>
          <ol class="numbered-info-list">
            <li><span>01</span><div><strong>Seleziona l’area</strong><p>Il sistema associa la macroarea al TOLC più vicino.</p></div></li>
            <li><span>02</span><div><strong>Svolgi gli esercizi</strong><p>Le domande restano identiche per tutti gli utenti.</p></div></li>
            <li><span>03</span><div><strong>Leggi le spiegazioni</strong><p>Il risultato evidenzia risposta corretta e ragionamento.</p></div></li>
          </ol>
          <a class="text-link" href="${escapeHtml(serviceData.sources?.cisiaRules || '#')}" target="_blank" rel="noreferrer">Consulta le regole TOLC ufficiali →</a>
        </aside>
      </section>

      <div id="preparationQuizHost"></div>

      <section class="source-disclaimer">
        <strong>Strumento di allenamento, non simulatore ufficiale.</strong>
        <p>Il test effettivo può cambiare per ateneo, corso e anno accademico. Prima di prepararti, apri il bando del corso e verifica struttura, iscrizione e scadenze.</p>
      </section>`;

    const universitySelect = $('#preparationUniversity');
    const modeSelect = $('#preparationMode');
    const syncMode = () => {
      if (!universitySelect?.value || !modeSelect || modeSelect.dataset.touched === 'true') return;
      const university = app.getUniversityById(universitySelect.value);
      modeSelect.value = university?.isPublic ? 'tolc' : 'internal';
    };
    universitySelect?.addEventListener('change', syncMode);
    modeSelect?.addEventListener('change', () => { modeSelect.dataset.touched = 'true'; });
    syncMode();

    $('#preparationSetupForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const university = app.getUniversityById(universitySelect.value);
      const area = (serviceData.testAreas || []).find((entry) => entry.id === $('#preparationArea').value);
      const message = $('#preparationSetupMessage');
      message.textContent = '';
      if (!university || !area) {
        message.textContent = 'Seleziona un ateneo e una macroarea.';
        message.dataset.type = 'error';
        return;
      }
      let mode = modeSelect.value;
      if (mode === 'auto') mode = university.isPublic ? 'tolc' : 'internal';
      renderQuiz($('#preparationQuizHost'), university, area, mode);
      $('#preparationQuizHost')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderQuiz(host, university, area, mode) {
    const questions = (serviceData.questionBanks?.[area.id] || []).slice(0, 5);
    const testLabel = mode === 'tolc'
      ? `${area.tolc} — schema orientativo`
      : `Test interno di ${area.label.toLowerCase()} — simulazione orientativa`;

    host.innerHTML = `
      <section class="service-card preparation-quiz-card">
        <div class="quiz-context-bar">
          <div><span>${escapeHtml(university.shortName || university.name)}</span><strong>${escapeHtml(testLabel)}</strong></div>
          <button class="button button-quiet" type="button" id="resetPreparation">Cambia impostazioni</button>
        </div>
        <form id="preparationQuizForm" class="fixed-question-list" novalidate>
          ${questions.map((question, questionIndex) => `
            <fieldset class="fixed-question" data-question-index="${questionIndex}">
              <legend><span>${String(questionIndex + 1).padStart(2, '0')}</span><div><small>${escapeHtml(question.section)}</small>${escapeHtml(question.question)}</div></legend>
              <div class="fixed-answer-grid">
                ${question.options.map((option, optionIndex) => `
                  <label class="fixed-answer">
                    <input type="radio" name="preparationQuestion${questionIndex}" value="${optionIndex}">
                    <span class="fixed-answer-letter">${String.fromCharCode(65 + optionIndex)}</span>
                    <span>${escapeHtml(option)}</span>
                  </label>`).join('')}
              </div>
              <div class="answer-explanation" data-explanation hidden></div>
            </fieldset>`).join('')}
          <p class="form-message" id="preparationQuizMessage" role="alert"></p>
          <button class="button button-primary" type="submit">Correggi la simulazione</button>
        </form>
      </section>
      <div id="preparationScoreHost"></div>`;

    $('#resetPreparation')?.addEventListener('click', () => {
      host.innerHTML = '';
      $('#preparationSetupForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('#preparationQuizForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const answers = questions.map((_question, index) => {
        const selected = $(`input[name="preparationQuestion${index}"]:checked`, event.currentTarget);
        return selected ? Number(selected.value) : null;
      });
      const unanswered = answers.filter((answer) => answer === null).length;
      const message = $('#preparationQuizMessage');
      message.textContent = '';
      if (unanswered) {
        message.textContent = `Rispondi ancora a ${unanswered} ${unanswered === 1 ? 'domanda' : 'domande'}.`;
        message.dataset.type = 'error';
        return;
      }

      let score = 0;
      questions.forEach((question, index) => {
        const fieldset = $(`[data-question-index="${index}"]`, event.currentTarget);
        const labels = $$('.fixed-answer', fieldset);
        labels.forEach((label, optionIndex) => {
          label.classList.remove('is-correct', 'is-wrong');
          if (optionIndex === question.answer) label.classList.add('is-correct');
          if (optionIndex === answers[index] && answers[index] !== question.answer) label.classList.add('is-wrong');
        });
        if (answers[index] === question.answer) score += 1;
        const explanation = $('[data-explanation]', fieldset);
        explanation.hidden = false;
        explanation.innerHTML = `<strong>${answers[index] === question.answer ? 'Risposta corretta' : `Risposta corretta: ${String.fromCharCode(65 + question.answer)}`}</strong><p>${escapeHtml(question.explanation)}</p>`;
      });

      const percentage = Math.round((score / questions.length) * 100);
      const resultTitle = percentage >= 80 ? 'Ottima base.' : percentage >= 60 ? 'Buon punto di partenza.' : 'Continua ad allenarti.';
      $('#preparationScoreHost').innerHTML = `
        <section class="quiz-score-card">
          <div class="score-dial" style="--score:${percentage}"><span>${percentage}%</span></div>
          <div><span class="eyebrow">Risultato</span><h2>${resultTitle}</h2><p>Hai risposto correttamente a <strong>${score} domande su ${questions.length}</strong>. Le spiegazioni sono ora visibili sotto ogni quesito.</p></div>
          <button class="button button-secondary" type="button" id="retryPreparation">Riprova le stesse domande</button>
        </section>`;
      $('#retryPreparation')?.addEventListener('click', () => renderQuiz(host, university, area, mode));
      $('#preparationScoreHost')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function render() {
    const host = $('[data-preparation-app]');
    if (!host || !app) return;
    const user = app.getCurrentUser();
    if (!user) {
      renderLocked(host, 'login');
      return;
    }
    if (user.situation !== 'enrolling') {
      renderLocked(host, 'profile');
      return;
    }
    renderSetup(host, user);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  document.addEventListener('universitysite:userchange', render);
})();

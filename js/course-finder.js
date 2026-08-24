(() => {
  'use strict';

  const catalog = window.CourseCatalog;
  if (!catalog) return;

  const state = {
    step: 0,
    answers: {},
    result: null
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function setMessage(text = '') {
    const message = $('#quizMessage');
    if (message) message.textContent = text;
  }

  function currentQuestion() {
    return catalog.questions[state.step];
  }

  function optionTemplate(question, option) {
    const selected = Array.isArray(state.answers[question.id])
      ? state.answers[question.id].includes(option.value)
      : state.answers[question.id] === option.value;
    const type = question.type === 'multiple' ? 'checkbox' : 'radio';

    return `
      <label class="quiz-option${selected ? ' is-selected' : ''}">
        <input type="${type}" name="${escapeHtml(question.id)}" value="${escapeHtml(option.value)}"${selected ? ' checked' : ''}>
        <span class="quiz-option-control" aria-hidden="true"></span>
        <span class="quiz-option-copy">
          <strong>${escapeHtml(option.label)}</strong>
          <small>${escapeHtml(option.hint)}</small>
        </span>
      </label>
    `;
  }

  function renderStep() {
    const question = currentQuestion();
    const host = $('#quizQuestionHost');
    if (!question || !host) return;

    const selectionNote = question.type === 'multiple'
      ? `<span class="quiz-selection-note">Puoi scegliere fino a ${question.max}</span>`
      : '<span class="quiz-selection-note">Scegli una risposta</span>';

    host.innerHTML = `
      <fieldset class="quiz-fieldset">
        <legend>${escapeHtml(question.title)}</legend>
        <p>${escapeHtml(question.description)}</p>
        ${selectionNote}
        <div class="quiz-options${question.type === 'multiple' ? ' is-multiple' : ''}">
          ${question.options.map((option) => optionTemplate(question, option)).join('')}
        </div>
      </fieldset>
    `;

    const total = catalog.questions.length;
    $('#quizStepLabel').textContent = `Domanda ${state.step + 1} di ${total}`;
    $('#quizProgressTitle').textContent = state.step === 0 ? 'Iniziamo dai tuoi interessi' : 'Stiamo costruendo il tuo profilo';
    $('#quizProgressBar').style.width = `${((state.step + 1) / total) * 100}%`;
    $('#quizBack').disabled = state.step === 0;
    $('#quizNext').textContent = state.step === total - 1 ? 'Scopri il risultato' : 'Continua';
    setMessage();

    host.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => handleAnswerChange(question));
    });
  }

  function handleAnswerChange(question) {
    const inputs = Array.from($('#quizQuestionHost').querySelectorAll('input'));
    if (question.type === 'multiple') {
      const checked = inputs.filter((input) => input.checked);
      if (checked.length > question.max) {
        const latest = checked.at(-1);
        latest.checked = false;
        setMessage(`Puoi scegliere al massimo ${question.max} risposte.`);
      } else {
        state.answers[question.id] = checked.map((input) => input.value);
        setMessage();
      }
    } else {
      const selected = inputs.find((input) => input.checked);
      state.answers[question.id] = selected?.value || '';
      setMessage();
    }

    inputs.forEach((input) => {
      input.closest('.quiz-option')?.classList.toggle('is-selected', input.checked);
    });
  }

  function hasCurrentAnswer() {
    const answer = state.answers[currentQuestion().id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  }

  function nextStep(event) {
    event.preventDefault();
    if (!hasCurrentAnswer()) {
      setMessage('Scegli almeno una risposta per continuare.');
      return;
    }

    if (state.step < catalog.questions.length - 1) {
      state.step += 1;
      renderStep();
      $('#courseFinderForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    showResult();
  }

  function previousStep() {
    if (state.step === 0) return;
    state.step -= 1;
    renderStep();
  }

  function courseCard(course, primary = false) {
    const subjects = course.subjects.slice(0, primary ? 5 : 3)
      .map((subject) => `<span>${escapeHtml(subject)}</span>`)
      .join('');

    return `
      <article class="course-result-card${primary ? ' is-primary' : ''}">
        <div class="course-score" aria-label="Compatibilità ${course.score} percento">
          <strong>${course.score}%</strong>
          <span>compatibilità</span>
        </div>
        <div class="course-result-copy">
          <span class="course-result-group">${escapeHtml(course.group)}</span>
          <h3>${escapeHtml(course.name)}</h3>
          <p>${escapeHtml(course.description)}</p>
          <div class="course-subjects">${subjects}</div>
        </div>
      </article>
    `;
  }

  function showResult() {
    const vector = catalog.vectorFromAnswers(state.answers);
    const ranked = catalog.rankCourses(vector);
    state.result = {
      answers: typeof structuredClone === 'function' ? structuredClone(state.answers) : JSON.parse(JSON.stringify(state.answers)),
      vector,
      recommendations: ranked.slice(0, 5).map(({ slug, name, score, group }) => ({ slug, name, score, group }))
    };

    $('#primaryCourseResult').innerHTML = courseCard(ranked[0], true);
    $('#alternativeCourseGrid').innerHTML = ranked.slice(1, 3).map((course) => courseCard(course)).join('');
    $('#finderLayout').hidden = true;
    $('#finderResult').hidden = false;
    $('#finderResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateRememberButton(false);
  }

  function updateRememberButton(saved) {
    const button = $('#rememberPreferences');
    if (!button) return;
    button.disabled = saved;
    button.textContent = saved ? 'Preferenze ricordate' : 'Ricorda queste preferenze';
    button.classList.toggle('is-saved', saved);
  }

  function rememberPreferences() {
    if (!state.result) return;
    const saved = catalog.savePreferences(state.result);
    if (!saved) {
      window.UniversitySite?.showToast?.('Non è stato possibile salvare le preferenze nel browser.');
      return;
    }
    updateRememberButton(true);
    renderSavedBanner(saved);
    window.UniversitySite?.showToast?.('Preferenze salvate: verranno usate nel comparatore.');
  }

  function renderSavedBanner(preferences = catalog.getSavedPreferences()) {
    const banner = $('#savedPreferenceBanner');
    if (!banner) return;
    const top = preferences?.recommendations?.[0];
    if (!top) {
      banner.hidden = true;
      banner.innerHTML = '';
      return;
    }

    banner.hidden = false;
    banner.innerHTML = `
      <div>
        <span>Preferenze già salvate</span>
        <strong>${escapeHtml(top.name)} · ${escapeHtml(top.score)}%</strong>
      </div>
      <a href="comparison.html?mode=courses">Usale nel comparatore</a>
    `;
  }

  function restart() {
    state.step = 0;
    state.answers = {};
    state.result = null;
    $('#finderResult').hidden = true;
    $('#finderLayout').hidden = false;
    $('#courseFinderForm').hidden = false;
    renderStep();
    $('#courseFinderForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    const form = $('#courseFinderForm');
    if (!form) return;
    form.addEventListener('submit', nextStep);
    $('#quizBack')?.addEventListener('click', previousStep);
    $('#rememberPreferences')?.addEventListener('click', rememberPreferences);
    $('#restartFinder')?.addEventListener('click', restart);
    renderSavedBanner();
    renderStep();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

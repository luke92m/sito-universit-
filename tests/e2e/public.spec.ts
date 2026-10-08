import { expect, test } from '@playwright/test';

// Percorsi pubblici: funzionano anche senza Supabase configurato.

test('home e navigazione principale', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('spiegata');
  await expect(page.getByText('99 istituti universitari')).toBeVisible();
  await page.getByRole('navigation', { name: 'Navigazione principale' }).getByRole('link', { name: 'atenei' }).click();
  await expect(page).toHaveURL(/\/atenei$/);
});

test('atenei: ricerca, filtro per area e scheda', async ({ page }) => {
  await page.goto('/atenei');
  await expect(page.locator('.university-card')).toHaveCount(99);

  await page.getByPlaceholder('Cerca ateneo, città, regione o area…').fill('bocconi');
  await expect(page.locator('.university-card')).toHaveCount(1);
  await page.locator('.university-card').first().click();
  const dialog = page.getByRole('dialog');
  // La prima richiesta in sviluppo compila la route API: tempo di attesa più ampio.
  await expect(dialog).toContainText('Università commerciale Luigi Bocconi', { timeout: 20_000 });
  await expect(dialog).toContainText('Storia in breve');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByPlaceholder('Cerca ateneo, città, regione o area…').fill('');
  await page.getByRole('button', { name: /Filtra/ }).click();
  await page.getByRole('button', { name: /Dipartimento/ }).click();
  await expect(page.locator('p.catalog-meta[aria-live]')).toContainText('nell’area Economico');
  await expect(page.locator('.university-card').first()).toContainText('Bocconi');
});

test('trova il mio corso → trova la mia università', async ({ page }) => {
  await page.goto('/trova-corso');
  const quiz = page.locator('#courseFinderPanel form');
  for (let step = 0; step < 6; step += 1) {
    await quiz.locator('.quiz-option').first().click();
    await quiz.getByRole('button', { name: /Continua|Scopri il risultato/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Il corso più vicino ai tuoi interessi' })).toBeVisible();

  await page.getByRole('button', { name: 'Trova la mia università' }).last().click();
  const finder = page.locator('#universityFinderPanel');
  const next = finder.locator('form button[type=submit]');
  await next.click(); // corso già proposto dal primo test
  await finder.getByText('Laurea triennale', { exact: true }).click();
  await next.click();
  await finder.locator('.university-inline-fields select').selectOption('Lombardia');
  await finder.locator('.university-inline-fields input').fill('Pavia');
  await next.click();
  await finder.getByText('Sì, posso fare il pendolare').click();
  await next.click();
  await finder.getByText('Anche in regioni confinanti').click();
  await next.click();
  await finder.locator('.university-course-select-field select').selectOption('24000-26000');
  await next.click();
  await finder.getByText('Italiano', { exact: true }).click();
  await next.click();

  await expect(finder.getByRole('heading', { name: 'Le università più adatte al tuo profilo.' })).toBeVisible();
  await expect(finder.locator('.university-match-card')).not.toHaveCount(0);
});

test('comparison tra due atenei', async ({ page }) => {
  await page.goto('/comparison');
  await page.getByRole('button', { name: 'Confronta gli atenei' }).click();
  await expect(page.getByRole('heading', { name: 'Confronto tra università' })).toBeVisible();
  await expect(page.locator('.comparison-row[role=row]:not(.comparison-table-head)')).toHaveCount(12);
});

test('comparison tra corsi con scenario', async ({ page }) => {
  await page.goto('/comparison?mode=courses');
  await expect(page.locator('#courseA')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Confronta i corsi' }).click();
  await expect(page.locator('.scenario-label')).toHaveText('Stesso corso · università diverse');
});

test('strumenti riservati senza accesso', async ({ page }) => {
  await page.goto('/preparazione');
  await expect(page.locator('.access-gate')).toBeVisible();
  await page.goto('/area-studente/community');
  await expect(page.locator('.student-area-locked')).toBeVisible();
});

test('i vecchi URL .html reindirizzano', async ({ page }) => {
  await page.goto('/atenei.html');
  await expect(page).toHaveURL(/\/atenei$/);
  await page.goto('/area-studente.html?sezione=community');
  await expect(page).toHaveURL(/\/area-studente\/community/);
});

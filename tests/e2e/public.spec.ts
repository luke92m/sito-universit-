import { expect, test } from '@playwright/test';

// Percorsi pubblici: funzionano anche senza Supabase configurato.

test('home e navigazione principale', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('fa per te');
  await expect(page.getByText('nessun ateneo paga per comparire', { exact: true })).toBeVisible();
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

// Link completo ai risultati, come lo crea chi sceglie di includere fascia ISEE e città.
const FULL_LINK =
  '/trova-corso?mode=university&corso=course:economia-aziendale&livello=bachelor&regione=Lombardia' +
  '&citta=Pavia&pendolare=yes&mobilita=neighbors&isee=24000-26000&lingua=italian';

test('percorso completo senza account: risultati → confronto → iscrizione', async ({ page }) => {
  await page.goto(FULL_LINK);
  const cards = page.locator('.university-match-card');
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  await expect(cards.first().locator('.university-match-why li')).not.toHaveCount(0);
  // L'indirizzo dei risultati non conserva i dati personali.
  await expect(page).not.toHaveURL(/isee=|citta=/);

  await cards.nth(0).getByText('Confronta', { exact: true }).click();
  await cards.nth(2).getByText('Confronta', { exact: true }).click();
  await page.getByRole('link', { name: 'Confronta le 2 scelte' }).click();

  await expect(page).toHaveURL(/\/comparison\?mode=courses&a=.+&b=.+/);
  await expect(page.getByRole('heading', { name: 'Confronto tra corsi' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.neutrality-note')).toBeVisible();

  await page.locator('.comparison-next-step a').first().click();
  await expect(page).toHaveURL(/\/burocrazia\?ateneo=.+&corso=.+/);
  await expect(page.locator('.access-gate')).toHaveCount(0);
  await expect(page.locator('.bureaucracy-selector-card select')).not.toHaveValue('', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Crea la checklist' }).click();
  await expect(page.locator('.bureaucracy-result')).toBeVisible();

  await page.getByRole('link', { name: /Verifica le borse di studio/ }).click();
  await expect(page).toHaveURL(/\/borse\?ateneo=/);
  await expect(page.locator('.student-area-locked')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Verifica la possibilità' })).toBeVisible();
});

test('link condiviso senza dati personali: si risponde solo alle domande mancanti', async ({ page }) => {
  await page.goto(FULL_LINK.replace('&citta=Pavia', '').replace('&isee=24000-26000', ''));
  const finder = page.locator('#universityFinderPanel');
  await expect(finder.getByText('Domanda 3 di 7')).toBeVisible({ timeout: 20_000 });
  await expect(finder.locator('.university-inline-fields select')).toHaveValue('Lombardia');
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

test('funzioni spente: fuori dal menu e dagli indirizzi', async ({ page, request }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigazione principale' });
  await expect(nav.getByRole('link', { name: 'atenei' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'preparazione' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'scuole e aziende' })).toHaveCount(0);

  await page.goto('/preparazione');
  await expect(page).toHaveURL(/\/burocrazia$/);
  expect((await request.get('/scuole-aziende')).status()).toBe(404);
  expect((await request.get('/api/deadlines?universityId=x')).status()).toBe(404);

  // Le sezioni spente dell'area personale riportano alle borse, riservate agli utenti registrati.
  await page.goto('/area-studente/community');
  await expect(page).toHaveURL(/\/area-studente\/borse-di-studio$/);
  await expect(page.locator('.student-area-locked')).toBeVisible();

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/trova-corso');
  expect(sitemap).not.toContain('/preparazione');
  expect(sitemap).not.toContain('/scuole-aziende');
});

test('i vecchi URL .html reindirizzano', async ({ page }) => {
  await page.goto('/atenei.html');
  await expect(page).toHaveURL(/\/atenei$/);
  await page.goto('/area-studente.html?sezione=scadenze');
  await expect(page).toHaveURL(/\/area-studente\/scadenze/);
});

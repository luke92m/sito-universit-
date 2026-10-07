import { expect, test } from '@playwright/test';

// Flussi con account: richiedono Supabase configurato e un utente di test già confermato
// con situazione "Sono studente universitario" (E2E_USER_EMAIL / E2E_USER_PASSWORD).
const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('account', () => {
  test.skip(!email || !password, 'Utente di test non configurato (E2E_USER_EMAIL, E2E_USER_PASSWORD).');

  test('accesso, modifica del percorso e uscita', async ({ page }) => {
    await page.goto('/');
    await page.locator('.profile-button').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('nome@email.it').fill(email!);
    await dialog.getByPlaceholder('La tua password').fill(password!);
    await dialog.getByRole('button', { name: /Accedi/ }).click();
    await expect(page.locator('.profile-button.is-logged-in')).toBeVisible();

    await page.goto('/area-studente/dati-percorso');
    await page.getByRole('button', { name: /dati/ }).click();
    const journey = page.getByRole('dialog');
    await journey.getByLabel('Ateneo').click();
    await journey.getByRole('option').first().click();
    await journey.getByText('Già immatricolato').click();
    await journey.locator('select').last().selectOption('2');
    await journey.getByRole('button', { name: 'Salva il percorso' }).click();
    await expect(page.locator('.site-toast')).toHaveText('Dati del percorso aggiornati.');

    await page.goto('/area-studente/community');
    const text = `Messaggio di prova ${Date.now()}`;
    await page.locator('#communityText').fill(text);
    await page.getByRole('button', { name: 'Pubblica' }).click();
    await expect(page.getByText(text)).toBeVisible();
    await page.locator('.community-message', { hasText: text }).getByRole('button', { name: 'Elimina' }).click();
    await expect(page.getByText(text)).toBeHidden();

    await page.locator('.profile-button').click();
    await page.getByRole('menuitem', { name: /Esci dal profilo/ }).click();
    await expect(page.locator('.profile-button.is-logged-in')).toHaveCount(0);
  });
});

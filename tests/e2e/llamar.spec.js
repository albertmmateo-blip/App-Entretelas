const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Llamar E2E', () => {
  let app;
  let page;
  const sidebar = () => page.getByRole('navigation');

  const getCardByText = (text) =>
    page.locator('div[role="button"]').filter({ hasText: text }).first();

  const openCardMenu = async (text) => {
    const card = getCardByText(text);
    await expect(card).toBeVisible();
    await card.locator('button[aria-label="Abrir menú de acciones"]').click();
  };

  test.beforeEach(async () => {
    app = await launchApp();
    await cleanDatabase(app);
    page = app.testPage;
    await sidebar()
      .getByRole('link', { name: /Llamar/i })
      .click();
    await expect(page.getByRole('heading', { name: 'Llamar' })).toBeVisible();
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('create, mark urgent, and delete llamar entry', async () => {
    await page.getByRole('button', { name: '+ Nueva entrada' }).click();
    await page.getByLabel('Asunto *').fill('Test Call');
    await page.getByLabel('Contacto *').fill('555-1234');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const card = getCardByText('Test Call');
    await expect(card).toBeVisible();

    await openCardMenu('Test Call');
    await page.getByRole('button', { name: 'Marcar urgente' }).click();
    await expect(card.locator('span[title="Urgente"]')).toBeVisible();

    await openCardMenu('Test Call');
    await page.getByRole('button', { name: 'Eliminar' }).click();
    const deleteDialog = page.locator('.fixed.inset-0').last();
    await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();

    await expect(getCardByText('Test Call')).toHaveCount(0);
  });
});

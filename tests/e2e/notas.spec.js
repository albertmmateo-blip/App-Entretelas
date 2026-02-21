const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Notas E2E', () => {
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
    await sidebar().getByRole('link', { name: /Notas/i }).click();
    await expect(page.getByRole('heading', { name: 'Notas', exact: true })).toBeVisible();
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('create, edit, mark urgent, and delete nota', async () => {
    await page.getByRole('button', { name: '+ Nueva nota' }).click();
    await page.getByLabel('Nombre').fill('Test Nota');
    await page.getByLabel('Descripción').fill('Description');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const createdCard = getCardByText('Test Nota');
    await expect(createdCard).toBeVisible();

    await createdCard.click();
    await page.getByLabel('Nombre').fill('Updated Nota');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const updatedCard = getCardByText('Updated Nota');
    await expect(updatedCard).toBeVisible();

    await openCardMenu('Updated Nota');
    await page.getByRole('button', { name: 'Marcar urgente' }).click();
    await expect(updatedCard.locator('span[title="Urgente"]')).toBeVisible();

    await openCardMenu('Updated Nota');
    await page.getByRole('button', { name: 'Eliminar' }).click();
    const deleteDialog = page.locator('.fixed.inset-0').last();
    await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();

    await expect(getCardByText('Updated Nota')).toHaveCount(0);
  });
});

const path = require('path');
const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Facturas E2E', () => {
  let app;
  let page;

  test.beforeEach(async () => {
    app = await launchApp();
    await cleanDatabase(app);
    page = app.testPage;

    await page.evaluate(() => {
      window.location.hash = '#/facturas/compra';
    });

    await expect(page.getByRole('heading', { name: /Contabilidad Compra/i })).toBeVisible();
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('create supplier, upload invoice pdf, and delete it', async () => {
    await page.getByRole('button', { name: '+ Nuevo Proveedor' }).click();
    await page.getByLabel('Razón Social *').fill('Test Supplier');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await page.getByRole('button', { name: /Abrir carpeta de Test Supplier/i }).click();

    const fixturePath = path.resolve(__dirname, '../fixtures/test-invoice.pdf');
    await page.locator('input#pdf-upload').setInputFiles(fixturePath);

    await expect(page.getByText('test-invoice.pdf')).toBeVisible();

    const thumbnailCard = page.locator('div.group').filter({ hasText: 'test-invoice.pdf' }).first();
    await thumbnailCard.click({ button: 'right' });
    await thumbnailCard.locator('button[title="Eliminar archivo"]').click();

    const deleteDialog = page.locator('.fixed.inset-0').last();
    await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('test-invoice.pdf')).toHaveCount(0);
  });
});

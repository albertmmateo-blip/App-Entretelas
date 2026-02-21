const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Encargar E2E', () => {
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

    await page.evaluate(async () => {
      await window.electronAPI.proveedores.create({
        razon_social: 'Proveedor Encargar',
        nif: null,
        direccion: null,
      });
    });

    await sidebar()
      .getByRole('link', { name: /Encargar/i })
      .click();
    await expect(page.getByRole('heading', { name: 'Encargar', exact: true })).toBeVisible();
    await expect(getCardByText('Proveedor Encargar')).toBeVisible();
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('create, mark urgent, and delete encargar entry', async () => {
    await page.evaluate(async () => {
      const proveedores = await window.electronAPI.proveedores.getAll();
      const proveedor = (proveedores?.data || []).find(
        (item) => item.razon_social === 'Proveedor Encargar'
      );

      await window.electronAPI.encargar.create({
        proveedor_id: proveedor?.id || null,
        proveedor: 'Proveedor Encargar',
        articulo: 'Test Product',
        ref_interna: null,
        descripcion: null,
        ref_proveedor: null,
        urgente: false,
      });
    });

    await getCardByText('Proveedor Encargar').click();

    const card = getCardByText('Test Product');
    await expect(card).toBeVisible();

    await openCardMenu('Test Product');
    await page.getByRole('button', { name: 'Marcar urgente' }).click();
    await expect(card.locator('span[title="Urgente"]')).toBeVisible();

    await openCardMenu('Test Product');
    await page.getByRole('button', { name: 'Eliminar' }).click();
    const deleteDialog = page.locator('.fixed.inset-0').last();
    await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();

    await expect(getCardByText('Test Product')).toHaveCount(0);
  });
});

const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Encargar E2E', () => {
  let app;
  let page;
  const sidebar = () => page.getByRole('navigation');

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
    await expect(page.getByRole('button', { name: '📁 Proveedores' })).toBeVisible();
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('navigates to new provider form from Nuevo proveedor button', async () => {
    await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeVisible();
  });

  test('create, edit and delete provider note', async () => {
    const providerCard = () => page.getByRole('button', { name: /📁 Proveedor Encargar/i }).first();
    const editor = () => page.getByPlaceholder('Escribe aquí la nota del proveedor...');

    await page.getByRole('button', { name: '📁 Proveedores' }).click();
    await page.getByRole('menuitem', { name: '📁 Proveedor Encargar' }).click();

    if (!(await editor().isVisible())) {
      await expect(providerCard()).toBeVisible();
      await providerCard().click();
    }

    await expect(page.getByRole('heading', { name: /PEDIDO · Proveedor Encargar/i })).toBeVisible();
    await editor().fill('Primera nota libre');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Primera nota libre')).toBeVisible();

    await providerCard().click();
    await editor().fill('Nota actualizada');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Nota actualizada')).toBeVisible();

    await providerCard().click();
    await page.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('button', { name: 'Eliminar pedido' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).last().click();

    const emptyState = page.getByText(
      'Selecciona una carpeta desde “📁 Proveedores” o busca una en la barra superior para abrir su nota.'
    );
    const emptyEditor = page.getByPlaceholder('Escribe aquí la nota del proveedor...');

    // After deleting the last note, the UI can validly land in one of two states:
    // 1) Folder closes and the global empty-state hint is shown.
    // 2) Folder stays open in edit mode with an empty editor ready for a new note.
    // We accept either state, but always assert the deleted content is gone.
    await expect
      .poll(async () => {
        const hasEmptyState =
          (await emptyState.count()) > 0 && (await emptyState.first().isVisible());
        const hasEmptyEditor =
          (await emptyEditor.count()) > 0 && (await emptyEditor.first().isVisible());
        return hasEmptyState || hasEmptyEditor;
      })
      .toBe(true);
    await expect(page.getByText('Nota actualizada')).toHaveCount(0);
  });
});

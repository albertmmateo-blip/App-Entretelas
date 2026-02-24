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

  test('navigates to new provider form from Nueva carpeta button', async () => {
    await page.getByRole('button', { name: '+ Nueva carpeta' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo proveedor', exact: true })).toBeVisible();
  });

  test('create, edit and delete provider note', async () => {
    await page.getByRole('button', { name: '📁 Proveedores' }).click();
    await page.getByRole('menuitem', { name: '📁 Proveedor Encargar' }).click();

    const noteContainer = page.getByRole('button', { name: /📁 Proveedor Encargar/i });
    await expect(noteContainer).toBeVisible();
    await noteContainer.click();

    const editor = page.getByPlaceholder('Escribe aquí la nota del proveedor...');
    await editor.fill('Primera nota libre');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Primera nota libre')).toBeVisible();

    await noteContainer.click();
    await editor.fill('Nota actualizada');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Nota actualizada')).toBeVisible();

    await noteContainer.click();
    await page.getByRole('button', { name: 'Eliminar nota' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).last().click();

    await expect(
      page.getByText(
        'Selecciona una carpeta desde “📁 Proveedores” o busca una en la barra superior para abrir su nota.'
      )
    ).toBeVisible();

    await page.getByRole('button', { name: '📁 Proveedores' }).click();
    await page.getByRole('menuitem', { name: '📁 Proveedor Encargar' }).click();
    await expect(
      page.getByText('Haz clic para escribir una nota libre para este proveedor.')
    ).toBeVisible();
  });
});

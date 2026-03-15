const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Import/Export E2E', () => {
  let app;
  let page;

  test.beforeEach(async () => {
    app = await launchApp();
    await cleanDatabase(app);
    page = app.testPage;
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('shows visual progress feedback during import', async () => {
    await page.getByRole('button', { name: 'Ayuda' }).click();
    await page.getByRole('button', { name: /Importar datos/i }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!win || win.isDestroyed()) {
        return;
      }

      win.webContents.send('data:import-progress', {
        phase: 'importing',
        processedBytes: 4,
        totalBytes: 7,
        message: 'Importando documentos y adjuntos...',
      });
    });

    await expect(page.getByText('Importando...')).toBeVisible();
    await expect(page.getByText(/Importando documentos y adjuntos\.\.\./i)).toBeVisible();
  });
});

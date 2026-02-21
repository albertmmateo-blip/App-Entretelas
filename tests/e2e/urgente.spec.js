const { test, expect } = require('@playwright/test');
const { launchApp, cleanDatabase, closeApp } = require('./helpers');

test.describe('Urgente E2E', () => {
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

  const markCardUrgent = async (text) => {
    await openCardMenu(text);
    await page.getByRole('button', { name: 'Marcar urgente' }).click();
  };

  const deleteCard = async (text) => {
    await openCardMenu(text);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    const deleteDialog = page.locator('.fixed.inset-0').last();
    await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();
  };

  test.beforeEach(async () => {
    app = await launchApp();
    await cleanDatabase(app);
    page = app.testPage;

    await page.evaluate(async () => {
      const createdProveedor = await window.electronAPI.proveedores.create({
        razon_social: 'Urgent Supplier',
        nif: null,
        direccion: null,
      });

      const proveedorId = createdProveedor?.data?.id;
      await window.electronAPI.encargar.create({
        proveedor_id: proveedorId || null,
        proveedor: 'Urgent Supplier',
        articulo: 'Urgent Product',
        ref_interna: null,
        descripcion: null,
        ref_proveedor: null,
        urgente: true,
      });
    });

    await sidebar().getByRole('link', { name: /Notas/i }).click();
    await page.getByRole('button', { name: '+ Nueva nota' }).click();
    await page.getByLabel('Nombre').fill('Urgent Nota');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await markCardUrgent('Urgent Nota');

    await sidebar()
      .getByRole('link', { name: /Llamar/i })
      .click();
    await page.getByRole('button', { name: '+ Nueva entrada' }).click();
    await page.getByLabel('Asunto *').fill('Urgent Call');
    await page.getByLabel('Contacto *').fill('555-0001');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await markCardUrgent('Urgent Call');
  });

  test.afterEach(async () => {
    await closeApp(app);
  });

  test('shows grouped urgent entries and removes urgency correctly', async () => {
    await sidebar()
      .getByRole('link', { name: /URGENTE!/i })
      .click();

    await expect(page.getByRole('heading', { name: /URGENTE!/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Notas \(1\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Llamar \(1\)/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Encargar \(1\)/ })).toBeVisible();

    await expect(page.getByText('Urgent Nota')).toBeVisible();
    await expect(page.getByText('Urgent Call')).toBeVisible();
    await expect(page.getByText('Urgent Product')).toBeVisible();

    const notaRow = page.locator('div[role="button"]').filter({ hasText: 'Urgent Nota' }).first();
    await notaRow.getByRole('button', { name: 'Quitar urgencia' }).click();
    await expect(page.getByText('Urgent Nota')).toHaveCount(0);

    await sidebar().getByRole('link', { name: /Notas/i }).click();
    const notaCard = getCardByText('Urgent Nota');
    await expect(notaCard).toBeVisible();
    await expect(notaCard.locator('span[title="Urgente"]')).toHaveCount(0);

    await deleteCard('Urgent Nota');

    await sidebar()
      .getByRole('link', { name: /Llamar/i })
      .click();
    await deleteCard('Urgent Call');

    await page.evaluate(async () => {
      const encargarEntries = await window.electronAPI.encargar.getAll();
      for (const entry of encargarEntries?.data || []) {
        await window.electronAPI.encargar.delete(entry.id);
      }

      const proveedores = await window.electronAPI.proveedores.getAll();
      for (const proveedor of proveedores?.data || []) {
        await window.electronAPI.proveedores.delete(proveedor.id);
      }
    });

    await sidebar()
      .getByRole('link', { name: /URGENTE!/i })
      .click();
    await expect(page.getByText('No hay entradas urgentes')).toBeVisible();
  });
});

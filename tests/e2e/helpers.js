const path = require('path');
const fs = require('fs');
const os = require('os');
const { _electron: electron } = require('playwright');

async function launchApp() {
  const testUserDataDir = path.join(
    os.tmpdir(),
    `app-entretelas-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
  fs.mkdirSync(testUserDataDir, { recursive: true });

  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../../src/main/index.js'), `--user-data-dir=${testUserDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
  });

  const page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  electronApp.testPage = page;
  electronApp.testUserDataDir = testUserDataDir;

  return electronApp;
}

async function cleanDatabase(electronApp) {
  if (!electronApp) {
    return;
  }

  const page = electronApp.testPage || (await electronApp.firstWindow());

  await page.evaluate(async () => {
    const api = window.electronAPI;

    const safeData = async (promise) => {
      try {
        const result = await promise;
        return result?.success ? result.data || [] : [];
      } catch {
        return [];
      }
    };

    const notas = await safeData(api.notas.getAll());
    await Promise.all(notas.map((entry) => api.notas.delete(entry.id)));

    const llamar = await safeData(api.llamar.getAll());
    await Promise.all(llamar.map((entry) => api.llamar.delete(entry.id)));

    const encargar = await safeData(api.encargar.getAll());
    await Promise.all(encargar.map((entry) => api.encargar.delete(entry.id)));

    const proveedores = await safeData(api.proveedores.getAll());
    const clientes = await safeData(api.clientes.getAll());

    const filesFor = async (params) => safeData(api.facturas.getAllForEntidad(params));

    const allFacturas = [];

    for (const proveedor of proveedores) {
      const compra = await filesFor({ tipo: 'compra', entidadId: proveedor.id });
      const arreglos = await filesFor({ tipo: 'arreglos', entidadId: proveedor.id });
      allFacturas.push(...compra, ...arreglos);
    }

    for (const cliente of clientes) {
      const venta = await filesFor({ tipo: 'venta', entidadId: cliente.id });
      allFacturas.push(...venta);
    }

    const contabilidad = await filesFor({ tipo: 'contabilidad' });
    allFacturas.push(...contabilidad);

    const uniqueFacturas = Array.from(new Map(allFacturas.map((f) => [f.id, f])).values());
    await Promise.all(uniqueFacturas.map((pdf) => api.facturas.deletePDF(pdf.id)));

    await Promise.all(proveedores.map((entry) => api.proveedores.delete(entry.id)));
    await Promise.all(clientes.map((entry) => api.clientes.delete(entry.id)));
  });

  const dbPath = path.join(electronApp.testUserDataDir, 'entretelas.db');
  if (fs.existsSync(dbPath)) {
    try {
      fs.utimesSync(dbPath, new Date(), new Date());
    } catch {
      // no-op: file can be locked on Windows while app is running
    }
  }
}

async function closeApp(electronApp) {
  if (!electronApp) {
    return;
  }

  try {
    await electronApp.close();
  } finally {
    if (electronApp.testUserDataDir && fs.existsSync(electronApp.testUserDataDir)) {
      fs.rmSync(electronApp.testUserDataDir, { recursive: true, force: true });
    }
  }
}

module.exports = {
  launchApp,
  cleanDatabase,
  closeApp,
};

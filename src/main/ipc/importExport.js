const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const Database = require('better-sqlite3');
const {
  getDatabase,
  getDbPath,
  getFacturasDir,
  closeDatabaseForImport,
  reopenDatabase,
  createBackup,
} = require('../db/connection');

/**
 * Registers IPC handlers for data export and import.
 */
function registerImportExportHandlers() {
  /**
   * Handler: data:export
   * Creates a .zip bundle containing the SQLite database and all invoice PDFs.
   * Opens a native Save dialog for the user to choose the output location.
   */
  ipcMain.handle('data:export', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow();

      // Build default filename with timestamp
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}Z$/, '')
        .replace('T', '-');
      const defaultFilename = `entretelas-export-${timestamp}.zip`;

      const { canceled, filePath: savePath } = await dialog.showSaveDialog(win, {
        title: 'Exportar datos',
        defaultPath: defaultFilename,
        filters: [{ name: 'Archivo ZIP', extensions: ['zip'] }],
      });

      if (canceled || !savePath) {
        return { success: false, cancelled: true };
      }

      const dbPath = getDbPath();
      const facturasDir = getFacturasDir();

      // Ensure WAL is checkpointed so the .db file is self-contained
      try {
        const db = getDatabase();
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (err) {
        console.warn('WAL checkpoint skipped:', err.message);
      }

      // Create the zip archive
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(savePath);
        const archive = archiver('zip', { zlib: { level: 1 } }); // low compression — PDFs are already compressed

        output.on('close', resolve);
        archive.on('error', reject);
        archive.on('warning', (err) => {
          if (err.code !== 'ENOENT') reject(err);
        });

        archive.pipe(output);

        // Add the database file
        if (fs.existsSync(dbPath)) {
          archive.file(dbPath, { name: 'entretelas.db' });
        }

        // Add the facturas directory (if it exists)
        if (fs.existsSync(facturasDir)) {
          archive.directory(facturasDir, 'facturas');
        }

        archive.finalize();
      });

      return { success: true, filePath: savePath };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: { code: 'EXPORT_FAILED', message: error.message },
      };
    }
  });

  /**
   * Handler: data:import
   * Opens a native Open dialog, validates the selected .zip, backs up current data,
   * then replaces the database and facturas folder with the imported contents.
   */
  ipcMain.handle('data:import', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow();

      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Importar datos',
        filters: [{ name: 'Archivo ZIP de Entretelas', extensions: ['zip'] }],
        properties: ['openFile'],
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const zipPath = filePaths[0];
      const dbPath = getDbPath();
      const facturasDir = getFacturasDir();

      // ── 1. Validate zip contents ──────────────────────────────
      let zip;
      try {
        zip = new AdmZip(zipPath);
      } catch (err) {
        return {
          success: false,
          error: { code: 'INVALID_ZIP', message: 'El archivo no es un ZIP válido.' },
        };
      }

      const entries = zip.getEntries();
      const hasDb = entries.some((e) => e.entryName === 'entretelas.db');

      if (!hasDb) {
        return {
          success: false,
          error: {
            code: 'MISSING_DB',
            message: 'El archivo ZIP no contiene entretelas.db.',
          },
        };
      }

      // ── 2. Validate the DB file inside the zip ────────────────
      const dbBuffer = zip.readFile('entretelas.db');
      const tempDbPath = path.join(path.dirname(dbPath), 'entretelas-import-temp.db');

      try {
        fs.writeFileSync(tempDbPath, dbBuffer);
        const tempDb = new Database(tempDbPath, { readonly: true });

        // Check schema version — block importing a newer schema
        const importVersion = tempDb.pragma('user_version', { simple: true });
        const currentDb = getDatabase();
        const currentVersion = currentDb.pragma('user_version', { simple: true });

        tempDb.close();

        if (importVersion > currentVersion) {
          fs.unlinkSync(tempDbPath);
          return {
            success: false,
            error: {
              code: 'SCHEMA_TOO_NEW',
              message: `La exportación tiene esquema v${importVersion}, pero esta app soporta hasta v${currentVersion}. Actualiza la app primero.`,
            },
          };
        }
      } catch (err) {
        try {
          fs.unlinkSync(tempDbPath);
        } catch (_) {
          /* ignore */
        }
        return {
          success: false,
          error: {
            code: 'CORRUPT_DB',
            message: 'El archivo de base de datos dentro del ZIP está corrupto.',
          },
        };
      }

      // ── 3. Create backup of current data ──────────────────────
      createBackup(dbPath);

      // ── 4. Close database ─────────────────────────────────────
      closeDatabaseForImport();

      // ── 5. Replace database file ──────────────────────────────
      try {
        // The temp file is already validated — just rename it
        fs.copyFileSync(tempDbPath, dbPath);
        fs.unlinkSync(tempDbPath);
      } catch (err) {
        // Try to reopen old database on failure
        reopenDatabase();
        return {
          success: false,
          error: { code: 'REPLACE_DB_FAILED', message: err.message },
        };
      }

      // ── 6. Replace facturas folder ────────────────────────────
      const hasFacturas = entries.some((e) => e.entryName.startsWith('facturas/'));

      if (hasFacturas) {
        // Remove existing facturas directory
        if (fs.existsSync(facturasDir)) {
          fs.rmSync(facturasDir, { recursive: true, force: true });
        }

        // Extract facturas entries
        entries.forEach((entry) => {
          if (entry.entryName.startsWith('facturas/') && !entry.isDirectory) {
            const targetPath = path.join(path.dirname(dbPath), entry.entryName);
            const targetDir = path.dirname(targetPath);

            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            fs.writeFileSync(targetPath, entry.getData());
          }
        });
      }

      // ── 7. Reopen database and apply migrations ───────────────
      reopenDatabase();

      // ── 8. Reload the renderer window ─────────────────────────
      if (win) {
        win.reload();
      }

      return { success: true };
    } catch (error) {
      console.error('Import failed:', error);

      // Try to reopen the database no matter what
      try {
        reopenDatabase();
      } catch (_) {
        /* best effort */
      }

      return {
        success: false,
        error: { code: 'IMPORT_FAILED', message: error.message },
      };
    }
  });
}

module.exports = { registerImportExportHandlers };

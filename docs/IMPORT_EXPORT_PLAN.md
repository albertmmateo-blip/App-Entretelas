# Import / Export — Brainstorming & Plan

> **Branch:** `Import/Export`
> **Goal:** Let the user export all data from the _store_ installation of the app and import it into their _home_ installation (or vice-versa), so both machines stay in sync.

---

## 1. What needs to be exported?

| Data source                       | Storage today                 | Notes                                                                                                                                                                    |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SQLite database (`entretelas.db`) | `{userData}/entretelas.db`    | All tables: `notas`, `llamar`, `encargar`, `proveedores`, `clientes`, `facturas_pdf`, `arreglos`, `encargar_catalogo_*`, `secret_catalogo_*`, `guardado_*` + FTS indexes |
| Invoice PDFs                      | `{userData}/facturas/` folder | Binary files referenced by `facturas_pdf.ruta_relativa`                                                                                                                  |

Both pieces must travel together for the import to be complete.

---

## 2. Export format options

### Option A — Single `.zip` bundle (recommended)

```
entretelas-export-2026-02-26T1430.zip
├── entretelas.db          ← full SQLite copy
└── facturas/              ← all stored PDFs, preserving relative paths
    ├── compras/
    │   └── [Proveedor] - factura.pdf
    └── ventas/
        └── [Cliente] - factura.pdf
```

**Pros:** Single file to move via USB / cloud / email. Self-contained; easy to validate.
**Cons:** Could be large if many PDFs exist.

### Option B — JSON + PDFs in a `.zip`

Export each table as a JSON array, bundle PDFs alongside.

**Pros:** Human-readable data, easier to debug.
**Cons:** Requires serialization/deserialization logic per table; schema version must be embedded.

### Option C — Raw database copy only (no PDFs)

Simply copy `entretelas.db`.

**Pros:** Simplest.
**Cons:** PDFs would be missing on the target machine — broken references.

**Decision: Option A** is the best balance of simplicity and completeness. The existing backup system already copies the `.db` file, so we extend that pattern by also bundling the PDF folder.

---

## 3. Proposed UX flow

### 3.1 Export

1. User navigates to **Settings / Ajustes** (or a new section on Home).
2. Clicks **"Exportar datos"**.
3. A native **Save File** dialog opens (default name: `entretelas-export-YYYY-MM-DDTHHMM.zip`).
4. A progress indicator shows while the zip is being assembled.
5. On success, a toast confirms: _"Datos exportados correctamente"_.

### 3.2 Import

1. User clicks **"Importar datos"**.
2. A **confirmation dialog** warns: _"Esto reemplazará TODOS los datos actuales. ¿Continuar?"_
3. A native **Open File** dialog lets the user pick a `.zip`.
4. The app validates the zip (contains `entretelas.db`, optional `facturas/`).
5. The current database is backed up automatically (using existing `createBackup()`).
6. The DB file and PDFs are extracted into `{userData}/`.
7. The database connection is closed, replaced, reopened, and migrations are re-applied if the source was at a lower schema version.
8. The app reloads or prompts the user to restart.

---

## 4. Technical implementation plan

### 4.1 New files

| File                                              | Purpose                                          |
| ------------------------------------------------- | ------------------------------------------------ |
| `src/main/ipc/importExport.js`                    | IPC handlers for `data:export` and `data:import` |
| `src/renderer/components/ImportExportButtons.jsx` | UI buttons + confirmation dialog                 |

### 4.2 Modified files

| File                                     | Change                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `src/main/index.js`                      | Register `importExport` IPC handlers                                             |
| `src/preload/index.js`                   | Expose `data.export()` and `data.import()` to renderer                           |
| `src/main/db/connection.js`              | Export `getDbPath()` and `closeDatabaseForImport()` / `reopenDatabase()` helpers |
| `src/renderer/pages/Home/` (or Settings) | Mount `<ImportExportButtons />`                                                  |

### 4.3 Dependencies

| Package                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `archiver`                 | Create zip from DB + PDF folder (main process) |
| `adm-zip` or `extract-zip` | Extract zip on import (main process)           |

Both are pure-JS, no native compilation needed.

### 4.4 IPC channels

| Channel       | Direction       | Payload                                 | Response                         |
| ------------- | --------------- | --------------------------------------- | -------------------------------- |
| `data:export` | renderer → main | _none_ (triggers Save dialog from main) | `{ success, filePath?, error? }` |
| `data:import` | renderer → main | _none_ (triggers Open dialog from main) | `{ success, error? }`            |

### 4.5 Export logic (main process)

```
1. dialog.showSaveDialog({ defaultPath: `entretelas-export-${timestamp}.zip` })
2. If cancelled → return { success: false, cancelled: true }
3. Close WAL checkpoint: db.pragma('wal_checkpoint(TRUNCATE)')
4. Create zip stream → output to chosen path
   a. Add entretelas.db
   b. Add facturas/ directory (recursive)
5. Return { success: true, filePath }
```

### 4.6 Import logic (main process)

```
1. dialog.showOpenDialog({ filters: [{ name: 'Entretelas Export', extensions: ['zip'] }] })
2. If cancelled → return
3. Validate zip contents (must contain entretelas.db)
4. createBackup(currentDbPath)          ← safety net
5. db.close()                           ← release lock
6. Extract entretelas.db → {userData}/entretelas.db  (overwrite)
7. Extract facturas/ → {userData}/facturas/          (overwrite)
8. Reopen database, apply migrations
9. BrowserWindow.reload()               ← refresh UI
10. Return { success: true }
```

---

## 5. Edge cases & considerations

| Concern                                                 | Mitigation                                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Schema version mismatch**                             | After extracting the DB, `applyMigrations()` runs automatically — it upgrades older exports to the current schema. Importing a _newer_ schema into an _older_ app should be blocked (compare `user_version`). |
| **Large exports**                                       | Show a progress bar. Use streaming archiver to avoid loading everything into memory.                                                                                                                          |
| **Corrupt zip**                                         | Validate before overwriting: check for `entretelas.db` entry, try opening it with `better-sqlite3` in read-only mode before committing.                                                                       |
| **PDF path collisions**                                 | Full overwrite of the `facturas/` folder is safe because `ruta_relativa` in the DB matches the exported structure.                                                                                            |
| **Partial import failure**                              | The automatic backup taken in step 4 allows rollback via existing restore UI.                                                                                                                                 |
| **FTS indexes**                                         | They are virtual tables synced via triggers. After import, run `INSERT INTO notas_fts(notas_fts) VALUES('rebuild')` (and similar for other FTS tables) to ensure consistency.                                 |
| **Concurrent access**                                   | The export/import runs in the main process which owns the single DB connection — no concurrency issues.                                                                                                       |
| **Catalog images** (encargar_catalogo, secret_catalogo) | If these store images on disk, the export must also include those directories. Needs verification.                                                                                                            |

---

## 6. Merge strategy

This is an **offline sync** — the export is a full snapshot, not a delta. Import _replaces_ all data. There is no conflict resolution; the most recent export wins. This is appropriate for the "store → home" use case where only one machine is actively editing at a time.

If bidirectional editing becomes common, a future enhancement could do row-level merge based on `fecha_mod` timestamps, but that is out of scope for v1.

---

## 7. Next steps

- [ ] Install `archiver` and `adm-zip` (or `extract-zip`)
- [ ] Implement `src/main/ipc/importExport.js` with export + import handlers
- [ ] Add `closeDatabaseForImport()` / `reopenDatabase()` to `connection.js`
- [ ] Wire up preload API (`data.export`, `data.import`)
- [ ] Build `<ImportExportButtons />` component
- [ ] Add to Home page or create Settings page
- [ ] Write integration tests
- [ ] Test round-trip: export on machine A → import on machine B

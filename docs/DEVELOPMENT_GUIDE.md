# Development Guide

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| OS | Windows 10 (64-bit) | **Windows only** — the app is not supported on macOS or Linux |
| Node.js | 20 LTS | Use [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage versions |
| npm | 10+ | Bundled with Node.js 20 |
| Git | 2.40+ | [git-scm.com/download/win](https://git-scm.com/download/win) |
| Visual Studio Build Tools | 2022 | Required by `better-sqlite3` native bindings; install the "Desktop development with C++" workload |

> **Note:** Python 3 is also required by `node-gyp` (included in Visual Studio Build Tools installer). Run `npm config set python python3` after installation.

---

## 2. Initial Setup

```powershell
# 1. Clone the repository
git clone https://github.com/albertmmateo-blip/App-Entretelas.git
cd App-Entretelas

# 2. Install dependencies (native modules will be compiled for Electron)
npm install

# 3. Verify the dev build starts correctly
npm run dev
```

If `better-sqlite3` fails to build, ensure the Visual Studio Build Tools are installed and run:

```powershell
npm run rebuild-natives
# Internally: npx electron-rebuild -f -w better-sqlite3
```

---

## 3. Available Scripts

| Script | Command | Description |
|---|---|---|
| Dev | `npm run dev` | Starts Vite dev server + Electron with hot reload |
| Build | `npm run build` | Compiles renderer (Vite) + packages Electron app via electron-builder |
| Dist | `npm run dist` | Produces a Windows installer (NSIS) in `dist/` |
| Test | `npm test` | Runs Vitest (unit + component tests) |
| Lint | `npm run lint` | ESLint + Prettier check |
| Lint fix | `npm run lint:fix` | ESLint auto-fix + Prettier format |
| Rebuild natives | `npm run rebuild-natives` | Recompiles native Node modules for the current Electron version |

---

## 4. Project Structure Quick Reference

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full folder tree. Key entry points:

| File | Role |
|---|---|
| `src/main/index.js` | Electron main process entry |
| `src/preload/index.js` | contextBridge definitions |
| `src/renderer/main.jsx` | React DOM entry |
| `src/renderer/App.jsx` | Router + sidebar layout |
| `src/main/db/connection.js` | SQLite connection + migration runner |

---

## 5. Environment Variables

Create a `.env` file at the project root (not committed — add to `.gitignore`):

```env
# Optional: override the userData path during development
ENTRETELAS_DATA_DIR=C:\Users\<YourUser>\AppData\Local\App-Entretelas-dev
```

In production the app uses `app.getPath('userData')` automatically.

---

## 6. Database

- Location (production): `%APPDATA%\App-Entretelas\entretelas.db`
- Location (dev, if `ENTRETELAS_DATA_DIR` is set): the path defined above.
- To reset the database during development, stop the app and delete the `.db` file; migrations will recreate it on next start.
- PDF storage root: `%APPDATA%\App-Entretelas\facturas\`

---

## 7. Building a Distributable

```powershell
npm run dist
```

This invokes `electron-builder` which:
1. Runs `npm run build` (Vite production build).
2. Packages the app into `dist/win-unpacked/`.
3. Creates an NSIS installer at `dist/App-Entretelas Setup x.y.z.exe`.

`electron-builder` configuration lives in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.entretelas.app",
    "productName": "App-Entretelas",
    "win": {
      "target": "nsis",
      "icon": "src/renderer/assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 8. Testing

Tests live in `tests/`:

```
tests/
├── unit/           # Pure function tests (db helpers, path sanitisers, etc.)
└── component/      # React Testing Library tests for UI components
```

Run all tests:

```powershell
npm test
```

Run tests in watch mode:

```powershell
npm run test:watch
```

Generate a coverage report:

```powershell
npm run test:coverage
```

---

## 9. Linting & Formatting

The project uses **ESLint** (airbnb config) and **Prettier**. Both run as a pre-commit hook via `lint-staged`.

To check manually:

```powershell
npm run lint
```

To auto-fix:

```powershell
npm run lint:fix
```

---

## 10. Branching & PR Rules

1. Work on a feature branch: `git checkout -b feature/<short-description>`.
2. Keep PRs focused on a single feature or fix.
3. Every PR **must** pass `npm run lint` and `npm test` in CI before merging.
4. After merging, follow the documentation update rules in [PROMPTS.md](../PROMPTS.md).

---

## 11. Troubleshooting

| Problem | Solution |
|---|---|
| `better-sqlite3` fails to install | Run `npm run rebuild-natives`; ensure Visual Studio Build Tools 2022 are installed |
| Blank white window on dev start | Wait for the Vite server to fully start; Electron retries automatically |
| PDFs not loading | Check that `ENTRETELAS_DATA_DIR` points to an existing directory |
| Gmail webview blocked | Ensure the Content Security Policy in `index.html` allows `https://mail.google.com` |

---

## 12. Adding Database Migrations

When adding a new field or table:

1. Create a new migration file: `src/main/db/migrations/00X_description.sql`
   - Use next sequential number (e.g., if `001_init.sql` exists, create `002_add_notas_archivado.sql`)
   - Name describes the change clearly

2. Write **additive SQL only** (v1 does not support rollbacks):
   ```sql
   -- ✅ Good: Add new optional column
   ALTER TABLE notas ADD COLUMN archivado INTEGER NOT NULL DEFAULT 0;

   -- ✅ Good: Add new table
   CREATE TABLE IF NOT EXISTS settings (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL
   );

   -- ❌ Bad: Remove or rename columns (breaks old app versions)
   -- ALTER TABLE notas DROP COLUMN nombre;
   -- ALTER TABLE notas RENAME COLUMN nombre TO titulo;
   ```

3. Update `docs/DATA_MODEL.md` with new schema

4. Update corresponding IPC handlers to support new field/table

5. Test migration:
   - Copy production database to test environment
   - Run app with new migration
   - Verify `user_version` PRAGMA incremented: `SELECT * FROM pragma_user_version;`
   - Verify data integrity (existing rows unchanged)
   - Test new functionality that uses the new field/table

6. **If migration fails:** DO NOT modify the migration file
   - Instead, create a new migration to fix the issue
   - Example: if `002_add_field.sql` has a typo, create `003_fix_field.sql`

---

## 13. Updating Dependencies

### Electron Version Updates

Electron follows Chromium release cycle (new major every 8 weeks). Updating requires:

1. Check Electron release notes: https://releases.electronjs.org/
2. Review breaking changes for your version jump
3. Update `package.json`: `"electron": "^XX.0.0"`
4. Rebuild native modules: `npm run rebuild-natives`
5. Test critical areas:
   - IPC handlers (especially `contextBridge` APIs - Electron sometimes changes these)
   - Webview (often breaks due to Chromium changes)
   - Window management (check `BrowserWindow` options still work)
   - File I/O operations
6. Update `docs/ARCHITECTURE.md` to note new Electron version

### React Version Updates

1. Check React changelog: https://react.dev/blog
2. Update `package.json`: `"react": "^XX.0.0"`, `"react-dom": "^XX.0.0"`
3. Run tests: component tests may break on React updates
4. Check for deprecated lifecycle methods or hooks
5. Test in development mode for any warnings
6. Update `docs/ARCHITECTURE.md`

### Vite Version Updates

1. Check Vite migration guide: https://vitejs.dev/guide/migration.html
2. Update `vite.config.js` per migration guide (Vite often changes config structure between majors)
3. Test HMR in development: `npm run dev` → make code change → verify hot reload works
4. Test production build: `npm run build` → `npm run dist`
5. Verify Electron app still launches after build

### Security Updates

Run `npm audit` regularly (at least monthly):

```powershell
npm audit                    # Check for vulnerabilities
npm audit fix                # Auto-fix non-breaking updates
npm audit fix --force        # Fix breaking updates (TEST THOROUGHLY after)
```

For `better-sqlite3` security updates:
- Check GitHub releases: https://github.com/WiseLibs/better-sqlite3/releases
- Native modules require rebuild: `npm install better-sqlite3@latest && npm run rebuild-natives`
- Test database operations after update

For `pdfjs-dist` security updates:
- Check GitHub releases: https://github.com/mozilla/pdf.js/releases
- Test PDF thumbnail generation with sample PDFs after update
- Verify Web Worker still loads correctly

---

## 14. Debugging Production Issues

### Logs

Electron logs should be written to:
- **Windows:** `%APPDATA%\App-Entretelas\logs\main.log` (main process)
- **Windows:** `%APPDATA%\App-Entretelas\logs\renderer.log` (renderer process)

To enable logging (recommended for production):

1. Install: `npm install electron-log`
2. In `src/main/index.js`:
   ```javascript
   import log from 'electron-log';
   log.transports.file.level = 'info';
   log.info('App started');
   ```
3. In renderer (forward to main via IPC):
   ```javascript
   window.electronAPI.log = (level, message) =>
     ipcRenderer.send('log', level, message);
   ```
4. In main IPC handler:
   ```javascript
   ipcMain.on('log', (event, level, message) => {
     log[level](message);
   });
   ```

### Crash Reports

Use Electron's built-in crash reporter (future enhancement):

1. Configure `crashReporter.start()` in main process
2. Send reports to self-hosted server (not public service for privacy)
3. Store crash dumps in `{userData}/crashDumps/`

### Common Issues

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| App won't start | Check logs in `%APPDATA%\App-Entretelas\logs\` | Look for errors on startup |
| Database locked | Another instance running? | Close all instances, restart |
| PDFs not displaying | Check PDF file permissions | Verify files exist in `{userData}/facturas/` |
| Webview blank | Gmail blocked by firewall? | Check network, try different network |
| Slow performance | Large database? | Run `VACUUM` on SQLite database |

### Performance Profiling

1. **Database queries:** Add query timing:
   ```javascript
   const start = Date.now();
   const rows = db.prepare('SELECT ...').all();
   log.info(`Query took ${Date.now() - start}ms`);
   ```

2. **React components:** Use React DevTools Profiler in development

3. **Memory leaks:** Use Chrome DevTools (Electron includes Chromium):
   - In main process: `--inspect` flag
   - In renderer: `Ctrl+Shift+I` → Memory tab

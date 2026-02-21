# Development Guide

## 1. Prerequisites

| Tool                      | Minimum Version     | Notes                                                                                             |
| ------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| OS                        | Windows 10 (64-bit) | **Windows only** — the app is not supported on macOS or Linux                                     |
| Node.js                   | 20 LTS              | Use [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage versions                  |
| npm                       | 10+                 | Bundled with Node.js 20                                                                           |
| Git                       | 2.40+               | [git-scm.com/download/win](https://git-scm.com/download/win)                                      |
| Visual Studio Build Tools | 2022                | Required by `better-sqlite3` native bindings; install the "Desktop development with C++" workload |

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

| Script          | Command                        | Description                                                           |
| --------------- | ------------------------------ | --------------------------------------------------------------------- |
| Dev             | `npm run dev`                  | Rebuilds native modules for Electron, then starts Vite + Electron     |
| Build           | `npm run build`                | Compiles renderer (Vite) + packages Electron app via electron-builder |
| Dist            | `npm run dist`                 | Produces a Windows installer (NSIS) in `dist/`                        |
| Test            | `npm test`                     | Rebuilds native modules for Node, then runs Vitest                    |
| Lint            | `npm run lint`                 | ESLint + Prettier check                                               |
| Lint fix        | `npm run lint:fix`             | ESLint auto-fix + Prettier format                                     |
| Rebuild (Node)  | `npm run rebuild-natives:node` | Recompiles native modules for the current Node runtime                |
| Rebuild natives | `npm run rebuild-natives`      | Recompiles native Node modules for the current Electron version       |

---

## 4. Project Structure Quick Reference

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full folder tree. Key entry points:

| File                        | Role                                 |
| --------------------------- | ------------------------------------ |
| `src/main/index.js`         | Electron main process entry          |
| `src/preload/index.js`      | contextBridge definitions            |
| `src/renderer/main.jsx`     | React DOM entry                      |
| `src/renderer/App.jsx`      | Router + sidebar layout              |
| `src/main/db/connection.js` | SQLite connection + migration runner |

### Naming convention (important)

- The user-facing label for the module is **Contabilidad**.
- The technical namespace remains **Facturas** and must stay as `facturas` in:
  - file/folder names,
  - IPC channel names,
  - database objects (for example `facturas_pdf`),
  - on-disk storage paths (for example `{userData}/facturas/...`).
- This is intentional for backward compatibility; do not migrate technical identifiers to `contabilidad`.

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
- Facturas PDF path pattern: `%APPDATA%\App-Entretelas\facturas\<compra|venta>\<entidad_sanitizada>\[Proveedor|Client] - [archivo].pdf`
- `facturas_pdf` stores metadata only; editable fields are `importe`, `importe_iva_re`, `vencimiento`, and `pagada`.

---

## 7. Building a Distributable

Confirmed electron-builder configuration in `package.json` under the `build` key:

```json
{
  "build": {
    "appId": "com.entretelas.app",
    "productName": "App-Entretelas",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": ["dist-renderer/**/*", "src/main/**/*", "src/preload/**/*", "package.json"],
    "win": {
      "target": "nsis",
      "icon": "src/renderer/assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

Build command:

```powershell
npm run dist
```

This invokes `electron-builder` which:

1. Runs `npm run build` (Vite production build).
2. Packages the app into `dist/win-unpacked/`.
3. Creates an NSIS installer at `dist/App-Entretelas Setup x.y.z.exe`.

Output location: `dist/App-Entretelas Setup x.y.z.exe`.

Manual testing steps:

To verify installer on target machine: (1) Copy `.exe` to Windows 10+ machine, (2) Run installer, (3) Choose installation directory, (4) Complete installation, (5) Launch app from Start Menu, (6) Verify app opens, database initializes, and sidebar renders correctly.

---

## 8. Testing

Tests live in `tests/`:

```
tests/
├── unit/           # Pure function tests (db helpers, path sanitisers, etc.)
├── component/      # React Testing Library tests for UI components
├── e2e/            # End-to-end tests using Playwright for Electron
│   ├── helpers.js      # E2E helpers (launchApp, cleanDatabase, closeApp)
│   ├── notas.spec.js
│   ├── llamar.spec.js
│   ├── encargar.spec.js
│   ├── urgente.spec.js
│   ├── facturas.spec.js
│   └── gmail.spec.js
├── helpers/        # Shared test utilities
│   ├── db.js       # Database helpers for testing
│   ├── ipc-mock.js # IPC mocking utilities
│   └── e2e.js      # Legacy E2E helpers
└── fixtures/       # Test data and files
    ├── sample-data.js    # Factory functions for test entities
    └── test-invoice.pdf  # Sample PDF for testing
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

`npm run test:coverage` runs Vitest suites and excludes `tests/e2e/**`.

Run Playwright E2E suite:

```powershell
npm run test:e2e
```

Run a single E2E test file:

```powershell
npx playwright test tests/e2e/notas.spec.js
```

Debug E2E tests with Playwright Inspector:

```powershell
npx playwright test tests/e2e/facturas.spec.js --debug
```

You can also step through headed mode and keep traces:

```powershell
npx playwright test tests/e2e/urgente.spec.js --headed --trace on
```

### Test Utilities

The project provides several helper utilities for consistent testing across modules.

#### Database Helpers (`tests/helpers/db.js`)

For unit and integration tests that need database access:

```javascript
const { createTestDb, seedTestData, clearTable } = require('../helpers/db');

describe('Database Tests', () => {
  let db;

  beforeEach(() => {
    // Create in-memory database with migrations applied
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('should insert and retrieve data', () => {
    // Insert test data
    seedTestData(db, 'notas', [{ nombre: 'Test', descripcion: 'Description', urgente: 0 }]);

    // Query and verify
    const rows = db.prepare('SELECT * FROM notas').all();
    expect(rows).toHaveLength(1);
  });

  it('should clear table data', () => {
    seedTestData(db, 'notas', [{ nombre: 'Test', urgente: 0 }]);
    clearTable(db, 'notas');

    const rows = db.prepare('SELECT * FROM notas').all();
    expect(rows).toHaveLength(0);
  });
});
```

**Available functions:**

- `createTestDb()` - Returns an in-memory SQLite connection with all migrations applied
- `seedTestData(db, tableName, rows)` - Inserts array of objects into specified table
- `clearTable(db, tableName)` - Truncates table and resets autoincrement counter

#### IPC Mocking (`tests/helpers/ipc-mock.js`)

For component tests that call `window.electronAPI`:

```javascript
import { setupIPCMock, teardownIPCMock, mockIPCResponse } from '../helpers/ipc-mock';
import { createNota } from '../fixtures/sample-data';

describe('Notas Component', () => {
  beforeEach(() => {
    setupIPCMock();
  });

  afterEach(() => {
    teardownIPCMock();
  });

  it('should fetch and display notas', async () => {
    // Set up mock response
    mockIPCResponse('notas:getAll', {
      success: true,
      data: [createNota({ nombre: 'Test Nota' })],
    });

    // Render component and verify
    render(<NotasList />);
    await waitFor(() => {
      expect(screen.getByText('Test Nota')).toBeInTheDocument();
    });
  });

  it('should handle dynamic responses', async () => {
    // Mock with a function for dynamic responses
    mockIPCResponse('notas:create', (data) => ({
      success: true,
      data: { id: 1, ...data },
    }));

    // Test component behavior...
  });
});
```

**Available functions:**

- `setupIPCMock()` - Initializes `window.electronAPI` mock, call in `beforeEach`
- `teardownIPCMock()` - Cleans up mock, call in `afterEach`
- `mockIPCResponse(channel, response)` - Sets mock response for IPC channel
- `clearIPCMocks()` - Clears all mock responses
- `createMockElectronAPI()` - Creates mock API object (used internally by `setupIPCMock`)

#### Test Data Factories (`tests/fixtures/sample-data.js`)

Factory functions for creating test entities with sensible defaults:

```javascript
import {
  createNota,
  createLlamar,
  createEncargar,
  createProveedor,
  createCliente,
  createMany,
  createFullTestData,
} from '../fixtures/sample-data';

// Create single entity with defaults
const nota = createNota();
// { nombre: 'Test Nota', descripcion: '...', contacto: '...', urgente: 0 }

// Override specific fields
const urgentNota = createNota({ nombre: 'Urgent Note', urgente: 1 });

// Create multiple entities
const notas = createMany(createNota, 5, (index) => ({
  nombre: `Nota ${index + 1}`,
}));

// Create full dataset for all modules
const testData = createFullTestData();
// Returns: { notas: [...], llamar: [...], encargar: [...], proveedores: [...], clientes: [...] }
```

**Available factories:**

- `createNota(overrides)` - Creates nota with default values
- `createLlamar(overrides)` - Creates llamar entry with default values
- `createEncargar(overrides)` - Creates encargar entry with default values
- `createProveedor(overrides)` - Creates proveedor with default values
- `createCliente(overrides)` - Creates cliente with default values
- `createMany(factoryFn, count, overridesFn)` - Creates multiple entities
- `createFullTestData()` - Returns complete dataset for all modules

#### E2E Test Helpers (`tests/helpers/e2e.js`)

For end-to-end tests with Playwright (once E2E tests are implemented):

```javascript
const { launchApp, cleanDatabase, closeApp } = require('../helpers/e2e');

describe('E2E: Notas Flow', () => {
  let app;

  beforeEach(async () => {
    app = await launchApp();
    await cleanDatabase(app);
  });

  afterEach(async () => {
    await closeApp(app);
  });

  it('should create and display a nota', async () => {
    const window = app.testWindow;

    // Navigate and interact with app
    await window.click('text=Notas');
    await window.click('text=Nueva');
    await window.fill('[name="nombre"]', 'Test Nota');
    await window.click('button:has-text("Guardar")');

    // Verify
    await window.waitForSelector('text=Test Nota');
  });
});
```

**Available functions:**

- `launchApp()` - Starts Electron app in test mode with temporary user data directory
- `cleanDatabase(electronApp)` - Deletes test database for fresh state
- `closeApp(electronApp)` - Closes app and cleans up temporary files

#### Test Fixtures

**Sample PDF** (`tests/fixtures/test-invoice.pdf`)

A minimal valid PDF (< 1 KB) for testing PDF upload and thumbnail generation:

```javascript
const fs = require('fs');
const path = require('path');

const testPdfPath = path.join(__dirname, '../fixtures/test-invoice.pdf');
const pdfBuffer = fs.readFileSync(testPdfPath);

// Use in tests...
```

---

## 9. Linting & Formatting

The project uses **ESLint** (airbnb config) and **Prettier**. Both run as a pre-commit hook via `lint-staged`.

### Commit-Safety Rule (for humans and AI agents)

Any change is considered complete only if it can be committed without breaking hooks. Agents must not stop at “code compiles”; they must leave the tree in a commit-ready state.

To check manually:

```powershell
npm run lint
```

To auto-fix:

```powershell
npm run lint:fix
```

If `husky`/`lint-staged` fails repeatedly while committing, use this sequence:

```powershell
npm run lint:fix
git add -A
git commit -m "<mensaje>"
```

This avoids partial-staging stash/restore conflicts and ensures the committed snapshot is the same one that passed lint.

#### Prevent recurring hook regressions

- Prefer explicit normalization helpers over nested ternary chains in IPC handlers. This avoids repeat `no-nested-ternary` failures after formatting.
- Do not silence lint rules to pass commits; fix root-cause code structure instead.
- Before finishing a session, re-run `npm run lint` after all edits (including formatter changes) and only then report completion.
- If lint reports `prettier/prettier` with `Delete ␍`, normalize line endings before committing:

```powershell
git add --renormalize .
npm run lint
```

- Keep `.gitattributes` enforcement intact (`eol=lf` for source/docs) so future sessions do not reintroduce CRLF hook failures.

---

## 10. Branching & PR Rules

1. Work on a feature branch: `git checkout -b feature/<short-description>`.
2. Keep PRs focused on a single feature or fix.
3. Every PR **must** pass `npm run lint` and `npm test` in CI before merging.
4. After merging, follow the documentation update rules in [PROMPTS.md](../PROMPTS.md).

---

## 11. Troubleshooting

| Problem                                          | Solution                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `better-sqlite3` fails to install                | Run `npm run rebuild-natives`; ensure Visual Studio Build Tools 2022 are installed                          |
| `NODE_MODULE_VERSION` mismatch between app/tests | Run `npm run dev` before app use (Electron ABI) and `npm test` before test runs (Node ABI)                  |
| Blank white window on dev start                  | Wait for the Vite server to fully start; Electron retries automatically                                     |
| PDFs not loading                                 | Verify `facturas:getPDFBytes` receives a valid `ruta_relativa` and file exists under `{userData}/facturas/` |
| Gmail webview blocked                            | Ensure the Content Security Policy in `index.html` allows `https://mail.google.com`                         |

### Electron 30 Compatibility

#### better-sqlite3 Compatibility

**Verified Compatible:** better-sqlite3@12.6.2 (latest) is fully compatible with Electron 30.5.1.

- **Node.js Version:** Electron 30 uses Node.js 20.x, which matches better-sqlite3's requirement of Node.js 20.x+
- **Native Module Compilation:** better-sqlite3 uses native C++ bindings that must be compiled specifically for Electron
- **Rebuild Required:** After installing or updating better-sqlite3, run `npm run rebuild-natives` to recompile for Electron's Node.js ABI

**Installation Steps:**

1. Ensure Visual Studio Build Tools 2022 are installed (required for native compilation)
2. Install the package: `npm install better-sqlite3`
3. Rebuild for Electron: `npm run rebuild-natives`
4. Verify the module loads: Start the app in dev mode (`npm run dev`) and check console for errors

**Common Issues:**

- **Error: "The module was compiled against a different Node.js version"**
  - Solution: Run `npm run rebuild-natives` to recompile for Electron's Node.js version
- **Error: "Cannot find module 'better-sqlite3'"**
  - Solution: Ensure the module is listed in dependencies (not devDependencies) and run `npm install`
- **Build fails with MSBuild errors**
  - Solution: Install Visual Studio Build Tools 2022 with "Desktop development with C++" workload

#### Vite Hot Module Replacement (HMR)

**Verified Working:** Vite 5.4.21 HMR functions correctly with Electron 30 in development mode.

**Configuration Notes:**

- Vite config must use `.mjs` extension or be ESM-compatible due to `@vitejs/plugin-react` being ESM-only
- The dev server runs on `http://localhost:5173` and Electron loads this URL in development
- React Fast Refresh is automatically enabled through `@vitejs/plugin-react`

**Testing HMR:**

1. Start dev server: `npm run dev`
2. Modify any React component in `src/renderer/`
3. Save the file
4. Observe the browser window updates without full page reload
5. Component state is preserved during hot updates

**HMR Troubleshooting:**

- **Changes not reflecting:** Check browser console for Vite connection errors; ensure port 5173 is not blocked
- **Full page reload instead of HMR:** React components must use function or class syntax with proper export
- **Vite config errors:** Ensure `vite.config.mjs` uses ESM syntax (import/export) not CommonJS (require/module.exports)

#### Known Electron 30 Issues

**ASAR Integrity Bypass (Moderate Severity):**

- **Advisory:** [GHSA-vmqv-hx8q-j7mg](https://github.com/advisories/GHSA-vmqv-hx8q-j7mg)
- **Status:** Accepted risk for v1.0.x (see SECURITY.md for justification)
- **Mitigation:** Standard Windows file permissions and deployment to trusted environments
- **Resolution:** Will be addressed in future versions when upgrading to Electron 35+

#### Migration Path to Newer Electron Versions

When upgrading from Electron 30 to newer versions:

1. **Review Breaking Changes:**
   - Check Electron release notes: https://releases.electronjs.org/
   - Note API changes affecting: BrowserWindow, contextBridge, ipcMain/ipcRenderer

2. **Update Dependencies:**

   ```powershell
   npm install electron@latest
   npm run rebuild-natives
   ```

3. **Test Critical Functionality:**
   - Window creation and state persistence
   - IPC communication between main and renderer
   - Native module loading (better-sqlite3)
   - Vite development server integration
   - Webview functionality (Gmail embed)

4. **Update Documentation:**
   - Update this section with new version number
   - Document any new compatibility issues or workarounds
   - Update SECURITY.md if new vulnerabilities are addressed

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
2. Update `vite.config.mjs` per migration guide (Vite often changes config structure between majors)
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
   window.electronAPI.log = (level, message) => ipcRenderer.send('log', level, message);
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

| Issue               | Diagnosis                                      | Solution                                                                                            |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| App won't start     | Check logs in `%APPDATA%\App-Entretelas\logs\` | Look for errors on startup                                                                          |
| Database locked     | Another instance running?                      | Close all instances, restart                                                                        |
| PDFs not displaying | Invalid bytes/path or unreadable PDF           | Confirm `ruta_relativa` is valid, file exists, and check `facturas:getPDFBytes` errors in main logs |
| Webview blank       | Gmail blocked by firewall?                     | Check network, try different network                                                                |
| Slow performance    | Large database?                                | Run `VACUUM` on SQLite database                                                                     |

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

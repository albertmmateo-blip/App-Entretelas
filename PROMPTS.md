# PROMPTS

This file contains an ordered sequence of AI agent prompts for incrementally building App-Entretelas. Each prompt is self-contained and builds on the work of the previous ones.

---

## Agent Rules (READ BEFORE EVERY PROMPT)

1. **Read the documentation first.** Before writing any code, read `README.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/UI_DESIGN.md`, and `docs/DEVELOPMENT_GUIDE.md`.
2. **Minimal changes only.** Change as few files as possible to satisfy the prompt. Do not refactor unrelated code.
3. **Update documentation after each PR.** After every merged PR, update any affected section(s) in `docs/`. If a requirement changes, update `docs/REQUIREMENTS.md`. If the schema changes, update `docs/DATA_MODEL.md`. If the architecture changes, update `docs/ARCHITECTURE.md`.
4. **Update this file (PROMPTS.md) after each PR.** Mark the completed prompt with `[x]` and add any follow-on prompts that were discovered during implementation.
5. **Never break existing tests.** Run `npm test` and `npm run lint` before opening a PR.
6. **Windows only.** The app targets Windows 10+. Do not add macOS- or Linux-specific code or build targets.
7. **Spanish UI.** All user-facing text must be in Spanish.
8. **Parameterised SQL only.** Never concatenate user input into SQL strings.
9. **IPC input validation.** All IPC handlers must validate input payloads: check required fields are present and of correct type; sanitize string inputs (trim, check length limits); validate numeric inputs are within acceptable ranges; return structured error responses `{ success: false, error: { code, message } }` for invalid inputs.
10. **Process boundary enforcement.** Main process ONLY: SQLite queries, file I/O, native OS APIs. Preload script ONLY: `contextBridge.exposeInMainWorld` definitions. Renderer ONLY: React components, UI state, `window.electronAPI` calls. NEVER import Node.js modules (`fs`, `path`, etc.) or `better-sqlite3` or Electron main APIs in renderer code.
11. **Testing requirements for each module.** Unit tests: pure functions (path sanitizers, validators). Integration tests: IPC handler → DB query → response (test in main process context with in-memory DB). Component tests: UI rendering and user interactions (mock IPC responses). E2E tests: critical user journeys (one per major module).

---

## Prompt Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed

---

## Phase 1 – Project Scaffolding

### P1-01 — Initialise the Electron + React + Vite project `[ ]`

> Scaffold a new Electron 30 + React 18 + Vite project.
>
> Requirements:
> - Use `npm init` or the `electron-vite` scaffolding tool.
> - Configure `contextIsolation: true` and `nodeIntegration: false` in the `BrowserWindow` options.
> - Create `src/main/index.js`, `src/preload/index.js`, `src/renderer/main.jsx`, and `src/renderer/index.html` per the folder structure in `docs/ARCHITECTURE.md`.
> - Add Tailwind CSS with the configuration described in `docs/UI_DESIGN.md`.
> - Add ESLint (airbnb config) and Prettier; configure `lint-staged` + `husky` pre-commit hook.
> - Add Vitest and React Testing Library.
> - Add Content Security Policy in `src/renderer/index.html`: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;">` (will be extended in later prompts for webview).
> - Register app lifecycle handlers in `src/main/index.js`: `app.on('window-all-closed')` → quit app on Windows, `app.on('second-instance')` → prevent multiple instances by focusing existing window.
> - Implement window state persistence using `electron-window-state` package: install `npm install electron-window-state`, save window bounds to `{userData}/window-state.json` on close, restore on launch.
> - Ensure `npm run dev`, `npm test`, and `npm run lint` all pass with no errors.
> - Success criteria: app window opens with `document.title === 'App-Entretelas'` and browser console shows no errors.
> - Update `docs/DEVELOPMENT_GUIDE.md` with the verified bootstrap commands.

### P1-01a — Verify dependency versions and security configuration `[ ]`

> Validate that all dependencies are compatible and securely configured.
>
> Requirements:
> - Verify Electron 30 compatibility with `better-sqlite3`: check GitHub issues/compatibility matrix at https://github.com/WiseLibs/better-sqlite3#electron. Document findings in `docs/DEVELOPMENT_GUIDE.md §11`.
> - Add package.json script: `"audit:security": "npm audit --production"`.
> - Run `npm audit --production` and ensure no high/critical vulnerabilities. If vulnerabilities exist, either update packages or document accepted risks with justification in a new file `SECURITY.md`.
> - Test that Vite HMR works correctly with Electron: modify a React component, save, verify hot reload without full app restart.
> - Create `.npmrc` file with `audit-level=moderate` to fail CI builds on moderate+ vulnerabilities.
> - Update `docs/DEVELOPMENT_GUIDE.md §11` with troubleshooting section for common Electron 30 compatibility issues.

### P1-02 — Application shell: sidebar navigation + routing `[ ]`

> Implement the application shell described in `docs/UI_DESIGN.md §2`.
>
> Requirements:
> - Install `react-router-dom` v6.
> - Create `src/renderer/App.jsx` with a persistent sidebar (72 px wide) containing icon + label links for: URGENTE!, Notas, Llamar, Encargar, Facturas, E-mail — in that order.
> - Register all routes listed in `docs/UI_DESIGN.md §12`. Create placeholder components in `src/renderer/pages/`: `Home/index.jsx` → `<div><h1>Home</h1></div>`, `Urgente/index.jsx` → `<div><h1>URGENTE!</h1></div>`, `Notas/index.jsx` → `<div><h1>Notas</h1></div>`, `Llamar/index.jsx` → `<div><h1>Llamar</h1></div>`, `Encargar/index.jsx` → `<div><h1>Encargar</h1></div>`, `Facturas/index.jsx` → `<div><h1>Facturas</h1></div>`, `Email/index.jsx` → `<div><h1>E-mail</h1></div>`. Do NOT implement any business logic; placeholders render only the module name as h1 heading.
> - The active route's sidebar icon is highlighted with the `primary` colour.
> - Use the colour palette and typography defined in `docs/UI_DESIGN.md §3–4`.
> - Add a component test verifying the sidebar renders all six navigation links and correct routes are registered.
> - Update `docs/UI_DESIGN.md` if any layout decision differs from the spec.

### P1-02a — Error handling infrastructure `[ ]`

> Implement global error boundary and error notification system.
>
> Requirements:
> - Create `src/renderer/components/ErrorBoundary.jsx`: catch React errors, display fallback UI with message "Algo salió mal. Por favor, recarga la aplicación.", log error to console. Wrap `<App />` in ErrorBoundary in `main.jsx`.
> - Create `src/renderer/components/Toast.jsx`: notification component for errors and success messages. Auto-dismiss after 5 seconds. Stack multiple toasts vertically. Types: `success` (green bg-success-100, text-success-700), `error` (red bg-danger-100, text-danger-700), `info` (blue bg-primary-100, text-primary-700).
> - Create `src/renderer/context/ToastContext.jsx` and `src/renderer/hooks/useToast.js`: returns `showToast(message, type)` function. Use context to manage toast state globally.
> - Create `src/renderer/utils/errorMessages.js`: export object mapping error codes to Spanish messages: `{ DB_ERROR: 'Error al guardar los datos', NOT_FOUND: 'Entrada no encontrada', INVALID_INPUT: 'Por favor, revisa los datos ingresados', FILE_TOO_LARGE: 'El archivo es demasiado grande (máx. 50 MB)', FILE_INVALID: 'El archivo no es un PDF válido' }`.
> - Write component tests: ErrorBoundary catches and displays error, Toast shows and auto-dismisses after 5s.

### P1-03 — SQLite setup + migration runner `[ ]`

> Implement the database layer described in `docs/ARCHITECTURE.md §5` and `docs/DATA_MODEL.md`.
>
> Requirements:
> - Install `better-sqlite3` and configure `electron-rebuild` in `package.json`.
> - Create `src/main/db/connection.js` that opens `{userData}/entretelas.db` and applies pending migrations. Export `getDatabase()` function that returns the DB connection singleton.
> - Create `src/main/db/migrations/001_init.sql` with all table definitions, triggers, indexes, and FTS5 virtual tables from `docs/DATA_MODEL.md §2–4`.
> - Register `app.on('before-quit')` handler in `src/main/index.js` to close database connection cleanly: `getDatabase().close()`.
> - Write unit tests for the migration runner (use an in-memory SQLite database): test that migrations apply in order, user_version increments correctly, running twice doesn't re-apply migrations.
> - `npm test` must pass.

### P1-03a — Test utilities and fixtures `[ ]`

> Create shared test utilities for consistent testing across modules.
>
> Requirements:
> - Create `tests/helpers/db.js`: `createTestDb()` returns in-memory SQLite connection with migrations applied; `seedTestData(db, tableName, rows)` inserts test data; `clearTable(db, tableName)` truncates table.
> - Create `tests/helpers/ipc-mock.js`: mock implementation of `window.electronAPI` for component tests. Export `mockIPCResponse(channel, response)` function to set up mock responses.
> - Create `tests/fixtures/` directory with `test-invoice.pdf` (a valid small PDF < 100 KB for testing) and `sample-data.js` (factory functions for creating test entities: `createNota(overrides)`, `createLlamar(overrides)`, `createEncargar(overrides)`, `createProveedor(overrides)`, `createCliente(overrides)` - each returns object with default values merged with overrides).
> - Create `tests/helpers/e2e.js`: `launchApp()` starts Electron app for E2E tests and returns app instance; `cleanDatabase()` resets test database between E2E tests.
> - Document usage of all helpers in `docs/DEVELOPMENT_GUIDE.md §8`.

### P1-04 — Database backup and recovery `[ ]`

> Implement automatic database backup and recovery mechanisms.
>
> Requirements:
> - On app startup (in `src/main/db/connection.js`), after successful DB open, create timestamped backup: `{userData}/backups/entretelas-YYYY-MM-DD-HHmmss.db`. Use Node.js `fs.copyFileSync`.
> - Keep last 7 backups: after creating new backup, list files in backups/ directory, sort by timestamp, delete files older than 7th newest.
> - If database fails to open (corrupted), automatically attempt to restore from latest backup: copy most recent backup file to `entretelas.db`, then retry open. Log to console: "Database corrupted, restored from backup: [filename]".
> - Create IPC handler `db:listBackups` that returns array of backup filenames with timestamps and file sizes.
> - Create IPC handler `db:restoreBackup` that accepts backup filename, closes current DB, copies backup to main DB path, reopens DB. Returns `{ success: true }` or `{ success: false, error }`.
> - Write integration test: create entries in test DB, backup DB, delete entries, restore DB, verify entries reappear.
> - Show user notification (using Toast from P1-02a) on restore: "Base de datos restaurada desde copia de seguridad".

---

## Phase 2 – Core Modules

### P2-01 — Notas module (CRUD + URGENTE! toggle) `[ ]`

> Implement the Notas module as specified in `docs/REQUIREMENTS.md §3.3`.
>
> Requirements:
> - Register IPC handlers in `src/main/ipc/notas.js`: `notas:getAll`, `notas:create`, `notas:update`, `notas:delete`. All handlers return structured responses: `{ success: true, data: ... }` on success, `{ success: false, error: { code: 'ERROR_CODE', message: '...' } }` on failure. Use parameterised SQL queries. Validate inputs: `nombre` max 255 chars, `descripcion` max 5000 chars, `contacto` max 255 chars. Return error code `INVALID_INPUT` if validation fails.
> - Expose in `src/preload/index.js` via `contextBridge.exposeInMainWorld('electronAPI', { notas: { getAll, create, update, delete } })`.
> - Create Zustand store `src/renderer/store/notas.js` with actions: `fetchAll`, `create`, `update`, `delete`, `toggleUrgente`. Actions check `response.success` before updating state. On error, call `useToast().showToast(errorMessages[error.code], 'error')` from P1-02a. On success operations (create/update/delete), show toast: "Guardado correctamente" or "Eliminado correctamente".
> - Implement list view at `/notas` per `docs/UI_DESIGN.md §6`: sortable table, search bar (filters by nombre, descripcion, contacto), row context menu (Editar / Marcar Urgente / Eliminar), empty state. Show pagination: 100 entries per page with "Anterior"/"Siguiente" buttons.
> - Implement create/edit form at `/notas/nueva` and `/notas/:id` per `docs/UI_DESIGN.md §7`. Use `maxLength` attributes: nombre=255, descripcion=5000, contacto=255. Show character count when > 80% of limit. Trim whitespace on submit. Implement auto-save: use `useEffect` with 500ms debounce to save form state to localStorage key `autosave-notas-${id || 'new'}`. Restore autosave on mount. Clear autosave on submit/cancel.
> - Implement confirmation dialog for deletion per `docs/UI_DESIGN.md §10`.
> - Urgent entries have className including 'bg-danger' or 'text-danger' for testing purposes.
> - Write integration tests for IPC handlers (use `createTestDb()` from P1-03a): test create inserts row, getAll returns rows, update modifies row, delete removes row. Test validation: oversized inputs return INVALID_INPUT error.
> - Write component tests: render list with mock data (use `mockIPCResponse` from P1-03a), verify search filters list, verify empty state renders when no data. Render form, fill fields, submit, verify IPC called.
> - Write E2E test: launch app, navigate to /notas, create nota, verify appears in list, edit nota, verify changes saved, mark urgent, verify badge appears, delete nota with confirmation, verify removed from list.

### P2-01a — Shared CRUD components and hooks `[ ]`

> Refactor common patterns from P2-01 into reusable abstractions to prevent code duplication in P2-02 and P2-03.
>
> **Dependencies:** P2-01 must be completed first.
>
> Requirements:
> - Create `src/renderer/components/DataTable.jsx`: generic sortable table component. Props: `columns` (array of `{ key, label, sortable }`), `data` (array of objects), `onRowClick`, `renderActions` (function returning context menu items for each row). Built-in features: sort by column (ascending/descending), pagination (100 per page). Reusable for Notas, Llamar, Encargar.
> - Create `src/renderer/components/EntryForm.jsx`: generic form component. Props: `fields` (array of `{ name, label, type, required, maxLength }`), `initialValues`, `onSubmit`, `onCancel`, `showUrgenteToggle`. Built-in: validation, auto-save to localStorage, character counters, trimming.
> - Create `src/renderer/hooks/useCRUD.js`: custom hook abstracting Zustand store operations. Accepts `moduleName` ('notas'|'llamar'|'encargar'), returns `{ entries, loading, error, fetchAll, create, update, delete, toggleUrgente }`. Internally calls `window.electronAPI[moduleName].*` and handles toasts.
> - Refactor Notas module (from P2-01) to use DataTable, EntryForm, and useCRUD hook.
> - Write unit tests for useCRUD hook (mock window.electronAPI calls).

### P2-02 — Llamar module (CRUD + URGENTE! toggle) `[ ]`

> Implement the Llamar module as specified in `docs/REQUIREMENTS.md §3.4`.
>
> **Dependencies:** P2-01a (shared components) must be completed first.
>
> Requirements:
> - Register IPC handlers in `src/main/ipc/llamar.js` following the same pattern as P2-01: structured responses, input validation (asunto required & max 255 chars, contacto required & max 255 chars, nombre max 255, descripcion max 5000).
> - Expose in preload: `contextBridge.exposeInMainWorld('electronAPI', { ..., llamar: { getAll, create, update, delete } })`.
> - Use `useCRUD('llamar')` hook from P2-01a for state management.
> - Use `DataTable` component from P2-01a for list view at `/llamar`. Configure columns: Asunto, Contacto, Nombre, Fecha.
> - Use `EntryForm` component from P2-01a for `/llamar/nueva` and `/llamar/:id`. Pass fields config: asunto (required), contacto (required), nombre, descripcion.
> - Write integration tests for IPC handlers and E2E test following P2-01 pattern.

### P2-03 — Encargar module (CRUD + URGENTE! toggle) `[ ]`

> Implement the Encargar module as specified in `docs/REQUIREMENTS.md §3.5`.
>
> **Dependencies:** P2-01a (shared components) must be completed first.
>
> Requirements:
> - Register IPC handlers in `src/main/ipc/encargar.js` following the same pattern: structured responses, input validation (articulo required & max 255 chars, all optional fields max 255 chars, descripcion max 5000).
> - Expose in preload: `contextBridge.exposeInMainWorld('electronAPI', { ..., encargar: { getAll, create, update, delete } })`.
> - Use `useCRUD('encargar')` hook from P2-01a.
> - Use `DataTable` for list view at `/encargar`. Columns: Artículo, Proveedor, Ref. Interna, Fecha.
> - Use `EntryForm` for `/encargar/nueva` and `/encargar/:id`. Fields: articulo (required), ref_interna, descripcion, proveedor, ref_proveedor.
> - Write integration tests and E2E test following P2-01 pattern.
>
> Routes: `/encargar`, `/encargar/nueva`, `/encargar/:id`.

### P2-04 — Home page: unified list + module quick-nav `[ ]`

> Implement the Home page as specified in `docs/REQUIREMENTS.md §3.1` and `docs/UI_DESIGN.md §5`.
>
> **Dependencies:** P2-01, P2-02, P2-03 must be completed first.
>
> Requirements:
> - Create `src/renderer/pages/Home/index.jsx`.
> - Data fetching on mount:
>   * Call `Promise.all([window.electronAPI.notas.getAll(), window.electronAPI.llamar.getAll(), window.electronAPI.encargar.getAll()])`.
>   * Transform results into unified array of objects: `{ id: number, type: 'notas'|'llamar'|'encargar', title: string, contacto: string|null, descripcion: string|null, urgente: boolean, fecha_creacion: string, fecha_mod: string }`.
>   * Where `title` = `nombre` (notas), `asunto` (llamar), `articulo` (encargar).
> - Sorting logic:
>   * Primary sort: `urgente` DESC (urgent entries always first).
>   * Secondary sort: user-selected column (default: `fecha_creacion` DESC).
>   * Use `Array.sort` with multi-level comparator: `(a, b) => (b.urgente - a.urgente) || compareBySelectedColumn(a, b)`.
> - Search implementation:
>   * `<SearchBar />` component with `onChange` handler.
>   * Filter entries where search query appears (case-insensitive) in `title`, `contacto`, or `descripcion` fields.
>   * Use `String.prototype.toLowerCase().includes(query.toLowerCase())`.
> - Filter panel:
>   * `<FilterPanel />` with dropdowns: Module type (All / Notas / Llamar / Encargar), URGENTE (All / Only urgent / Non-urgent), Date range (Last 7 days / Last 30 days / All time).
>   * Apply filters before rendering table: `entries.filter(e => matchesModuleFilter(e) && matchesUrgenteFilter(e) && matchesDateFilter(e))`.
> - Module quick-nav panel:
>   * Grid of 6 large icon buttons (120×120 px each) linking to: /urgente, /notas, /llamar, /encargar, /facturas, /email.
>   * Use `<Link>` from react-router-dom.
> - List rendering:
>   * Reuse `<DataTable />` component from P2-01a.
>   * Columns: Type (badge: N/LL/EN), URGENTE (red dot if true), Title, Contacto, Fecha.
>   * Row click navigates to: `/${entry.type}/${entry.id}`.
> - Component tests:
>   * Mock IPC responses with sample data (use `sample-data.js` from P1-03a).
>   * Test search filters list correctly.
>   * Test sort by fecha_creacion works (urgent entries remain at top).
>   * Test module type filter shows only selected type.
>   * Test empty state renders when no entries match filters.
> - Performance target: List renders in < 100ms for 1,000 entries (verify with React DevTools Profiler).

### P2-05 — URGENTE! page `[ ]`

> Implement the URGENTE! page as specified in `docs/REQUIREMENTS.md §3.2` and `docs/UI_DESIGN.md §8`.
>
> **Dependencies:** P2-01, P2-02, P2-03 must be completed first.
>
> Requirements:
> - Fetch all entries with `urgente = 1` from notas, llamar, and encargar (use `Promise.all` as in P2-04).
> - Display them grouped by module (Notas → Llamar → Encargar), sorted by `fecha_mod` descending within each group. Use `Array.sort` with comparator checking `type` first, then `fecha_mod`.
> - Each entry shows: module type badge (Notas / Llamar / Encargar), title/asunto/articulo, contacto (if present), date created, and a "Quitar urgencia" button that calls `toggleUrgente()` action.
> - Clicking an entry navigates to its detail view: `/${entry.type}/${entry.id}`.
> - Show empty state (per `docs/UI_DESIGN.md §11`) when no urgent entries exist: icon 📭, message "No hay entradas urgentes", no call-to-action needed.
> - Write component test: render with mock urgent entries from multiple modules, verify grouping is correct, verify empty state when no urgent entries.

---

## Phase 3 – Facturas Module

### P3-01 — Proveedores and Clientes CRUD `[ ]`

> Implement CRUD for `proveedores` and `clientes` as specified in `docs/REQUIREMENTS.md §3.6.2–3.6.3` and `docs/DATA_MODEL.md §2.4–2.5`.
>
> Requirements:
> - Register IPC handlers for `proveedores:getAll`, `proveedores:create`, `proveedores:update`, `proveedores:delete` and the equivalent for `clientes`.
> - Expose in preload.
> - Create Zustand stores.
> - Implement the Facturas root page (`/facturas`) showing two folder icons: Facturas Compra and Facturas Venta.
> - Implement the Proveedor list (`/facturas/compra`) and Cliente list (`/facturas/venta`) per `docs/UI_DESIGN.md §9`.
> - Add, edit, delete Proveedor/Cliente with confirmation dialogs.
> - Write component tests.

### P3-02 — PDF upload, storage, and listing `[ ]`

> Implement PDF file management as specified in `docs/REQUIREMENTS.md §3.6.1` and `docs/ARCHITECTURE.md §6`.
>
> Requirements:
> - Register IPC handlers in `src/main/ipc/facturas.js`: `facturas:uploadPDF`, `facturas:deletePDF`, `facturas:getAllForEntidad`, `facturas:getPDFBytes`.
> - `facturas:uploadPDF` handler:
>   * Accepts: `{ tipo: 'compra'|'venta', entidadId: number, entidadNombre: string, filePath: string }`.
>   * Validation: Check file exists, file extension is `.pdf` (case-insensitive), file size < 50 MB (52,428,800 bytes). Return error codes: `FILE_NOT_FOUND`, `FILE_INVALID`, `FILE_TOO_LARGE`.
>   * Optional: verify MIME type matches PDF (check first 4 bytes: `%PDF`).
>   * Sanitize `entidadNombre` and `path.basename(filePath)`: remove ALL special characters `\ / : * ? " < > |` and control characters (ASCII 0-31), replace spaces with underscores, convert to lowercase for consistency.
>   * Check sanitized name is not Windows reserved name (CON, PRN, AUX, NUL, COM1-9, LPT1-9 - case-insensitive check).
>   * Target path: `{userData}/facturas/${tipo}/${sanitizedEntidad}/[SanitizedEntidad] - [sanitized_filename].pdf`.
>   * Create directories if they don't exist (`fs.mkdirSync` with `recursive: true`).
>   * Copy file using `fs.copyFileSync`.
>   * Insert record into `facturas_pdf` table with all metadata.
>   * Return `{ success: true, data: { id, ruta_relativa } }`.
> - `facturas:deletePDF` handler: delete file from disk AND database record. Use transaction-like pattern: delete DB record first, then file. If file delete fails, log warning but return success (file may have been manually deleted).
> - `facturas:getAllForEntidad`: accepts `{ tipo, entidadId }`, returns array of `facturas_pdf` records.
> - `facturas:getPDFBytes`: accepts `pdfPath` (relative path from `facturas_pdf.ruta_relativa`), validates path is within `{userData}/facturas/` (prevent path traversal), reads file with `fs.readFileSync`, returns `ArrayBuffer`. Returns error if file not found or path is invalid.
> - Implement PDF list view (grid of thumbnails 160×210 px) per `docs/UI_DESIGN.md §9`. Grid should be responsive (use CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`).
> - Double-clicking a thumbnail calls `shell.openPath(absolutePath)` to open PDF in default viewer. Check if `shell.openPath` is available in Electron 30; if deprecated, use recommended alternative.
> - Write unit tests for path-sanitization function: test removes special chars, handles Windows reserved names (CON.pdf → CON_.pdf), handles long names (truncate to 200 chars), handles unicode characters safely.

### P3-03 — PDF thumbnail generation `[ ]`

> Add lazy thumbnail generation for PDFs using PDF.js.
>
> Requirements:
> - In the renderer, use `pdfjs-dist` to render the first page of each PDF to a `<canvas>` and export it as a PNG data URL.
> - Thumbnails are generated lazily when they scroll into the viewport (use `IntersectionObserver`).
> - Cache rendered thumbnails in a `Map` keyed by PDF path so each PDF is rendered at most once per session.
> - Show a loading skeleton while the thumbnail is being generated.
> - Show a placeholder icon if the PDF cannot be rendered (handle errors gracefully).
> - Write a unit test for the thumbnail cache logic.

---

## Phase 4 – E-mail

### P4-01 — Gmail webview `[ ]`

> Implement the E-mail page as specified in `docs/REQUIREMENTS.md §3.7`.
>
> Requirements:
> - Use an Electron `<webview>` tag with `src="https://mail.google.com"` and `partition="persist:gmail"` so the session is persisted.
> - Listen to `will-navigate` and `new-window` events on the webview; redirect external URLs to `shell.openExternal()`.
> - The webview fills the entire content area (no surrounding chrome beyond the sidebar).
> - Test that the webview component renders without crashing (mock the webview in the component test environment).

---

## Phase 5 – Polish & Distribution

### P5-01 — Keyboard shortcuts & accessibility `[ ]`

> Add basic keyboard support:
> - `Ctrl+F` focuses the search bar on list pages.
> - `Escape` closes open modals/dialogs.
> - `Enter` submits forms.
> - All interactive elements are focusable via Tab and have visible focus rings.
> - All icon buttons have `aria-label` attributes in Spanish.

### P5-02 — Windows installer build `[ ]`

> Configure `electron-builder` to produce a Windows NSIS installer as described in `docs/DEVELOPMENT_GUIDE.md §7`.
>
> Requirements:
> - `npm run dist` produces `dist/App-Entretelas Setup x.y.z.exe`.
> - The installer sets the app name to "App-Entretelas" and installs to `%LOCALAPPDATA%\Programs\App-Entretelas` by default.
> - Include an app icon (`src/renderer/assets/icon.ico`).
> - Verify the installer runs on a clean Windows 10 VM and the app starts correctly.
> - Update `docs/DEVELOPMENT_GUIDE.md §7` with any configuration changes.

### P5-03 — End-to-end smoke test `[ ]`

> Write a minimal end-to-end test using Playwright for Electron that:
> - Launches the app.
> - Creates one Nota, one Llamar entry, and one Encargar entry.
> - Marks each as URGENTE! and verifies they appear on the URGENTE! page.
> - Removes the urgent flag and verifies the URGENTE! page is empty.
> - Uploads a PDF invoice to a Proveedor folder and verifies it appears in the list.

---

## Discovered / Follow-on Prompts

> Prompts added during implementation go here. Use the same format as above.
> Example: if P2-01 revealed a need for a shared date-formatting utility, add a P2-01a prompt here.

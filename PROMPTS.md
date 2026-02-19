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
> **Dependencies:** P3-02 (PDF storage and `facturas:getPDFBytes` handler) must be completed first.
>
> Requirements:
> - Install: `npm install pdfjs-dist`.
> - Configure PDF.js Web Worker in renderer: create `src/renderer/utils/pdfjs-setup.js` that imports `pdfjs-dist` and sets `pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href`. Import this file in `main.jsx`.
> - Create `src/renderer/components/PDFThumbnail.jsx`:
>   * Props: `{ pdfPath: string }` (relative path from facturas_pdf table).
>   * State: `{ loading: boolean, thumbnailDataUrl: string | null, error: Error | null }`.
>   * On mount (when component enters viewport, see IntersectionObserver below):
>     - Call `window.electronAPI.getPDFBytes(pdfPath)` to get ArrayBuffer.
>     - Load PDF: `await pdfjsLib.getDocument({ data: arrayBuffer }).promise`.
>     - Get first page: `await pdf.getPage(1)`.
>     - Create canvas element (160×210 px - A4 aspect ratio).
>     - Calculate viewport: `page.getViewport({ scale: 160 / page.getViewport({scale: 1}).width })`.
>     - Render page to canvas: `await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise`.
>     - Convert to data URL: `canvas.toDataURL('image/png')`.
>     - Set state: `thumbnailDataUrl`.
>     - Wrap entire process in try-catch: on error, set `error` state.
>     - Add timeout: use `Promise.race` with 5-second timeout. If timeout, treat as error.
>   * Canvas rendering limits: max canvas size 4096×4096 px (check before rendering, show error if PDF page exceeds this).
>   * Rendering: display `thumbnailDataUrl` in `<img>` if loaded; `<div data-testid="thumbnail-loading" className="animate-pulse bg-neutral-200 h-[210px] w-[160px]" />` while loading; placeholder icon (📄) if error.
> - Lazy loading with IntersectionObserver:
>   * Create `src/renderer/hooks/useIntersectionObserver.js` custom hook.
>   * Observer config: `{ rootMargin: '200px', threshold: 0.01 }` (pre-load 200px before entering viewport).
>   * PDFThumbnail component only triggers `getPDFBytes` when `isIntersecting === true`.
> - Thumbnail caching:
>   * Create `src/renderer/context/ThumbnailCacheContext.jsx`.
>   * Cache structure: `Map<string, string>` (pdfPath → data URL).
>   * Before generating thumbnail, check cache. If present, use cached data URL immediately.
>   * After generating, store in cache.
> - Concurrency control:
>   * Thumbnail cache context also manages render queue.
>   * Max concurrent renders: 3.
>   * If > 3 thumbnails are loading, queue additional requests.
>   * Use `Promise.all` with concurrency limit (can use p-limit library or implement manually).
> - Write integration test:
>   * Use `tests/fixtures/test-invoice.pdf` from P1-03a.
>   * Upload to test database via `facturas:uploadPDF`.
>   * Render PDFThumbnail component with test PDF path.
>   * Wait for loading to complete (use `waitFor` from testing-library).
>   * Verify `<img>` element has non-empty src (data URL).
>   * Render same PDFThumbnail again, verify cache used (no second `getPDFBytes` call).
> - Write unit test for ThumbnailCacheContext: verify get/set operations, verify concurrency queue works.

---

## Phase 4 – E-mail

### P4-01 — Gmail webview `[ ]`

> Implement the E-mail page as specified in `docs/REQUIREMENTS.md §3.7`.
>
> Requirements:
> - Update CSP in `src/renderer/index.html` to allow webview for Gmail: add `webview-src https://mail.google.com https://*.google.com;` to the existing Content-Security-Policy meta tag.
> - Create `src/renderer/pages/Email/index.jsx` with Electron `<webview>` tag.
> - Webview attributes:
>   * `src="https://mail.google.com"`
>   * `partition="persist:gmail"` (persists session across app restarts)
>   * `allowpopups="false"` (prevent popup windows)
>   * `disablewebsecurity="false"` (keep web security enabled)
>   * `nodeintegration="false"` (never allow Node.js in webview)
>   * `style={{ width: '100%', height: '100%' }}` (fills content area)
> - Navigation security:
>   * Listen to `will-navigate` event on webview ref.
>   * Allow-list: only URLs matching `https://mail.google.com/*` or `https://*.google.com/*` patterns.
>   * For allowed navigations within Gmail/Google domains: allow (return without preventing).
>   * For external URLs: prevent default navigation (`e.preventDefault()`), show confirmation dialog "Abrir enlace externo en navegador?" with Cancel/Abrir buttons.
>   * If user clicks Abrir, call `shell.openExternal(url)` ONLY if URL protocol is `http://` or `https://` (block `file://`, `javascript:`, etc.).
> - New window handling:
>   * Listen to `new-window` event on webview ref.
>   * Prevent default (`e.preventDefault()`).
>   * Apply same URL validation as will-navigate.
>   * Open external URLs via `shell.openExternal` after user confirmation.
> - Webview fills entire content area (no chrome beyond sidebar, as per UI_DESIGN.md).
> - Component test:
>   * Render Email page component.
>   * Verify `<webview>` element is present in DOM (check `document.querySelector('webview')`).
>   * Verify `src` attribute is `https://mail.google.com`.
>   * Verify security attributes are set correctly.
>   * Note: Webview functionality cannot be fully tested in JSDOM environment (that's OK).
> - E2E test (add to P5-03): verify Gmail login page loads in webview (check webview.getURL() starts with 'https://mail.google.com').

---

## Phase 5 – Polish & Distribution

### P5-01 — Keyboard shortcuts & accessibility `[ ]`

> Add keyboard support and accessibility attributes.
>
> Requirements:
> - Keyboard shortcuts:
>   * Create `src/renderer/hooks/useKeyboardShortcuts.js` hook.
>   * On `Ctrl+F` (Windows): call `document.querySelector('[data-search-input]')?.focus()`. Check `event.target.tagName !== 'INPUT'` and `!== 'TEXTAREA'` to avoid triggering when user is typing.
>   * On `Escape`: call `closeModal()` from modal context (if modal is open). Otherwise, blur active element.
>   * On `Enter` in forms: form elements should use `onSubmit` handler (default browser behavior). No special hook needed.
>   * Register shortcuts using `useEffect` with `document.addEventListener('keydown')`. Clean up on unmount.
> - Focus management:
>   * All `<button>` elements must have Tailwind focus styles: `focus:outline-2 focus:outline-primary focus:outline-offset-2`.
>   * All `<input>`, `<textarea>`, `<select>` elements must have: `focus:ring-2 focus:ring-primary`.
>   * Modal dialogs must trap focus: install `npm install focus-trap-react`, wrap modal content in `<FocusTrap>`.
>   * On modal open: focus first interactive element (button or input).
>   * On modal close: return focus to trigger element (store ref to triggering button).
> - ARIA labels (all in Spanish):
>   * Icon buttons without visible text must have `aria-label`:
>     - Edit button: `aria-label="Editar entrada"`
>     - Delete button: `aria-label="Eliminar entrada"`
>     - Search button: `aria-label="Buscar"`
>     - Filter button: `aria-label="Filtrar resultados"`
>     - Context menu button: `aria-label="Abrir menú de acciones"`
>     - Close modal button: `aria-label="Cerrar"`
> - ARIA roles:
>   * Use semantic HTML where possible (`<button>`, `<nav>`, `<main>`, `<header>`, `<form>`).
>   * Modals: `<div role="dialog" aria-modal="true" aria-labelledby="modal-title">`.
>   * Confirmation dialogs: `<div role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">`.
>   * Sidebar navigation: `<nav role="navigation" aria-label="Navegación principal">`.
>   * Search inputs: `<input type="search" role="searchbox" aria-label="Buscar entradas">`.
> - Accessibility audit:
>   * Install: `npm install --save-dev axe-core @axe-core/react`.
>   * Add axe-core in development mode only (`src/renderer/main.jsx`):
>     ```javascript
>     if (import.meta.env.DEV) {
>       import('@axe-core/react').then((axe) => {
>         axe.default(React, ReactDOM, 1000);
>       });
>     }
>     ```
>   * Run app in dev mode (`npm run dev`), check browser console for axe-core warnings.
>   * Fix all accessibility errors before completing this prompt.
> - Component test:
>   * Use `@testing-library/user-event` to test keyboard interactions.
>   * Test: press Tab key, verify focus moves through form fields in correct order.
>   * Test: open modal, press Escape, verify modal closes.
>   * Test: press Ctrl+F on Home page, verify search input receives focus.
> - Success criteria:
>   * Run `npm run dev`, open browser console, verify no axe-core errors logged.
>   * All component tests pass.
>   * Manual test: navigate entire app using only keyboard (Tab, Enter, Escape, Ctrl+F, Arrow keys for dropdowns).

### P5-02 — Windows installer build `[ ]`

> Configure `electron-builder` to produce a Windows NSIS installer as described in `docs/DEVELOPMENT_GUIDE.md §7`.
>
> Requirements:
> - Install: `npm install --save-dev electron-builder`.
> - Add to `package.json` scripts: `"dist": "npm run build && electron-builder"`.
> - Configure electron-builder in `package.json` (add `"build"` section):
>   ```json
>   {
>     "build": {
>       "appId": "com.entretelas.app",
>       "productName": "App-Entretelas",
>       "directories": {
>         "output": "dist",
>         "buildResources": "build"
>       },
>       "files": [
>         "dist-renderer/**/*",
>         "src/main/**/*",
>         "src/preload/**/*",
>         "package.json"
>       ],
>       "win": {
>         "target": "nsis",
>         "icon": "src/renderer/assets/icon.ico"
>       },
>       "nsis": {
>         "oneClick": false,
>         "allowToChangeInstallationDirectory": true,
>         "createDesktopShortcut": true,
>         "createStartMenuShortcut": true
>       }
>     }
>   }
>   ```
> - Create `src/renderer/assets/icon.ico` (256×256 px Windows icon file). If not available, use placeholder.
> - Run `npm run dist` successfully with exit code 0.
> - Verify output file exists: `dist/App-Entretelas Setup x.y.z.exe` (where x.y.z is version from package.json) and file size is > 50 MB (reasonable for Electron app).
> - Verify electron-builder log shows no errors (check console output or `dist/builder-effective-config.yaml`).
> - Update `docs/DEVELOPMENT_GUIDE.md §7` with:
>   * Confirmed electron-builder configuration.
>   * Build command: `npm run dist`.
>   * Output location: `dist/App-Entretelas Setup x.y.z.exe`.
>   * Manual testing steps: "To verify installer on target machine: (1) Copy .exe to Windows 10+ machine, (2) Run installer, (3) Choose installation directory, (4) Complete installation, (5) Launch app from Start Menu, (6) Verify app opens, database initializes, and sidebar renders correctly."

### P5-03 — End-to-end tests `[ ]`

> Write modular end-to-end tests using Playwright for Electron.
>
> **Dependencies:** All prompts P1-01 through P5-02 must be completed first. This is an integration test of the entire application.
>
> Requirements:
> - Install: `npm install --save-dev @playwright/test playwright`.
> - Create `tests/e2e/` directory for E2E test files.
> - Create `tests/e2e/helpers.js` with shared utilities: `launchApp()` (starts Electron), `cleanDatabase()` (resets test DB), `closeApp(electronApp)`.
> - Each test file should:
>   * Import `test, expect` from `@playwright/test`.
>   * Use `test.beforeEach(async () => { app = await launchApp(); await cleanDatabase(); })`.
>   * Use `test.afterEach(async () => { await closeApp(app); })`.
> - Create separate test files (each independently runnable):
>
> **tests/e2e/notas.spec.js:**
>   - Launch app, navigate to /notas.
>   - Click "+ Nueva entrada", fill form (nombre: "Test Nota", descripcion: "Description"), submit.
>   - Verify nota appears in list.
>   - Click nota row, edit nombre to "Updated Nota", save.
>   - Verify updated name in list.
>   - Mark as urgent via context menu.
>   - Verify red badge appears.
>   - Delete nota with confirmation.
>   - Verify removed from list.
>
> **tests/e2e/llamar.spec.js:**
>   - Navigate to /llamar.
>   - Create llamar entry (asunto: "Test Call", contacto: "555-1234").
>   - Verify appears in list.
>   - Mark as urgent.
>   - Delete entry.
>
> **tests/e2e/encargar.spec.js:**
>   - Navigate to /encargar.
>   - Create encargar entry (articulo: "Test Product").
>   - Verify appears in list.
>   - Mark as urgent.
>   - Delete entry.
>
> **tests/e2e/urgente.spec.js:**
>   - Create one nota, one llamar, one encargar (all marked urgent).
>   - Navigate to /urgente.
>   - Verify all 3 entries appear, grouped by module.
>   - Click "Quitar urgencia" on nota.
>   - Verify nota disappears from URGENTE page.
>   - Navigate back to /notas, verify nota still exists but not urgent.
>   - Delete all entries.
>   - Navigate to /urgente, verify empty state message.
>
> **tests/e2e/facturas.spec.js:**
>   - Navigate to /facturas/compra.
>   - Create proveedor (razón_social: "Test Supplier").
>   - Click proveedor folder.
>   - Upload PDF (use `tests/fixtures/test-invoice.pdf`).
>   - Verify PDF thumbnail appears in grid.
>   - Right-click thumbnail, delete PDF.
>   - Verify removed from list.
>
> **tests/e2e/gmail.spec.js:**
>   - Navigate to /email.
>   - Verify webview element exists.
>   - Get webview.getURL(), verify starts with 'https://mail.google.com' (Gmail login page).
>   - (Do not attempt to log in - just verify webview loads).
>
> - Add to `package.json` scripts: `"test:e2e": "playwright test tests/e2e/"`.
> - Success criteria: `npm run test:e2e` passes all tests in < 2 minutes total runtime.
> - Document E2E testing in `docs/DEVELOPMENT_GUIDE.md §8`: commands to run tests, how to debug with Playwright inspector, how to run individual test files.

---

## Discovered / Follow-on Prompts

> Prompts added during implementation go here. Use the same format as above.
> Example: if P2-01 revealed a need for a shared date-formatting utility, add a P2-01a prompt here.

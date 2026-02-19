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
> - Ensure `npm run dev`, `npm test`, and `npm run lint` all pass with no errors.
> - The app window must open to a blank white page with the title "App-Entretelas".
> - Update `docs/DEVELOPMENT_GUIDE.md` with the verified bootstrap commands.

### P1-02 — Application shell: sidebar navigation + routing `[ ]`

> Implement the application shell described in `docs/UI_DESIGN.md §2`.
>
> Requirements:
> - Install `react-router-dom` v6.
> - Create `src/renderer/App.jsx` with a persistent sidebar (72 px wide) containing icon + label links for: URGENTE!, Notas, Llamar, Encargar, Facturas, E-mail — in that order.
> - Register all routes listed in `docs/UI_DESIGN.md §12`. Each route renders a placeholder `<PageName />` component.
> - The active route's sidebar icon is highlighted with the `primary` colour.
> - Use the colour palette and typography defined in `docs/UI_DESIGN.md §3–4`.
> - Add a component test verifying the sidebar renders all six navigation links.
> - Update `docs/UI_DESIGN.md` if any layout decision differs from the spec.

### P1-03 — SQLite setup + migration runner `[ ]`

> Implement the database layer described in `docs/ARCHITECTURE.md §5` and `docs/DATA_MODEL.md`.
>
> Requirements:
> - Install `better-sqlite3` and configure `electron-rebuild` in `package.json`.
> - Create `src/main/db/connection.js` that opens `{userData}/entretelas.db` and applies pending migrations.
> - Create `src/main/db/migrations/001_init.sql` with all table definitions, triggers, indexes, and FTS5 virtual tables from `docs/DATA_MODEL.md §2–4`.
> - Write unit tests for the migration runner (use an in-memory SQLite database).
> - `npm test` must pass.

---

## Phase 2 – Core Modules

### P2-01 — Notas module (CRUD + URGENTE! toggle) `[ ]`

> Implement the Notas module as specified in `docs/REQUIREMENTS.md §3.3`.
>
> Requirements:
> - Register IPC handlers `notas:getAll`, `notas:create`, `notas:update`, `notas:delete` in `src/main/ipc/notas.js`.
> - Expose them in `src/preload/index.js` via `contextBridge`.
> - Create a Zustand store `src/renderer/store/notas.js` with actions: `fetchAll`, `create`, `update`, `delete`, `toggleUrgente`.
> - Implement the list view at `/notas` per `docs/UI_DESIGN.md §6`: sortable, searchable, row context menu (Editar / Marcar Urgente / Eliminar), empty state.
> - Implement the create/edit form at `/notas/nueva` and `/notas/:id` per `docs/UI_DESIGN.md §7`.
> - Implement the confirmation dialog for deletion per `docs/UI_DESIGN.md §10`.
> - Urgent entries show the red badge.
> - Write component tests for the list view and form.

### P2-02 — Llamar module (CRUD + URGENTE! toggle) `[ ]`

> Implement the Llamar module as specified in `docs/REQUIREMENTS.md §3.4`.
>
> Follow the same patterns established in P2-01 (IPC handlers, preload, Zustand store, list view, form, confirmation dialog, component tests), using the `llamar` table and the fields `asunto` (required), `contacto` (required), `nombre` (optional), `descripcion` (optional).
>
> Routes: `/llamar`, `/llamar/nueva`, `/llamar/:id`.

### P2-03 — Encargar module (CRUD + URGENTE! toggle) `[ ]`

> Implement the Encargar module as specified in `docs/REQUIREMENTS.md §3.5`.
>
> Follow the same patterns as P2-01/P2-02, using the `encargar` table and the fields `articulo` (required), `ref_interna`, `descripcion`, `proveedor`, `ref_proveedor` (all optional).
>
> Routes: `/encargar`, `/encargar/nueva`, `/encargar/:id`.

### P2-04 — Home page: unified list + module quick-nav `[ ]`

> Implement the Home page as specified in `docs/REQUIREMENTS.md §3.1` and `docs/UI_DESIGN.md §5`.
>
> Requirements:
> - Fetch all notas, llamar, and encargar entries and merge them into one sorted list.
> - Default sort: `fecha_creacion` descending; urgent entries always float to the top.
> - Implement text search across all text fields.
> - Implement a filter panel: filter by module type, date range, URGENTE! status.
> - Above the list, show the module quick-nav panel with large icons.
> - Clicking a row navigates to the entry's detail/edit view within its module.
> - Write component tests for search, sort, and filter logic.

### P2-05 — URGENTE! page `[ ]`

> Implement the URGENTE! page as specified in `docs/REQUIREMENTS.md §3.2` and `docs/UI_DESIGN.md §8`.
>
> Requirements:
> - Fetch all entries with `urgente = 1` from notas, llamar, and encargar.
> - Display them grouped by module (Notas → Llamar → Encargar), sorted by `fecha_mod` descending within each group.
> - Each entry shows: module badge, title/asunto, contacto (if present), date, and a "Quitar urgencia" button.
> - Clicking an entry navigates to its detail view.
> - Show empty state when no urgent entries exist.
> - Write a component test for the empty state and the grouping logic.

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
> - Register IPC handlers: `facturas:uploadPDF`, `facturas:deletePDF`, `facturas:getAllForEntidad`.
> - Main process stores PDFs at `{userData}/facturas/<tipo>/<entidad>/[Entidad] - [nombre_original].pdf`.
> - Sanitise the entity name and original filename (no path separators, no reserved Windows characters: `\ / : * ? " < > |`).
> - Insert a record into `facturas_pdf` after a successful file copy.
> - Implement the PDF list view (grid of thumbnails) per `docs/UI_DESIGN.md §9`.
> - Double-clicking a thumbnail calls `shell.openPath()` to open the PDF in the default viewer.
> - Write unit tests for the path-sanitisation function.

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

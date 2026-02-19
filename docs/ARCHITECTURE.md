# Architecture

## 1. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Desktop shell | **Electron 30+** | Windows desktop app, access to native OS APIs |
| UI framework | **React 18** | Component model, hooks, well-known ecosystem |
| Build tool | **Vite** | Fast HMR, native ESM, minimal config for Electron + React |
| Styling | **Tailwind CSS** | Utility-first, consistent design system, small bundle |
| State management | **Zustand** | Lightweight, minimal boilerplate, no context-provider nesting |
| Local database | **better-sqlite3** | Synchronous SQLite bindings, zero-config, fast |
| PDF rendering | **PDF.js** (`pdfjs-dist`) | Browser-native PDF parsing and thumbnail canvas rendering |
| Testing | **Vitest** + **React Testing Library** | Same config as Vite, fast, component + unit coverage |
| Linting | **ESLint** (eslint-config-airbnb) + **Prettier** | Consistent code style |

---

## 2. Electron Process Model

```
┌──────────────────────────────────────────────────────────────┐
│  Main Process  (src/main/)                                   │
│  ─ Creates BrowserWindow                                     │
│  ─ Registers IPC handlers (ipcMain)                         │
│  ─ Owns the SQLite connection (via better-sqlite3)           │
│  ─ Handles file-system operations (PDF storage, thumbnails)  │
└────────────────────┬─────────────────────────────────────────┘
                     │  contextBridge / ipcRenderer
┌────────────────────▼─────────────────────────────────────────┐
│  Renderer Process  (src/renderer/)                           │
│  ─ React 18 SPA                                              │
│  ─ Calls window.electronAPI.* exposed via preload script     │
│  ─ Zustand stores consume IPC responses                      │
└──────────────────────────────────────────────────────────────┘
```

### Context Isolation

- `contextIsolation: true` and `nodeIntegration: false` are **always** set.
- All Node.js / Electron APIs exposed to the renderer are routed through a **preload script** (`src/preload/index.js`) using `contextBridge.exposeInMainWorld('electronAPI', { ... })`.

### IPC Channel Naming Convention

```
<module>:<action>
```

Examples:

| Channel | Direction | Description |
|---|---|---|
| `notas:getAll` | renderer → main | Fetch all notes |
| `notas:create` | renderer → main | Insert a new note |
| `notas:update` | renderer → main | Update an existing note |
| `notas:delete` | renderer → main | Delete a note |
| `llamar:getAll` | renderer → main | Fetch all llamar entries |
| `encargar:getAll` | renderer → main | Fetch all encargar entries |
| `facturas:getPDF` | renderer → main | Read PDF bytes for thumbnail generation |
| `facturas:uploadPDF` | renderer → main | Copy a PDF into the managed folder |
| `facturas:deletePDF` | renderer → main | Delete a PDF file |
| `proveedores:getAll` | renderer → main | Fetch all proveedor records |
| `clientes:getAll` | renderer → main | Fetch all cliente records |

---

## 3. Folder Structure

```
App-Entretelas/
├── docs/                        # Project documentation
│   ├── ARCHITECTURE.md
│   ├── REQUIREMENTS.md
│   ├── DATA_MODEL.md
│   ├── UI_DESIGN.md
│   └── DEVELOPMENT_GUIDE.md
├── PROMPTS.md                   # AI agent build prompts
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .eslintrc.cjs
├── .prettierrc
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.js             # Entry: creates window, registers IPC
│   │   ├── db/
│   │   │   ├── connection.js    # Opens / migrates SQLite database
│   │   │   └── migrations/      # SQL migration files (001_init.sql, etc.)
│   │   ├── ipc/                 # One file per module
│   │   │   ├── notas.js
│   │   │   ├── llamar.js
│   │   │   ├── encargar.js
│   │   │   ├── facturas.js
│   │   │   ├── proveedores.js
│   │   │   └── clientes.js
│   │   └── pdf/
│   │       └── storage.js       # PDF file-system helpers
│   ├── preload/
│   │   └── index.js             # contextBridge definitions
│   └── renderer/                # React SPA
│       ├── index.html
│       ├── main.jsx             # ReactDOM.createRoot entry
│       ├── App.jsx              # Router + layout
│       ├── assets/              # Icons, images
│       ├── components/          # Shared, reusable components
│       │   ├── Badge.jsx
│       │   ├── ConfirmDialog.jsx
│       │   ├── EmptyState.jsx
│       │   ├── SearchBar.jsx
│       │   ├── SortableTable.jsx
│       │   └── UrgenteBadge.jsx
│       ├── pages/               # One folder per module
│       │   ├── Home/
│       │   ├── Urgente/
│       │   ├── Notas/
│       │   ├── Llamar/
│       │   ├── Encargar/
│       │   ├── Facturas/
│       │   └── Email/
│       └── store/               # Zustand stores
│           ├── notas.js
│           ├── llamar.js
│           ├── encargar.js
│           ├── facturas.js
│           └── proveedores.js
└── tests/
    ├── unit/                    # Vitest unit tests (pure functions)
    └── component/               # React Testing Library component tests
```

---

## 4. Data Flow

```
User interaction (React component)
        │
        ▼
Zustand store action
        │
        ▼
window.electronAPI.<channel>(payload)   ← preload bridge
        │  (IPC invoke)
        ▼
ipcMain.handle('<channel>', handler)    ← main process IPC handler
        │
        ▼
better-sqlite3 query / file-system op
        │
        ▼
Return value travels back up the chain
        │
        ▼
Zustand store updates state
        │
        ▼
React re-renders
```

### IPC Data Serialization Rules

All data passed over IPC is serialized via Structured Clone Algorithm:

- **Dates:** Convert to ISO-8601 strings in main process before returning (SQLite stores as TEXT in this format already)
- **Buffers:** Convert to `ArrayBuffer` or `Uint8Array` for IPC transfer
- **Errors:** Return plain objects: `{ success: false, error: { code: 'ERROR_CODE', message: 'Description' } }`
- **Success responses:** Return: `{ success: true, data: {...} }`

Example IPC handler pattern:

```javascript
ipcMain.handle('notas:getAll', async () => {
  try {
    const rows = db.prepare('SELECT * FROM notas ORDER BY fecha_creacion DESC').all();
    return {
      success: true,
      data: rows.map(r => ({
        ...r,
        urgente: Boolean(r.urgente), // Convert SQLite 0/1 to boolean
        fecha_creacion: r.fecha_creacion, // Already ISO string from DB
        fecha_mod: r.fecha_mod
      }))
    };
  } catch (err) {
    console.error('Database error in notas:getAll:', err);
    return {
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    };
  }
});
```

Renderer-side consumption:

```javascript
const response = await window.electronAPI.notas.getAll();
if (response.success) {
  setNotas(response.data);
} else {
  showToast(errorMessages[response.error.code], 'error');
}
```

---

## 5. Database Strategy

- A single SQLite file is placed at `{userData}/entretelas.db`.
- Schema migrations are applied sequentially on startup via numbered SQL files in `src/main/db/migrations/`.
- All queries are executed synchronously in the main process (better-sqlite3 is synchronous by design); this is safe because SQLite queries on a local file complete well within 200 ms.

---

## 6. PDF Storage Strategy

- PDFs are stored at: `{userData}/facturas/<tipo>/<entidad>/[Entidad] - [nombre original].pdf`
  - `<tipo>`: `compra` or `venta`
  - `<entidad>`: sanitised `razón_social` (spaces replaced with underscores, special characters removed)
- Thumbnail generation uses PDF.js `getPage(1).render()` on a canvas in the renderer and is kicked off lazily (when the thumbnail enters the viewport) to avoid blocking.
- Thumbnails are cached as PNG files at `{userData}/facturas/.thumbs/<hash>.png` where `<hash>` is the SHA-256 of the full PDF path.

---

## 7. Security Considerations

| Concern | Mitigation |
|---|---|
| Arbitrary code execution via renderer | `contextIsolation: true`, `nodeIntegration: false`, no eval |
| External navigation in Gmail webview | `will-navigate` and `new-window` events redirect to `shell.openExternal` |
| Path traversal in PDF upload | Main process sanitises all file paths before writing to disk |
| SQLite injection | All queries use parameterised statements (no string concatenation) |

---

## 8. Adding a New Module

To add a new module (e.g., "Proveedores"):

### 1. Database

- Create migration: `src/main/db/migrations/00X_add_proveedores.sql`
- Define table with: `id`, required fields, `urgente` flag (if applicable), `fecha_creacion`, `fecha_mod`
- Add trigger for `fecha_mod` auto-update (see existing triggers in `001_init.sql`)
- Add FTS5 virtual table for full-text search (if module needs search)
- Add index on `urgente` column (if module supports urgent flag)

### 2. Main Process

- Create `src/main/ipc/proveedores.js`
- Register handlers: `getAll`, `create`, `update`, `delete`
- All handlers return structured responses: `{ success: true, data }` or `{ success: false, error: { code, message } }`
- Use parameterised SQL queries (never string concatenation)
- Validate inputs: check required fields, max lengths, sanitize strings

### 3. Preload

- Update `src/preload/index.js`
- Add to `contextBridge.exposeInMainWorld`:
  ```javascript
  proveedores: {
    getAll: () => ipcRenderer.invoke('proveedores:getAll'),
    create: (data) => ipcRenderer.invoke('proveedores:create', data),
    update: (id, data) => ipcRenderer.invoke('proveedores:update', id, data),
    delete: (id) => ipcRenderer.invoke('proveedores:delete', id)
  }
  ```

### 4. Renderer

- **Store:** Create `src/renderer/store/proveedores.js` (Zustand)
  - OR: Use `useCRUD('proveedores')` hook if module follows standard CRUD pattern
- **List View:** Create `src/renderer/pages/Proveedores/index.jsx`
  - Reuse `<DataTable />` component (from P2-01a)
  - Implement search, sort, pagination
- **Form:** Create `src/renderer/pages/Proveedores/Form.jsx`
  - Reuse `<EntryForm />` component (from P2-01a)
  - OR: Create custom form if fields are complex
- **Routes:** Add to `src/renderer/App.jsx`:
  - `/proveedores` → List view
  - `/proveedores/nueva` → Create form
  - `/proveedores/:id` → Edit form

### 5. Navigation

- **Sidebar:** Add icon and link in `src/renderer/App.jsx` sidebar
- **Home Page:** Add to module quick-nav panel (`src/renderer/pages/Home/index.jsx`)
- **URGENTE! Page:** Add to grouping logic (`src/renderer/pages/Urgente/index.jsx`) if module supports urgent flag

### 6. Testing

- **Integration Tests:** Test IPC handlers with in-memory DB (`tests/integration/proveedores.test.js`)
  - Test CRUD operations
  - Test validation (required fields, max lengths)
  - Test error cases
- **Component Tests:** Test list view and form (`tests/component/Proveedores.test.jsx`)
  - Mock IPC responses using `mockIPCResponse` helper
  - Test search, filter, sort
  - Test form validation
- **E2E Test:** Create `tests/e2e/proveedores.spec.js`
  - Full CRUD flow: create → verify in list → edit → delete

### 7. Documentation

- Add module description to `README.md` table
- Add requirements to `docs/REQUIREMENTS.md` (create new §3.X)
- Add UI routes to `docs/UI_DESIGN.md §12`
- Update `docs/DATA_MODEL.md` with new table schema
- Mark completion in `PROMPTS.md` under "Discovered / Follow-on Prompts"

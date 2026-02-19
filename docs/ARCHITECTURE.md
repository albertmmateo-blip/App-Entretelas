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

# Requirements

## 1. Overview

App-Entretelas is a desktop application used as an internal business manager. It stores and organises business information across six distinct modules. All data is persisted locally via SQLite. The UI is built with React and rendered inside an Electron shell.

---

## 2. Global Functional Requirements

| ID    | Requirement                                                                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GF-01 | The application **must** run as a standalone desktop app on **Windows** (Windows 10 or later). macOS and Linux are out of scope.                                                         |
| GF-02 | All data **must** be stored locally in an SQLite database. No cloud persistence is required for v1.                                                                                      |
| GF-03 | Data modules **must** provide at least search or filtering in their primary list view; sortable columns are required where explicitly defined per-module.                                |
| GF-04 | Any entry in **Notas**, **Llamar**, or **Encargar** can be marked as **URGENTE!**. Urgent entries are surfaced at the top of their respective lists and aggregated in the URGENTE! page. |
| GF-05 | The main navigation menu is always visible and displays large icons for each module in the following order: URGENTE!, Notas, Llamar, Encargar, Facturas, E-mail.                         |
| GF-06 | All text in the UI **must** be in Spanish.                                                                                                                                               |
| GF-07 | The application **must** support adding, editing, and deleting entries in all data modules.                                                                                              |
| GF-08 | Date/time of creation and last modification **must** be stored for every entry and displayed in list views.                                                                              |

---

## 3. Module Requirements

### 3.1 Home Page

| ID    | Requirement                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| HP-01 | The Home page displays a unified, paginated list of all **Notas**, **Llamar**, and **Encargar** entries together. |
| HP-02 | The list is sortable by: date created (default, descending), date modified, type (module), and name/subject.      |
| HP-03 | The list is searchable via a text input that matches against all text fields.                                     |
| HP-04 | A filter panel allows filtering by: module type, date range, and URGENTE! status.                                 |
| HP-05 | Urgent entries appear at the top of the list, visually distinguished (e.g. coloured badge/icon).                  |
| HP-06 | Above the list, a panel with large navigation icons links to each module page.                                    |

---

### 3.2 URGENTE!

| ID    | Requirement                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| UR-01 | Displays all Notas, Llamar, and Encargar entries that have `urgente = true`.                                                    |
| UR-02 | Entries are grouped by module type and sorted by date modified (most recent first).                                             |
| UR-03 | Each entry shows: module type badge, title/subject, contact (if present), date created, and a button to remove the urgent flag. |
| UR-04 | Clicking an entry navigates to the detail view of that entry within its module.                                                 |
| UR-05 | If there are no urgent entries, an empty-state message is displayed.                                                            |

---

### 3.3 Notas

| ID    | Requirement                                                                               |
| ----- | ----------------------------------------------------------------------------------------- |
| NO-01 | A note is a free-form record saved automatically with the current date and time.          |
| NO-02 | **Required fields:** none.                                                                |
| NO-03 | **Optional fields:** `Nombre` (text), `Descripción` (multi-line text), `Contacto` (text). |
| NO-04 | Notes are listed sorted by `fecha_creacion` descending by default.                        |
| NO-05 | Notes are searchable by Nombre, Descripción, and Contacto.                                |
| NO-06 | Each note can be marked/unmarked as URGENTE! from the list or from its detail view.       |
| NO-07 | Notes can be deleted with a confirmation dialog.                                          |
| NO-08 | The note editor is a simple form; no rich-text formatting is required for v1.             |

---

### 3.4 Llamar

| ID    | Requirement                                                            |
| ----- | ---------------------------------------------------------------------- |
| LL-01 | Llamar entries represent reminders to make a call or send a message.   |
| LL-02 | **Required fields:** `Asunto` (text), `Contacto` (text).               |
| LL-03 | **Optional fields:** `Nombre` (text), `Descripción` (multi-line text). |
| LL-04 | Entries are sortable by date created, date modified, and Asunto.       |
| LL-05 | Entries are searchable by Asunto, Nombre, Descripción, and Contacto.   |
| LL-06 | Each entry can be marked/unmarked as URGENTE!.                         |
| LL-07 | Entries can be deleted with a confirmation dialog.                     |

---

### 3.5 Encargar

| ID    | Requirement                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------- |
| EN-01 | Encargar entries represent items that need to be reordered from a supplier.                                               |
| EN-02 | **Required fields:** `Artículo` (text).                                                                                   |
| EN-03 | **Optional fields:** `Ref. Interna` (text), `Descripción` (multi-line text), `Proveedor` (text), `Ref. Proveedor` (text). |
| EN-04 | Entries are sortable by date created, Artículo, and Proveedor.                                                            |
| EN-05 | Entries are searchable by all text fields.                                                                                |
| EN-06 | Each entry can be marked/unmarked as URGENTE!.                                                                            |
| EN-07 | Entries can be deleted with a confirmation dialog.                                                                        |

---

### 3.6 Facturas

#### 3.6.1 General

| ID    | Requirement                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| FA-01 | The `/facturas` root page displays two top-level folders: **Facturas Compra** and **Facturas Venta**.                                                                                      |
| FA-02 | **Facturas Compra** lists `proveedores`; **Facturas Venta** lists `clientes`. Each list supports text search by key fields and card-level actions (Editar / Eliminar).                     |
| FA-03 | PDFs are stored on disk under `{userData}/facturas/<tipo>/<entidad_sanitizada>/` and tracked in SQLite table `facturas_pdf` (metadata + relative path).                                    |
| FA-04 | Stored PDF filename format is `[Proveedor                                                                                                                                                  | Client] - [nombre_original_sanitizado].pdf`, with numeric suffix collision handling (`(1)`, `(2)`, ...). |
| FA-05 | PDF upload accepts one or multiple files and validates: `.pdf` extension, `%PDF` header, and max size **50 MB** per file.                                                                  |
| FA-06 | Each uploaded PDF is shown as a first-page thumbnail (160 × 210) with metadata summary: original filename, upload date, importe, importe+IVA+RE, vencimiento, and estado pagada/pendiente. |
| FA-07 | Metadata fields (`importe`, `importe_iva_re`, `vencimiento`, `pagada`) are editable from the PDF card and persisted via IPC.                                                               |
| FA-08 | A PDF can be deleted with confirmation; DB record deletion and file deletion are both attempted by the main process handler.                                                               |
| FA-09 | PDF bytes retrieval for thumbnail rendering must validate relative paths and reject traversal attempts (`..`, `~`, or paths outside `{userData}/facturas`).                                |

#### 3.6.2 Proveedor (Facturas Compra)

| ID    | Requirement                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FP-01 | **Required fields:** `Razón Social` (text).                                                                                                |
| FP-02 | **Optional fields:** `Dirección` (text), `NIF` (text).                                                                                     |
| FP-03 | Routes implemented: `/facturas/compra`, `/facturas/compra/nuevo`, `/facturas/compra/:proveedorId`, `/facturas/compra/:proveedorId/editar`. |

#### 3.6.3 Cliente (Facturas Venta)

| ID    | Requirement                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| FC-01 | **Required fields:** `Razón Social` (text), `Número de Cliente` (text).                                                            |
| FC-02 | **Optional fields:** `Dirección` (text), `NIF` (text).                                                                             |
| FC-03 | Routes implemented: `/facturas/venta`, `/facturas/venta/nuevo`, `/facturas/venta/:clienteId`, `/facturas/venta/:clienteId/editar`. |

---

### 3.7 E-mail

| ID    | Requirement                                                                                                                   |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| EM-01 | The E-mail page embeds an Electron `<webview>` pointing to `https://mail.google.com`.                                         |
| EM-02 | The user can navigate the Gmail web interface with most standard functionalities.                                             |
| EM-03 | External links opened from within the Gmail webview **must** open in the system's default browser, not a new Electron window. |
| EM-04 | The user's Gmail session is persisted across application restarts via Electron session cookies.                               |

---

## 4. Non-Functional Requirements

| ID    | Requirement                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| NF-01 | Cold start time **should** be under 3 seconds on a modern mid-range laptop.                                                              |
| NF-02 | All database queries **should** complete in under 200 ms.                                                                                |
| NF-03 | The UI **must** be responsive down to 1280 × 720 px.                                                                                     |
| NF-04 | PDF thumbnail generation **must** not block the main UI thread; it **must** run in a background worker or off the main renderer process. |
| NF-05 | The application **must** handle corrupted or unreadable PDFs gracefully (show a placeholder thumbnail and an error message).             |
| NF-06 | User data (SQLite database and PDF files) **must** be stored in the OS-standard user data directory (`app.getPath('userData')`).         |
| NF-07 | The application **must** prompt the user before any destructive action (deletion, folder removal).                                       |

---

## 5. Out of Scope (v1)

- Cloud synchronisation or multi-user support.
- Rich-text / Markdown formatting in Notas.
- Email composition, sending, or reply from within the app (Gmail webview provides this natively).
- Automated invoice parsing or OCR.
- Exporting data to CSV/Excel.

---

## 6. Performance and Scale Targets

App-Entretelas is designed for single-user desktop use with local data storage. These targets ensure good performance for typical business use over 5+ years.

| Metric                                        | Target       | Notes                                                                        |
| --------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| **Total entries** (Notas + Llamar + Encargar) | Up to 10,000 | Reasonable for 5 years of daily business use (~5-6 entries per business day) |
| **PDF files**                                 | Up to 1,000  | Storage: ~50 MB avg/file = 50 GB max                                         |
| **Database size**                             | Up to 500 MB | SQLite performs well at this scale on modern hardware                        |
| **List rendering**                            | < 100 ms     | For up to 1,000 visible entries (measured with React DevTools Profiler)      |
| **Search query**                              | < 50 ms      | Using FTS5 indexes for full-text search                                      |
| **Cold start time**                           | < 3 seconds  | From app launch to UI ready (on mid-range laptop with SSD)                   |
| **Database query**                            | < 200 ms     | For any single query (SELECT, INSERT, UPDATE, DELETE)                        |

### Scalability Strategy

- **Pagination:** Lists show 100 entries per page by default (configurable in UI)
- **Virtual scrolling:** If list exceeds 500 entries, use `react-window` for virtualization
- **Lazy loading:** Only load data for active module (not all data on startup)
- **Query optimization:** Use `EXPLAIN QUERY PLAN` to verify indexes are used
- **Database maintenance:** Run `VACUUM` periodically to reclaim space and optimize storage

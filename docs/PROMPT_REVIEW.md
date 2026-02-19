# Prompt Review Analysis

**Date:** 2026-02-19
**Reviewer:** Claude Sonnet 4.5
**Purpose:** Comprehensive review of PROMPTS.md for thoroughness, coherence, security, and AI execution suitability

---

## Executive Summary

This document provides a detailed analysis of the prompts in PROMPTS.md, evaluating them against security best practices, architectural consistency, testing strategy, verifiability, and AI execution requirements.

**Key Findings:**

- ✅ Strong foundation with clear security boundaries and consistent patterns
- ⚠️ Several prompts need more specific success criteria
- ⚠️ Testing strategy needs refinement for integration coverage
- ⚠️ Some version-specific risks require explicit handling
- ⚠️ Several prompts lack objective verification steps

---

## 1. Electron Security Best Practices

### 1.1 Context Isolation and Node Integration

**Status:** ✅ **GOOD** - Consistently enforced

**Analysis:**

- P1-01 explicitly requires `contextIsolation: true` and `nodeIntegration: false` (line 36)
- ARCHITECTURE.md §2 reinforces these requirements (line 40-41)
- All IPC patterns route through preload script with contextBridge

**Recommendations:**

- None required - this is well-specified

### 1.2 IPC Channel Security

**Status:** ⚠️ **NEEDS IMPROVEMENT** - Input validation not explicitly required

**Issues Found:**

1. **P2-01, P2-02, P2-03** (Notas/Llamar/Encargar modules):
   - Prompts specify IPC handlers but don't require input validation
   - No mention of payload sanitization or size limits
   - Missing specification for error handling on invalid inputs

2. **P3-02** (PDF upload):
   - Path sanitization is mentioned (line 152)
   - But character sanitization list is incomplete for Windows
   - Missing: validation of file size limits, MIME type verification
   - No mention of preventing directory traversal attacks

**Recommendations:**

**Action Required:** Add to Agent Rules in PROMPTS.md:

```
9. **IPC input validation.** All IPC handlers must validate input payloads:
   - Check required fields are present and of correct type
   - Sanitize string inputs (trim, check length limits)
   - Validate numeric inputs are within acceptable ranges
   - Return structured error responses for invalid inputs
```

**Action Required:** Update P3-02 to specify:

```
- Validate PDF file extension matches MIME type
- Enforce maximum file size limit (e.g., 50 MB)
- Sanitize filenames: remove ALL special characters: \ / : * ? " < > | and control characters (ASCII 0-31)
- Validate that sanitized names are not Windows reserved names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
- Return specific error codes for: file too large, invalid type, invalid name
```

### 1.3 WebView Security

**Status:** ⚠️ **NEEDS IMPROVEMENT** - Incomplete security specification

**Issues Found in P4-01** (Gmail webview):

1. Missing security attributes for webview tag:
   - No mention of `allowpopups="false"`
   - No mention of `disablewebsecurity="false"` (should be explicit)
   - No mention of Content Security Policy for the webview itself

2. Navigation security incomplete:
   - `will-navigate` handler specified but no validation logic
   - `new-window` redirects to `shell.openExternal` but no URL validation
   - Risk: malicious Gmail content could trigger phishing URLs

**Recommendations:**

**Action Required:** Update P4-01 to specify:

```
- Set webview attributes: `allowpopups="false"`, `disablewebsecurity="false"`, `nodeintegration="false"`
- Implement allow-list for will-navigate: only allow URLs matching `https://*.google.com/*` and `https://mail.google.com/*`
- Validate URLs before calling shell.openExternal():
  * Check protocol is http:// or https:// only
  * Warn user before opening external URLs with a confirmation dialog
  * Block file:// and other local protocols
- Add CSP meta tag in renderer index.html allowing only google.com domains for webview
```

### 1.4 SQL Injection Prevention

**Status:** ✅ **GOOD** - Clearly specified

**Analysis:**

- Agent Rules line 16: "Parameterised SQL only"
- ARCHITECTURE.md §7 explicitly states all queries use parameterised statements
- DATA_MODEL.md shows proper SQL structure

**Recommendations:**

- None required

### 1.5 Version-Specific Security Risks

**Status:** ⚠️ **NEEDS ATTENTION**

**Electron 30 Specific Risks:**

1. **DeprecatedAPI usage:**
   - `shell.openPath()` used in P3-02 (line 155) - check if still supported
   - Webview tag in P4-01 - officially deprecated, consider BrowserView

2. **Better-sqlite3 with Electron 30:**
   - Native module compatibility needs verification
   - P1-03 mentions electron-rebuild (line 63) but doesn't specify version compatibility testing

**React 18 Specific Risks:**

1. **Concurrent rendering:**
   - No prompts mention React 18 concurrent features
   - Potential race conditions in Zustand stores if not using transitions properly

**PDF.js Risks:**

1. **P3-03** (PDF thumbnail generation):
   - Uses `pdfjs-dist` but doesn't specify version compatibility
   - Doesn't mention Web Worker requirement for PDF.js (security best practice)
   - Canvas rendering in renderer could be used for XSS if PDF is malicious

**Vite Specific Risks:**

1. **Build configuration:**
   - No prompt validates Vite CSP configuration
   - No mention of Vite's manifest for integrity checks

**Recommendations:**

**Action Required:** Add new prompt P1-01a (after P1-01):

```
### P1-01a — Verify dependency versions and security configuration `[ ]`

> Validate that all dependencies are compatible and securely configured.
>
> Requirements:
> - Verify Electron 30 compatibility with better-sqlite3 (check GitHub issues/compatibility matrix)
> - Test that `shell.openPath()` works on Electron 30 or replace with recommended alternative
> - Configure Vite with Content Security Policy in index.html:
>   * script-src 'self'
>   * object-src 'none'
>   * base-uri 'self'
>   * Allow webview-src https://mail.google.com for Gmail embed
> - Add package.json script to check for known vulnerabilities: `npm run audit:security`
> - Run: `npm audit --production` and ensure no high/critical vulnerabilities
> - Document any accepted vulnerabilities with justification in SECURITY.md
```

**Action Required:** Update P3-03 to specify:

```
- Use PDF.js Web Worker for rendering (never parse PDFs on main thread)
- Configure worker: `pdfjsLib.GlobalWorkerOptions.workerSrc = 'path/to/pdf.worker.js'`
- Wrap PDF parsing in try-catch and sanitize errors before displaying to user
- Set canvas rendering limits: max canvas size 4096x4096 px to prevent memory exhaustion
- Add timeout for PDF rendering (5 seconds) to prevent DoS from malicious PDFs
```

---

## 2. Main / Preload / Renderer Boundary Enforcement

### 2.1 Boundary Clarity

**Status:** ✅ **GOOD** - Generally well-defined

**Analysis:**

- ARCHITECTURE.md §2 clearly defines process model
- All module prompts (P2-01, P2-02, P2-03) follow consistent pattern:
  1. Register IPC handlers in main (src/main/ipc/\*)
  2. Expose via preload (src/preload/index.js)
  3. Call via window.electronAPI in renderer

**Issues Found:**

1. **P3-03** (PDF thumbnail generation):
   - Says "use `pdfjs-dist` to render... in the renderer" (line 163)
   - But doesn't specify HOW PDF bytes are fetched from main process
   - Implies renderer directly reads files (boundary violation risk)

2. **P1-03** (SQLite setup):
   - Correctly specifies main process owns connection (line 64)
   - But doesn't prevent prompts from accidentally using SQLite in renderer

**Recommendations:**

**Action Required:** Update P3-03 to clarify:

```
- Add IPC handler `facturas:getPDFBytes` in main process that:
  * Accepts PDF path (validate it's within userData/facturas/)
  * Reads file using fs.readFile
  * Returns ArrayBuffer to renderer
  * Includes error handling for missing/corrupted files
- Renderer requests PDF bytes via window.electronAPI.getPDFBytes(path)
- Only after receiving bytes, pass ArrayBuffer to pdfjs-dist for rendering
```

**Action Required:** Add to Agent Rules:

```
10. **Process boundary enforcement.**
    - Main process ONLY: SQLite queries, file I/O, native OS APIs
    - Preload script ONLY: contextBridge.exposeInMainWorld definitions
    - Renderer ONLY: React components, UI state, window.electronAPI calls
    - NEVER import Node.js modules (fs, path, etc.) directly in renderer code
    - NEVER import better-sqlite3 or electron main APIs in renderer
```

### 2.2 Data Serialization Across IPC

**Status:** ⚠️ **MISSING SPECIFICATION**

**Issues:**

- No prompt specifies serialization format for IPC
- Complex objects (Dates, Buffers) may not serialize correctly
- No error handling for serialization failures

**Recommendations:**

**Action Required:** Add to ARCHITECTURE.md §4 (Data Flow):

````
### IPC Data Serialization Rules

All data passed over IPC is serialized via Structured Clone Algorithm:

- **Dates:** Convert to ISO-8601 strings in main process before returning
- **Buffers:** Convert to ArrayBuffer or Uint8Array for IPC transfer
- **Errors:** Return plain objects: `{ success: false, error: { code: 'ERROR_CODE', message: 'Description' } }`
- **Success responses:** Return: `{ success: true, data: {...} }`

Example IPC handler pattern:

```javascript
ipcMain.handle('notas:getAll', async () => {
  try {
    const rows = db.prepare('SELECT * FROM notas').all();
    return {
      success: true,
      data: rows.map(r => ({
        ...r,
        fecha_creacion: r.fecha_creacion, // already ISO string from DB
        fecha_mod: r.fecha_mod
      }))
    };
  } catch (err) {
    return {
      success: false,
      error: { code: 'DB_ERROR', message: err.message }
    };
  }
});
````

```

**Action Required:** Update P2-01 (and note to follow pattern for P2-02, P2-03):
```

- All IPC handlers return structured responses: { success: boolean, data?: any, error?: { code, message } }
- Handle errors gracefully and return error objects (never throw across IPC)
- Zustand stores check response.success before updating state
- Display user-friendly error messages in UI (translate error codes to Spanish)

```

---

## 3. Testing Strategy Review

### 3.1 Test Layer Coverage

**Status:** ⚠️ **INCOMPLETE** - Missing integration tests

**Current Testing Approach:**

| Prompt | Test Type | What's Tested | What's Missing |
|--------|-----------|---------------|----------------|
| P1-03 | Unit | Migration runner (in-memory DB) | ✅ Good |
| P2-01 | Component | List view, form rendering | ❌ No IPC integration test |
| P2-04 | Component | Search, sort, filter logic | ⚠️ Likely UI-focused only |
| P3-02 | Unit | Path sanitization function | ❌ No file I/O integration test |
| P3-03 | Unit | Thumbnail cache logic | ❌ No PDF rendering integration |
| P4-01 | Component | Webview renders without crash (mocked) | ❌ No real webview test |
| P5-03 | E2E | End-to-end smoke test (Playwright) | ⚠️ Only one E2E test |

**Issues Found:**

1. **Over-testing UI, under-testing business logic:**
   - Component tests verify rendering, but not IPC interactions
   - No tests for main process IPC handlers
   - No tests for database query correctness beyond migration

2. **Missing integration tests:**
   - No tests that verify renderer → IPC → DB → IPC → renderer flow
   - No tests for file upload → storage → retrieval flow
   - No tests for Zustand store integration with IPC

3. **E2E testing too sparse:**
   - Only P5-03 has E2E test (very late in development)
   - No E2E tests for individual modules as they're built
   - Risk: integration bugs discovered very late

4. **Flakiness risks:**
   - P4-01 mocks webview (can't catch real webview bugs)
   - P3-03 thumbnail generation depends on canvas rendering (async, timing-sensitive)
   - P5-03 E2E test has many steps (will be slow and brittle)

**Recommendations:**

**Action Required:** Update testing strategy throughout prompts:

**Add to Agent Rules:**
```

11. **Testing requirements for each module:**
    - Unit tests: Pure functions (path sanitizers, date formatters, validators)
    - Integration tests: IPC handler → DB query → response (test in main process context)
    - Component tests: UI rendering and user interactions (mock IPC responses)
    - E2E tests: Critical user journeys (one per major module)

```

**Action Required:** Update P2-01 (and replicate pattern for P2-02, P2-03):
```

- Write integration tests for IPC handlers:
  - Test in Node.js environment (not renderer)
  - Use in-memory SQLite database
  - Call IPC handler functions directly (not over IPC channel)
  - Verify: notas:create inserts row, notas:getAll returns all rows, notas:update modifies, notas:delete removes
  - Test error cases: missing required fields, invalid IDs, SQL errors
- Component tests should mock window.electronAPI.\* calls
- Add one E2E test for Notas module: open app → create nota → verify it appears in list → edit it → delete it

```

**Action Required:** Update P5-03:
```

- Break E2E test into separate test files per module:
  - tests/e2e/notas.spec.js - Create, edit, mark urgent, delete nota
  - tests/e2e/llamar.spec.js - Create, edit, mark urgent, delete llamar
  - tests/e2e/encargar.spec.js - Create, edit, mark urgent, delete encargar
  - tests/e2e/urgente.spec.js - Verify urgent aggregation across modules
  - tests/e2e/facturas.spec.js - Upload PDF, verify thumbnail, open in viewer, delete
- Each test file should be independently runnable
- Tests should clean up data after themselves (delete created entries)
- Total E2E runtime target: < 2 minutes for full suite

```

**Action Required:** Update P3-03:
```

- Add integration test for thumbnail generation:
  - Use a real (small, safe) test PDF file in tests/fixtures/test-invoice.pdf
  - Call thumbnail generation function
  - Verify canvas output is non-empty
  - Verify cache stores the result
  - Second call retrieves from cache (faster)
- Handle flakiness: wrap canvas operations in retry logic (max 3 attempts)

```

### 3.2 Test Maintainability

**Status:** ⚠️ **NEEDS IMPROVEMENT**

**Issues:**

1. **No shared test utilities mentioned:**
   - Each prompt mentions "write tests" but no guidance on reusable helpers
   - Risk: duplicated test setup code across modules

2. **No test data factories:**
   - Tests will likely hard-code data
   - Risk: brittle tests that break on schema changes

**Recommendations:**

**Action Required:** Add new prompt P1-03a (after P1-03):
```

### P1-03a — Test utilities and fixtures `[ ]`

> Create shared test utilities for consistent testing across modules.
>
> Requirements:
>
> - Create `tests/helpers/db.js`:
>   - `createTestDb()`: Returns in-memory SQLite connection with migrations applied
>   - `seedTestData(db, tableName, rows)`: Inserts test data
>   - `clearTable(db, tableName)`: Truncates table
> - Create `tests/helpers/ipc-mock.js`:
>   - Mock implementation of window.electronAPI for component tests
>   - `mockIPCResponse(channel, response)`: Sets up mock response
> - Create `tests/fixtures/`:
>   - `test-invoice.pdf`: Small valid PDF (< 100 KB)
>   - `sample-data.js`: Factory functions for creating test entities (notas, llamar, encargar, proveedores, clientes)
> - Create `tests/helpers/e2e.js`:
>   - `launchApp()`: Starts Electron app for E2E tests
>   - `cleanDatabase()`: Resets test database between E2E tests
> - Document usage of helpers in docs/DEVELOPMENT_GUIDE.md §8

```

---

## 4. Underspecified Prompts and Implementation Sprawl

### 4.1 Prompts That Are Too Broad

**P1-02** (Application shell) - **⚠️ MODERATE RISK**
- Says "register all routes listed in docs/UI_DESIGN.md §12" (line 52)
- That's 13 routes total, but prompt only says create "placeholder <PageName /> component"
- Risk: AI might create full page implementations or skip routes

**Recommendation:**
Update P1-02 to be explicit:
```

- Create placeholder components in src/renderer/pages/:
  - Home/index.jsx → exports `<div>Home</div>`
  - Urgente/index.jsx → exports `<div>URGENTE!</div>`
  - Notas/index.jsx → exports `<div>Notas</div>`
  - (etc. for all modules)
- Do NOT implement any business logic in placeholders
- Placeholders should only render the module name as h1 heading

```

**P2-04** (Home page) - **⚠️ HIGH RISK**
- Requires fetching from 3 modules, merging, sorting, filtering, searching
- Says "implement text search across all text fields" - which fields exactly?
- "Default sort: fecha_creacion descending; urgent entries always float to the top" - how to combine these?
- Risk: AI could implement inefficient N+1 queries or client-side sorting of large datasets

**Recommendation:**
Update P2-04 to specify:
```

- Data fetching strategy:
  - Call window.electronAPI.notas.getAll(), llamar.getAll(), encargar.getAll() in parallel
  - Merge results client-side (acceptable since data is local)
  - Transform each entry to unified format: { id, type: 'nota'|'llamar'|'encargar', title, contacto, urgente, fecha_creacion, fecha_mod }
  - Where title = nombre for notas, asunto for llamar, articulo for encargar
- Sorting:
  - Primary sort: urgente DESC (urgent entries first)
  - Secondary sort: user-selected column (default: fecha_creacion DESC)
  - Use lodash orderBy or native Array.sort with multiple comparators
- Search:
  - Search fields: title, contacto, descripcion (if present)
  - Use simple string includes (case-insensitive)
  - Filter merged list client-side
- Performance target: < 100ms for list of 1000 entries

```

**P3-03** (PDF thumbnail generation) - **⚠️ MODERATE RISK**
- Says "thumbnails are generated lazily when they scroll into viewport" (line 164)
- Doesn't specify IntersectionObserver configuration (rootMargin, threshold)
- Risk: thumbnails might generate too early/late, causing janky scrolling

**Recommendation:**
Update P3-03 to specify:
```

- Use IntersectionObserver with:
  - rootMargin: '200px' (pre-load thumbnails 200px before they enter viewport)
  - threshold: 0.01 (trigger as soon as 1% is visible)
- Render at most 3 thumbnails concurrently (queue others)
- Use requestIdleCallback for non-critical thumbnail generation
- If user scrolls quickly, cancel pending thumbnail renders and prioritize visible ones

```

### 4.2 Prompts with Implicit Dependencies

**P4-01** (Gmail webview) - **⚠️ DOCUMENTATION ISSUE**
- Says "test that webview component renders without crashing (mock webview in test)" (line 182)
- But webview tag requires Electron runtime - can't easily mock
- Risk: AI might skip test entirely or write non-functional test

**Recommendation:**
Update P4-01:
```

- Component test should verify:
  - Email page component renders
  - <webview> element is present in DOM (check tag name)
  - Src attribute is set to https://mail.google.com
  - Use @testing-library/react with custom render that doesn't crash on unknown <webview> tag
- For E2E test (add to P5-03): verify Gmail login page loads in webview

```

**P5-02** (Windows installer) - **⚠️ UNVERIFIABLE**
- Says "verify the installer runs on a clean Windows 10 VM" (line 205)
- This is impossible for AI to verify
- Breaks rule: no unverifiable claims

**Recommendation:**
Update P5-02:
```

- Remove: "Verify the installer runs on a clean Windows 10 VM"
- Replace with:
  - Run `npm run dist` successfully with exit code 0
  - Verify `dist/App-Entretelas Setup x.y.z.exe` exists and is > 50 MB
  - Verify electron-builder log shows no errors
  - Document manual testing steps in docs/DEVELOPMENT_GUIDE.md §7.2:
    "To verify installer: (1) Copy .exe to clean Windows machine, (2) Run installer, (3) Launch app from Start Menu, (4) Verify app opens and database initializes"

```

### 4.3 Success Criteria That Are Not Objectively Verifiable

**Issue Summary:**

| Prompt | Non-Verifiable Criterion | Problem |
|--------|--------------------------|---------|
| P1-01 | "app window must open to blank white page" (line 42) | How to verify "white"? Could be #FFFFFF, #FEFEFE, or default background |
| P1-02 | "Use colour palette and typography defined in docs" (line 54) | No automated check that colors match |
| P2-01 | "Urgent entries show red badge" (line 84) | No automated check for color |
| P3-03 | "Show loading skeleton while thumbnail is being generated" (line 166) | "Skeleton" is subjective |
| P5-01 | "All interactive elements have visible focus rings" (line 194) | "Visible" is subjective, no contrast check |
| P5-02 | "Verify installer runs on clean VM" (line 205) | Cannot be done by AI |

**Recommendations:**

**Action Required:** Update all subjective success criteria to be objectively verifiable:

**P1-01:**
```

- Replace: "app window must open to blank white page"
- With: "app window must open with document.title === 'App-Entretelas' and document.body contains no errors in console"

```

**P1-02:**
```

- Add: "Run a visual regression test (Percy or Chromatic) to verify colors match design tokens in tailwind.config.js"
- OR: "Create a script that parses CSS and checks for Tailwind class usage: grep for 'bg-neutral-50', 'text-primary', etc."

```

**P2-01:**
```

- Add: "Write a component test that verifies urgent entries have className containing 'bg-danger' or 'text-danger'"

```

**P3-03:**
```

- Replace: "Show loading skeleton"
- With: "Display a placeholder div with data-testid='thumbnail-loading' and CSS animation while loading"

```

**P5-01:**
```

- Replace: "visible focus rings"
- With: "All interactive elements have focus styles with CSS outline-width >= 2px and contrast ratio >= 3:1 (verify with automated accessibility audit via axe-core)"

```

**P5-02:** (Already addressed above - remove VM verification)

---

## 5. Duplicate Implementations and Conflicting Patterns

### 5.1 Potential Duplications

**Status:** ⚠️ **MODERATE RISK**

**Issues Found:**

1. **Module CRUD patterns (P2-01, P2-02, P2-03):**
   - All three modules have identical IPC/Zustand/List/Form patterns
   - P2-02 says "Follow the same patterns established in P2-01" (line 91)
   - P2-03 says "Follow the same patterns as P2-01/P2-02" (line 100)
   - Risk: Code duplication across notas/llamar/encargar modules
   - Risk: Inconsistencies if AI interprets "same pattern" differently each time

2. **Proveedores and Clientes (P3-01):**
   - Nearly identical CRUD operations for two entities
   - Risk: Duplicated form components, IPC handlers

**Recommendations:**

**Action Required:** Add new prompt P2-01a (after P2-01):
```

### P2-01a — Shared CRUD components and hooks `[ ]`

> Refactor common patterns from P2-01 into reusable abstractions.
>
> Requirements:
>
> - Create `src/renderer/components/DataTable.jsx`:
>   - Generic table component accepting columns, data, actions
>   - Built-in sort, search, context menu support
>   - Reusable for Notas, Llamar, Encargar
> - Create `src/renderer/components/EntryForm.jsx`:
>   - Generic form component accepting fields config
>   - Built-in validation, submit, cancel, urgente toggle
> - Create `src/renderer/hooks/useCRUD.js`:
>   - Custom hook abstracting Zustand store operations
>   - Accepts module name, returns { entries, create, update, delete, fetchAll, toggleUrgente }
> - Update Notas module to use these shared components
> - Write unit tests for DataTable, EntryForm, useCRUD

```

**Action Required:** Update P2-02 and P2-03:
```

- Use shared DataTable component from P2-01a for list views
- Use shared EntryForm component from P2-01a for forms
- Use useCRUD hook for Zustand store operations
- Only implement module-specific field configurations (pass to EntryForm as props)

```

**Action Required:** Update P3-01:
```

- Create shared ProveedorCliente form component that accepts `type: 'proveedor' | 'cliente'` prop
- Conditionally render "Número de Cliente" field only when type === 'cliente'
- Share IPC handler logic: create src/main/ipc/entidades.js with generic CRUD functions accepting table name

```

### 5.2 Conflicting Patterns

**Status:** ✅ **GOOD** - No major conflicts found

**Analysis:**
- All IPC patterns use `<module>:<action>` naming (consistent)
- All forms use Spanish labels (consistent)
- All deletions require confirmation (consistent)
- All date fields use ISO-8601 (consistent)

**Minor Issue:**

**P2-04** (Home page) vs. **P2-05** (URGENTE page):
- Both fetch from multiple modules and merge entries
- But use different sorting strategies:
  - Home: "urgent entries always float to top" + user sort
  - URGENTE: "sorted by fecha_mod descending within each group"
- Not a conflict, but could share sorting logic

**Recommendation:**
```

- Create shared utility: src/renderer/utils/sortEntries.js
- Export functions: sortByUrgent(entries), sortByDate(entries, field), sortByMultiple(entries, comparators)
- Use in both Home and URGENTE pages

```

---

## 6. Long-Term Maintainability and Extension

### 6.1 Schema Evolution

**Status:** ⚠️ **PARTIALLY ADDRESSED**

**Good Practices:**
- DATA_MODEL.md §6 describes migration strategy (line 205)
- Migrations are numbered and never modified (line 212)

**Missing:**
- No prompt teaches how to ADD a new migration
- No guidance on backward-compatible changes only

**Recommendation:**

**Action Required:** Add to docs/DEVELOPMENT_GUIDE.md:
```

## 12. Adding Database Migrations

When adding a new field or table:

1. Create a new migration file: `src/main/db/migrations/00X_description.sql`
   - Use next sequential number
   - Name describes the change (e.g., `002_add_notas_archivado.sql`)

2. Write additive SQL only (v1 does not support rollbacks):

   ```sql
   -- Good: Add new optional column
   ALTER TABLE notas ADD COLUMN archivado INTEGER NOT NULL DEFAULT 0;

   -- Bad: Remove or rename columns (breaks old app versions)
   -- ALTER TABLE notas DROP COLUMN nombre;
   ```

3. Update DATA_MODEL.md with new schema

4. Update corresponding IPC handlers to support new field

5. Test migration:
   - Copy production database to test environment
   - Run app with new migration
   - Verify user_version PRAGMA incremented
   - Verify data integrity

6. If migration fails, DO NOT modify the migration file
   - Instead, create a new migration to fix the issue

```

### 6.2 Adding New Modules

**Status:** ⚠️ **NO GUIDANCE PROVIDED**

**Issue:**
- Prompts show how to build initial 5 modules
- But no documentation on how to add a 7th module later

**Recommendation:**

**Action Required:** Add to docs/ARCHITECTURE.md:
```

## 8. Adding a New Module

To add a new module (e.g., "Proveedores"):

1. Database:
   - Create migration: `src/main/db/migrations/00X_add_proveedores.sql`
   - Define table with id, required fields, urgente flag, fecha_creacion, fecha_mod
   - Add trigger for fecha_mod auto-update
   - Add FTS5 virtual table for search
   - Add index on urgente column

2. Main process:
   - Create `src/main/ipc/proveedores.js`
   - Register handlers: getAll, create, update, delete
   - Use parameterised queries
   - Return structured responses: { success, data/error }

3. Preload:
   - Update `src/preload/index.js`
   - Add to contextBridge: proveedores: { getAll, create, update, delete }

4. Renderer:
   - Create `src/renderer/store/proveedores.js` (Zustand)
   - Create `src/renderer/pages/Proveedores/index.jsx` (list view)
   - Create `src/renderer/pages/Proveedores/Form.jsx` (create/edit)
   - Reuse DataTable and EntryForm components
   - Add routes to App.jsx

5. Navigation:
   - Add icon and link to sidebar in App.jsx
   - Add to module quick-nav in Home page
   - Add to URGENTE page grouping logic

6. Testing:
   - Integration tests for IPC handlers
   - Component tests for list and form
   - E2E test for full CRUD flow

7. Documentation:
   - Add module to README.md table
   - Add requirements to docs/REQUIREMENTS.md
   - Update docs/UI_DESIGN.md with routes
   - Mark in PROMPTS.md under "Discovered / Follow-on Prompts"

```

### 6.3 Dependency Updates

**Status:** ❌ **NOT ADDRESSED**

**Issue:**
- No guidance on how to update Electron, React, Vite, or other deps
- Risk: Breaking changes in major version updates

**Recommendation:**

**Action Required:** Add to docs/DEVELOPMENT_GUIDE.md:
```

## 13. Updating Dependencies

### Electron Version Updates

Electron follows Chromium release cycle (new major every 8 weeks). Updating requires:

1. Check Electron release notes: https://releases.electronjs.org/
2. Review breaking changes for your version jump
3. Update package.json: `"electron": "^XX.0.0"`
4. Rebuild native modules: `npm run rebuild-natives`
5. Test IPC handlers (especially contextBridge APIs)
6. Test webview (often breaks due to Chromium changes)
7. Update ARCHITECTURE.md to note new Electron version

### React Version Updates

1. Check React changelog: https://react.dev/blog
2. Update package.json: `"react": "^XX.0.0"`, `"react-dom": "^XX.0.0"`
3. Run tests: component tests may break on React updates
4. Check for deprecated lifecycle methods or hooks
5. Update ARCHITECTURE.md

### Vite Version Updates

1. Check Vite migration guide: https://vitejs.dev/guide/migration.html
2. Update vite.config.js per migration guide
3. Test HMR in development: `npm run dev`
4. Test production build: `npm run build`
5. Verify Electron app still launches after build

### Security Updates

Run `npm audit` regularly (at least monthly):

```powershell
npm audit
npm audit fix  # Auto-fix non-breaking updates
npm audit fix --force  # Fix breaking updates (test thoroughly after)
```

For better-sqlite3 security updates:

- Check GitHub releases: https://github.com/WiseLibs/better-sqlite3/releases
- Native modules require rebuild: `npm run rebuild-natives`

```

---

## 7. Prompt Structure for AI Execution

### 7.1 Clarity and Specificity

**Status:** ⚠️ **MIXED QUALITY**

**Good Examples:**

✅ **P1-03** (SQLite setup):
- Clear requirements with specific file paths
- Concrete acceptance criteria: "npm test must pass"
- Points to exact schema in DATA_MODEL.md

✅ **P2-01** (Notas module):
- Lists specific IPC channels by name
- References exact UI sections in UI_DESIGN.md
- Clear component list: list view, form, dialog

**Poor Examples:**

❌ **P2-04** (Home page):
- "Implement text search across all text fields" - which fields?
- "Merge them into one sorted list" - what data structure?
- "Default sort... urgent entries always float to top" - how to combine?

❌ **P3-03** (PDF thumbnails):
- "Generate lazily when they scroll into viewport" - using what API?
- "Cache rendered thumbnails" - what data structure?
- "Handle errors gracefully" - what counts as graceful?

❌ **P5-01** (Keyboard shortcuts):
- "All interactive elements are focusable" - how to verify?
- "Have visible focus rings" - what CSS?

**Recommendations:**

**Action Required:** Rewrite P2-04 with concrete specifications:
```

### P2-04 — Home page: unified list + module quick-nav `[ ]`

> Implement the Home page as specified in docs/REQUIREMENTS.md §3.1 and docs/UI_DESIGN.md §5.
>
> Requirements:
>
> - Create `src/renderer/pages/Home/index.jsx`
> - Fetch data on mount:
>   - Call window.electronAPI.notas.getAll(), llamar.getAll(), encargar.getAll() using Promise.all
>   - Transform results into unified array of objects: `{ id: number, type: 'notas'|'llamar'|'encargar', title: string, contacto: string|null, descripcion: string|null, urgente: boolean, fecha_creacion: string, fecha_mod: string }`
>   - title = nombre (notas), asunto (llamar), articulo (encargar)
> - Sorting:
>   - Primary: urgente DESC (always)
>   - Secondary: user-selected column (default: fecha_creacion DESC)
>   - Use Array.sort with multi-level comparator
> - Search:
>   - <SearchBar /> component at top with onChange handler
>   - Filter entries where query appears in title, contacto, or descripcion (case-insensitive)
>   - Use String.prototype.toLowerCase().includes()
> - Filtering:
>   - <FilterPanel /> component with dropdowns:
>     - Module type: All / Notas / Llamar / Encargar
>     - URGENTE: All / Only urgent / Non-urgent
>     - Date range: Last 7 days / Last 30 days / All time
>   - Apply filters before rendering table
> - Module quick-nav panel:
>   - Grid of 6 large icon buttons (120x120px each)
>   - Icons link to: /urgente, /notas, /llamar, /encargar, /facturas, /email
>   - Use Link component from react-router-dom
> - List rendering:
>   - Reuse <DataTable /> component
>   - Columns: Type (badge), URGENTE (red dot if true), Title, Contacto, Fecha
>   - Row click navigates to entry edit page: /${entry.type}/${entry.id}
> - Write component tests:
>   - Search filters list correctly
>   - Sort by date works
>   - Module type filter works
>   - Empty state shows when no entries
> - Performance: List should render < 100ms for 1000 entries

```

**Action Required:** Rewrite P3-03 with concrete specifications:
```

### P3-03 — PDF thumbnail generation `[ ]`

> Add lazy thumbnail generation for PDFs using PDF.js.
>
> Requirements:
>
> - Install: `npm install pdfjs-dist`
> - Configure worker in renderer:
>   ```javascript
>   import * as pdfjsLib from 'pdfjs-dist';
>   pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
>   ```
> - Copy pdf.worker.js from node_modules/pdfjs-dist/build/ to public/
> - Create `src/renderer/components/PDFThumbnail.jsx`:
>   - Props: { pdfPath: string }
>   - State: loading (boolean), thumbnailDataUrl (string | null), error (Error | null)
> - Thumbnail generation logic:
>   - On mount, call window.electronAPI.getPDFBytes(pdfPath)
>   - Load PDF: `pdfjsLib.getDocument({ data: arrayBuffer })`
>   - Get first page: `pdf.getPage(1)`
>   - Create canvas element (160x210px - A4 aspect ratio)
>   - Render page to canvas: `page.render({ canvasContext, viewport })`
>   - Convert to data URL: `canvas.toDataURL('image/png')`
>   - Set state: thumbnailDataUrl
>   - Wrap in try-catch: set error state on failure
> - Lazy loading with IntersectionObserver:
>   - Create useIntersectionObserver hook
>   - Observer config: rootMargin: '200px', threshold: 0.01
>   - Only call getPDFBytes when component is in viewport
> - Caching:
>   - Create context: ThumbnailCacheContext
>   - Store cache in context: Map<string, string> (path -> data URL)
>   - Check cache before generating thumbnail
>   - Add to cache after generation
> - Concurrency limit:
>   - Create queue in cache context
>   - Render max 3 thumbnails concurrently
>   - Queue others and process when slot available
> - Error handling:
>   - Timeout: abort rendering if it takes > 5 seconds
>   - Display placeholder icon if PDF can't be rendered
>   - Log errors to console (not user-visible popup)
> - Loading state:
>   - Show <div data-testid="thumbnail-loading" className="animate-pulse bg-neutral-200" />
> - Write unit test for ThumbnailCache context:
>   - Verify cache stores and retrieves data URLs
>   - Verify cache doesn't re-render same PDF twice
> - Write integration test:
>   - Use tests/fixtures/test-invoice.pdf
>   - Render PDFThumbnail component
>   - Verify canvas element created
>   - Verify data URL is non-empty

```

**Action Required:** Rewrite P5-01:
```

### P5-01 — Keyboard shortcuts & accessibility `[ ]`

> Add keyboard support and accessibility attributes.
>
> Requirements:
>
> - Keyboard shortcuts:
>   - Create `src/renderer/hooks/useKeyboardShortcuts.js` hook
>   - On Ctrl+F: call document.querySelector('[data-search-input]')?.focus()
>   - On Escape: call closeModal() from modal context (if modal is open)
>   - On Enter in forms: call handleSubmit() (use onKeyDown handler on form element)
>   - Shortcuts should only apply when not typing in an input (check event.target.tagName)
> - Focus management:
>   - All buttons must have CSS: `focus:outline-2 focus:outline-primary focus:outline-offset-2`
>   - All inputs must have CSS: `focus:ring-2 focus:ring-primary`
>   - Modals must trap focus (use focus-trap-react library)
>   - On modal open, focus first interactive element
>   - On modal close, return focus to trigger element
> - ARIA labels:
>   - All icon buttons without text must have aria-label attribute
>   - Labels must be in Spanish: aria-label="Editar entrada", "Eliminar entrada", "Buscar", "Filtrar"
>   - Context menu buttons: aria-label="Abrir menú de acciones"
> - ARIA roles:
>   - Use semantic HTML where possible (<button>, <nav>, <main>, <header>)
>   - Add role="dialog" to modal overlays
>   - Add role="alertdialog" to confirmation dialogs
>   - Add role="navigation" to sidebar
> - Accessibility audit:
>   - Install: `npm install --save-dev axe-core @axe-core/react`
>   - Add axe-core to development mode only:
>     ```javascript
>     if (import.meta.env.DEV) {
>       import('@axe-core/react').then((axe) => {
>         axe.default(React, ReactDOM, 1000);
>       });
>     }
>     ```
>   - Run app in dev mode and fix any accessibility warnings in console
> - Write component test:
>   - Use @testing-library/user-event
>   - Test Tab key navigation through form fields
>   - Test Escape key closes modal
>   - Test Ctrl+F focuses search bar
> - Success criteria:
>   - `npm run dev` shows no axe-core errors in console
>   - All tests pass
>   - Manual test: Navigate entire app using only keyboard (Tab, Enter, Escape, Arrow keys)

```

### 7.2 Dependency on External Documentation

**Status:** ✅ **GOOD** - Appropriate use of cross-references

**Analysis:**
- Prompts frequently reference docs/ files (e.g., "per docs/UI_DESIGN.md §5")
- This is good: avoids duplication, keeps prompts concise
- Documentation is comprehensive and specific

**Minor Issue:**
- Some prompts reference ambiguous sections
- Example: P2-01 line 84 "Urgent entries show the red badge" - which badge? Where defined?

**Recommendation:**
**Action Required:** Cross-check all documentation references:
```

- Verify every "per docs/X.md §Y" reference points to existing section
- Ensure referenced sections contain sufficient detail for implementation
- If doc section is ambiguous, either clarify doc or include detail in prompt

```

### 7.3 Prompt Sequencing and Dependencies

**Status:** ⚠️ **SOME DEPENDENCIES MISSING**

**Issues:**

1. **P3-03** depends on **P3-02** (needs `facturas:getPDFBytes` IPC handler)
   - But P3-02 doesn't specify this handler
   - AI executing P3-03 would need to create it retroactively (risky)

2. **P2-04** and **P2-05** depend on **P2-01, P2-02, P2-03**
   - But prompts don't explicitly state "do not start until P2-01/02/03 are complete"
   - AI might attempt to implement without underlying stores ready

3. **P5-03** (E2E test) depends on ALL prior prompts
   - But doesn't list explicit prerequisites
   - Risk: E2E test written before features exist

**Recommendations:**

**Action Required:** Add dependency notation to prompts:

```

### P2-04 — Home page: unified list + module quick-nav `[ ]`

**Dependencies:** P2-01 (Notas), P2-02 (Llamar), P2-03 (Encargar) must be completed first.

> Implement the Home page...

```

```

### P3-03 — PDF thumbnail generation `[ ]`

**Dependencies:** P3-02 (PDF upload and storage) must be completed first.

**Note:** This prompt requires P3-02 to expose an IPC handler `facturas:getPDFBytes` (if not already present, add it in P3-02).

> Add lazy thumbnail generation...

```

```

### P5-03 — End-to-end smoke test `[ ]`

**Dependencies:** All prompts P1-01 through P5-02 must be completed first. This is an integration test of the entire application.

> Write a minimal end-to-end test...

```

### 7.4 Size and Complexity of Individual Prompts

**Status:** ⚠️ **SOME PROMPTS TOO LARGE**

**Analysis of prompt complexity (by requirement count):**

| Prompt | Requirements | Assessment | Risk |
|--------|--------------|------------|------|
| P1-01 | 8 | ⚠️ Large (scaffold + config + 4 tools) | Moderate |
| P1-02 | 6 | ✅ Good | Low |
| P2-01 | 7 | ⚠️ Moderate (IPC + store + 3 UIs) | Moderate |
| P2-04 | 5 | ⚠️ Large (3 data sources + merge + filter + search) | High |
| P3-03 | 7 | ⚠️ Large (PDF.js + observer + cache + queue) | High |
| P5-03 | 5 steps | ⚠️ Large (multi-module E2E) | High |

**Prompts that should be split:**

**P1-01** is acceptable (project bootstrap is naturally large), but could be split:
```

P1-01a: Scaffold Electron + React + Vite
P1-01b: Configure Tailwind, ESLint, Prettier, Husky
P1-01c: Add Vitest and React Testing Library

```

**P2-04** should be split:
```

P2-04a: Implement unified data fetching and merging
P2-04b: Implement search and filter panel
P2-04c: Implement module quick-nav panel

```

**P3-03** should be split:
```

P3-03a: Implement basic PDF thumbnail rendering with PDF.js
P3-03b: Add lazy loading with IntersectionObserver
P3-03c: Add thumbnail caching and concurrency control

```

**P5-03** should be split (already recommended in §3.1):
```

P5-03a: E2E test for Notas module
P5-03b: E2E test for Llamar module
P5-03c: E2E test for Encargar module
P5-03d: E2E test for URGENTE aggregation
P5-03e: E2E test for Facturas PDF upload

```

**Recommendation:**
**Action Required:** Split large prompts as described above and update PROMPTS.md.

---

## 8. Uncovered Risk Areas

### 8.1 Data Loss and Backup

**Status:** ❌ **NOT ADDRESSED**

**Risks:**
- No backup strategy for user data
- No auto-save for forms (user could lose work)
- No recovery mechanism if database corrupts

**Recommendations:**

**Action Required:** Add new prompt:
```

### P1-04 — Database backup and recovery `[ ]`

> Implement automatic database backup and recovery mechanisms.
>
> Requirements:
>
> - On app startup, create timestamped backup: `{userData}/backups/entretelas-YYYY-MM-DD-HHmmss.db`
> - Keep last 7 backups, delete older backups
> - Create IPC handler `db:restore` that accepts backup filename
> - If database fails to open (corrupted), automatically attempt to restore from latest backup
> - Show user notification on restore: "Base de datos restaurada desde copia de seguridad"
> - Add manual backup option in a (future) Settings page
> - Write integration test:
>   - Create entries in test DB
>   - Backup DB
>   - Delete entries
>   - Restore DB
>   - Verify entries reappear

```

**Action Required:** Add auto-save to forms (P2-01):
```

- Use useEffect with debounce (500ms) to auto-save form state to localStorage
- Key: `autosave-${moduleName}-${entryId || 'new'}`
- On form mount, check localStorage for autosave data and restore if present
- Clear autosave data on successful submit or cancel
- Show indicator: "Guardado automáticamente" in form footer

```

### 8.2 Performance and Scalability

**Status:** ⚠️ **PARTIALLY ADDRESSED**

**Addressed:**
- NF-02: Database queries < 200 ms
- P2-04: Performance target for Home page (< 100ms for 1000 entries)

**Not Addressed:**
- What happens with 10,000 entries? 100,000?
- No pagination specified for lists
- No virtual scrolling for large lists
- No database query optimization guidance (indexes exist, but no query planning)

**Recommendations:**

**Action Required:** Add to docs/REQUIREMENTS.md:
```

## 6. Performance and Scale Targets

| Metric                                    | Target       | Notes                                  |
| ----------------------------------------- | ------------ | -------------------------------------- |
| Total entries (Notas + Llamar + Encargar) | Up to 10,000 | Reasonable for 5 years of business use |
| PDF files                                 | Up to 1,000  | Storage: ~50 MB avg/file = 50 GB max   |
| Database size                             | Up to 500 MB | SQLite performs well at this scale     |
| List rendering                            | < 100 ms     | For up to 1,000 visible entries        |
| Search query                              | < 50 ms      | Using FTS5 indexes                     |

### Scalability Strategy

- **Pagination:** Lists show 100 entries per page by default
- **Virtual scrolling:** Implement if > 500 entries (use react-window)
- **Lazy loading:** Only load data for active module (not all data on startup)
- **Query optimization:** Use EXPLAIN QUERY PLAN to verify indexes are used

```

**Action Required:** Update P2-01 (and P2-02, P2-03):
```

- Implement pagination for list view:
  - Default page size: 100 entries
  - Show "Anterior" / "Siguiente" buttons at bottom
  - Update Zustand store with currentPage state
  - Only render current page of entries
- If list has > 500 entries, use react-window for virtual scrolling:
  - Install: npm install react-window
  - Wrap list in <FixedSizeList> component
  - Set item size: 60px per row

```

### 8.3 Error Handling and User Feedback

**Status:** ⚠️ **INCONSISTENTLY ADDRESSED**

**Good:**
- Prompts mention confirmation dialogs for destructive actions
- P3-03 mentions "handle errors gracefully" for PDF rendering

**Missing:**
- No global error boundary for React
- No specification for error message display (toast? modal? inline?)
- No guidance on error logging
- No offline/network error handling (not applicable since local-only, but DB errors possible)

**Recommendations:**

**Action Required:** Add new prompt P1-02a:
```

### P1-02a — Error handling infrastructure `[ ]`

> Implement global error boundary and error notification system.
>
> Requirements:
>
> - Create `src/renderer/components/ErrorBoundary.jsx`:
>   - Catch React errors
>   - Display fallback UI: "Algo salió mal. Recargar la aplicación."
>   - Log error to console
>   - Wrap <App /> in ErrorBoundary in main.jsx
> - Create `src/renderer/components/Toast.jsx`:
>   - Notification component for non-critical errors and success messages
>   - Auto-dismiss after 5 seconds
>   - Stack multiple toasts vertically
>   - Types: success (green), error (red), info (blue)
> - Create `src/renderer/hooks/useToast.js`:
>   - Returns showToast(message, type) function
>   - Use context to manage toast state globally
> - Create `src/renderer/utils/errorMessages.js`:
>   - Map error codes to Spanish messages:
>     - DB_ERROR: "Error al guardar los datos"
>     - NOT_FOUND: "Entrada no encontrada"
>     - INVALID_INPUT: "Por favor, revisa los datos ingresados"
>     - FILE_TOO_LARGE: "El archivo es demasiado grande (máx. 50 MB)"
>     - FILE_INVALID: "El archivo no es un PDF válido"
> - Update IPC error responses to include error codes (not just messages)
> - Write component test for ErrorBoundary (throw error in child component)
> - Write component test for Toast (show and auto-dismiss)

```

**Action Required:** Update all module prompts (P2-01, etc.) to use error handling:
```

- In Zustand store actions, wrap IPC calls in try-catch
- On error response, call useToast().showToast(errorMessages[error.code], 'error')
- On success, call useToast().showToast('Guardado correctamente', 'success')

```

### 8.4 Electron-Specific Risks

**Status:** ⚠️ **SOME GAPS**

**Covered:**
- Context isolation
- IPC security

**Not Covered:**

1. **App lifecycle:**
   - No specification for app quit behavior (save state? close database?)
   - No handling of app updates (electron-updater not mentioned)
   - No handling of multiple instances (should prevent or allow?)

2. **Window management:**
   - No specification for window state persistence (size, position)
   - No specification for minimize to tray (out of scope for v1, but worth noting)

3. **Crash reporting:**
   - No mention of Electron crash reporter
   - No logs for debugging issues on user machines

**Recommendations:**

**Action Required:** Update P1-01:
```

- Register app lifecycle handlers in src/main/index.js:
  - app.on('before-quit'): Close database connection cleanly
  - app.on('window-all-closed'): Quit app on Windows (app.quit())
  - app.on('second-instance'): Prevent multiple instances - focus existing window
- Implement window state persistence:
  - Save window bounds to userData/window-state.json on close
  - Restore bounds on next launch
  - Use electron-window-state package: `npm install electron-window-state`

```

**Action Required:** Add to DEVELOPMENT_GUIDE.md:
```

## 14. Debugging Production Issues

### Logs

Electron logs are written to:

- Windows: `%APPDATA%\App-Entretelas\logs\main.log` (main process)
- Windows: `%APPDATA%\App-Entretelas\logs\renderer.log` (renderer process)

To enable logging:

- Install electron-log: `npm install electron-log`
- In main process: `import log from 'electron-log'` and use `log.info()`, `log.error()`
- In renderer: logs are forwarded via IPC to main process

### Crash Reports

Use Electron's built-in crash reporter (future enhancement):

- Configure crashReporter.start() in main process
- Send reports to self-hosted server (not public service for privacy)

```

### 8.5 User Experience Edge Cases

**Status:** ⚠️ **MINIMAL COVERAGE**

**Not Addressed:**

1. **Empty states:** Only mentioned in a few prompts (P2-05, UI_DESIGN.md §11)
2. **Loading states:** Mentioned for thumbnails, but not for data fetching
3. **Optimistic updates:** No guidance on whether to update UI before IPC response
4. **Conflicts:** What if user edits entry A, but another instance deleted it?
   - (Not applicable in v1 single-instance app, but worth noting)
5. **Large text handling:** What if user pastes 100,000 characters into descripción field?

**Recommendations:**

**Action Required:** Add UX guidance to UI_DESIGN.md:
```

## 13. UX Patterns and Edge Cases

### Loading States

All data-fetching operations must show loading indicator:

- Lists: Show skeleton rows (3 rows of animated gray bars)
- Forms: Disable submit button and show spinner
- PDFs: Show "Cargando..." text in thumbnail placeholder
- Minimum display time: 300ms (don't flash for fast operations)

### Empty States

All lists must show empty state when no data:

- Use pattern from UI_DESIGN.md §11
- Include icon (📭), message, and call-to-action button
- Empty state should be visually centered in content area

### Optimistic Updates

For delete operations:

- Immediately remove entry from list (optimistic)
- If IPC delete fails, re-add entry and show error toast
- For create/update: wait for IPC response before showing in list (to get ID)

### Input Validation and Limits

- All text inputs: maxLength={255}
- Multi-line textareas (descripción): maxLength={5000}
- Show character count when > 80% of limit
- Trim whitespace on submit
- Prevent submit if required fields are empty

### Stale Data

- Lists refresh data when page regains focus (useEffect with focus event listener)
- No real-time sync needed (single-user, single-instance app)

```

---

## 9. Summary of Required Actions

### Critical (Must Fix Before Implementation)

1. ✅ **Add IPC input validation rule** to PROMPTS.md Agent Rules (§1.2)
2. ✅ **Update P3-02** with complete file sanitization and validation (§1.2)
3. ✅ **Update P4-01** with webview security attributes and URL validation (§1.3)
4. ✅ **Add P1-01a** for dependency version verification and security audit (§1.5)
5. ✅ **Update P3-03** with PDF.js Web Worker and security limits (§1.5)
6. ✅ **Add process boundary enforcement rule** to PROMPTS.md (§2.1)
7. ✅ **Add IPC serialization guide** to ARCHITECTURE.md (§2.2)
8. ✅ **Update P2-01** with IPC response structure (§2.2)
9. ✅ **Update testing strategy** in P2-01, P2-02, P2-03 with integration tests (§3.1)
10. ✅ **Add P1-03a** for test utilities and fixtures (§3.2)
11. ✅ **Update P5-03** to split E2E tests by module (§3.1)
12. ✅ **Update P5-02** to remove unverifiable VM test (§4.3)

### High Priority (Important for Quality)

13. ✅ **Add P2-01a** for shared CRUD components to prevent duplication (§5.1)
14. ✅ **Rewrite P2-04** with concrete specifications (§7.1)
15. ✅ **Rewrite P3-03** with concrete specifications (§7.1)
16. ✅ **Rewrite P5-01** with concrete specifications (§7.1)
17. ✅ **Add dependency notation** to P2-04, P2-05, P3-03, P5-03 (§7.3)
18. ✅ **Split large prompts**: P2-04, P3-03, P5-03 (§7.4)
19. ✅ **Add P1-04** for database backup and recovery (§8.1)
20. ✅ **Update P2-01** with auto-save for forms (§8.1)
21. ✅ **Add P1-02a** for error handling infrastructure (§8.3)

### Medium Priority (Maintainability)

22. ✅ **Add schema evolution guide** to DEVELOPMENT_GUIDE.md (§6.1)
23. ✅ **Add "Adding New Modules" guide** to ARCHITECTURE.md (§6.2)
24. ✅ **Add "Updating Dependencies" guide** to DEVELOPMENT_GUIDE.md (§6.3)
25. ✅ **Add performance targets** to REQUIREMENTS.md (§8.2)
26. ✅ **Update P2-01** with pagination and virtual scrolling (§8.2)
27. ✅ **Update P1-01** with app lifecycle handlers (§8.4)
28. ✅ **Add debugging guide** to DEVELOPMENT_GUIDE.md (§8.4)
29. ✅ **Add UX patterns guide** to UI_DESIGN.md (§8.5)

### Low Priority (Nice to Have)

30. **Update P1-02** with explicit placeholder component list (§4.1)
31. **Add shared sorting utility** for Home and URGENTE pages (§5.2)
32. **Cross-check all documentation references** in prompts (§7.2)

---

## 10. Conclusion

**Overall Assessment:** ⚠️ **GOOD FOUNDATION, NEEDS REFINEMENT**

The prompts in PROMPTS.md provide a solid architectural foundation with clear security boundaries and consistent patterns. However, there are significant gaps in:

1. **Security:** Input validation, webview security, version-specific risks
2. **Testing:** Missing integration tests, over-emphasis on component tests
3. **Verifiability:** Several success criteria cannot be objectively verified
4. **Specificity:** Some prompts are too broad and risk implementation sprawl
5. **Risk Coverage:** Missing backup, error handling, performance, and UX edge cases

**Recommended Approach:**

1. Address all **Critical** items before starting any implementation
2. Address **High Priority** items in Phase 1 (while building scaffolding)
3. Address **Medium Priority** items progressively during Phases 2-3
4. Address **Low Priority** items as time permits

By implementing these recommendations, the prompts will be:
- More secure (defense in depth)
- More testable (comprehensive coverage)
- More maintainable (clear patterns, documented processes)
- More executable by AI (concrete, verifiable specifications)
- Less risky (edge cases and failure modes covered)

---

**Document Status:** ✅ Complete
**Next Steps:** Update PROMPTS.md and documentation files per recommendations
```

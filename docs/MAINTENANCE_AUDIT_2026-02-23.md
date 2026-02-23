# Maintenance Audit — 2026-02-23

## Scope

Focused audit on recent unstable areas:

- Native module rebuild workflow (`better-sqlite3` for Node vs Electron runtimes)
- Facturas Compra/Venta folder-shortcut + quarter summary UX behavior
- Documentation consistency for operational scripts and recovery steps

## Significant Changes (recent)

1. Runtime rebuild workflow changed in `package.json`:
   - `predev` now runs `rebuild-natives` (Electron ABI rebuild) before launching app.
   - `pretest*` still runs `rebuild-natives:node` for Node runtime tests.
2. New Windows lock-cleanup script added: `scripts/cleanup-native-locks.js`.
3. Facturas Venta UX changed in `src/renderer/pages/Facturas/ClientesList.jsx`:
   - Folder shortcuts hidden by default.
   - Searchbar filters only by `razon_social` and `numero_cliente`.
   - Quarter summary decoupled from shortcut visibility.
4. Regression tests updated in `tests/component/FacturasFlow.test.jsx`.

## Findings

### 1) High — ABI flip-flop risk across workflows

**What**

- Tests compile `better-sqlite3` for Node runtime.
- App requires Electron runtime ABI.
- If app is started without an Electron rebuild, DB layer fails to load and user sees data-related toasts.

**Where**

- `package.json` scripts (`pretest*`, `predev`, `rebuild-natives*`).

**Impact**

- App can look “broken” (missing proveedores/clientes, save errors) although data file still exists.

**Current mitigation**

- `predev` now enforces Electron rebuild.

**Residual risk**

- Any custom launch path that bypasses `npm run dev` can still hit mismatch.

---

### 2) High — Force-kill cleanup script can terminate active work

**What**

- `cleanup-native-locks` force-stops matching `node.exe`/`electron.exe` processes.
- Fallback logic may kill additional Electron/Node processes when lock persists.

**Where**

- `scripts/cleanup-native-locks.js`.

**Impact**

- Unsaved app state can be lost.
- Developer tooling sessions may be interrupted.

**Current mitigation**

- Warnings in docs.

**Residual risk**

- Operational risk remains by design; this is a tradeoff for lock recovery.

---

### 3) Medium — Duplicate business logic between Compra/Venta list pages

**What**

- `ClientesList.jsx` and `ProveedoresList.jsx` repeat similar logic for:
  - overdue-payment evaluation,
  - folder-count loading,
  - quarter-summary loading fallback behavior.

**Impact**

- Increases drift/regression probability (one page fixed, the other forgotten).
- Makes behavior changes costlier and harder to reason about.

**Recommendation**

- Extract shared logic to a dedicated hook/service (e.g. `useFacturasFolderSummary(tipo, entries)`).

---

### 4) Medium — Overloaded component responsibilities in `ClientesList.jsx`

**What**

- Component handles: fetch, async aggregation, filtering, summary rendering, route-level folder navigation, and detail naming composition.

**Impact**

- High cognitive load and fragile edits for small UX changes.

**Recommendation**

- Split into:
  - `ClientesShortcutsSection`
  - `FacturasQuarterSummaryTable`
  - async data hook for counts + overdue flags

---

### 5) Low — Documentation drift risk

**What**

- Script behavior changed quickly and docs briefly diverged.

**Where**

- `README.md` and `docs/DEVELOPMENT_GUIDE.md` (now aligned in this update).

**Impact**

- Wrong runbook steps during incidents.

## Immediate hardening actions (recommended)

1. Keep `predev` Electron rebuild (already in place).
2. Add explicit “runtime mismatch” troubleshooting block in incident docs with symptoms:
   - `NODE_MODULE_VERSION` mismatch toast,
   - data appears missing but DB still present.
3. Add a single shared hook for Facturas folder summary/flags to remove duplicated logic.
4. Add a lightweight smoke check script that validates `npm run dev` after `npm test` in CI (Windows runner).

## Decision log

- **Accepted tradeoff:** force-kill lock cleanup remains enabled for Windows reliability.
- **Risk accepted with mitigation:** potential unsaved state loss; users/developers must save work before rebuild steps.

## Audit outcome

- No evidence of permanent data-loss logic introduced by the recent UX changes.
- Main production risk is operational/runtime ABI mismatch and aggressive lock cleanup side effects.
- Maintainability risk is primarily structural duplication and oversized page components.

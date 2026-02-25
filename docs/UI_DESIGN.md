# UI Design

## 1. Design Principles

- **Spanish-first**: all labels, messages, and tooltips are in Spanish.
- **Clarity over decoration**: the interface is clean and functional; minimal visual chrome.
- **Urgency is visible**: urgent entries use a consistent red badge/icon across all pages.
- **Consistent patterns**: list views, forms, and confirmation dialogs share the same component patterns throughout the app.

---

## 2. Application Shell

```
┌────────────────────────────────────────────────────────────────┐
│  [App icon]  App-Entretelas          [─]  [□]  [✕]            │  ← title bar
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                      │
│  [ICON]  │                                                      │
│ URGENTE! │                                                      │
│          │                                                      │
│  [ICON]  │            Content area                             │
│  Notas   │         (page component renders here)               │
│          │                                                      │
│  [ICON]  │                                                      │
│  Llamar  │                                                      │
│          │                                                      │
│  [ICON]  │                                                      │
│ Encargar │                                                      │
│          │                                                      │
│  [ICON]  │                                                      │
│ Facturas │                                                      │
│          │                                                      │
│  [ICON]  │                                                      │
│  E-mail  │                                                      │
│          │                                                      │
└──────────┴─────────────────────────────────────────────────────┘
```

- The **sidebar** is always visible, 72 px wide, with large icons (40 × 40 px) and short labels below each icon.
- The active module icon is highlighted with the primary accent colour.
- The sidebar is **not collapsible** in v1.

---

## 3. Colour Palette

| Token         | Hex       | Usage                                   |
| ------------- | --------- | --------------------------------------- |
| `primary`     | `#1D4ED8` | Active nav item, primary buttons, links |
| `danger`      | `#DC2626` | Urgent badge, delete buttons            |
| `success`     | `#16A34A` | Confirmation states                     |
| `neutral-50`  | `#F9FAFB` | Page background                         |
| `neutral-200` | `#E5E7EB` | Dividers, borders                       |
| `neutral-700` | `#374151` | Body text                               |
| `neutral-900` | `#111827` | Headings                                |

---

## 4. Typography

| Element            | Style                                    |
| ------------------ | ---------------------------------------- |
| Page title         | `text-2xl font-bold text-neutral-900`    |
| Section heading    | `text-lg font-semibold text-neutral-700` |
| Body / table cells | `text-sm text-neutral-700`               |
| Placeholder / meta | `text-xs text-neutral-400`               |

---

## 5. Home Page Layout

```
┌─────────────────────────────────────────────────────┐
│  [Icon: URGENTE!]  [Icon: Notas]  [Icon: Llamar]    │
│  [Icon: Encargar]  [Icon: Facturas]  [Icon: E-mail] │  ← module quick-nav panel
├─────────────────────────────────────────────────────┤
│  🔍 [Search input …]    [Filtros ▾]                 │  ← search + filter bar
├───────┬────────┬───────────────────┬────────────────┤
│ Tipo  │ URGENT.│ Título / Asunto   │ Fecha          │  ← table header
├───────┼────────┼───────────────────┼────────────────┤
│ 🔴 N  │  ●    │ Nota de ejemplo   │ 19/02/2026     │
│    LL │        │ Llamar a proveedo │ 18/02/2026     │
│    EN │        │ Pedir hilo blanco │ 17/02/2026     │
└───────┴────────┴───────────────────┴────────────────┘
```

- Urgent entries appear at the top with a red dot in the URGENTE column.
- Clicking a row opens the entry's detail/edit view.

---

## 6. List View Pattern (Notas / Llamar / Encargar)

```
┌─────────────────────────────────────────────────────────────┐
│  [+ Nueva entrada]                    🔍 [Buscar …]        │
├─────────────────────────────────────────────────────────────┤
│  [URGENTE! ●] Título / Asunto                     Fecha  ⋮  │
│  ─────────────────────────────────────────────────────────  │
│  [●] Nota 1                                 19/02/2026  ⋮   │
│      Nota 2                                 18/02/2026  ⋮   │
└─────────────────────────────────────────────────────────────┘
```

- `⋮` is a context menu with: **Editar**, **Marcar/Desmarcar Urgente**, **Eliminar**.
- Clicking the row (outside `⋮`) opens the detail view.

---

## 7. Entry Form Pattern

```
┌──────────────────────────────────────────────────────────┐
│  ← Volver          [Módulo: Notas]                       │
├──────────────────────────────────────────────────────────┤
│  Nombre *                                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Descripción                                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Contacto                                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [ ] Marcar como URGENTE!                                │
│                                                          │
│  [Cancelar]                            [Guardar]         │
└──────────────────────────────────────────────────────────┘
```

- Required fields are marked with `*` and validated on submit.
- The URGENTE! checkbox is a toggle; when checked, the label turns red.

---

## 8. URGENTE! Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️  URGENTE!                                             │
├──────────────────────────────────────────────────────────┤
│  NOTAS (2)                                               │
│  ─────────────────────────────────────────────────────   │
│  [●] Nota urgente                    19/02/2026  ⋮       │
│  [●] Otra nota urgente               18/02/2026  ⋮       │
│                                                          │
│  LLAMAR (1)                                              │
│  ─────────────────────────────────────────────────────   │
│  [●] Llamar a proveedor             17/02/2026  ⋮        │
│                                                          │
│  ENCARGAR (0)                                            │
│  ─────────────────────────────────────────────────────   │
│  (Sin entradas urgentes)                                 │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Facturas Page Layout

```
┌──────────────────────────────────────────────────────────┐
│  Facturas                                                │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐             │
│  │ 📁 Facturas       │  │ 📁 Facturas       │             │
│  │    Compra         │  │    Venta          │             │
│  └──────────────────┘  └──────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

Clicking **Facturas Compra** opens:

```
┌──────────────────────────────────────────────────────────┐
│  ← Facturas Compra        [+ Nuevo Proveedor]            │
├──────────────────────────────────────────────────────────┤
│  🔍 [Buscar …]                                           │
├──────────────────────────────────────────────────────────┤
│  [chips acceso rápido por proveedor]                     │
├──────────────────────────────────────────────────────────┤
│  📁 Proveedor A (Facturas subidas: N)             ⋮      │
│  📁 Proveedor B (Facturas subidas: N)             ⋮      │
└──────────────────────────────────────────────────────────┘
```

Clicking a Proveedor/Cliente card opens:

```
┌──────────────────────────────────────────────────────────┐
│  ← Proveedor A               [Editar proveedor/cliente]  │
├──────────────────────────────────────────────────────────┤
│  [Facturas PDF (count)]      [+ Subir PDF]               │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │               │
│  │ archivo  │  │ archivo  │  │ archivo  │               │
│  │ fecha    │  │ fecha    │  │ fecha    │               │
│  │ importe  │  │ importe  │  │ importe  │               │
│  │ pagada?  │  │ pagada?  │  │ pagada?  │               │
│  │ [Editar] │  │ [Editar] │  │ [Editar] │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└──────────────────────────────────────────────────────────┘
```

- Thumbnails are 160 × 210 px (A4 aspect ratio).
- Each PDF card includes inline metadata editing (`importe`, `importe+IVA+RE`, `vencimiento`, `pagada`).
- PDF deletion uses a dedicated delete icon with confirmation dialog.
- Thumbnail rendering is lazy (IntersectionObserver) and reads bytes via `facturas:getPDFBytes`.

---

## 10. Confirmation Dialog Pattern

```
┌────────────────────────────────────┐
│  ⚠  ¿Eliminar esta entrada?        │
│                                    │
│  Esta acción no se puede deshacer. │
│                                    │
│  [Cancelar]          [Eliminar]    │
└────────────────────────────────────┘
```

- The **Eliminar** button is styled in `danger` red.
- The dialog is a modal overlay; it can be dismissed with Escape or by clicking **Cancelar**.

---

## 11. Empty State Pattern

```
┌────────────────────────────────────────┐
│                                        │
│        📭  Sin entradas                │
│                                        │
│  No hay ninguna nota todavía.          │
│  Haz clic en "+ Nueva nota" para       │
│  añadir la primera.                    │
│                                        │
└────────────────────────────────────────┘
```

---

## 12. Routing (React Router)

| Route                                  | Page                                 |
| -------------------------------------- | ------------------------------------ |
| `/`                                    | Home                                 |
| `/urgente`                             | URGENTE!                             |
| `/notas`                               | Notas list                           |
| `/notas/nueva`                         | New note form                        |
| `/notas/:id`                           | Edit note form                       |
| `/llamar`                              | Llamar list                          |
| `/llamar/nueva`                        | New llamar form                      |
| `/llamar/:id`                          | Edit llamar form                     |
| `/encargar`                            | Encargar list                        |
| `/encargar/nueva`                      | Encargar workspace (compat route)    |
| `/encargar/:id`                        | Encargar workspace (preselect by ID) |
| `/facturas`                            | Facturas root (two folders)          |
| `/facturas/compra`                     | Facturas Compra – Proveedor list     |
| `/facturas/compra/nuevo`               | Crear proveedor                      |
| `/facturas/compra/:proveedorId`        | PDF list for a Proveedor             |
| `/facturas/compra/:proveedorId/editar` | Edit proveedor                       |
| `/facturas/venta`                      | Facturas Venta – Cliente list        |
| `/facturas/venta/nuevo`                | Crear cliente                        |
| `/facturas/venta/:clienteId`           | PDF list for a Cliente               |
| `/facturas/venta/:clienteId/editar`    | Edit cliente                         |
| `/email`                               | Gmail webview                        |

---

## 13. UX Patterns and Edge Cases

### Loading States

All data-fetching operations must show loading indicator:

- **Lists:** Show skeleton rows (3 rows of animated gray bars with `animate-pulse` from Tailwind)
- **Forms:** Disable submit button and show spinner (use loading state from button component)
- **PDFs:** Show "Cargando..." text in thumbnail placeholder with `animate-pulse` background
- **Minimum display time:** 300ms (don't flash loading state for very fast operations - use delay)

### Empty States

All lists must show empty state when no data (per §11 pattern):

- Use icon (📭), clear message, and call-to-action button
- Empty state should be visually centered in content area
- Messages should be helpful and specific:
  - Notas: "No hay ninguna nota todavía. Haz clic en '+ Nueva nota' para añadir la primera."
  - URGENTE!: "No hay entradas urgentes" (no CTA needed)
  - Filtered list with no results: "No se encontraron resultados. Prueba con otros filtros."

### Optimistic Updates

- **Delete operations:** Immediately remove entry from list (optimistic). If IPC delete fails, re-add entry and show error toast.
- **Create/update operations:** Wait for IPC response before showing in list (to get server-generated ID and timestamps).
- **Toggle urgent:** Optimistically update badge. If IPC fails, revert UI state and show error toast.

### Input Validation and Limits

- **All text inputs:** `maxLength={255}` (single-line fields)
- **Multi-line textareas (descripción):** `maxLength={5000}`
- **Character counters:** Show when input is > 80% of limit: "240 / 255 caracteres"
- **Trim whitespace:** Always trim on form submit (use `value.trim()`)
- **Required field validation:** Prevent submit if required fields are empty. Show red border and message below field: "Este campo es obligatorio"
- **Real-time validation:** Validate on blur, not on every keystroke (better UX)

### Stale Data

- **List refresh:** Reload data when page regains focus (use `useEffect` with focus event listener)
- **No real-time sync needed:** Single-user, single-instance app (data doesn't change externally)
- **Manual refresh:** Provide "Actualizar" button in list toolbar (optional, nice-to-have)

### Error Recovery

- **Network-like errors (DB locked, file not found):** Show retry button in toast notification
- **Validation errors:** Keep form data, highlight fields with errors, allow user to correct and resubmit
- **Fatal errors (caught by ErrorBoundary):** Show reload button that calls `window.location.reload()`

### Keyboard Navigation

- **Tab order:** Logical left-to-right, top-to-bottom through interactive elements
- **Escape key:** Always closes topmost modal/dialog
- **Enter key:** Submits forms (use `<form onSubmit>`, not manual Enter handler)
- **Arrow keys:** Navigate dropdown options (native `<select>` behavior)

### Accessibility

- **Color contrast:** All text meets WCAG AA standard (4.5:1 for normal text, 3:1 for large text)
- **Focus indicators:** Visible 2px outline on all interactive elements
- **Alt text:** All images and icons have descriptive alt text or aria-label
- **Screen reader testing:** Not required for v1, but semantic HTML helps (use `<button>`, `<nav>`, `<main>`, `<header>`)

### Mobile/Responsive (Future)

- **Not in v1 scope:** App is desktop-only (Windows 10+)
- **Minimum supported resolution:** 1280 × 720 px
- **UI should not break** at smaller sizes, but functionality may be limited

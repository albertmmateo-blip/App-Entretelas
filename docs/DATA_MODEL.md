# Data Model

## 1. Entity Relationship Diagram (text)

```
notas          llamar         encargar
─────          ──────         ────────
id (PK)        id (PK)        id (PK)
nombre         asunto *       articulo *
descripcion    contacto *     ref_interna
contacto       nombre         descripcion
urgente        descripcion    proveedor
fecha_creacion urgente        ref_proveedor
fecha_mod      fecha_creacion urgente
               fecha_mod      fecha_creacion
                              fecha_mod

proveedores                   clientes
───────────                   ────────
id (PK)                       id (PK)
razon_social *                razon_social *
direccion                     numero_cliente *
nif                           direccion
fecha_creacion                nif
fecha_mod                     fecha_creacion
                              fecha_mod

facturas_pdf  (metadata only – actual file lives on disk)
────────────
id (PK)
tipo            TEXT  ('compra' | 'venta')
entidad_id      INTEGER  (FK → proveedores.id or clientes.id depending on tipo)
entidad_tipo    TEXT  ('proveedor' | 'cliente')
nombre_original TEXT  (original filename provided by the user)
nombre_guardado TEXT  (full stored filename: "[Entidad] - [nombre_original]")
ruta_relativa   TEXT  (relative path from {userData}/facturas/)
fecha_subida    TEXT  (ISO-8601)
fecha_mod       TEXT  (ISO-8601)
```

`*` = required (NOT NULL with CHECK constraint)

---

## 2. Table Definitions (SQL)

### 2.1 `notas`

```sql
CREATE TABLE IF NOT EXISTS notas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT,
    descripcion    TEXT,
    contacto       TEXT,
    urgente        INTEGER NOT NULL DEFAULT 0 CHECK (urgente IN (0, 1)),
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

### 2.2 `llamar`

```sql
CREATE TABLE IF NOT EXISTS llamar (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    asunto         TEXT    NOT NULL CHECK (length(trim(asunto)) > 0),
    contacto       TEXT    NOT NULL CHECK (length(trim(contacto)) > 0),
    nombre         TEXT,
    descripcion    TEXT,
    urgente        INTEGER NOT NULL DEFAULT 0 CHECK (urgente IN (0, 1)),
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

### 2.3 `encargar`

```sql
CREATE TABLE IF NOT EXISTS encargar (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    articulo       TEXT    NOT NULL CHECK (length(trim(articulo)) > 0),
    ref_interna    TEXT,
    descripcion    TEXT,
    proveedor      TEXT,
    ref_proveedor  TEXT,
    urgente        INTEGER NOT NULL DEFAULT 0 CHECK (urgente IN (0, 1)),
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

### 2.4 `proveedores`

```sql
CREATE TABLE IF NOT EXISTS proveedores (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social   TEXT    NOT NULL CHECK (length(trim(razon_social)) > 0),
    direccion      TEXT,
    nif            TEXT,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

### 2.5 `clientes`

```sql
CREATE TABLE IF NOT EXISTS clientes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social     TEXT    NOT NULL CHECK (length(trim(razon_social)) > 0),
    numero_cliente   TEXT    NOT NULL CHECK (length(trim(numero_cliente)) > 0),
    direccion        TEXT,
    nif              TEXT,
    fecha_creacion   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

### 2.6 `facturas_pdf`

```sql
CREATE TABLE IF NOT EXISTS facturas_pdf (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo            TEXT    NOT NULL CHECK (tipo IN ('compra', 'venta')),
    entidad_id      INTEGER NOT NULL,
    entidad_tipo    TEXT    NOT NULL CHECK (entidad_tipo IN ('proveedor', 'cliente')),
    nombre_original TEXT    NOT NULL,
    nombre_guardado TEXT    NOT NULL,
    ruta_relativa   TEXT    NOT NULL UNIQUE,
    fecha_subida    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

---

## 3. Trigger: auto-update `fecha_mod`

A trigger is defined for each table to automatically update `fecha_mod` on any row update:

```sql
-- Example for notas (repeat pattern for all tables)
CREATE TRIGGER IF NOT EXISTS notas_fecha_mod
AFTER UPDATE ON notas
FOR EACH ROW
BEGIN
    UPDATE notas SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;
```

---

## 4. Indexes

```sql
-- Full-text search helpers (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(
    nombre, descripcion, contacto,
    content='notas', content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS llamar_fts USING fts5(
    asunto, nombre, descripcion, contacto,
    content='llamar', content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS encargar_fts USING fts5(
    articulo, ref_interna, descripcion, proveedor, ref_proveedor,
    content='encargar', content_rowid='id'
);

-- Standard B-tree indexes for common filters
CREATE INDEX IF NOT EXISTS idx_notas_urgente    ON notas(urgente);
CREATE INDEX IF NOT EXISTS idx_llamar_urgente   ON llamar(urgente);
CREATE INDEX IF NOT EXISTS idx_encargar_urgente ON encargar(urgente);
CREATE INDEX IF NOT EXISTS idx_facturas_tipo    ON facturas_pdf(tipo);
CREATE INDEX IF NOT EXISTS idx_facturas_entidad ON facturas_pdf(entidad_id, entidad_tipo);
```

---

## 5. Field Validation Rules

| Table          | Field            | Rule                              |
| -------------- | ---------------- | --------------------------------- |
| `llamar`       | `asunto`         | Non-empty string after trimming   |
| `llamar`       | `contacto`       | Non-empty string after trimming   |
| `encargar`     | `articulo`       | Non-empty string after trimming   |
| `proveedores`  | `razon_social`   | Non-empty string after trimming   |
| `clientes`     | `razon_social`   | Non-empty string after trimming   |
| `clientes`     | `numero_cliente` | Non-empty string after trimming   |
| `facturas_pdf` | `tipo`           | One of `'compra'`, `'venta'`      |
| `facturas_pdf` | `entidad_tipo`   | One of `'proveedor'`, `'cliente'` |
| All tables     | `urgente`        | Boolean integer: 0 or 1           |

Validation is enforced at two levels:

1. **Database** – `CHECK` constraints in the schema (see §2 above).
2. **UI** – React form validation before the IPC call is made.

---

## 6. Migration Strategy

Migrations are numbered SQL files in `src/main/db/migrations/`:

```
001_init.sql      – creates all tables, triggers, and indexes
002_*.sql         – future schema changes (additive only for v1)
```

On startup, `src/main/db/connection.js` reads the `user_version` PRAGMA, applies any migrations with a higher number, and updates `user_version`. Migrations are **never modified after release**; new changes are always new migration files.

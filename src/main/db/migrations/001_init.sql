-- ============================================================
-- Initial Schema: All Tables, Triggers, Indexes, and FTS5
-- ============================================================

-- ------------------------------------------------------------
-- Table: notas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT,
    descripcion    TEXT,
    contacto       TEXT,
    urgente        INTEGER NOT NULL DEFAULT 0 CHECK (urgente IN (0, 1)),
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Trigger: auto-update fecha_mod for notas
CREATE TRIGGER IF NOT EXISTS notas_fecha_mod
AFTER UPDATE ON notas
FOR EACH ROW
BEGIN
    UPDATE notas SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: llamar
-- ------------------------------------------------------------
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

-- Trigger: auto-update fecha_mod for llamar
CREATE TRIGGER IF NOT EXISTS llamar_fecha_mod
AFTER UPDATE ON llamar
FOR EACH ROW
BEGIN
    UPDATE llamar SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: encargar
-- ------------------------------------------------------------
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

-- Trigger: auto-update fecha_mod for encargar
CREATE TRIGGER IF NOT EXISTS encargar_fecha_mod
AFTER UPDATE ON encargar
FOR EACH ROW
BEGIN
    UPDATE encargar SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: proveedores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social   TEXT    NOT NULL CHECK (length(trim(razon_social)) > 0),
    direccion      TEXT,
    nif            TEXT,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Trigger: auto-update fecha_mod for proveedores
CREATE TRIGGER IF NOT EXISTS proveedores_fecha_mod
AFTER UPDATE ON proveedores
FOR EACH ROW
BEGIN
    UPDATE proveedores SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social     TEXT    NOT NULL CHECK (length(trim(razon_social)) > 0),
    numero_cliente   TEXT    NOT NULL CHECK (length(trim(numero_cliente)) > 0),
    direccion        TEXT,
    nif              TEXT,
    fecha_creacion   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Trigger: auto-update fecha_mod for clientes
CREATE TRIGGER IF NOT EXISTS clientes_fecha_mod
AFTER UPDATE ON clientes
FOR EACH ROW
BEGIN
    UPDATE clientes SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: facturas_pdf
-- ------------------------------------------------------------
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

-- Trigger: auto-update fecha_mod for facturas_pdf
CREATE TRIGGER IF NOT EXISTS facturas_pdf_fecha_mod
AFTER UPDATE ON facturas_pdf
FOR EACH ROW
BEGIN
    UPDATE facturas_pdf SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ============================================================
-- Full-Text Search: FTS5 Virtual Tables
-- ============================================================

-- FTS5 for notas
CREATE VIRTUAL TABLE IF NOT EXISTS notas_fts USING fts5(
    nombre, descripcion, contacto,
    content='notas', content_rowid='id'
);

-- FTS5 for llamar
CREATE VIRTUAL TABLE IF NOT EXISTS llamar_fts USING fts5(
    asunto, nombre, descripcion, contacto,
    content='llamar', content_rowid='id'
);

-- FTS5 for encargar
CREATE VIRTUAL TABLE IF NOT EXISTS encargar_fts USING fts5(
    articulo, ref_interna, descripcion, proveedor, ref_proveedor,
    content='encargar', content_rowid='id'
);

-- ============================================================
-- Indexes
-- ============================================================

-- Indexes on urgente columns for filtering
CREATE INDEX IF NOT EXISTS idx_notas_urgente    ON notas(urgente);
CREATE INDEX IF NOT EXISTS idx_llamar_urgente   ON llamar(urgente);
CREATE INDEX IF NOT EXISTS idx_encargar_urgente ON encargar(urgente);

-- Indexes on facturas_pdf for common queries
CREATE INDEX IF NOT EXISTS idx_facturas_tipo    ON facturas_pdf(tipo);
CREATE INDEX IF NOT EXISTS idx_facturas_entidad ON facturas_pdf(entidad_id, entidad_tipo);

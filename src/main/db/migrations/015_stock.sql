-- ============================================================
-- Stock Module: Families -> Productos -> Articulos with variants
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_familias (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    codigo         TEXT,
    descripcion    TEXT,
    orden          INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS stock_familias_fecha_mod
AFTER UPDATE ON stock_familias
FOR EACH ROW
BEGIN
    UPDATE stock_familias SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS stock_productos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    familia_id     INTEGER NOT NULL REFERENCES stock_familias(id) ON DELETE CASCADE,
    nombre         TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    ref            TEXT,
    descripcion    TEXT,
    orden          INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_productos_familia_id
    ON stock_productos(familia_id);

CREATE TRIGGER IF NOT EXISTS stock_productos_fecha_mod
AFTER UPDATE ON stock_productos
FOR EACH ROW
BEGIN
    UPDATE stock_productos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS stock_articulos (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id        INTEGER NOT NULL REFERENCES stock_productos(id) ON DELETE CASCADE,
    parent_articulo_id INTEGER REFERENCES stock_articulos(id) ON DELETE CASCADE,
    nombre             TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    ref                TEXT,
    color              TEXT,
    descripcion        TEXT,
    notas              TEXT,
    cantidad           INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    orden              INTEGER NOT NULL DEFAULT 0,
    fecha_creacion     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_articulos_producto_id
    ON stock_articulos(producto_id);

CREATE INDEX IF NOT EXISTS idx_stock_articulos_parent_articulo_id
    ON stock_articulos(parent_articulo_id);

CREATE TRIGGER IF NOT EXISTS stock_articulos_fecha_mod
AFTER UPDATE ON stock_articulos
FOR EACH ROW
BEGIN
    UPDATE stock_articulos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;
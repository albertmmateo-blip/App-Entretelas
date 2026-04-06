-- Allow stock_articulos to live directly under a stock_familia (no intermediary producto).
-- Changes:
--   * producto_id becomes nullable (was NOT NULL)
--   * New nullable familia_id column added (FK → stock_familias)
--   * A CHECK ensures at least one of (producto_id, familia_id) is always set
--   * New index idx_stock_articulos_familia_id added
--
-- SQLite does not support dropping NOT NULL constraints via ALTER TABLE, so the table
-- is recreated using the standard 12-step rename-copy-drop-rename approach with
-- foreign key enforcement temporarily disabled for the duration of the operation.

PRAGMA foreign_keys = OFF;

CREATE TABLE stock_articulos_new (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id        INTEGER REFERENCES stock_productos(id) ON DELETE CASCADE,
    familia_id         INTEGER REFERENCES stock_familias(id) ON DELETE CASCADE,
    parent_articulo_id INTEGER REFERENCES stock_articulos(id) ON DELETE CASCADE,
    nombre             TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    ref                TEXT,
    color              TEXT,
    color_hex          TEXT,
    descripcion        TEXT,
    notas              TEXT,
    cantidad           INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    orden              INTEGER NOT NULL DEFAULT 0,
    fecha_creacion     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (
        (producto_id IS NOT NULL AND familia_id IS NULL) OR
        (producto_id IS NULL AND familia_id IS NOT NULL)
    )
);

INSERT INTO stock_articulos_new
    (id, producto_id, familia_id, parent_articulo_id, nombre, ref, color, color_hex,
     descripcion, notas, cantidad, orden, fecha_creacion, fecha_mod)
    SELECT id, producto_id, NULL, parent_articulo_id, nombre, ref, color, color_hex,
           descripcion, notas, cantidad, orden, fecha_creacion, fecha_mod
    FROM stock_articulos;

DROP TABLE stock_articulos;

ALTER TABLE stock_articulos_new RENAME TO stock_articulos;

CREATE INDEX IF NOT EXISTS idx_stock_articulos_producto_id
    ON stock_articulos(producto_id);

CREATE INDEX IF NOT EXISTS idx_stock_articulos_familia_id
    ON stock_articulos(familia_id);

CREATE INDEX IF NOT EXISTS idx_stock_articulos_parent_articulo_id
    ON stock_articulos(parent_articulo_id);

CREATE TRIGGER IF NOT EXISTS stock_articulos_fecha_mod
AFTER UPDATE ON stock_articulos
FOR EACH ROW
BEGIN
    UPDATE stock_articulos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

PRAGMA foreign_keys = ON;

-- ============================================================
-- Guardado Articulos: Specific items grouped under a Producto
-- e.g. Producto "Bies" → Artículos "Bies Rojo", "Bies Amarillo"
-- Each Artículo can be independently located at a Lugar/Compartimento.
-- ============================================================

CREATE TABLE IF NOT EXISTS guardado_articulos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id      INTEGER NOT NULL REFERENCES guardado_productos(id) ON DELETE CASCADE,
    nombre           TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    descripcion      TEXT,
    ref              TEXT,
    lugar_id         INTEGER REFERENCES guardado_lugares(id) ON DELETE SET NULL,
    compartimento_id INTEGER REFERENCES guardado_compartimentos(id) ON DELETE SET NULL,
    notas            TEXT,
    fecha_creacion   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_guardado_articulos_producto_id
    ON guardado_articulos(producto_id);

CREATE INDEX IF NOT EXISTS idx_guardado_articulos_lugar_id
    ON guardado_articulos(lugar_id);

CREATE TRIGGER IF NOT EXISTS guardado_articulos_fecha_mod
AFTER UPDATE ON guardado_articulos
FOR EACH ROW
BEGIN
    UPDATE guardado_articulos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

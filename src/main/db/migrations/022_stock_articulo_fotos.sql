-- Photos for stock articles.
-- Stores metadata only; actual image files live under {userData}/stock_fotos/{articulo_id}/.

CREATE TABLE IF NOT EXISTS stock_articulo_fotos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    articulo_id     INTEGER NOT NULL REFERENCES stock_articulos(id) ON DELETE CASCADE,
    nombre_original TEXT    NOT NULL,
    nombre_guardado TEXT    NOT NULL,
    ruta_relativa   TEXT    NOT NULL,
    fecha_subida    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_stock_articulo_fotos_articulo_id
    ON stock_articulo_fotos(articulo_id);

CREATE TRIGGER IF NOT EXISTS stock_articulo_fotos_fecha_mod
AFTER UPDATE ON stock_articulo_fotos
FOR EACH ROW
BEGIN
    UPDATE stock_articulo_fotos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

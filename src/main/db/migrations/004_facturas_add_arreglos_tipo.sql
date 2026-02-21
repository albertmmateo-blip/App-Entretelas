-- ============================================================
-- Allow 'arreglos' as valid tipo in facturas_pdf
-- ============================================================

BEGIN TRANSACTION;

DROP TRIGGER IF EXISTS facturas_pdf_fecha_mod;

CREATE TABLE facturas_pdf_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo            TEXT    NOT NULL CHECK (tipo IN ('compra', 'venta', 'arreglos')),
    entidad_id      INTEGER NOT NULL,
    entidad_tipo    TEXT    NOT NULL CHECK (entidad_tipo IN ('proveedor', 'cliente')),
    nombre_original TEXT    NOT NULL,
    nombre_guardado TEXT    NOT NULL,
    ruta_relativa   TEXT    NOT NULL UNIQUE,
    fecha_subida    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    importe         REAL,
    importe_iva_re  REAL,
    vencimiento     TEXT,
    pagada          INTEGER NOT NULL DEFAULT 0 CHECK (pagada IN (0, 1))
);

INSERT INTO facturas_pdf_new (
    id,
    tipo,
    entidad_id,
    entidad_tipo,
    nombre_original,
    nombre_guardado,
    ruta_relativa,
    fecha_subida,
    fecha_mod,
    importe,
    importe_iva_re,
    vencimiento,
    pagada
)
SELECT
    id,
    tipo,
    entidad_id,
    entidad_tipo,
    nombre_original,
    nombre_guardado,
    ruta_relativa,
    fecha_subida,
    fecha_mod,
    importe,
    importe_iva_re,
    vencimiento,
    pagada
FROM facturas_pdf;

DROP TABLE facturas_pdf;
ALTER TABLE facturas_pdf_new RENAME TO facturas_pdf;

CREATE TRIGGER facturas_pdf_fecha_mod
AFTER UPDATE ON facturas_pdf
FOR EACH ROW
BEGIN
    UPDATE facturas_pdf SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas_pdf(tipo);
CREATE INDEX IF NOT EXISTS idx_facturas_entidad ON facturas_pdf(entidad_id, entidad_tipo);

COMMIT;

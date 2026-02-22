-- ============================================================
-- Migration 008: Create arreglos table
-- ============================================================

CREATE TABLE IF NOT EXISTS arreglos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    albaran        TEXT    NOT NULL CHECK (albaran IN ('Entretelas', 'Isa', 'Loli')),
    fecha          TEXT    NOT NULL,
    numero         TEXT    NOT NULL CHECK (length(trim(numero)) > 0),
    cliente        TEXT,
    arreglo        TEXT,
    importe        REAL    NOT NULL CHECK (importe >= 0),
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS arreglos_fecha_mod
AFTER UPDATE ON arreglos
FOR EACH ROW
BEGIN
    UPDATE arreglos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_arreglos_fecha ON arreglos(fecha);
CREATE INDEX IF NOT EXISTS idx_arreglos_albaran ON arreglos(albaran);
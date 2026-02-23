-- ============================================================
-- Encargar Catálogo: nested folders + entries
-- ============================================================

CREATE TABLE IF NOT EXISTS encargar_catalogo_folders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id      INTEGER REFERENCES encargar_catalogo_folders(id) ON DELETE CASCADE,
    concepto       TEXT,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS encargar_catalogo_entries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id      INTEGER NOT NULL REFERENCES encargar_catalogo_folders(id) ON DELETE CASCADE,
    producto       TEXT,
    link           TEXT,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_encargar_catalogo_folders_parent
ON encargar_catalogo_folders(parent_id);

CREATE INDEX IF NOT EXISTS idx_encargar_catalogo_entries_folder
ON encargar_catalogo_entries(folder_id);

CREATE TRIGGER IF NOT EXISTS encargar_catalogo_folders_fecha_mod
AFTER UPDATE ON encargar_catalogo_folders
FOR EACH ROW
BEGIN
    UPDATE encargar_catalogo_folders
    SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS encargar_catalogo_entries_fecha_mod
AFTER UPDATE ON encargar_catalogo_entries
FOR EACH ROW
BEGIN
    UPDATE encargar_catalogo_entries
    SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

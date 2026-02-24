-- ============================================================
-- Secret Catálogo: provider/family typing and dual-folder assignments
-- ============================================================

ALTER TABLE secret_catalogo_folders
ADD COLUMN tipo TEXT NOT NULL DEFAULT 'proveedor';

ALTER TABLE secret_catalogo_entries
ADD COLUMN proveedor_folder_id INTEGER REFERENCES secret_catalogo_folders(id) ON DELETE SET NULL;

ALTER TABLE secret_catalogo_entries
ADD COLUMN familia_folder_id INTEGER REFERENCES secret_catalogo_folders(id) ON DELETE SET NULL;

UPDATE secret_catalogo_folders
SET tipo = 'proveedor'
WHERE tipo IS NULL OR trim(tipo) = '';

UPDATE secret_catalogo_entries
SET proveedor_folder_id = COALESCE(proveedor_folder_id, folder_id)
WHERE proveedor_folder_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_secret_catalogo_folders_tipo
ON secret_catalogo_folders(tipo);

CREATE INDEX IF NOT EXISTS idx_secret_catalogo_entries_proveedor_folder
ON secret_catalogo_entries(proveedor_folder_id);

CREATE INDEX IF NOT EXISTS idx_secret_catalogo_entries_familia_folder
ON secret_catalogo_entries(familia_folder_id);

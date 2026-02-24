-- ============================================================
-- Encargar Catálogo: folder types + proveedor/familia product assignment
-- ============================================================

ALTER TABLE encargar_catalogo_folders
ADD COLUMN tipo TEXT NOT NULL DEFAULT 'proveedor';

ALTER TABLE encargar_catalogo_entries
ADD COLUMN proveedor_folder_id INTEGER REFERENCES encargar_catalogo_folders(id) ON DELETE SET NULL;

ALTER TABLE encargar_catalogo_entries
ADD COLUMN familia_folder_id INTEGER REFERENCES encargar_catalogo_folders(id) ON DELETE SET NULL;

UPDATE encargar_catalogo_folders
SET tipo = 'proveedor'
WHERE tipo IS NULL OR trim(tipo) = '';

UPDATE encargar_catalogo_entries
SET proveedor_folder_id = folder_id
WHERE proveedor_folder_id IS NULL AND folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_encargar_catalogo_folders_tipo
ON encargar_catalogo_folders(tipo);

CREATE INDEX IF NOT EXISTS idx_encargar_catalogo_entries_proveedor_folder
ON encargar_catalogo_entries(proveedor_folder_id);

CREATE INDEX IF NOT EXISTS idx_encargar_catalogo_entries_familia_folder
ON encargar_catalogo_entries(familia_folder_id);

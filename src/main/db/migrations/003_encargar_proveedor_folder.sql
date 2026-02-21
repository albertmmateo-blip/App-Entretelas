-- ============================================================
-- Encargar Provider Folder Link
-- ============================================================

ALTER TABLE encargar ADD COLUMN proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_encargar_proveedor_id ON encargar(proveedor_id);

-- Backfill proveedor_id for existing rows when proveedor text matches razon_social exactly.
UPDATE encargar
SET proveedor_id = (
  SELECT p.id
  FROM proveedores p
  WHERE trim(lower(p.razon_social)) = trim(lower(encargar.proveedor))
)
WHERE proveedor_id IS NULL
  AND proveedor IS NOT NULL
  AND trim(proveedor) <> '';

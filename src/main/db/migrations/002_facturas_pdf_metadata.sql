-- ============================================================
-- Add editable metadata fields to facturas_pdf
-- ============================================================

ALTER TABLE facturas_pdf ADD COLUMN importe REAL;
ALTER TABLE facturas_pdf ADD COLUMN importe_iva_re REAL;
ALTER TABLE facturas_pdf ADD COLUMN vencimiento TEXT;
ALTER TABLE facturas_pdf ADD COLUMN pagada INTEGER NOT NULL DEFAULT 0 CHECK (pagada IN (0, 1));

-- Add optional hex color column to stock_articulos for visual identification.
-- Completely independent from the existing free-text `color` column.
ALTER TABLE stock_articulos ADD COLUMN color_hex TEXT;

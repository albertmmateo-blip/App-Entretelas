-- Add discount tier field for clientes
ALTER TABLE clientes
ADD COLUMN descuento_porcentaje INTEGER NOT NULL DEFAULT 0 CHECK (descuento_porcentaje IN (0, 8, 10, 20));

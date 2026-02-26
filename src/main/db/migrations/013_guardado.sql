-- ============================================================
-- Guardado Module: Physical storage location tracking
-- ============================================================

-- ------------------------------------------------------------
-- Table: guardado_lugares
-- A general physical place in the shop (e.g., "Estantería derecha mesa")
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardado_lugares (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    descripcion    TEXT,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS guardado_lugares_fecha_mod
AFTER UPDATE ON guardado_lugares
FOR EACH ROW
BEGIN
    UPDATE guardado_lugares SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: guardado_compartimentos
-- A specific sub-location within a lugar (e.g., compartimento "6")
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardado_compartimentos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    lugar_id       INTEGER NOT NULL REFERENCES guardado_lugares(id) ON DELETE CASCADE,
    nombre         TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    descripcion    TEXT,
    orden          INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_guardado_compartimentos_lugar_id
    ON guardado_compartimentos(lugar_id);

CREATE TRIGGER IF NOT EXISTS guardado_compartimentos_fecha_mod
AFTER UPDATE ON guardado_compartimentos
FOR EACH ROW
BEGIN
    UPDATE guardado_compartimentos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: guardado_productos
-- A product that can be stored somewhere in the shop
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardado_productos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT    NOT NULL CHECK (length(trim(nombre)) > 0),
    descripcion    TEXT,
    ref            TEXT,
    fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS guardado_productos_fecha_mod
AFTER UPDATE ON guardado_productos
FOR EACH ROW
BEGIN
    UPDATE guardado_productos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

-- ------------------------------------------------------------
-- Table: guardado_asignaciones
-- Links a product to a lugar (optionally a compartimento within it)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardado_asignaciones (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id       INTEGER NOT NULL REFERENCES guardado_productos(id) ON DELETE CASCADE,
    lugar_id          INTEGER NOT NULL REFERENCES guardado_lugares(id) ON DELETE CASCADE,
    compartimento_id  INTEGER REFERENCES guardado_compartimentos(id) ON DELETE SET NULL,
    notas             TEXT,
    fecha_creacion    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    fecha_mod         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_guardado_asignaciones_producto_id
    ON guardado_asignaciones(producto_id);
CREATE INDEX IF NOT EXISTS idx_guardado_asignaciones_lugar_id
    ON guardado_asignaciones(lugar_id);
CREATE INDEX IF NOT EXISTS idx_guardado_asignaciones_compartimento_id
    ON guardado_asignaciones(compartimento_id);

CREATE TRIGGER IF NOT EXISTS guardado_asignaciones_fecha_mod
AFTER UPDATE ON guardado_asignaciones
FOR EACH ROW
BEGIN
    UPDATE guardado_asignaciones SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

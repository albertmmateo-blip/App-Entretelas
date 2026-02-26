const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

/**
 * Registers IPC handlers for the Guardado module.
 * Manages physical storage locations, sub-compartments, products and their assignments.
 */
function registerGuardadoHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;

  // ─────────────────────────────────────────────────────────────────────────
  // LUGARES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * guardado:getLugares
   * Returns all lugares with their nested compartimentos.
   */
  ipc.handle('guardado:getLugares', async () => {
    try {
      const db = getDb();
      const lugares = db
        .prepare(`SELECT * FROM guardado_lugares ORDER BY nombre COLLATE NOCASE ASC`)
        .all();

      const compartimentos = db
        .prepare(
          `SELECT * FROM guardado_compartimentos ORDER BY lugar_id, orden ASC, nombre COLLATE NOCASE ASC`
        )
        .all();

      const compartimentosByLugar = compartimentos.reduce((acc, c) => {
        if (!acc[c.lugar_id]) acc[c.lugar_id] = [];
        acc[c.lugar_id].push(c);
        return acc;
      }, {});

      const result = lugares.map((lugar) => ({
        ...lugar,
        compartimentos: compartimentosByLugar[lugar.id] || [],
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('Error in guardado:getLugares:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:createLugar
   * Creates a new lugar.
   */
  ipc.handle('guardado:createLugar', async (_event, data) => {
    try {
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }
      if (data.nombre.length > 255) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'nombre must be 255 characters or less' },
        };
      }

      const db = getDb();
      const stmt = db.prepare(`INSERT INTO guardado_lugares (nombre, descripcion) VALUES (?, ?)`);
      const info = stmt.run(data.nombre.trim(), data.descripcion?.trim() || null);
      const created = db
        .prepare(`SELECT * FROM guardado_lugares WHERE id = ?`)
        .get(info.lastInsertRowid);
      return { success: true, data: { ...created, compartimentos: [] } };
    } catch (error) {
      console.error('Error in guardado:createLugar:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:updateLugar
   * Updates an existing lugar.
   */
  ipc.handle('guardado:updateLugar', async (_event, id, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_lugares WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Lugar not found' } };
      }

      db.prepare(`UPDATE guardado_lugares SET nombre = ?, descripcion = ? WHERE id = ?`).run(
        data.nombre.trim(),
        data.descripcion?.trim() || null,
        id
      );

      const updated = db.prepare(`SELECT * FROM guardado_lugares WHERE id = ?`).get(id);
      const compartimentos = db
        .prepare(
          `SELECT * FROM guardado_compartimentos WHERE lugar_id = ? ORDER BY orden ASC, nombre COLLATE NOCASE ASC`
        )
        .all(id);

      return { success: true, data: { ...updated, compartimentos } };
    } catch (error) {
      console.error('Error in guardado:updateLugar:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:deleteLugar
   * Deletes a lugar and cascades (compartimentos + asignaciones).
   */
  ipc.handle('guardado:deleteLugar', async (_event, id) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_lugares WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Lugar not found' } };
      }

      db.prepare(`DELETE FROM guardado_lugares WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in guardado:deleteLugar:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARTIMENTOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * guardado:createCompartimento
   * Adds a compartimento to a lugar.
   */
  ipc.handle('guardado:createCompartimento', async (_event, data) => {
    try {
      if (!Number.isInteger(data?.lugar_id) || data.lugar_id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'lugar_id is required' },
        };
      }
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }
      if (data.nombre.length > 255) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'nombre must be 255 characters or less' },
        };
      }

      const db = getDb();
      const lugar = db.prepare(`SELECT id FROM guardado_lugares WHERE id = ?`).get(data.lugar_id);
      if (!lugar) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Lugar not found' } };
      }

      const { maxOrden } = db
        .prepare(
          `SELECT COALESCE(MAX(orden), -1) as maxOrden FROM guardado_compartimentos WHERE lugar_id = ?`
        )
        .get(data.lugar_id);

      const info = db
        .prepare(
          `INSERT INTO guardado_compartimentos (lugar_id, nombre, descripcion, orden) VALUES (?, ?, ?, ?)`
        )
        .run(data.lugar_id, data.nombre.trim(), data.descripcion?.trim() || null, maxOrden + 1);

      const created = db
        .prepare(`SELECT * FROM guardado_compartimentos WHERE id = ?`)
        .get(info.lastInsertRowid);

      return { success: true, data: created };
    } catch (error) {
      console.error('Error in guardado:createCompartimento:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:updateCompartimento
   * Updates a compartimento's name/description.
   */
  ipc.handle('guardado:updateCompartimento', async (_event, id, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_compartimentos WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Compartimento not found' } };
      }

      db.prepare(`UPDATE guardado_compartimentos SET nombre = ?, descripcion = ? WHERE id = ?`).run(
        data.nombre.trim(),
        data.descripcion?.trim() || null,
        id
      );

      const updated = db.prepare(`SELECT * FROM guardado_compartimentos WHERE id = ?`).get(id);
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error in guardado:updateCompartimento:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:deleteCompartimento
   * Deletes a compartimento (asignaciones referencing it get compartimento_id set to NULL).
   */
  ipc.handle('guardado:deleteCompartimento', async (_event, id) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_compartimentos WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Compartimento not found' } };
      }

      db.prepare(`DELETE FROM guardado_compartimentos WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in guardado:deleteCompartimento:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * guardado:getProductos
   * Returns all productos with their current assignment(s).
   */
  ipc.handle('guardado:getProductos', async () => {
    try {
      const db = getDb();
      const productos = db
        .prepare(`SELECT * FROM guardado_productos ORDER BY nombre COLLATE NOCASE ASC`)
        .all();

      const asignaciones = db
        .prepare(
          `SELECT
            a.*,
            l.nombre AS lugar_nombre,
            c.nombre AS compartimento_nombre
          FROM guardado_asignaciones a
          JOIN guardado_lugares l ON l.id = a.lugar_id
          LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
          ORDER BY a.fecha_creacion ASC`
        )
        .all();

      const asignacionesByProducto = asignaciones.reduce((acc, a) => {
        if (!acc[a.producto_id]) acc[a.producto_id] = [];
        acc[a.producto_id].push(a);
        return acc;
      }, {});

      const articulos = db
        .prepare(
          `SELECT a.*, l.nombre AS lugar_nombre, c.nombre AS compartimento_nombre
           FROM guardado_articulos a
           LEFT JOIN guardado_lugares l ON l.id = a.lugar_id
           LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
           ORDER BY a.producto_id, a.nombre COLLATE NOCASE ASC`
        )
        .all();

      const articulosByProducto = articulos.reduce((acc, a) => {
        if (!acc[a.producto_id]) acc[a.producto_id] = [];
        acc[a.producto_id].push(a);
        return acc;
      }, {});

      const result = productos.map((p) => ({
        ...p,
        asignaciones: asignacionesByProducto[p.id] || [],
        articulos: articulosByProducto[p.id] || [],
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('Error in guardado:getProductos:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:createProducto
   */
  ipc.handle('guardado:createProducto', async (_event, data) => {
    try {
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }
      if (data.nombre.length > 255) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'nombre must be 255 characters or less' },
        };
      }

      const db = getDb();
      const info = db
        .prepare(`INSERT INTO guardado_productos (nombre, descripcion, ref) VALUES (?, ?, ?)`)
        .run(data.nombre.trim(), data.descripcion?.trim() || null, data.ref?.trim() || null);

      const created = db
        .prepare(`SELECT * FROM guardado_productos WHERE id = ?`)
        .get(info.lastInsertRowid);
      return { success: true, data: { ...created, asignaciones: [], articulos: [] } };
    } catch (error) {
      console.error('Error in guardado:createProducto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:updateProducto
   */
  ipc.handle('guardado:updateProducto', async (_event, id, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_productos WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
      }

      db.prepare(
        `UPDATE guardado_productos SET nombre = ?, descripcion = ?, ref = ? WHERE id = ?`
      ).run(data.nombre.trim(), data.descripcion?.trim() || null, data.ref?.trim() || null, id);

      const updated = db.prepare(`SELECT * FROM guardado_productos WHERE id = ?`).get(id);
      const asignaciones = db
        .prepare(
          `SELECT a.*, l.nombre AS lugar_nombre, c.nombre AS compartimento_nombre
           FROM guardado_asignaciones a
           JOIN guardado_lugares l ON l.id = a.lugar_id
           LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
           WHERE a.producto_id = ?
           ORDER BY a.fecha_creacion ASC`
        )
        .all(id);
      const articulosUpd = db
        .prepare(
          `SELECT a.*, l.nombre AS lugar_nombre, c.nombre AS compartimento_nombre
           FROM guardado_articulos a
           LEFT JOIN guardado_lugares l ON l.id = a.lugar_id
           LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
           WHERE a.producto_id = ?
           ORDER BY a.nombre COLLATE NOCASE ASC`
        )
        .all(id);

      return { success: true, data: { ...updated, asignaciones, articulos: articulosUpd } };
    } catch (error) {
      console.error('Error in guardado:updateProducto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:deleteProducto
   * Deletes a producto and cascades (asignaciones).
   */
  ipc.handle('guardado:deleteProducto', async (_event, id) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_productos WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
      }

      db.prepare(`DELETE FROM guardado_productos WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in guardado:deleteProducto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ASIGNACIONES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * guardado:getAsignaciones
   * Returns all asignaciones with joined product and location details.
   */
  ipc.handle('guardado:getAsignaciones', async () => {
    try {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT
            a.*,
            p.nombre  AS producto_nombre,
            p.ref     AS producto_ref,
            l.nombre  AS lugar_nombre,
            c.nombre  AS compartimento_nombre
          FROM guardado_asignaciones a
          JOIN guardado_productos p ON p.id = a.producto_id
          JOIN guardado_lugares l   ON l.id = a.lugar_id
          LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
          ORDER BY p.nombre COLLATE NOCASE ASC, l.nombre COLLATE NOCASE ASC`
        )
        .all();

      return { success: true, data: rows };
    } catch (error) {
      console.error('Error in guardado:getAsignaciones:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:createAsignacion
   * Assigns a product to a lugar (optionally a compartimento).
   */
  ipc.handle('guardado:createAsignacion', async (_event, data) => {
    try {
      if (!Number.isInteger(data?.producto_id) || data.producto_id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'producto_id is required' },
        };
      }
      if (!Number.isInteger(data?.lugar_id) || data.lugar_id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'lugar_id is required' },
        };
      }

      const db = getDb();

      const producto = db
        .prepare(`SELECT id FROM guardado_productos WHERE id = ?`)
        .get(data.producto_id);
      if (!producto) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
      }

      const lugar = db.prepare(`SELECT id FROM guardado_lugares WHERE id = ?`).get(data.lugar_id);
      if (!lugar) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Lugar not found' } };
      }

      let compartimentoId = null;
      if (data.compartimento_id != null) {
        if (!Number.isInteger(data.compartimento_id) || data.compartimento_id <= 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'compartimento_id must be a positive integer',
            },
          };
        }
        const compartimento = db
          .prepare(`SELECT id FROM guardado_compartimentos WHERE id = ? AND lugar_id = ?`)
          .get(data.compartimento_id, data.lugar_id);
        if (!compartimento) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Compartimento not found or does not belong to specified lugar',
            },
          };
        }
        compartimentoId = data.compartimento_id;
      }

      const info = db
        .prepare(
          `INSERT INTO guardado_asignaciones (producto_id, lugar_id, compartimento_id, notas)
           VALUES (?, ?, ?, ?)`
        )
        .run(data.producto_id, data.lugar_id, compartimentoId, data.notas?.trim() || null);

      const created = db
        .prepare(
          `SELECT
            a.*,
            p.nombre  AS producto_nombre,
            p.ref     AS producto_ref,
            l.nombre  AS lugar_nombre,
            c.nombre  AS compartimento_nombre
          FROM guardado_asignaciones a
          JOIN guardado_productos p ON p.id = a.producto_id
          JOIN guardado_lugares l   ON l.id = a.lugar_id
          LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
          WHERE a.id = ?`
        )
        .get(info.lastInsertRowid);

      return { success: true, data: created };
    } catch (error) {
      console.error('Error in guardado:createAsignacion:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:updateAsignacion
   * Updates the notes (and optionally location) of an asignacion.
   */
  ipc.handle('guardado:updateAsignacion', async (_event, id, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT * FROM guardado_asignaciones WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Asignacion not found' } };
      }

      const lugarId =
        Number.isInteger(data?.lugar_id) && data.lugar_id > 0 ? data.lugar_id : existing.lugar_id;
      let compartimentoId = existing.compartimento_id;

      if ('compartimento_id' in (data || {})) {
        compartimentoId = data.compartimento_id ?? null;
        if (compartimentoId !== null) {
          if (!Number.isInteger(compartimentoId) || compartimentoId <= 0) {
            return {
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'compartimento_id must be a positive integer or null',
              },
            };
          }
          const compartimento = db
            .prepare(`SELECT id FROM guardado_compartimentos WHERE id = ? AND lugar_id = ?`)
            .get(compartimentoId, lugarId);
          if (!compartimento) {
            return {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Compartimento not found or does not belong to specified lugar',
              },
            };
          }
        }
      }

      db.prepare(
        `UPDATE guardado_asignaciones SET lugar_id = ?, compartimento_id = ?, notas = ? WHERE id = ?`
      ).run(lugarId, compartimentoId, data?.notas?.trim() ?? existing.notas, id);

      const updated = db
        .prepare(
          `SELECT
            a.*,
            p.nombre  AS producto_nombre,
            p.ref     AS producto_ref,
            l.nombre  AS lugar_nombre,
            c.nombre  AS compartimento_nombre
          FROM guardado_asignaciones a
          JOIN guardado_productos p ON p.id = a.producto_id
          JOIN guardado_lugares l   ON l.id = a.lugar_id
          LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
          WHERE a.id = ?`
        )
        .get(id);

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error in guardado:updateAsignacion:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:deleteAsignacion
   */
  ipc.handle('guardado:deleteAsignacion', async (_event, id) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_asignaciones WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Asignacion not found' } };
      }

      db.prepare(`DELETE FROM guardado_asignaciones WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in guardado:deleteAsignacion:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARTICULOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * guardado:createArticulo
   * Creates a new artículo under a producto, with optional location assignment.
   */
  ipc.handle('guardado:createArticulo', async (_event, data) => {
    try {
      if (!Number.isInteger(data?.producto_id) || data.producto_id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'producto_id is required' },
        };
      }
      if (!data?.nombre || typeof data.nombre !== 'string' || data.nombre.trim().length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }
      if (data.nombre.length > 255) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'nombre must be 255 characters or less' },
        };
      }

      const db = getDb();
      const producto = db
        .prepare(`SELECT id FROM guardado_productos WHERE id = ?`)
        .get(data.producto_id);
      if (!producto) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
      }

      let lugarId = null;
      let compartimentoId = null;

      if (data.lugar_id != null) {
        if (!Number.isInteger(data.lugar_id) || data.lugar_id <= 0) {
          return {
            success: false,
            error: { code: 'INVALID_INPUT', message: 'lugar_id must be a positive integer' },
          };
        }
        const lugar = db.prepare(`SELECT id FROM guardado_lugares WHERE id = ?`).get(data.lugar_id);
        if (!lugar) {
          return { success: false, error: { code: 'NOT_FOUND', message: 'Lugar not found' } };
        }
        lugarId = data.lugar_id;

        if (data.compartimento_id != null) {
          if (!Number.isInteger(data.compartimento_id) || data.compartimento_id <= 0) {
            return {
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'compartimento_id must be a positive integer',
              },
            };
          }
          const comp = db
            .prepare(`SELECT id FROM guardado_compartimentos WHERE id = ? AND lugar_id = ?`)
            .get(data.compartimento_id, lugarId);
          if (!comp) {
            return {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Compartimento not found or does not belong to specified lugar',
              },
            };
          }
          compartimentoId = data.compartimento_id;
        }
      }

      const info = db
        .prepare(
          `INSERT INTO guardado_articulos (producto_id, nombre, descripcion, ref, lugar_id, compartimento_id, notas)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.producto_id,
          data.nombre.trim(),
          data.descripcion?.trim() || null,
          data.ref?.trim() || null,
          lugarId,
          compartimentoId,
          data.notas?.trim() || null
        );

      const created = db
        .prepare(
          `SELECT a.*, l.nombre AS lugar_nombre, c.nombre AS compartimento_nombre
           FROM guardado_articulos a
           LEFT JOIN guardado_lugares l ON l.id = a.lugar_id
           LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
           WHERE a.id = ?`
        )
        .get(info.lastInsertRowid);

      return { success: true, data: created };
    } catch (error) {
      console.error('Error in guardado:createArticulo:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:updateArticulo
   * Updates an artículo's fields and/or location.
   */
  ipc.handle('guardado:updateArticulo', async (_event, id, data) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT * FROM guardado_articulos WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      const nombre = data?.nombre?.trim() || existing.nombre;
      if (!nombre) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'nombre is required' } };
      }

      let lugarId = existing.lugar_id;
      let compartimentoId = existing.compartimento_id;

      if ('lugar_id' in (data || {})) {
        lugarId = data.lugar_id ?? null;
        compartimentoId = null; // reset compartimento when lugar changes
        if (lugarId !== null) {
          if (!Number.isInteger(lugarId) || lugarId <= 0) {
            return {
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'lugar_id must be a positive integer or null',
              },
            };
          }
          const lugar = db.prepare(`SELECT id FROM guardado_lugares WHERE id = ?`).get(lugarId);
          if (!lugar) {
            return { success: false, error: { code: 'NOT_FOUND', message: 'Lugar not found' } };
          }
        }
      }

      if ('compartimento_id' in (data || {})) {
        compartimentoId = data.compartimento_id ?? null;
        if (compartimentoId !== null && lugarId !== null) {
          if (!Number.isInteger(compartimentoId) || compartimentoId <= 0) {
            return {
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'compartimento_id must be a positive integer or null',
              },
            };
          }
          const comp = db
            .prepare(`SELECT id FROM guardado_compartimentos WHERE id = ? AND lugar_id = ?`)
            .get(compartimentoId, lugarId);
          if (!comp) {
            return {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Compartimento not found or does not belong to specified lugar',
              },
            };
          }
        }
      }

      db.prepare(
        `UPDATE guardado_articulos SET nombre = ?, descripcion = ?, ref = ?, lugar_id = ?, compartimento_id = ?, notas = ? WHERE id = ?`
      ).run(
        nombre,
        data?.descripcion?.trim() ?? existing.descripcion,
        data?.ref?.trim() ?? existing.ref,
        lugarId,
        compartimentoId,
        data?.notas?.trim() ?? existing.notas,
        id
      );

      const updated = db
        .prepare(
          `SELECT a.*, l.nombre AS lugar_nombre, c.nombre AS compartimento_nombre
           FROM guardado_articulos a
           LEFT JOIN guardado_lugares l ON l.id = a.lugar_id
           LEFT JOIN guardado_compartimentos c ON c.id = a.compartimento_id
           WHERE a.id = ?`
        )
        .get(id);

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error in guardado:updateArticulo:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  /**
   * guardado:deleteArticulo
   */
  ipc.handle('guardado:deleteArticulo', async (_event, id) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare(`SELECT id FROM guardado_articulos WHERE id = ?`).get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      db.prepare(`DELETE FROM guardado_articulos WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in guardado:deleteArticulo:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });
}

module.exports = { registerGuardadoHandlers };

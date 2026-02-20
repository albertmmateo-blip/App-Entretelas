const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

/**
 * Validates encargar input data.
 * @param {Object} data - The encargar data to validate
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validateEncargarInput(data) {
  // Validate articulo (required, max 255 chars)
  if (data.articulo !== null && data.articulo !== undefined) {
    if (typeof data.articulo !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'articulo must be a string' },
      };
    }
    if (data.articulo.trim().length === 0) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'articulo is required' },
      };
    }
    if (data.articulo.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'articulo must be 255 characters or less',
        },
      };
    }
  }

  // Validate ref_interna (optional but if provided max 255 chars)
  if (data.ref_interna !== null && data.ref_interna !== undefined) {
    if (typeof data.ref_interna !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'ref_interna must be a string' },
      };
    }
    if (data.ref_interna.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'ref_interna must be 255 characters or less',
        },
      };
    }
  }

  // Validate descripcion (optional but if provided max 5000 chars)
  if (data.descripcion !== null && data.descripcion !== undefined) {
    if (typeof data.descripcion !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'descripcion must be a string' },
      };
    }
    if (data.descripcion.length > 5000) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'descripcion must be 5000 characters or less',
        },
      };
    }
  }

  // Validate proveedor (optional but if provided max 255 chars)
  if (data.proveedor !== null && data.proveedor !== undefined) {
    if (typeof data.proveedor !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'proveedor must be a string' },
      };
    }
    if (data.proveedor.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'proveedor must be 255 characters or less',
        },
      };
    }
  }

  // Validate ref_proveedor (optional but if provided max 255 chars)
  if (data.ref_proveedor !== null && data.ref_proveedor !== undefined) {
    if (typeof data.ref_proveedor !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'ref_proveedor must be a string' },
      };
    }
    if (data.ref_proveedor.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'ref_proveedor must be 255 characters or less',
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Registers IPC handlers for encargar operations.
 */
function registerEncargarHandlers() {
  /**
   * Handler: encargar:getAll
   * Returns all encargar entries from the database.
   * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('encargar:getAll', async () => {
    try {
      const db = getDatabase();
      const encargar = db.prepare('SELECT * FROM encargar ORDER BY fecha_creacion DESC').all();

      return {
        success: true,
        data: encargar,
      };
    } catch (error) {
      console.error('Error in encargar:getAll handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  /**
   * Handler: encargar:create
   * Creates a new encargar entry.
   * @param {Event} _event - IPC event (unused)
   * @param {Object} data - The encargar data { articulo, ref_interna?, descripcion?, proveedor?, ref_proveedor?, urgente? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('encargar:create', async (_event, data) => {
    try {
      // Check for required fields
      if (
        !data.articulo ||
        (typeof data.articulo === 'string' && data.articulo.trim().length === 0)
      ) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'articulo is required',
          },
        };
      }

      // Validate input
      const validation = validateEncargarInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Trim whitespace from string fields
      const articulo = data.articulo.trim();
      // eslint-disable-next-line camelcase
      const ref_interna = data.ref_interna ? data.ref_interna.trim() : null;
      const descripcion = data.descripcion ? data.descripcion.trim() : null;
      const proveedor = data.proveedor ? data.proveedor.trim() : null;
      // eslint-disable-next-line camelcase
      const ref_proveedor = data.ref_proveedor ? data.ref_proveedor.trim() : null;
      const urgente = data.urgente ? 1 : 0;

      // Insert encargar entry
      const stmt = db.prepare(`
        INSERT INTO encargar (articulo, ref_interna, descripcion, proveedor, ref_proveedor, urgente)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // eslint-disable-next-line camelcase
      const result = stmt.run(
        articulo,
        ref_interna,
        descripcion,
        proveedor,
        ref_proveedor,
        urgente
      );

      // Fetch the created encargar entry
      const encargar = db
        .prepare('SELECT * FROM encargar WHERE id = ?')
        .get(result.lastInsertRowid);

      return {
        success: true,
        data: encargar,
      };
    } catch (error) {
      console.error('Error in encargar:create handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  /**
   * Handler: encargar:update
   * Updates an existing encargar entry.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The encargar ID
   * @param {Object} data - The encargar data to update { articulo?, ref_interna?, descripcion?, proveedor?, ref_proveedor?, urgente? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('encargar:update', async (_event, id, data) => {
    try {
      // Validate ID
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'id is required and must be a number',
          },
        };
      }

      // Validate input
      const validation = validateEncargarInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Check if encargar entry exists
      const existing = db.prepare('SELECT id FROM encargar WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Encargar entry not found',
          },
        };
      }

      // Trim whitespace from string fields
      let articulo;
      if (data.articulo !== undefined) {
        articulo = data.articulo ? data.articulo.trim() : null;
      }

      // eslint-disable-next-line camelcase
      let ref_interna;
      if (data.ref_interna !== undefined) {
        // eslint-disable-next-line camelcase
        ref_interna = data.ref_interna ? data.ref_interna.trim() : null;
      }

      let descripcion;
      if (data.descripcion !== undefined) {
        descripcion = data.descripcion ? data.descripcion.trim() : null;
      }

      let proveedor;
      if (data.proveedor !== undefined) {
        proveedor = data.proveedor ? data.proveedor.trim() : null;
      }

      // eslint-disable-next-line camelcase
      let ref_proveedor;
      if (data.ref_proveedor !== undefined) {
        // eslint-disable-next-line camelcase
        ref_proveedor = data.ref_proveedor ? data.ref_proveedor.trim() : null;
      }

      let urgente;
      if (data.urgente !== undefined) {
        urgente = data.urgente ? 1 : 0;
      }

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];

      if (articulo !== undefined) {
        updates.push('articulo = ?');
        values.push(articulo);
      }
      // eslint-disable-next-line camelcase
      if (ref_interna !== undefined) {
        updates.push('ref_interna = ?');
        // eslint-disable-next-line camelcase
        values.push(ref_interna);
      }
      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        values.push(descripcion);
      }
      if (proveedor !== undefined) {
        updates.push('proveedor = ?');
        values.push(proveedor);
      }
      // eslint-disable-next-line camelcase
      if (ref_proveedor !== undefined) {
        updates.push('ref_proveedor = ?');
        // eslint-disable-next-line camelcase
        values.push(ref_proveedor);
      }
      if (urgente !== undefined) {
        updates.push('urgente = ?');
        values.push(urgente);
      }

      if (updates.length === 0) {
        // No fields to update, just return the existing encargar entry
        const encargar = db.prepare('SELECT * FROM encargar WHERE id = ?').get(id);
        return {
          success: true,
          data: encargar,
        };
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE encargar
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);

      // Fetch the updated encargar entry
      const encargar = db.prepare('SELECT * FROM encargar WHERE id = ?').get(id);

      return {
        success: true,
        data: encargar,
      };
    } catch (error) {
      console.error('Error in encargar:update handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  /**
   * Handler: encargar:delete
   * Deletes an encargar entry.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The encargar ID
   * @returns {Promise<{success: boolean, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('encargar:delete', async (_event, id) => {
    try {
      // Validate ID
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'id is required and must be a number',
          },
        };
      }

      const db = getDatabase();

      // Check if encargar entry exists
      const existing = db.prepare('SELECT id FROM encargar WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Encargar entry not found',
          },
        };
      }

      // Delete encargar entry
      db.prepare('DELETE FROM encargar WHERE id = ?').run(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in encargar:delete handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });
}

module.exports = {
  registerEncargarHandlers,
};

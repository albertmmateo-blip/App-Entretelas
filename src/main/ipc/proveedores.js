const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

/**
 * Validates proveedor input data.
 * @param {Object} data - The proveedor data to validate
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validateProveedorInput(data) {
  // Validate razon_social (required, max 255 chars)
  if (data.razon_social !== null && data.razon_social !== undefined) {
    if (typeof data.razon_social !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'razon_social must be a string' },
      };
    }
    if (data.razon_social.trim().length === 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'razon_social is required and cannot be empty',
        },
      };
    }
    if (data.razon_social.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'razon_social must be 255 characters or less',
        },
      };
    }
  }

  // Validate direccion (optional but if provided max 255 chars)
  if (data.direccion !== null && data.direccion !== undefined) {
    if (typeof data.direccion !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'direccion must be a string' },
      };
    }
    if (data.direccion.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'direccion must be 255 characters or less',
        },
      };
    }
  }

  // Validate nif (optional but if provided max 20 chars)
  if (data.nif !== null && data.nif !== undefined) {
    if (typeof data.nif !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'nif must be a string' },
      };
    }
    if (data.nif.length > 20) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'nif must be 20 characters or less',
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Registers IPC handlers for proveedores operations.
 */
function registerProveedoresHandlers() {
  /**
   * Handler: proveedores:getAll
   * Returns all proveedores from the database.
   * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('proveedores:getAll', async () => {
    try {
      const db = getDatabase();
      const proveedores = db.prepare('SELECT * FROM proveedores ORDER BY razon_social ASC').all();

      return {
        success: true,
        data: proveedores,
      };
    } catch (error) {
      console.error('Error in proveedores:getAll handler:', error);
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
   * Handler: proveedores:create
   * Creates a new proveedor.
   * @param {Event} _event - IPC event (unused)
   * @param {Object} data - The proveedor data { razon_social, direccion?, nif? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('proveedores:create', async (_event, data) => {
    try {
      // Validate required field
      if (!data.razon_social) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'razon_social is required',
          },
        };
      }

      // Validate input
      const validation = validateProveedorInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Trim whitespace from string fields
      const razonSocial = data.razon_social.trim();
      const direccion = data.direccion ? data.direccion.trim() : null;
      const nif = data.nif ? data.nif.trim() : null;

      // Insert proveedor
      const stmt = db.prepare(`
        INSERT INTO proveedores (razon_social, direccion, nif)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(razonSocial, direccion, nif);

      // Fetch the created proveedor
      const proveedor = db
        .prepare('SELECT * FROM proveedores WHERE id = ?')
        .get(result.lastInsertRowid);

      return {
        success: true,
        data: proveedor,
      };
    } catch (error) {
      console.error('Error in proveedores:create handler:', error);
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
   * Handler: proveedores:update
   * Updates an existing proveedor.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The proveedor ID
   * @param {Object} data - The proveedor data to update { razon_social?, direccion?, nif? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('proveedores:update', async (_event, id, data) => {
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
      const validation = validateProveedorInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Check if proveedor exists
      const existing = db.prepare('SELECT id FROM proveedores WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Proveedor not found',
          },
        };
      }

      // Trim whitespace from string fields
      let razonSocial;
      if (data.razon_social !== undefined) {
        razonSocial = data.razon_social ? data.razon_social.trim() : null;
      } else {
        razonSocial = undefined;
      }

      let direccion;
      if (data.direccion !== undefined) {
        direccion = data.direccion ? data.direccion.trim() : null;
      } else {
        direccion = undefined;
      }

      let nif;
      if (data.nif !== undefined) {
        nif = data.nif ? data.nif.trim() : null;
      } else {
        nif = undefined;
      }

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];

      if (razonSocial !== undefined) {
        if (!razonSocial || razonSocial.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'razon_social cannot be empty',
            },
          };
        }
        updates.push('razon_social = ?');
        values.push(razonSocial);
      }
      if (direccion !== undefined) {
        updates.push('direccion = ?');
        values.push(direccion);
      }
      if (nif !== undefined) {
        updates.push('nif = ?');
        values.push(nif);
      }

      if (updates.length === 0) {
        // No fields to update, just return the existing proveedor
        const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(id);
        return {
          success: true,
          data: proveedor,
        };
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE proveedores
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);

      // Fetch the updated proveedor
      const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(id);

      return {
        success: true,
        data: proveedor,
      };
    } catch (error) {
      console.error('Error in proveedores:update handler:', error);
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
   * Handler: proveedores:delete
   * Deletes a proveedor.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The proveedor ID
   * @returns {Promise<{success: boolean, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('proveedores:delete', async (_event, id) => {
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

      // Check if proveedor exists
      const existing = db.prepare('SELECT id FROM proveedores WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Proveedor not found',
          },
        };
      }

      // Delete proveedor
      db.prepare('DELETE FROM proveedores WHERE id = ?').run(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in proveedores:delete handler:', error);
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
  registerProveedoresHandlers,
};

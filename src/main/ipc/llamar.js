const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

/**
 * Validates llamar input data.
 * @param {Object} data - The llamar data to validate
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validateLlamarInput(data) {
  // Validate asunto (required, max 255 chars)
  if (data.asunto !== null && data.asunto !== undefined) {
    if (typeof data.asunto !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'asunto must be a string' },
      };
    }
    if (data.asunto.trim().length === 0) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'asunto is required' },
      };
    }
    if (data.asunto.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'asunto must be 255 characters or less',
        },
      };
    }
  }

  // Validate contacto (required, max 255 chars)
  if (data.contacto !== null && data.contacto !== undefined) {
    if (typeof data.contacto !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'contacto must be a string' },
      };
    }
    if (data.contacto.trim().length === 0) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'contacto is required' },
      };
    }
    if (data.contacto.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'contacto must be 255 characters or less',
        },
      };
    }
  }

  // Validate nombre (optional but if provided max 255 chars)
  if (data.nombre !== null && data.nombre !== undefined) {
    if (typeof data.nombre !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'nombre must be a string' },
      };
    }
    if (data.nombre.length > 255) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'nombre must be 255 characters or less',
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

  return { valid: true };
}

/**
 * Registers IPC handlers for llamar operations.
 */
function registerLlamarHandlers() {
  /**
   * Handler: llamar:getAll
   * Returns all llamar entries from the database.
   * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('llamar:getAll', async () => {
    try {
      const db = getDatabase();
      const llamar = db.prepare('SELECT * FROM llamar ORDER BY fecha_creacion DESC').all();

      return {
        success: true,
        data: llamar,
      };
    } catch (error) {
      console.error('Error in llamar:getAll handler:', error);
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
   * Handler: llamar:create
   * Creates a new llamar entry.
   * @param {Event} _event - IPC event (unused)
   * @param {Object} data - The llamar data { asunto, contacto, nombre?, descripcion?, urgente? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('llamar:create', async (_event, data) => {
    try {
      // Check for required fields
      if (!data.asunto || (typeof data.asunto === 'string' && data.asunto.trim().length === 0)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'asunto is required',
          },
        };
      }

      if (
        !data.contacto ||
        (typeof data.contacto === 'string' && data.contacto.trim().length === 0)
      ) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'contacto is required',
          },
        };
      }

      // Validate input
      const validation = validateLlamarInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Trim whitespace from string fields
      const asunto = data.asunto.trim();
      const contacto = data.contacto.trim();
      const nombre = data.nombre ? data.nombre.trim() : null;
      const descripcion = data.descripcion ? data.descripcion.trim() : null;
      const urgente = data.urgente ? 1 : 0;

      // Insert llamar entry
      const stmt = db.prepare(`
        INSERT INTO llamar (asunto, contacto, nombre, descripcion, urgente)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(asunto, contacto, nombre, descripcion, urgente);

      // Fetch the created llamar entry
      const llamar = db.prepare('SELECT * FROM llamar WHERE id = ?').get(result.lastInsertRowid);

      return {
        success: true,
        data: llamar,
      };
    } catch (error) {
      console.error('Error in llamar:create handler:', error);
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
   * Handler: llamar:update
   * Updates an existing llamar entry.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The llamar ID
   * @param {Object} data - The llamar data to update { asunto?, contacto?, nombre?, descripcion?, urgente? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('llamar:update', async (_event, id, data) => {
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
      const validation = validateLlamarInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Check if llamar entry exists
      const existing = db.prepare('SELECT id FROM llamar WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Llamar entry not found',
          },
        };
      }

      // Trim whitespace from string fields
      const asunto =
        data.asunto !== undefined ? (data.asunto ? data.asunto.trim() : null) : undefined;
      const contacto =
        data.contacto !== undefined ? (data.contacto ? data.contacto.trim() : null) : undefined;
      const nombre =
        data.nombre !== undefined ? (data.nombre ? data.nombre.trim() : null) : undefined;
      const descripcion =
        data.descripcion !== undefined
          ? data.descripcion
            ? data.descripcion.trim()
            : null
          : undefined;
      const urgente = data.urgente !== undefined ? (data.urgente ? 1 : 0) : undefined;

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];

      if (asunto !== undefined) {
        updates.push('asunto = ?');
        values.push(asunto);
      }
      if (contacto !== undefined) {
        updates.push('contacto = ?');
        values.push(contacto);
      }
      if (nombre !== undefined) {
        updates.push('nombre = ?');
        values.push(nombre);
      }
      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        values.push(descripcion);
      }
      if (urgente !== undefined) {
        updates.push('urgente = ?');
        values.push(urgente);
      }

      if (updates.length === 0) {
        // No fields to update, just return the existing llamar entry
        const llamar = db.prepare('SELECT * FROM llamar WHERE id = ?').get(id);
        return {
          success: true,
          data: llamar,
        };
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE llamar
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);

      // Fetch the updated llamar entry
      const llamar = db.prepare('SELECT * FROM llamar WHERE id = ?').get(id);

      return {
        success: true,
        data: llamar,
      };
    } catch (error) {
      console.error('Error in llamar:update handler:', error);
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
   * Handler: llamar:delete
   * Deletes a llamar entry.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The llamar ID
   * @returns {Promise<{success: boolean, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('llamar:delete', async (_event, id) => {
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

      // Check if llamar entry exists
      const existing = db.prepare('SELECT id FROM llamar WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Llamar entry not found',
          },
        };
      }

      // Delete llamar entry
      db.prepare('DELETE FROM llamar WHERE id = ?').run(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in llamar:delete handler:', error);
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
  registerLlamarHandlers,
};

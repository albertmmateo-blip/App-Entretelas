const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

/**
 * Validates nota input data.
 * @param {Object} data - The nota data to validate
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validateNotaInput(data) {
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

  // Validate contacto (optional but if provided max 255 chars)
  if (data.contacto !== null && data.contacto !== undefined) {
    if (typeof data.contacto !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'contacto must be a string' },
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

  return { valid: true };
}

/**
 * Registers IPC handlers for notas operations.
 */
function registerNotasHandlers() {
  /**
   * Handler: notas:getAll
   * Returns all notas from the database.
   * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('notas:getAll', async () => {
    try {
      const db = getDatabase();
      const notas = db.prepare('SELECT * FROM notas ORDER BY fecha_creacion DESC').all();

      return {
        success: true,
        data: notas,
      };
    } catch (error) {
      console.error('Error in notas:getAll handler:', error);
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
   * Handler: notas:create
   * Creates a new nota.
   * @param {Event} _event - IPC event (unused)
   * @param {Object} data - The nota data { nombre?, descripcion?, contacto?, urgente? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('notas:create', async (_event, data) => {
    try {
      // Validate input
      const validation = validateNotaInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Trim whitespace from string fields
      const nombre = data.nombre ? data.nombre.trim() : null;
      const descripcion = data.descripcion ? data.descripcion.trim() : null;
      const contacto = data.contacto ? data.contacto.trim() : null;
      const urgente = data.urgente ? 1 : 0;

      // Insert nota
      const stmt = db.prepare(`
        INSERT INTO notas (nombre, descripcion, contacto, urgente)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(nombre, descripcion, contacto, urgente);

      // Fetch the created nota
      const nota = db.prepare('SELECT * FROM notas WHERE id = ?').get(result.lastInsertRowid);

      return {
        success: true,
        data: nota,
      };
    } catch (error) {
      console.error('Error in notas:create handler:', error);
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
   * Handler: notas:update
   * Updates an existing nota.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The nota ID
   * @param {Object} data - The nota data to update { nombre?, descripcion?, contacto?, urgente? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('notas:update', async (_event, id, data) => {
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
      const validation = validateNotaInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Check if nota exists
      const existing = db.prepare('SELECT id FROM notas WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Nota not found',
          },
        };
      }

      // Trim whitespace from string fields
      const nombre =
        data.nombre !== undefined ? (data.nombre ? data.nombre.trim() : null) : undefined;
      const descripcion =
        data.descripcion !== undefined
          ? data.descripcion
            ? data.descripcion.trim()
            : null
          : undefined;
      const contacto =
        data.contacto !== undefined ? (data.contacto ? data.contacto.trim() : null) : undefined;
      const urgente = data.urgente !== undefined ? (data.urgente ? 1 : 0) : undefined;

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];

      if (nombre !== undefined) {
        updates.push('nombre = ?');
        values.push(nombre);
      }
      if (descripcion !== undefined) {
        updates.push('descripcion = ?');
        values.push(descripcion);
      }
      if (contacto !== undefined) {
        updates.push('contacto = ?');
        values.push(contacto);
      }
      if (urgente !== undefined) {
        updates.push('urgente = ?');
        values.push(urgente);
      }

      if (updates.length === 0) {
        // No fields to update, just return the existing nota
        const nota = db.prepare('SELECT * FROM notas WHERE id = ?').get(id);
        return {
          success: true,
          data: nota,
        };
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE notas
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);

      // Fetch the updated nota
      const nota = db.prepare('SELECT * FROM notas WHERE id = ?').get(id);

      return {
        success: true,
        data: nota,
      };
    } catch (error) {
      console.error('Error in notas:update handler:', error);
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
   * Handler: notas:delete
   * Deletes a nota.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The nota ID
   * @returns {Promise<{success: boolean, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('notas:delete', async (_event, id) => {
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

      // Check if nota exists
      const existing = db.prepare('SELECT id FROM notas WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Nota not found',
          },
        };
      }

      // Delete nota
      db.prepare('DELETE FROM notas WHERE id = ?').run(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in notas:delete handler:', error);
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
  registerNotasHandlers,
};

const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

/**
 * Validates cliente input data.
 * @param {Object} data - The cliente data to validate
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validateClienteInput(data) {
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

  // Validate numero_cliente (required, max 50 chars)
  if (data.numero_cliente !== null && data.numero_cliente !== undefined) {
    if (typeof data.numero_cliente !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'numero_cliente must be a string' },
      };
    }
    if (data.numero_cliente.trim().length === 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'numero_cliente is required and cannot be empty',
        },
      };
    }
    if (data.numero_cliente.length > 50) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'numero_cliente must be 50 characters or less',
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
 * Registers IPC handlers for clientes operations.
 */
function registerClientesHandlers() {
  /**
   * Handler: clientes:getAll
   * Returns all clientes from the database.
   * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('clientes:getAll', async () => {
    try {
      const db = getDatabase();
      const clientes = db.prepare('SELECT * FROM clientes ORDER BY razon_social ASC').all();

      return {
        success: true,
        data: clientes,
      };
    } catch (error) {
      console.error('Error in clientes:getAll handler:', error);
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
   * Handler: clientes:create
   * Creates a new cliente.
   * @param {Event} _event - IPC event (unused)
   * @param {Object} data - The cliente data { razon_social, numero_cliente, direccion?, nif? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('clientes:create', async (_event, data) => {
    try {
      // Validate required fields
      if (!data.razon_social) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'razon_social is required',
          },
        };
      }
      if (!data.numero_cliente) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'numero_cliente is required',
          },
        };
      }

      // Validate input
      const validation = validateClienteInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Trim whitespace from string fields
      const razonSocial = data.razon_social.trim();
      const numeroCliente = data.numero_cliente.trim();
      const direccion = data.direccion ? data.direccion.trim() : null;
      const nif = data.nif ? data.nif.trim() : null;

      // Insert cliente
      const stmt = db.prepare(`
        INSERT INTO clientes (razon_social, numero_cliente, direccion, nif)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(razonSocial, numeroCliente, direccion, nif);

      // Fetch the created cliente
      const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);

      return {
        success: true,
        data: cliente,
      };
    } catch (error) {
      console.error('Error in clientes:create handler:', error);
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
   * Handler: clientes:update
   * Updates an existing cliente.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The cliente ID
   * @param {Object} data - The cliente data to update { razon_social?, numero_cliente?, direccion?, nif? }
   * @returns {Promise<{success: boolean, data?: Object, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('clientes:update', async (_event, id, data) => {
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
      const validation = validateClienteInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDatabase();

      // Check if cliente exists
      const existing = db.prepare('SELECT id FROM clientes WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Cliente not found',
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

      let numeroCliente;
      if (data.numero_cliente !== undefined) {
        numeroCliente = data.numero_cliente ? data.numero_cliente.trim() : null;
      } else {
        numeroCliente = undefined;
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
      if (numeroCliente !== undefined) {
        if (!numeroCliente || numeroCliente.length === 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'numero_cliente cannot be empty',
            },
          };
        }
        updates.push('numero_cliente = ?');
        values.push(numeroCliente);
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
        // No fields to update, just return the existing cliente
        const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
        return {
          success: true,
          data: cliente,
        };
      }

      values.push(id);

      const stmt = db.prepare(`
        UPDATE clientes
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);

      // Fetch the updated cliente
      const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);

      return {
        success: true,
        data: cliente,
      };
    } catch (error) {
      console.error('Error in clientes:update handler:', error);
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
   * Handler: clientes:delete
   * Deletes a cliente.
   * @param {Event} _event - IPC event (unused)
   * @param {number} id - The cliente ID
   * @returns {Promise<{success: boolean, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('clientes:delete', async (_event, id) => {
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

      // Check if cliente exists
      const existing = db.prepare('SELECT id FROM clientes WHERE id = ?').get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Cliente not found',
          },
        };
      }

      // Delete cliente
      db.prepare('DELETE FROM clientes WHERE id = ?').run(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in clientes:delete handler:', error);
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
  registerClientesHandlers,
};

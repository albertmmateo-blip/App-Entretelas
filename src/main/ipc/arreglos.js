const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

const ALBARAN_OPTIONS = new Set(['Entretelas', 'Isa', 'Loli']);

function ensureArreglosSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS arreglos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      albaran        TEXT    NOT NULL CHECK (albaran IN ('Entretelas', 'Isa', 'Loli')),
      fecha          TEXT    NOT NULL,
      numero         TEXT    NOT NULL CHECK (length(trim(numero)) > 0),
      cliente        TEXT,
      arreglo        TEXT,
      importe        REAL    NOT NULL CHECK (importe >= 0),
      fecha_creacion TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      fecha_mod      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TRIGGER IF NOT EXISTS arreglos_fecha_mod
    AFTER UPDATE ON arreglos
    FOR EACH ROW
    BEGIN
      UPDATE arreglos SET fecha_mod = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = OLD.id;
    END;

    CREATE INDEX IF NOT EXISTS idx_arreglos_fecha ON arreglos(fecha);
    CREATE INDEX IF NOT EXISTS idx_arreglos_albaran ON arreglos(albaran);
  `);
}

function parseImporte(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/€/g, '').replace(/\s/g, '');
    if (!normalized) {
      return NaN;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
}

function isValidIsoDate(date) {
  if (typeof date !== 'string' || !date.trim()) {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp);
}

function validateArregloInput(data) {
  if (data.albaran !== null && data.albaran !== undefined) {
    if (typeof data.albaran !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'albaran must be a string' },
      };
    }

    if (!ALBARAN_OPTIONS.has(data.albaran.trim())) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'albaran must be one of: Entretelas, Isa, Loli',
        },
      };
    }
  }

  if (data.fecha !== null && data.fecha !== undefined) {
    if (!isValidIsoDate(data.fecha)) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'fecha must be a valid YYYY-MM-DD date' },
      };
    }
  }

  if (data.numero !== null && data.numero !== undefined) {
    if (typeof data.numero !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'numero must be a string' },
      };
    }

    if (data.numero.trim().length === 0) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'numero is required' },
      };
    }

    if (data.numero.length > 100) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'numero must be 100 characters or less' },
      };
    }
  }

  if (data.cliente !== null && data.cliente !== undefined) {
    if (typeof data.cliente !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'cliente must be a string' },
      };
    }

    if (data.cliente.length > 255) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'cliente must be 255 characters or less' },
      };
    }
  }

  if (data.arreglo !== null && data.arreglo !== undefined) {
    if (typeof data.arreglo !== 'string') {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'arreglo must be a string' },
      };
    }

    if (data.arreglo.length > 2000) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: 'arreglo must be 2000 characters or less' },
      };
    }
  }

  if (data.importe !== null && data.importe !== undefined) {
    const parsedImporte = parseImporte(data.importe);

    if (!Number.isFinite(parsedImporte) || parsedImporte < 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'importe must be a valid euro amount greater than or equal to 0',
        },
      };
    }
  }

  return { valid: true };
}

function registerArreglosHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;

  ipc.handle('arreglos:getAll', async () => {
    try {
      const db = getDb();
      ensureArreglosSchema(db);
      const arreglos = db
        .prepare(
          `SELECT *
           FROM arreglos
           ORDER BY fecha DESC, fecha_creacion DESC`
        )
        .all();

      return {
        success: true,
        data: arreglos,
      };
    } catch (error) {
      console.error('Error in arreglos:getAll handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('arreglos:create', async (_event, data) => {
    try {
      if (!data.albaran || typeof data.albaran !== 'string' || data.albaran.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'albaran is required',
          },
        };
      }

      if (!data.fecha || typeof data.fecha !== 'string' || data.fecha.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'fecha is required',
          },
        };
      }

      if (!data.numero || typeof data.numero !== 'string' || data.numero.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'numero is required',
          },
        };
      }

      if (data.importe === null || data.importe === undefined || data.importe === '') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'importe is required',
          },
        };
      }

      const validation = validateArregloInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDb();
      ensureArreglosSchema(db);
      const stmt = db.prepare(`
        INSERT INTO arreglos (albaran, fecha, numero, cliente, arreglo, importe)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const albaran = data.albaran.trim();
      const fecha = data.fecha.trim();
      const numero = data.numero.trim();
      const cliente = data.cliente ? data.cliente.trim() : null;
      const arreglo = data.arreglo ? data.arreglo.trim() : null;
      const importe = parseImporte(data.importe);

      const result = stmt.run(albaran, fecha, numero, cliente, arreglo, importe);
      const created = db.prepare('SELECT * FROM arreglos WHERE id = ?').get(result.lastInsertRowid);

      return {
        success: true,
        data: created,
      };
    } catch (error) {
      console.error('Error in arreglos:create handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('arreglos:update', async (_event, id, data) => {
    try {
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'id is required and must be a number',
          },
        };
      }

      const validation = validateArregloInput(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const db = getDb();
      ensureArreglosSchema(db);
      const existing = db.prepare('SELECT id FROM arreglos WHERE id = ?').get(id);

      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Arreglo entry not found',
          },
        };
      }

      const updates = [];
      const values = [];

      if (data.albaran !== undefined) {
        updates.push('albaran = ?');
        values.push(data.albaran ? data.albaran.trim() : null);
      }

      if (data.fecha !== undefined) {
        updates.push('fecha = ?');
        values.push(data.fecha ? data.fecha.trim() : null);
      }

      if (data.numero !== undefined) {
        updates.push('numero = ?');
        values.push(data.numero ? data.numero.trim() : null);
      }

      if (data.cliente !== undefined) {
        updates.push('cliente = ?');
        values.push(data.cliente ? data.cliente.trim() : null);
      }

      if (data.arreglo !== undefined) {
        updates.push('arreglo = ?');
        values.push(data.arreglo ? data.arreglo.trim() : null);
      }

      if (data.importe !== undefined) {
        updates.push('importe = ?');
        values.push(parseImporte(data.importe));
      }

      if (updates.length === 0) {
        const unchanged = db.prepare('SELECT * FROM arreglos WHERE id = ?').get(id);
        return {
          success: true,
          data: unchanged,
        };
      }

      values.push(id);

      db.prepare(
        `UPDATE arreglos
         SET ${updates.join(', ')}
         WHERE id = ?`
      ).run(...values);

      const updated = db.prepare('SELECT * FROM arreglos WHERE id = ?').get(id);

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      console.error('Error in arreglos:update handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('arreglos:delete', async (_event, id) => {
    try {
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'id is required and must be a number',
          },
        };
      }

      const db = getDb();
      ensureArreglosSchema(db);
      const existing = db.prepare('SELECT id FROM arreglos WHERE id = ?').get(id);

      if (!existing) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Arreglo entry not found',
          },
        };
      }

      db.prepare('DELETE FROM arreglos WHERE id = ?').run(id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error in arreglos:delete handler:', error);
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
  registerArreglosHandlers,
};

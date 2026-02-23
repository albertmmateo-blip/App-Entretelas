const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

function normalizeTrimmed(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function registerSecretCatalogoHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;

  ipc.handle('secretCatalogo:getFolders', async (_event, parentId = null) => {
    try {
      const db = getDb();

      if (parentId !== null && parentId !== undefined) {
        if (!Number.isInteger(parentId) || parentId <= 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'parentId must be a positive integer when provided',
            },
          };
        }

        const parentExists = db
          .prepare('SELECT id FROM secret_catalogo_folders WHERE id = ?')
          .get(parentId);
        if (!parentExists) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Parent folder not found',
            },
          };
        }
      }

      const folders =
        parentId === null || parentId === undefined
          ? db
              .prepare(
                `SELECT *
                 FROM secret_catalogo_folders
                 WHERE parent_id IS NULL
                 ORDER BY
                   CASE WHEN concepto IS NULL OR trim(concepto) = '' THEN 1 ELSE 0 END,
                   lower(concepto) ASC,
                   id DESC`
              )
              .all()
          : db
              .prepare(
                `SELECT *
                 FROM secret_catalogo_folders
                 WHERE parent_id = ?
                 ORDER BY
                   CASE WHEN concepto IS NULL OR trim(concepto) = '' THEN 1 ELSE 0 END,
                   lower(concepto) ASC,
                   id DESC`
              )
              .all(parentId);

      return { success: true, data: folders };
    } catch (error) {
      console.error('Error in secretCatalogo:getFolders handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:getFolderById', async (_event, id) => {
    try {
      if (!Number.isInteger(id) || id <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'id must be a positive integer',
          },
        };
      }

      const db = getDb();
      const folder = db.prepare('SELECT * FROM secret_catalogo_folders WHERE id = ?').get(id);

      if (!folder) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Folder not found',
          },
        };
      }

      return { success: true, data: folder };
    } catch (error) {
      console.error('Error in secretCatalogo:getFolderById handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:createFolder', async (_event, data = {}) => {
    try {
      const db = getDb();
      const parentId = data.parentId ?? null;
      const concepto = normalizeTrimmed(data.concepto);

      if (parentId !== null) {
        if (!Number.isInteger(parentId) || parentId <= 0) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'parentId must be a positive integer when provided',
            },
          };
        }

        const parentExists = db
          .prepare('SELECT id FROM secret_catalogo_folders WHERE id = ?')
          .get(parentId);
        if (!parentExists) {
          return {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Parent folder not found',
            },
          };
        }
      }

      if (
        data.concepto !== null &&
        data.concepto !== undefined &&
        typeof data.concepto !== 'string'
      ) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'concepto must be a string when provided',
          },
        };
      }

      if (concepto && concepto.length > 255) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'concepto must be 255 characters or less',
          },
        };
      }

      if (parentId === null && !concepto) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'concepto is required',
          },
        };
      }

      const result = db
        .prepare('INSERT INTO secret_catalogo_folders (parent_id, concepto) VALUES (?, ?)')
        .run(parentId, concepto);

      const created = db
        .prepare('SELECT * FROM secret_catalogo_folders WHERE id = ?')
        .get(result.lastInsertRowid);

      return { success: true, data: created };
    } catch (error) {
      console.error('Error in secretCatalogo:createFolder handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:getEntries', async (_event, folderId) => {
    try {
      if (!Number.isInteger(folderId) || folderId <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'folderId must be a positive integer',
          },
        };
      }

      const db = getDb();
      const folderExists = db
        .prepare('SELECT id FROM secret_catalogo_folders WHERE id = ?')
        .get(folderId);
      if (!folderExists) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Folder not found',
          },
        };
      }

      const entries = db
        .prepare(
          `SELECT *
           FROM secret_catalogo_entries
           WHERE folder_id = ?
           ORDER BY id DESC`
        )
        .all(folderId);

      return { success: true, data: entries };
    } catch (error) {
      console.error('Error in secretCatalogo:getEntries handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:createEntry', async (_event, data = {}) => {
    try {
      const db = getDb();
      const { folderId } = data;

      if (!Number.isInteger(folderId) || folderId <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'folderId must be a positive integer',
          },
        };
      }

      const folderExists = db
        .prepare('SELECT id FROM secret_catalogo_folders WHERE id = ?')
        .get(folderId);

      if (!folderExists) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Folder not found',
          },
        };
      }

      if (
        data.producto !== null &&
        data.producto !== undefined &&
        typeof data.producto !== 'string'
      ) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'producto must be a string when provided',
          },
        };
      }

      if (data.link !== null && data.link !== undefined && typeof data.link !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'link must be a string when provided',
          },
        };
      }

      const producto = normalizeTrimmed(data.producto);
      const link = normalizeTrimmed(data.link);

      if (producto && producto.length > 255) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'producto must be 255 characters or less',
          },
        };
      }

      if (link && link.length > 2000) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'link must be 2000 characters or less',
          },
        };
      }

      const result = db
        .prepare('INSERT INTO secret_catalogo_entries (folder_id, producto, link) VALUES (?, ?, ?)')
        .run(folderId, producto, link);

      const created = db
        .prepare('SELECT * FROM secret_catalogo_entries WHERE id = ?')
        .get(result.lastInsertRowid);

      return { success: true, data: created };
    } catch (error) {
      console.error('Error in secretCatalogo:createEntry handler:', error);
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
  registerSecretCatalogoHandlers,
};

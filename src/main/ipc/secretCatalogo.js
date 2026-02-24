const { ipcMain } = require('electron');
const { getDatabase } = require('../db/connection');

function normalizeTrimmed(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFolderType(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'proveedor' || normalized === 'familia') {
    return normalized;
  }

  return null;
}

function isValidOptionalString(value) {
  return value === null || value === undefined || typeof value === 'string';
}

function parseGetFoldersInput(input) {
  if (input === null || input === undefined || Number.isInteger(input)) {
    return {
      parentId: input ?? null,
      tipo: null,
    };
  }

  if (typeof input === 'object') {
    return {
      parentId: input.parentId ?? null,
      tipo: normalizeFolderType(input.tipo),
    };
  }

  return {
    parentId: null,
    tipo: null,
  };
}

function validateFolderTypeForId(db, folderId, expectedType) {
  if (!Number.isInteger(folderId) || folderId <= 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_INPUT',
        message: `${expectedType}_folder_id must be a positive integer`,
      },
    };
  }

  const folder = db
    .prepare('SELECT id, tipo FROM secret_catalogo_folders WHERE id = ?')
    .get(folderId);
  if (!folder) {
    return {
      valid: false,
      error: {
        code: 'NOT_FOUND',
        message: `Assigned ${expectedType} folder not found`,
      },
    };
  }

  const folderType = normalizeFolderType(folder.tipo) || 'proveedor';
  if (folderType !== expectedType) {
    return {
      valid: false,
      error: {
        code: 'INVALID_INPUT',
        message: `Assigned folder must be of type ${expectedType}`,
      },
    };
  }

  return { valid: true };
}

function registerSecretCatalogoHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;

  ipc.handle('secretCatalogo:getFolders', async (_event, input = null) => {
    try {
      const db = getDb();
      const { parentId, tipo } = parseGetFoldersInput(input);

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

      if (input && typeof input === 'object' && input.tipo !== undefined && !tipo) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'tipo must be proveedor or familia when provided',
          },
        };
      }

      const whereClauses = [];
      const params = [];

      if (parentId === null || parentId === undefined) {
        whereClauses.push('parent_id IS NULL');
      } else {
        whereClauses.push('parent_id = ?');
        params.push(parentId);
      }

      if (tipo) {
        whereClauses.push("COALESCE(NULLIF(trim(tipo), ''), 'proveedor') = ?");
        params.push(tipo);
      }

      const folders = db
        .prepare(
          `SELECT *
           FROM secret_catalogo_folders
           WHERE ${whereClauses.join(' AND ')}
           ORDER BY
             CASE WHEN concepto IS NULL OR trim(concepto) = '' THEN 1 ELSE 0 END,
             lower(concepto) ASC,
             id DESC`
        )
        .all(...params);

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
      const tipo = normalizeFolderType(data.tipo) || 'proveedor';

      if (data.tipo !== undefined && !normalizeFolderType(data.tipo)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'tipo must be proveedor or familia when provided',
          },
        };
      }

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
        .prepare('INSERT INTO secret_catalogo_folders (parent_id, concepto, tipo) VALUES (?, ?, ?)')
        .run(parentId, concepto, tipo);

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

  ipc.handle('secretCatalogo:updateFolder', async (_event, id, data = {}) => {
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

      const hasConcepto = Object.prototype.hasOwnProperty.call(data, 'concepto');
      if (!hasConcepto) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'concepto is required',
          },
        };
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

      const concepto = normalizeTrimmed(data.concepto);
      const nextTipo = data.tipo === undefined ? null : normalizeFolderType(data.tipo);

      if (data.tipo !== undefined && !nextTipo) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'tipo must be proveedor or familia when provided',
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

      const db = getDb();
      const currentFolder = db
        .prepare('SELECT * FROM secret_catalogo_folders WHERE id = ?')
        .get(id);

      if (!currentFolder) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Folder not found',
          },
        };
      }

      if (currentFolder.parent_id === null && !concepto) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'concepto is required',
          },
        };
      }

      if (data.tipo !== undefined) {
        db.prepare('UPDATE secret_catalogo_folders SET concepto = ?, tipo = ? WHERE id = ?').run(
          concepto,
          nextTipo,
          id
        );
      } else {
        db.prepare('UPDATE secret_catalogo_folders SET concepto = ? WHERE id = ?').run(
          concepto,
          id
        );
      }

      const updated = db.prepare('SELECT * FROM secret_catalogo_folders WHERE id = ?').get(id);

      return { success: true, data: updated };
    } catch (error) {
      console.error('Error in secretCatalogo:updateFolder handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:deleteFolder', async (_event, id) => {
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
      const currentFolder = db
        .prepare('SELECT * FROM secret_catalogo_folders WHERE id = ?')
        .get(id);

      if (!currentFolder) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Folder not found',
          },
        };
      }

      db.prepare('DELETE FROM secret_catalogo_folders WHERE id = ?').run(id);

      return { success: true, data: { id } };
    } catch (error) {
      console.error('Error in secretCatalogo:deleteFolder handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:getEntries', async (_event, input = null) => {
    try {
      const db = getDb();

      const legacyFolderId = Number.isInteger(input) ? input : null;
      const proveedorFolderId =
        typeof input === 'object' && input !== null
          ? (input.proveedorFolderId ?? null)
          : legacyFolderId;
      const familiaFolderId =
        typeof input === 'object' && input !== null ? (input.familiaFolderId ?? null) : null;

      const whereClauses = [];
      const params = [];

      if (proveedorFolderId !== null && proveedorFolderId !== undefined) {
        const proveedorValidation = validateFolderTypeForId(db, proveedorFolderId, 'proveedor');
        if (!proveedorValidation.valid) {
          return {
            success: false,
            error: proveedorValidation.error,
          };
        }

        whereClauses.push('proveedor_folder_id = ?');
        params.push(proveedorFolderId);
      }

      if (familiaFolderId !== null && familiaFolderId !== undefined) {
        const familiaValidation = validateFolderTypeForId(db, familiaFolderId, 'familia');
        if (!familiaValidation.valid) {
          return {
            success: false,
            error: familiaValidation.error,
          };
        }

        whereClauses.push('familia_folder_id = ?');
        params.push(familiaFolderId);
      }

      const entries = db
        .prepare(
          `SELECT *
           FROM secret_catalogo_entries
           ${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
           ORDER BY id DESC`
        )
        .all(...params);

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

  ipc.handle('secretCatalogo:getEntryById', async (_event, id) => {
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
      const entry = db.prepare('SELECT * FROM secret_catalogo_entries WHERE id = ?').get(id);

      if (!entry) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Entry not found',
          },
        };
      }

      return { success: true, data: entry };
    } catch (error) {
      console.error('Error in secretCatalogo:getEntryById handler:', error);
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
      const legacyFolderId = data.folderId ?? null;
      const proveedorFolderId = data.proveedorFolderId ?? legacyFolderId ?? null;
      const familiaFolderId = data.familiaFolderId ?? null;

      const proveedorValidation = validateFolderTypeForId(db, proveedorFolderId, 'proveedor');
      if (!proveedorValidation.valid) {
        return {
          success: false,
          error: proveedorValidation.error,
        };
      }

      const familiaValidation = validateFolderTypeForId(db, familiaFolderId, 'familia');
      if (!familiaValidation.valid) {
        return {
          success: false,
          error: familiaValidation.error,
        };
      }

      if (!isValidOptionalString(data.producto)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'producto must be a string when provided',
          },
        };
      }

      if (!isValidOptionalString(data.link)) {
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
        .prepare(
          `INSERT INTO secret_catalogo_entries (
            folder_id,
            proveedor_folder_id,
            familia_folder_id,
            producto,
            link
          ) VALUES (?, ?, ?, ?, ?)`
        )
        .run(proveedorFolderId, proveedorFolderId, familiaFolderId, producto, link);

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

  ipc.handle('secretCatalogo:updateEntry', async (_event, id, data = {}) => {
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
      const existingEntry = db
        .prepare('SELECT * FROM secret_catalogo_entries WHERE id = ?')
        .get(id);
      if (!existingEntry) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Entry not found',
          },
        };
      }

      const hasProducto = Object.prototype.hasOwnProperty.call(data, 'producto');
      const hasLink = Object.prototype.hasOwnProperty.call(data, 'link');
      const hasProveedorFolder = Object.prototype.hasOwnProperty.call(data, 'proveedorFolderId');
      const hasFamiliaFolder = Object.prototype.hasOwnProperty.call(data, 'familiaFolderId');

      if (!hasProducto && !hasLink && !hasProveedorFolder && !hasFamiliaFolder) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'No fields provided for update',
          },
        };
      }

      if (hasProducto && !isValidOptionalString(data.producto)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'producto must be a string when provided',
          },
        };
      }

      if (hasLink && !isValidOptionalString(data.link)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'link must be a string when provided',
          },
        };
      }

      const nextProducto = hasProducto
        ? normalizeTrimmed(data.producto)
        : normalizeTrimmed(existingEntry.producto);
      const nextLink = hasLink ? normalizeTrimmed(data.link) : normalizeTrimmed(existingEntry.link);
      const nextProveedorFolderId = hasProveedorFolder
        ? data.proveedorFolderId
        : existingEntry.proveedor_folder_id || existingEntry.folder_id;
      const nextFamiliaFolderId = hasFamiliaFolder
        ? data.familiaFolderId
        : existingEntry.familia_folder_id;

      if (nextProducto && nextProducto.length > 255) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'producto must be 255 characters or less',
          },
        };
      }

      if (nextLink && nextLink.length > 2000) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'link must be 2000 characters or less',
          },
        };
      }

      const proveedorValidation = validateFolderTypeForId(db, nextProveedorFolderId, 'proveedor');
      if (!proveedorValidation.valid) {
        return {
          success: false,
          error: proveedorValidation.error,
        };
      }

      const familiaValidation = validateFolderTypeForId(db, nextFamiliaFolderId, 'familia');
      if (!familiaValidation.valid) {
        return {
          success: false,
          error: familiaValidation.error,
        };
      }

      db.prepare(
        `UPDATE secret_catalogo_entries
         SET
           folder_id = ?,
           proveedor_folder_id = ?,
           familia_folder_id = ?,
           producto = ?,
           link = ?
         WHERE id = ?`
      ).run(
        nextProveedorFolderId,
        nextProveedorFolderId,
        nextFamiliaFolderId,
        nextProducto,
        nextLink,
        id
      );

      const updated = db.prepare('SELECT * FROM secret_catalogo_entries WHERE id = ?').get(id);
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error in secretCatalogo:updateEntry handler:', error);
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('secretCatalogo:deleteEntry', async (_event, id) => {
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
      const existingEntry = db
        .prepare('SELECT id FROM secret_catalogo_entries WHERE id = ?')
        .get(id);

      if (!existingEntry) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Entry not found',
          },
        };
      }

      db.prepare('DELETE FROM secret_catalogo_entries WHERE id = ?').run(id);
      return { success: true, data: { id } };
    } catch (error) {
      console.error('Error in secretCatalogo:deleteEntry handler:', error);
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

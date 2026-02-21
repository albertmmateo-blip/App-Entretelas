const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../db/connection');

// Windows reserved names that need special handling
const WINDOWS_RESERVED_NAMES = [
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
];

const MAX_STORED_FILENAME_LENGTH = 200;
const MAX_COLLISION_ATTEMPTS = 9999;
const ALLOWED_FILE_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.txt',
  '.rtf',
  '.odt',
  '.ods',
  '.odp',
]);

function normalizeOptionalAmount(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue =
    typeof value === 'string' ? Number(value.replace(',', '.').trim()) : Number(value);

  if (!Number.isFinite(numericValue)) {
    const error = new Error(`${fieldName} must be a valid number`);
    error.code = 'INVALID_INPUT';
    throw error;
  }

  return numericValue;
}

function normalizeOptionalDueDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error('vencimiento must use YYYY-MM-DD format');
    error.code = 'INVALID_INPUT';
    throw error;
  }

  return value;
}

function normalizePaymentStatus(value) {
  if (value === true || value === 1 || value === '1') {
    return 1;
  }

  if (value === false || value === 0 || value === '0' || value === null || value === undefined) {
    return 0;
  }

  const error = new Error('pagada must be a boolean or 0/1 value');
  error.code = 'INVALID_INPUT';
  throw error;
}

/**
 * Sanitizes a filename by removing special characters and applying safety rules.
 * @param {string} filename - The filename to sanitize
 * @returns {string} - The sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  let sanitized = filename;

  // Remove ALL special characters \ / : * ? " < > | # ( ) and control characters (ASCII 0-31)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\\/:*?"<>|#()]/g, '');

  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');

  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();

  // If empty after sanitization, return a default
  if (!sanitized || sanitized.trim() === '') {
    return 'unnamed';
  }

  // Truncate to 200 characters to avoid filesystem limits
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Check if the base name (without extension) is a Windows reserved name
  const baseName = sanitized.replace(/\.[^.]*$/, ''); // Remove extension
  if (WINDOWS_RESERVED_NAMES.includes(baseName.toUpperCase())) {
    sanitized = `${sanitized}_`;
  }

  return sanitized;
}

/**
 * Sanitizes only the base part of a filename while preserving case and spaces.
 * Used to build human-readable stored PDF filenames.
 * @param {string} name - filename base (without extension)
 * @returns {string}
 */
function sanitizeFileBaseName(name) {
  if (!name || typeof name !== 'string') {
    return 'unnamed';
  }

  let sanitized = name;

  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\\/:*?"<>|#()]/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  sanitized = sanitized.replace(/[.\s]+$/g, '').trim();

  if (!sanitized) {
    return 'unnamed';
  }

  if (sanitized.length > 180) {
    sanitized = sanitized.substring(0, 180).trim();
  }

  if (WINDOWS_RESERVED_NAMES.includes(sanitized.toUpperCase())) {
    sanitized = `${sanitized}_`;
  }

  return sanitized;
}

function buildStoredFilename(entityLabel, baseName, extension, suffixNumber = 0) {
  const suffix = suffixNumber > 0 ? ` (${suffixNumber})` : '';
  const prefix = `${entityLabel} - `;
  const maxBaseLength = Math.max(
    1,
    MAX_STORED_FILENAME_LENGTH - prefix.length - suffix.length - extension.length
  );

  let truncatedBase = baseName.substring(0, maxBaseLength).trim();
  truncatedBase = truncatedBase.replace(/[.\s]+$/g, '').trim();

  if (!truncatedBase) {
    truncatedBase = 'unnamed';
  }

  return `${prefix}${truncatedBase}${suffix}${extension}`;
}

function getUniqueStorageName({
  db,
  tipo,
  sanitizedEntidad,
  entityLabel,
  sanitizedOriginalBaseName,
  extension,
  targetDir,
}) {
  const findExistingByRelativePath = db.prepare(
    'SELECT 1 FROM facturas_pdf WHERE ruta_relativa = ? LIMIT 1'
  );

  for (let attempt = 0; attempt <= MAX_COLLISION_ATTEMPTS; attempt += 1) {
    const targetFilename = buildStoredFilename(
      entityLabel,
      sanitizedOriginalBaseName,
      extension,
      attempt
    );
    const relativePath = path.join(tipo, sanitizedEntidad, targetFilename);
    const targetPath = path.join(targetDir, targetFilename);

    const existsOnDisk = fs.existsSync(targetPath);
    const existsInDatabase = Boolean(findExistingByRelativePath.get(relativePath));

    if (!existsOnDisk && !existsInDatabase) {
      return { targetFilename, targetPath, relativePath };
    }
  }

  throw new Error('Unable to allocate unique PDF filename after multiple attempts');
}

/**
 * Validates that a relative path is within the facturas directory
 * and prevents path traversal attacks.
 * @param {string} relativePath - The relative path to validate
 * @returns {{ valid: boolean, error?: { code: string, message: string } }}
 */
function validatePDFPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'pdfPath must be a non-empty string' },
    };
  }

  // Prevent path traversal attempts
  if (relativePath.includes('..') || relativePath.includes('~')) {
    return {
      valid: false,
      error: { code: 'INVALID_PATH', message: 'Path traversal not allowed' },
    };
  }

  return { valid: true };
}

/**
 * Register all facturas-related IPC handlers.
 */
function registerFacturasHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;
  const electronApp = deps.app || app;
  /**
   * Handler: facturas:uploadPDF
   * Uploads a file to the managed facturas directory.
   * @param {object} params - Upload parameters
   * @param {string} params.tipo - 'compra' or 'venta'
   * @param {number} params.entidadId - ID of the entidad (proveedor or cliente)
   * @param {string} params.entidadNombre - Name of the entidad
   * @param {string} params.filePath - Source file path
   * @returns {Promise<{ success: boolean, data?: { id: number, ruta_relativa: string }, error?: object }>}
   */
  ipc.handle('facturas:uploadPDF', async (event, params) => {
    try {
      const { tipo, entidadId, entidadNombre, filePath } = params;

      // Validate required parameters
      if (!tipo || !entidadId || !entidadNombre || !filePath) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Missing required parameters' },
        };
      }

      // Validate tipo
      if (tipo !== 'compra' && tipo !== 'venta' && tipo !== 'arreglos') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'tipo must be "compra", "venta", or "arreglos"',
          },
        };
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Source file not found' },
        };
      }

      // Check allowed file extension
      const fileExt = path.extname(filePath).toLowerCase();
      if (!ALLOWED_FILE_EXTENSIONS.has(fileExt)) {
        return {
          success: false,
          error: { code: 'FILE_INVALID', message: `Unsupported file extension: ${fileExt}` },
        };
      }

      // Check file size < 50 MB
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;
      const maxSize = 52428800; // 50 MB in bytes
      if (fileSizeInBytes > maxSize) {
        return {
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File size must be less than 50 MB' },
        };
      }

      if (fileExt === '.pdf') {
        const fileBuffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
        const header = fileBuffer.slice(0, 4).toString('utf-8');
        if (header !== '%PDF') {
          return {
            success: false,
            error: { code: 'FILE_INVALID', message: 'File does not appear to be a valid PDF' },
          };
        }
      }

      // Sanitize entidadNombre for directory usage and filename for stored display-style name
      const sanitizedEntidad = sanitizeFilename(entidadNombre);
      const originalFilename = path.basename(filePath);
      const originalBaseName = path.basename(originalFilename, path.extname(originalFilename));
      const sanitizedOriginalBaseName = sanitizeFileBaseName(originalBaseName);

      // Build target path: {userData}/facturas/${tipo}/${sanitizedEntidad}/
      const userDataPath = electronApp.getPath('userData');
      const targetDir = path.join(userDataPath, 'facturas', tipo, sanitizedEntidad);

      // Create directories if they don't exist
      fs.mkdirSync(targetDir, { recursive: true });

      // Build filename: [Proveedor/Cliente/Arreglo] - [file name].[extension]
      let entityLabel = 'Arreglo';
      if (tipo === 'compra') {
        entityLabel = 'Proveedor';
      } else if (tipo === 'venta') {
        entityLabel = 'Cliente';
      }
      const db = getDb();
      const { targetFilename, targetPath, relativePath } = getUniqueStorageName({
        db,
        tipo,
        sanitizedEntidad,
        entityLabel,
        sanitizedOriginalBaseName,
        extension: fileExt,
        targetDir,
      });

      // Copy file
      fs.copyFileSync(filePath, targetPath);

      // Insert record into facturas_pdf table
      const entidadTipo = tipo === 'venta' ? 'cliente' : 'proveedor';

      const stmt = db.prepare(`
        INSERT INTO facturas_pdf (tipo, entidad_id, entidad_tipo, nombre_original, nombre_guardado, ruta_relativa)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        tipo,
        entidadId,
        entidadTipo,
        originalFilename,
        targetFilename,
        relativePath
      );

      return {
        success: true,
        data: {
          id: result.lastInsertRowid,
          ruta_relativa: relativePath,
        },
      };
    } catch (error) {
      console.error('Error in facturas:uploadPDF:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to upload file',
        },
      };
    }
  });

  /**
   * Handler: facturas:deletePDF
   * Deletes a PDF file from disk and database.
   * @param {number} id - ID of the facturas_pdf record
   * @returns {Promise<{ success: boolean, error?: object }>}
   */
  ipc.handle('facturas:deletePDF', async (event, id) => {
    try {
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a number' },
        };
      }

      const db = getDb();

      // Get the record to find the file path
      const record = db.prepare('SELECT * FROM facturas_pdf WHERE id = ?').get(id);

      if (!record) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'PDF record not found' },
        };
      }

      // Delete database record first
      const deleteStmt = db.prepare('DELETE FROM facturas_pdf WHERE id = ?');
      deleteStmt.run(id);

      // Then delete file from disk
      const userDataPath = electronApp.getPath('userData');
      const filePath = path.join(userDataPath, 'facturas', record.ruta_relativa);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (fileError) {
          // Log warning but return success (file may have been manually deleted)
          console.warn(`Failed to delete file ${filePath}:`, fileError.message);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in facturas:deletePDF:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to delete PDF',
        },
      };
    }
  });

  /**
   * Handler: facturas:getAllForEntidad
   * Gets all PDFs for a specific entidad.
   * @param {object} params - Query parameters
   * @param {string} params.tipo - 'compra' or 'venta'
   * @param {number} params.entidadId - ID of the entidad
   * @returns {Promise<{ success: boolean, data?: Array, error?: object }>}
   */
  ipc.handle('facturas:getAllForEntidad', async (event, params) => {
    try {
      const { tipo, entidadId } = params;

      if (!tipo || !entidadId) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'tipo and entidadId are required' },
        };
      }

      if (tipo !== 'compra' && tipo !== 'venta' && tipo !== 'arreglos') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'tipo must be "compra", "venta", or "arreglos"',
          },
        };
      }

      const db = getDb();
      const stmt = db.prepare(`
        SELECT * FROM facturas_pdf
        WHERE tipo = ? AND entidad_id = ?
        ORDER BY fecha_subida DESC
      `);

      const rows = stmt.all(tipo, entidadId);

      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      console.error('Error in facturas:getAllForEntidad:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to get PDFs',
        },
      };
    }
  });

  /**
   * Handler: facturas:updatePDFMetadata
   * Updates editable metadata fields for a PDF invoice.
   * @param {number} id - ID of the facturas_pdf record
   * @param {object} data - Metadata payload
   * @returns {Promise<{ success: boolean, data?: object, error?: object }>}
   */
  ipc.handle('facturas:updatePDFMetadata', async (event, id, data) => {
    try {
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a number' },
        };
      }

      const payload = data || {};
      const importe = normalizeOptionalAmount(payload.importe, 'importe');
      const importeIvaRe = normalizeOptionalAmount(payload.importeIvaRe, 'importeIvaRe');
      const vencimiento = normalizeOptionalDueDate(payload.vencimiento);
      const pagada = normalizePaymentStatus(payload.pagada);

      const db = getDb();

      const exists = db.prepare('SELECT id FROM facturas_pdf WHERE id = ?').get(id);
      if (!exists) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'PDF record not found' },
        };
      }

      const stmt = db.prepare(`
        UPDATE facturas_pdf
        SET importe = ?,
            importe_iva_re = ?,
            vencimiento = ?,
            pagada = ?
        WHERE id = ?
      `);

      stmt.run(importe, importeIvaRe, vencimiento, pagada, id);

      const updatedRecord = db.prepare('SELECT * FROM facturas_pdf WHERE id = ?').get(id);

      return {
        success: true,
        data: updatedRecord,
      };
    } catch (error) {
      console.error('Error in facturas:updatePDFMetadata:', error);
      return {
        success: false,
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: error.message || 'Failed to update PDF metadata',
        },
      };
    }
  });

  /**
   * Handler: facturas:getPDFBytes
   * Gets PDF file bytes for rendering thumbnails in the renderer process.
   *
   * The file content is returned as a fresh `ArrayBuffer` (not backed by the
   * Node.js Buffer pool) so that Electron's structured-clone algorithm can
   * transfer it reliably without any `{ type: 'Buffer', data: number[] }`
   * ambiguity.  A `meta` object with `byteLength` is included to aid debugging
   * without having to inspect the binary payload.
   *
   * @param {string} pdfPath - Relative path from facturas_pdf.ruta_relativa
   * @returns {Promise<{ success: boolean, data?: ArrayBuffer, meta?: { byteLength: number }, error?: { code: string, message: string } }>}
   */
  ipc.handle('facturas:getPDFBytes', async (event, pdfPath) => {
    try {
      // Validate input
      const validation = validatePDFPath(pdfPath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Build absolute path within userData/facturas/
      const userDataPath = electronApp.getPath('userData');
      const facturasDir = path.join(userDataPath, 'facturas');
      const absolutePath = path.join(facturasDir, pdfPath);

      // Verify the resolved path is still within facturas directory
      const normalizedPath = path.normalize(absolutePath);
      const normalizedFacturasDir = path.normalize(facturasDir);
      if (!normalizedPath.startsWith(normalizedFacturasDir)) {
        return {
          success: false,
          error: { code: 'INVALID_PATH', message: 'Path must be within facturas directory' },
        };
      }

      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'PDF file not found' },
        };
      }

      // Read the file and produce a *fresh* ArrayBuffer that is not backed by
      // the Node.js Buffer pool.  `Uint8Array.from(buf)` copies the bytes into
      // a new allocation whose `.buffer` is exactly the right size, so
      // Electron's structured-clone transfers it without any Buffer wrapping.
      const fileBuffer = fs.readFileSync(absolutePath);
      const arrayBuffer = Uint8Array.from(fileBuffer).buffer;
      return {
        success: true,
        data: arrayBuffer,
        meta: { byteLength: arrayBuffer.byteLength },
      };
    } catch (error) {
      console.error('Error in facturas:getPDFBytes:', error);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to read PDF file',
        },
      };
    }
  });
}

module.exports = { registerFacturasHandlers, sanitizeFilename };

const { ipcMain, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../db/connection');

// Windows reserved names that need special handling
const WINDOWS_RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

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

  // Remove ALL special characters \ / : * ? " < > | and control characters (ASCII 0-31)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\\/:*?"<>|]/g, '');

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
function registerFacturasHandlers() {
  /**
   * Handler: facturas:uploadPDF
   * Uploads a PDF file to the managed facturas directory.
   * @param {object} params - Upload parameters
   * @param {string} params.tipo - 'compra' or 'venta'
   * @param {number} params.entidadId - ID of the entidad (proveedor or cliente)
   * @param {string} params.entidadNombre - Name of the entidad
   * @param {string} params.filePath - Source file path
   * @returns {Promise<{ success: boolean, data?: { id: number, ruta_relativa: string }, error?: object }>}
   */
  ipcMain.handle('facturas:uploadPDF', async (event, params) => {
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
      if (tipo !== 'compra' && tipo !== 'venta') {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'tipo must be "compra" or "venta"' },
        };
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'Source file not found' },
        };
      }

      // Check file extension is .pdf (case-insensitive)
      const fileExt = path.extname(filePath).toLowerCase();
      if (fileExt !== '.pdf') {
        return {
          success: false,
          error: { code: 'FILE_INVALID', message: 'File must be a PDF (.pdf extension)' },
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

      // Optional: Verify MIME type by checking first 4 bytes for %PDF
      const fileBuffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
      const header = fileBuffer.slice(0, 4).toString('utf-8');
      if (header !== '%PDF') {
        return {
          success: false,
          error: { code: 'FILE_INVALID', message: 'File does not appear to be a valid PDF' },
        };
      }

      // Sanitize entidadNombre and filename
      const sanitizedEntidad = sanitizeFilename(entidadNombre);
      const originalFilename = path.basename(filePath);
      const sanitizedOriginalFilename = sanitizeFilename(originalFilename);

      // Build target path: {userData}/facturas/${tipo}/${sanitizedEntidad}/
      const userDataPath = app.getPath('userData');
      const targetDir = path.join(userDataPath, 'facturas', tipo, sanitizedEntidad);

      // Create directories if they don't exist
      fs.mkdirSync(targetDir, { recursive: true });

      // Build filename: [SanitizedEntidad] - [sanitized_filename].pdf
      const targetFilename = `${sanitizedEntidad}-${sanitizedOriginalFilename}`;
      const targetPath = path.join(targetDir, targetFilename);

      // Copy file
      fs.copyFileSync(filePath, targetPath);

      // Build relative path
      const relativePath = path.join(tipo, sanitizedEntidad, targetFilename);

      // Insert record into facturas_pdf table
      const db = getDatabase();
      const entidadTipo = tipo === 'compra' ? 'proveedor' : 'cliente';

      const stmt = db.prepare(`
        INSERT INTO facturas_pdf (tipo, entidad_id, entidad_tipo, nombre_original, nombre_guardado, ruta_relativa)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(tipo, entidadId, entidadTipo, originalFilename, targetFilename, relativePath);

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
          message: error.message || 'Failed to upload PDF',
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
  ipcMain.handle('facturas:deletePDF', async (event, id) => {
    try {
      if (!id || typeof id !== 'number') {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a number' },
        };
      }

      const db = getDatabase();

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
      const userDataPath = app.getPath('userData');
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
  ipcMain.handle('facturas:getAllForEntidad', async (event, params) => {
    try {
      const { tipo, entidadId } = params;

      if (!tipo || !entidadId) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'tipo and entidadId are required' },
        };
      }

      if (tipo !== 'compra' && tipo !== 'venta') {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'tipo must be "compra" or "venta"' },
        };
      }

      const db = getDatabase();
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
   * Handler: facturas:getPDFBytes
   * Gets PDF file bytes as ArrayBuffer for rendering thumbnails.
   * @param {string} pdfPath - Relative path from facturas_pdf.ruta_relativa
   * @returns {Promise<{ success: boolean, data?: ArrayBuffer, error?: object }>}
   */
  ipcMain.handle('facturas:getPDFBytes', async (event, pdfPath) => {
    try {
      // Validate input
      const validation = validatePDFPath(pdfPath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Build absolute path within userData/facturas/
      const userDataPath = app.getPath('userData');
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

      // Read file as Buffer and convert to ArrayBuffer
      const fileBuffer = fs.readFileSync(absolutePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      return {
        success: true,
        data: arrayBuffer,
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

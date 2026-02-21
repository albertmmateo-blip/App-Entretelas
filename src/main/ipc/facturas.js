const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

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

module.exports = { registerFacturasHandlers };

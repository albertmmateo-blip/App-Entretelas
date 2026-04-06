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

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_COLLISION_ATTEMPTS = 9999;

// Magic byte signatures for supported image formats
const IMAGE_SIGNATURES = [
  { ext: ['.jpg', '.jpeg'], bytes: [0xff, 0xd8, 0xff] },
  { ext: ['.png'], bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: ['.webp'], prefix: [0x52, 0x49, 0x46, 0x46], offset8: [0x57, 0x45, 0x42, 0x50] },
  { ext: ['.bmp'], bytes: [0x42, 0x4d] },
];

function getGuardadoFotosDir() {
  return path.join(app.getPath('userData'), 'guardado_fotos');
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'unnamed';

  let sanitized = filename;
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\\/:*?"<>|#()]/g, '');
  sanitized = sanitized.replace(/\s+/g, '_');
  sanitized = sanitized.toLowerCase();

  if (!sanitized || sanitized.trim() === '') return 'unnamed';
  if (sanitized.length > 200) sanitized = sanitized.substring(0, 200);

  const baseName = sanitized.replace(/\.[^.]*$/, '');
  if (WINDOWS_RESERVED_NAMES.includes(baseName.toUpperCase())) {
    sanitized = `${sanitized}_`;
  }

  return sanitized;
}

function validateImageMagicBytes(buffer, extension) {
  if (!buffer || buffer.length < 4) return false;

  for (const sig of IMAGE_SIGNATURES) {
    if (!sig.ext.includes(extension)) continue;

    if (sig.bytes) {
      const match = sig.bytes.every((b, i) => buffer[i] === b);
      if (match) return true;
    }

    // WebP: RIFF....WEBP
    if (sig.prefix && sig.offset8) {
      const prefixMatch = sig.prefix.every((b, i) => buffer[i] === b);
      const webpMatch = buffer.length >= 12 && sig.offset8.every((b, i) => buffer[8 + i] === b);
      if (prefixMatch && webpMatch) return true;
    }
  }

  return false;
}

function getUniqueStorageName(db, articuloId, sanitizedBase, extension, targetDir) {
  const findExisting = db.prepare(
    'SELECT 1 FROM guardado_articulo_fotos WHERE ruta_relativa = ? LIMIT 1'
  );

  for (let attempt = 0; attempt <= MAX_COLLISION_ATTEMPTS; attempt += 1) {
    const suffix = attempt > 0 ? `_${attempt}` : '';
    const targetFilename = `${sanitizedBase}${suffix}${extension}`;
    const relativePath = path.join(String(articuloId), targetFilename);
    const targetPath = path.join(targetDir, targetFilename);

    if (!fs.existsSync(targetPath) && !findExisting.get(relativePath)) {
      return { targetFilename, targetPath, relativePath };
    }
  }

  throw new Error('Unable to allocate unique photo filename after multiple attempts');
}

function validateFotoPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'path must be a non-empty string' },
    };
  }
  if (relativePath.includes('..') || relativePath.includes('~')) {
    return { valid: false, error: { code: 'INVALID_PATH', message: 'Path traversal not allowed' } };
  }
  return { valid: true };
}

function registerGuardadoFotosHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;
  const fotosDir = deps.fotosDir || getGuardadoFotosDir();

  // ── Upload a photo for a guardado articulo ───────────────────────────
  ipc.handle('guardado:uploadArticuloFoto', async (_event, params) => {
    try {
      const { articulo_id: articuloId, filename, buffer: rawBuffer } = params || {};

      if (!isPositiveInteger(articuloId)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'articulo_id must be a positive integer' },
        };
      }
      if (!filename || typeof filename !== 'string') {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'filename is required' },
        };
      }

      const db = getDb();
      const articulo = db.prepare('SELECT id FROM guardado_articulos WHERE id = ?').get(articuloId);
      if (!articulo) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      const extension = path.extname(filename).toLowerCase();
      if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `File type not allowed. Allowed: ${[...ALLOWED_IMAGE_EXTENSIONS].join(', ')}`,
          },
        };
      }

      const fileBuffer = Buffer.from(rawBuffer);

      if (fileBuffer.length === 0) {
        return { success: false, error: { code: 'INVALID_INPUT', message: 'File is empty' } };
      }
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB`,
          },
        };
      }

      if (!validateImageMagicBytes(fileBuffer, extension)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'File content does not match expected image format',
          },
        };
      }

      const articuloDir = path.join(fotosDir, String(articuloId));
      fs.mkdirSync(articuloDir, { recursive: true });

      const sanitizedBase = sanitizeFilename(path.basename(filename, extension));
      const { targetFilename, targetPath, relativePath } = getUniqueStorageName(
        db,
        articuloId,
        sanitizedBase,
        extension,
        articuloDir
      );

      fs.writeFileSync(targetPath, fileBuffer);

      const result = db
        .prepare(
          'INSERT INTO guardado_articulo_fotos (articulo_id, nombre_original, nombre_guardado, ruta_relativa) VALUES (?, ?, ?, ?)'
        )
        .run(articuloId, filename, targetFilename, relativePath);

      const record = db
        .prepare('SELECT * FROM guardado_articulo_fotos WHERE id = ?')
        .get(result.lastInsertRowid);

      return {
        success: true,
        data: {
          id: record.id,
          articulo_id: record.articulo_id,
          nombre_original: record.nombre_original,
          nombre_guardado: record.nombre_guardado,
          ruta_relativa: record.ruta_relativa,
          fecha_subida: record.fecha_subida,
          fecha_mod: record.fecha_mod,
        },
      };
    } catch (error) {
      console.error('Error in guardado:uploadArticuloFoto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ── Get all photos for a guardado articulo ───────────────────────────
  ipc.handle('guardado:getArticuloFotos', async (_event, articuloId) => {
    try {
      if (!isPositiveInteger(articuloId)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'articulo_id must be a positive integer' },
        };
      }

      const db = getDb();
      const rows = db
        .prepare(
          'SELECT * FROM guardado_articulo_fotos WHERE articulo_id = ? ORDER BY fecha_subida ASC'
        )
        .all(articuloId);

      return {
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          articulo_id: r.articulo_id,
          nombre_original: r.nombre_original,
          nombre_guardado: r.nombre_guardado,
          ruta_relativa: r.ruta_relativa,
          fecha_subida: r.fecha_subida,
          fecha_mod: r.fecha_mod,
        })),
      };
    } catch (error) {
      console.error('Error in guardado:getArticuloFotos:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ── Get the bytes of a specific guardado photo ───────────────────────
  ipc.handle('guardado:getArticuloFotoBytes', async (_event, relativePath) => {
    try {
      const validation = validateFotoPath(relativePath);
      if (!validation.valid) return { success: false, error: validation.error };

      const fullPath = path.join(fotosDir, relativePath);
      const resolved = path.resolve(fullPath);
      const baseResolved = path.resolve(fotosDir);

      if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) {
        return {
          success: false,
          error: { code: 'INVALID_PATH', message: 'Path traversal not allowed' },
        };
      }

      if (!fs.existsSync(resolved)) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Photo file not found' } };
      }

      const fileBuffer = fs.readFileSync(resolved);
      const cleanBuffer = Uint8Array.from(fileBuffer).buffer;

      return { success: true, data: cleanBuffer };
    } catch (error) {
      console.error('Error in guardado:getArticuloFotoBytes:', error);
      return { success: false, error: { code: 'FILE_ERROR', message: error.message } };
    }
  });

  // ── Delete a guardado photo ──────────────────────────────────────────
  ipc.handle('guardado:deleteArticuloFoto', async (_event, fotoId) => {
    try {
      if (!isPositiveInteger(fotoId)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const record = db.prepare('SELECT * FROM guardado_articulo_fotos WHERE id = ?').get(fotoId);
      if (!record) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Photo record not found' } };
      }

      const fullPath = path.join(fotosDir, record.ruta_relativa);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      const articuloDir = path.dirname(fullPath);
      try {
        const remaining = fs.readdirSync(articuloDir);
        if (remaining.length === 0) {
          fs.rmdirSync(articuloDir);
        }
      } catch {
        // Directory cleanup is best-effort
      }

      db.prepare('DELETE FROM guardado_articulo_fotos WHERE id = ?').run(fotoId);

      return { success: true };
    } catch (error) {
      console.error('Error in guardado:deleteArticuloFoto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  // ── Clean up photo files when a guardado articulo is deleted ─────────
  ipc.handle('guardado:cleanupArticuloFotos', async (_event, articuloId) => {
    try {
      if (!isPositiveInteger(articuloId)) return { success: true };

      const articuloDir = path.join(fotosDir, String(articuloId));

      if (fs.existsSync(articuloDir)) {
        fs.rmSync(articuloDir, { recursive: true, force: true });
      }

      const db = getDb();
      db.prepare('DELETE FROM guardado_articulo_fotos WHERE articulo_id = ?').run(articuloId);

      return { success: true };
    } catch (error) {
      console.error('Error in guardado:cleanupArticuloFotos:', error);
      return { success: true };
    }
  });
}

module.exports = { registerGuardadoFotosHandlers };

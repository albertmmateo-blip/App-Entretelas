import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../helpers/db';

let tmpDir;
const mockHandlers = {};
const mockIpcMain = {
  handle: vi.fn((channel, handler) => {
    mockHandlers[channel] = handler;
  }),
  removeHandler: vi.fn((channel) => {
    delete mockHandlers[channel];
  }),
};

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  app: {
    getPath: () => tmpDir,
  },
}));

let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

// A tiny valid JPEG (2x1 pixel)
function makeTestJpeg() {
  // Minimal JFIF: FF D8 FF E0 … then FF D9
  // Smallest valid JPEG that passes magic-byte check.
  const hex =
    'ffd8ffe000104a46494600010100000100010000' +
    'ffdb004300080606070605080707070909080a0c' +
    '140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c' +
    '20242e2720222c231c1c2837292c30313434341f' +
    '27393d38323c2e333432ffc0000b080001000201' +
    '011100ffc4001f000001050101010101010000000' +
    '0000000000102030405060708090a0bffc4001f01' +
    '0003010101010101010101000000000000010203' +
    '0405060708090a0bffda000c03010002110311003' +
    'f00fb50b2a14001ffd9';
  return Buffer.from(hex, 'hex');
}

// PNG 1x1 pixel
function makeTestPng() {
  const hex =
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c626000000002000198e195280000000049454e44ae426082';
  return Buffer.from(hex, 'hex');
}

describe('Stock Fotos IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-fotos-test-'));

    db = createTestDb();
    mockDb = db;

    // Register stock handlers first (to create articles)
    const { registerStockHandlers } = await import('../../src/main/ipc/stock');
    registerStockHandlers({ ipcMain: mockIpcMain, getDatabase: () => db });

    const { registerStockFotosHandlers } = await import('../../src/main/ipc/stockFotos');
    registerStockFotosHandlers({ ipcMain: mockIpcMain, getDatabase: () => db });
  });

  afterEach(() => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });
    if (db) db.close();

    // Clean up temp directory
    try {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {
      // best-effort
    }
  });

  async function createArticulo() {
    const famRes = await mockHandlers['stock:createFamilia'](null, {
      nombre: 'Test Familia',
      codigo: 'TF-01',
    });
    const prodRes = await mockHandlers['stock:createProducto'](null, {
      familia_id: famRes.data.id,
      nombre: 'Test Producto',
    });
    const artRes = await mockHandlers['stock:createArticulo'](null, {
      producto_id: prodRes.data.id,
      nombre: 'Coralina Cuadro Beige/Crudo',
      color: 'Beige',
      cantidad: 5,
    });
    return artRes.data;
  }

  it('uploads a photo and creates DB record + file on disk', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const res = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'My Photo.jpg',
      buffer: jpegBuf.buffer,
    });

    expect(res.success).toBe(true);
    expect(res.data.articulo_id).toBe(article.id);
    expect(res.data.nombre_original).toBe('My Photo.jpg');
    expect(res.data.ruta_relativa).toContain(String(article.id));

    // File should exist on disk
    const fullPath = path.join(tmpDir, 'stock_fotos', res.data.ruta_relativa);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  it('lists photos for an articulo', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'photo1.jpg',
      buffer: jpegBuf.buffer,
    });

    const res = await mockHandlers['stock:getArticuloFotos'](null, article.id);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].nombre_original).toBe('photo1.jpg');
  });

  it('reads photo bytes', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const uploadRes = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'pic.jpg',
      buffer: jpegBuf.buffer,
    });

    const bytesRes = await mockHandlers['stock:getArticuloFotoBytes'](
      null,
      uploadRes.data.ruta_relativa
    );
    expect(bytesRes.success).toBe(true);
    expect(bytesRes.data.byteLength).toBeGreaterThan(0);
  });

  it('deletes a photo and removes file from disk', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const uploadRes = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'del.jpg',
      buffer: jpegBuf.buffer,
    });

    const fullPath = path.join(tmpDir, 'stock_fotos', uploadRes.data.ruta_relativa);
    expect(fs.existsSync(fullPath)).toBe(true);

    const delRes = await mockHandlers['stock:deleteArticuloFoto'](null, uploadRes.data.id);
    expect(delRes.success).toBe(true);
    expect(fs.existsSync(fullPath)).toBe(false);
  });

  it('getTree returns has_foto=true only for articles with photos', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    // Before upload: has_foto should be false
    let tree = await mockHandlers['stock:getTree'](null);
    const findArticle = (t) => {
      for (const fam of t.data) {
        for (const prod of fam.products) {
          for (const art of prod.articles) {
            if (art.id === article.id) return art;
          }
        }
      }
      return null;
    };

    expect(findArticle(tree).has_foto).toBe(false);

    // After upload: has_foto should be true
    await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'test.jpg',
      buffer: jpegBuf.buffer,
    });

    tree = await mockHandlers['stock:getTree'](null);
    expect(findArticle(tree).has_foto).toBe(true);
  });

  it('rejects files with invalid extension', async () => {
    const article = await createArticulo();
    const buf = Buffer.from('not an image');

    const res = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'script.exe',
      buffer: buf.buffer,
    });

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_INPUT');
  });

  it('rejects files that exceed size limit', async () => {
    const article = await createArticulo();
    // Create a buffer larger than 10 MB with JPEG header
    const bigBuf = Buffer.alloc(11 * 1024 * 1024);
    bigBuf[0] = 0xff;
    bigBuf[1] = 0xd8;
    bigBuf[2] = 0xff;

    const res = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'huge.jpg',
      buffer: bigBuf.buffer,
    });

    expect(res.success).toBe(false);
    expect(res.error.message).toContain('maximum size');
  });

  it('rejects files with mismatched magic bytes', async () => {
    const article = await createArticulo();
    const fakeBuf = Buffer.from('This is not a JPEG file at all');

    const res = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'fake.jpg',
      buffer: fakeBuf.buffer,
    });

    expect(res.success).toBe(false);
    expect(res.error.message).toContain('does not match');
  });

  it('accepts PNG files', async () => {
    const article = await createArticulo();
    const pngBuf = makeTestPng();

    const res = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'icon.png',
      buffer: pngBuf.buffer,
    });

    expect(res.success).toBe(true);
    expect(res.data.nombre_original).toBe('icon.png');
  });

  it('cleans up photo files when articulo is deleted', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const uploadRes = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'cleanup.jpg',
      buffer: jpegBuf.buffer,
    });

    const fullPath = path.join(tmpDir, 'stock_fotos', uploadRes.data.ruta_relativa);
    expect(fs.existsSync(fullPath)).toBe(true);

    // Delete the articulo
    await mockHandlers['stock:deleteArticulo'](null, article.id);

    // Photo file should be removed
    expect(fs.existsSync(fullPath)).toBe(false);
  });

  it('rejects upload for non-existent articulo', async () => {
    const jpegBuf = makeTestJpeg();

    const res = await mockHandlers['stock:uploadArticuloFoto'](null, {
      articulo_id: 99999,
      filename: 'orphan.jpg',
      buffer: jpegBuf.buffer,
    });

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('NOT_FOUND');
  });

  it('prevents path traversal in getArticuloFotoBytes', async () => {
    const res = await mockHandlers['stock:getArticuloFotoBytes'](null, '../../etc/passwd');
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PATH');
  });
});

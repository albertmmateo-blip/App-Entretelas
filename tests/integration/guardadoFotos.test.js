import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../helpers/db';

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
  app: { getPath: () => '' },
}));

let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

// A tiny valid JPEG (2x1 pixel)
function makeTestJpeg() {
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
  const buf = Buffer.from(hex, 'hex');
  // Return a clean ArrayBuffer (not sharing the Buffer pool)
  return Uint8Array.from(buf);
}

describe('Guardado Fotos IPC Handlers', () => {
  let db;
  let tmpDir;

  beforeEach(async () => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guardado-fotos-test-'));

    db = createTestDb();
    mockDb = db;

    // Register guardado handlers (to create articles)
    const { registerGuardadoHandlers } = await import('../../src/main/ipc/guardado');
    registerGuardadoHandlers({ ipcMain: mockIpcMain, getDatabase: () => db });

    // Register guardado fotos handlers with injected deps
    const { registerGuardadoFotosHandlers } = await import('../../src/main/ipc/guardadoFotos');
    registerGuardadoFotosHandlers({
      ipcMain: mockIpcMain,
      getDatabase: () => db,
      fotosDir: path.join(tmpDir, 'guardado_fotos'),
    });
  });

  afterEach(() => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });
    if (db) db.close();

    try {
      if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {
      // best-effort
    }
  });

  async function createArticulo() {
    const prodRes = await mockHandlers['guardado:createProducto'](null, {
      nombre: 'Cañamazo',
    });
    expect(prodRes.success).toBe(true);

    const artRes = await mockHandlers['guardado:createArticulo'](null, {
      producto_id: prodRes.data.id,
      nombre: 'Cañamazo Beige',
    });
    expect(artRes.success).toBe(true);
    return artRes.data;
  }

  it('uploads a JPEG photo and creates DB record + file on disk', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const res = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'Mi Foto.jpg',
      buffer: jpegBuf.buffer,
    });

    expect(res).toEqual(expect.objectContaining({ success: true }));
    expect(res.data.articulo_id).toBe(article.id);
    expect(res.data.nombre_original).toBe('Mi Foto.jpg');
    expect(res.data.ruta_relativa).toContain(String(article.id));

    // File should exist on disk
    const fullPath = path.join(tmpDir, 'guardado_fotos', res.data.ruta_relativa);
    expect(fs.existsSync(fullPath)).toBe(true);

    // File content should match the original
    const diskContent = fs.readFileSync(fullPath);
    expect(diskContent.length).toBe(jpegBuf.length);
  });

  it('lists photos for an articulo', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'photo1.jpg',
      buffer: jpegBuf.buffer,
    });

    const res = await mockHandlers['guardado:getArticuloFotos'](null, article.id);
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].nombre_original).toBe('photo1.jpg');
  });

  it('reads photo bytes back correctly', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const uploadRes = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'pic.jpg',
      buffer: jpegBuf.buffer,
    });

    const bytesRes = await mockHandlers['guardado:getArticuloFotoBytes'](
      null,
      uploadRes.data.ruta_relativa
    );
    expect(bytesRes.success).toBe(true);
    expect(bytesRes.data.byteLength).toBe(jpegBuf.length);

    // Verify the bytes are identical
    const returned = new Uint8Array(bytesRes.data);
    const original = new Uint8Array(jpegBuf.buffer);
    expect(returned).toEqual(original);
  });

  it('deletes a photo and removes file from disk', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const uploadRes = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'del.jpg',
      buffer: jpegBuf.buffer,
    });

    const fullPath = path.join(tmpDir, 'guardado_fotos', uploadRes.data.ruta_relativa);
    expect(fs.existsSync(fullPath)).toBe(true);

    const delRes = await mockHandlers['guardado:deleteArticuloFoto'](null, uploadRes.data.id);
    expect(delRes.success).toBe(true);
    expect(fs.existsSync(fullPath)).toBe(false);
  });

  it('rejects upload for non-existent articulo', async () => {
    const jpegBuf = makeTestJpeg();

    const res = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: 99999,
      filename: 'test.jpg',
      buffer: jpegBuf.buffer,
    });

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('NOT_FOUND');
  });

  it('rejects upload with disallowed extension', async () => {
    const article = await createArticulo();
    const buf = Buffer.from('fake data');

    const res = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'malware.exe',
      buffer: buf.buffer,
    });

    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_INPUT');
  });

  it('handles filename collision gracefully', async () => {
    const article = await createArticulo();
    const jpegBuf = makeTestJpeg();

    const res1 = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'photo.jpg',
      buffer: jpegBuf.buffer,
    });
    expect(res1.success).toBe(true);

    const res2 = await mockHandlers['guardado:uploadArticuloFoto'](null, {
      articulo_id: article.id,
      filename: 'photo.jpg',
      buffer: jpegBuf.buffer,
    });
    expect(res2.success).toBe(true);
    expect(res2.data.nombre_guardado).not.toBe(res1.data.nombre_guardado);
  });
});

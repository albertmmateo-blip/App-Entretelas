import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestDb } from '../helpers/db';

// Mock electron's ipcMain and app
const mockHandlers = {};
const mockUserDataPath = path.join(os.tmpdir(), `test-facturas-${Date.now()}`);
const mockIpcMain = {
  handle: vi.fn((channel, handler) => {
    mockHandlers[channel] = handler;
  }),
  removeHandler: vi.fn((channel) => {
    delete mockHandlers[channel];
  }),
};
const mockApp = {
  getPath: vi.fn(() => mockUserDataPath),
};

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  app: mockApp,
  shell: {},
}));

let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

describe('Facturas IPC Handlers', () => {
  let db;
  let testPDFPath;
  let testProviderId;

  beforeEach(async () => {
    // Create test database
    db = createTestDb();
    mockDb = db;

    // Create test userData directory
    if (!fs.existsSync(mockUserDataPath)) {
      fs.mkdirSync(mockUserDataPath, { recursive: true });
    }

    // Create a test PDF file
    testPDFPath = path.join(mockUserDataPath, 'test-invoice.pdf');
    // Create a valid PDF with %PDF header
    const pdfHeader = Buffer.from('%PDF-1.4\n%Test PDF content\n');
    fs.writeFileSync(testPDFPath, pdfHeader);

    // Insert a test proveedor
    const proveedorStmt = db.prepare(`
      INSERT INTO proveedores (razon_social, direccion, nif)
      VALUES (?, ?, ?)
    `);
    const result = proveedorStmt.run('Test Proveedor', 'Test Address', '12345678A');
    testProviderId = result.lastInsertRowid;

    // Register handlers
    const { registerFacturasHandlers } = await import('../../src/main/ipc/facturas');
    registerFacturasHandlers({
      ipcMain: mockIpcMain,
      getDatabase: () => db,
      app: mockApp,
    });
  });

  afterEach(() => {
    // Clear all handlers
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    // Close database
    if (db) {
      db.close();
    }

    // Clean up test files
    if (fs.existsSync(mockUserDataPath)) {
      fs.rmSync(mockUserDataPath, { recursive: true, force: true });
    }
  });

  describe('facturas:uploadPDF', () => {
    it('should upload a valid PDF file', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      expect(handler).toBeDefined();

      const params = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      };

      const response = await handler(null, params);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.ruta_relativa).toContain('compra');
      expect(response.data.ruta_relativa).toContain('test_proveedor');

      // Verify database record
      const record = db.prepare('SELECT * FROM facturas_pdf WHERE id = ?').get(response.data.id);
      expect(record).toBeDefined();
      expect(record.tipo).toBe('compra');
      expect(record.entidad_id).toBe(testProviderId);
      expect(record.entidad_tipo).toBe('proveedor');
    });

    it('should return error for missing parameters', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const response = await handler(null, {});

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return error for invalid tipo', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const params = {
        tipo: 'invalid',
        entidadId: testProviderId,
        entidadNombre: 'Test',
        filePath: testPDFPath,
      };

      const response = await handler(null, params);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return FILE_NOT_FOUND for non-existent file', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const params = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test',
        filePath: '/nonexistent/file.pdf',
      };

      const response = await handler(null, params);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should return FILE_INVALID for unsupported file extension', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const exePath = path.join(mockUserDataPath, 'test.exe');
      fs.writeFileSync(exePath, 'not supported');

      const params = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test',
        filePath: exePath,
      };

      const response = await handler(null, params);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FILE_INVALID');
    });

    it('should return FILE_TOO_LARGE for files over 50MB', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const largePath = path.join(mockUserDataPath, 'large.pdf');

      // Create a file larger than 50MB (just write the header and set size in stats check)
      // For testing, we'll create a smaller file but this tests the logic
      const largeBuffer = Buffer.alloc(52428801); // 50MB + 1 byte
      largeBuffer.write('%PDF-1.4\n', 0);
      fs.writeFileSync(largePath, largeBuffer);

      const params = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test',
        filePath: largePath,
      };

      const response = await handler(null, params);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FILE_TOO_LARGE');
    });

    it('should return FILE_INVALID for file without PDF header', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const fakePDFPath = path.join(mockUserDataPath, 'fake.pdf');
      fs.writeFileSync(fakePDFPath, 'Not a real PDF');

      const params = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test',
        filePath: fakePDFPath,
      };

      const response = await handler(null, params);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FILE_INVALID');
      expect(response.error.message).toContain('valid PDF');
    });

    it('should sanitize filenames with special characters', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const specialPath = path.join(mockUserDataPath, 'special.pdf');
      fs.writeFileSync(specialPath, Buffer.from('%PDF-1.4\nTest'));

      const params = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Special:Name*Test',
        filePath: specialPath,
      };

      const response = await handler(null, params);

      expect(response.success).toBe(true);
      expect(response.data.ruta_relativa).toContain('specialnametest');
      expect(response.data.ruta_relativa).not.toContain('*');
      expect(response.data.ruta_relativa).not.toContain(':');
    });

    it('should upload Office files to contabilidad without entidad folder', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];
      const officePath = path.join(mockUserDataPath, 'resumen.xlsx');
      fs.writeFileSync(officePath, 'excel-bytes');

      const response = await handler(null, {
        tipo: 'contabilidad',
        filePath: officePath,
      });

      expect(response.success).toBe(true);
      expect(response.data.ruta_relativa).toContain(path.join('contabilidad', 'resumen.xlsx'));
      expect(response.data.ruta_relativa).not.toContain(
        path.join('contabilidad', 'test_proveedor')
      );

      const record = db.prepare('SELECT * FROM facturas_pdf WHERE id = ?').get(response.data.id);
      expect(record.tipo).toBe('contabilidad');
      expect(record.entidad_id).toBe(0);
    });

    it('should reject PDF uploads in top-level contabilidad section', async () => {
      const handler = mockHandlers['facturas:uploadPDF'];

      const response = await handler(null, {
        tipo: 'contabilidad',
        filePath: testPDFPath,
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FILE_INVALID');
    });
  });

  describe('facturas:deletePDF', () => {
    it('should delete PDF file and database record', async () => {
      // First upload a PDF
      const uploadHandler = mockHandlers['facturas:uploadPDF'];
      const uploadParams = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      };
      const uploadResponse = await uploadHandler(null, uploadParams);
      expect(uploadResponse.success).toBe(true);
      const pdfId = uploadResponse.data.id;

      // Now delete it
      const deleteHandler = mockHandlers['facturas:deletePDF'];
      const deleteResponse = await deleteHandler(null, pdfId);

      expect(deleteResponse.success).toBe(true);

      // Verify database record is deleted
      const record = db.prepare('SELECT * FROM facturas_pdf WHERE id = ?').get(pdfId);
      expect(record).toBeUndefined();
    });

    it('should return error for invalid id', async () => {
      const handler = mockHandlers['facturas:deletePDF'];
      const response = await handler(null, null);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return error for non-existent PDF', async () => {
      const handler = mockHandlers['facturas:deletePDF'];
      const response = await handler(null, 99999);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should succeed even if file was manually deleted', async () => {
      // First upload a PDF
      const uploadHandler = mockHandlers['facturas:uploadPDF'];
      const uploadParams = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      };
      const uploadResponse = await uploadHandler(null, uploadParams);
      expect(uploadResponse.success).toBe(true);
      const pdfId = uploadResponse.data.id;

      // Manually delete the file
      const record = db.prepare('SELECT * FROM facturas_pdf WHERE id = ?').get(pdfId);
      const fullPath = path.join(mockUserDataPath, 'facturas', record.ruta_relativa);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // Now try to delete via handler
      const deleteHandler = mockHandlers['facturas:deletePDF'];
      const deleteResponse = await deleteHandler(null, pdfId);

      expect(deleteResponse.success).toBe(true);
    });
  });

  describe('facturas:getAllForEntidad', () => {
    it('should return all PDFs for an entidad', async () => {
      // Upload two PDFs
      const uploadHandler = mockHandlers['facturas:uploadPDF'];
      const params1 = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      };
      await uploadHandler(null, params1);

      // Create another PDF
      const testPDFPath2 = path.join(mockUserDataPath, 'test-invoice-2.pdf');
      fs.writeFileSync(testPDFPath2, Buffer.from('%PDF-1.4\nTest 2'));
      const params2 = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath2,
      };
      await uploadHandler(null, params2);

      // Get all PDFs
      const handler = mockHandlers['facturas:getAllForEntidad'];
      const response = await handler(null, { tipo: 'compra', entidadId: testProviderId });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].entidad_id).toBe(testProviderId);
      expect(response.data[1].entidad_id).toBe(testProviderId);
    });

    it('should return empty array if no PDFs found', async () => {
      const handler = mockHandlers['facturas:getAllForEntidad'];
      const response = await handler(null, { tipo: 'compra', entidadId: testProviderId });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(0);
    });

    it('should return error for missing parameters', async () => {
      const handler = mockHandlers['facturas:getAllForEntidad'];
      const response = await handler(null, {});

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return error for invalid tipo', async () => {
      const handler = mockHandlers['facturas:getAllForEntidad'];
      const response = await handler(null, { tipo: 'invalid', entidadId: testProviderId });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return top-level contabilidad files without entidadId', async () => {
      const uploadHandler = mockHandlers['facturas:uploadPDF'];
      const officePath = path.join(mockUserDataPath, 'presupuesto.docx');
      fs.writeFileSync(officePath, 'docx-bytes');

      await uploadHandler(null, {
        tipo: 'contabilidad',
        filePath: officePath,
      });

      const handler = mockHandlers['facturas:getAllForEntidad'];
      const response = await handler(null, { tipo: 'contabilidad' });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].tipo).toBe('contabilidad');
    });
  });

  describe('facturas:getStatsByTipo', () => {
    it('should return grouped counts and importe totals by entidad', async () => {
      const uploadHandler = mockHandlers['facturas:uploadPDF'];

      const uploadResponseA = await uploadHandler(null, {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      });

      const uploadResponseB = await uploadHandler(null, {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      });

      expect(uploadResponseA.success).toBe(true);
      expect(uploadResponseB.success).toBe(true);

      const updateHandler = mockHandlers['facturas:updatePDFMetadata'];
      await updateHandler(null, uploadResponseA.data.id, {
        fecha: '2026-04-01',
        importe: '100.00',
        importeIvaRe: '121.60',
        vencimiento: '2026-04-30',
        pagada: false,
      });
      await updateHandler(null, uploadResponseB.data.id, {
        fecha: '2026-04-01',
        importe: '50.00',
        importeIvaRe: '60.50',
        vencimiento: '2026-04-30',
        pagada: false,
      });

      const statsHandler = mockHandlers['facturas:getStatsByTipo'];
      const response = await statsHandler(null, { tipo: 'compra' });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].entityId).toBe(testProviderId);
      expect(response.data[0].fileCount).toBe(2);
      expect(response.data[0].totalImporteIvaRe).toBeCloseTo(182.1, 5);
    });

    it('should return INVALID_INPUT for missing tipo', async () => {
      const statsHandler = mockHandlers['facturas:getStatsByTipo'];
      const response = await statsHandler(null, {});

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('facturas:updatePDFMetadata', () => {
    it('should update invoice metadata and payment status', async () => {
      const uploadHandler = mockHandlers['facturas:uploadPDF'];
      const uploadResponse = await uploadHandler(null, {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      });

      expect(uploadResponse.success).toBe(true);

      const handler = mockHandlers['facturas:updatePDFMetadata'];
      const response = await handler(null, uploadResponse.data.id, {
        fecha: '2026-04-01',
        importe: '100.50',
        importeIvaRe: '121.60',
        vencimiento: '2026-04-30',
        pagada: true,
      });

      expect(response.success).toBe(true);
      expect(response.data.fecha).toBe('2026-04-01');
      expect(response.data.importe).toBe(100.5);
      expect(response.data.importe_iva_re).toBe(121.6);
      expect(response.data.vencimiento).toBe('2026-04-30');
      expect(response.data.pagada).toBe(1);
    });

    it('should return INVALID_INPUT for invalid fecha format', async () => {
      const handler = mockHandlers['facturas:updatePDFMetadata'];
      const response = await handler(null, 1, {
        fecha: '30/04/2026',
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return INVALID_INPUT for invalid vencimiento format', async () => {
      const handler = mockHandlers['facturas:updatePDFMetadata'];
      const response = await handler(null, 1, {
        vencimiento: '30/04/2026',
      });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('facturas:getPDFBytes', () => {
    it('should return PDF bytes as ArrayBuffer', async () => {
      // First upload a PDF
      const uploadHandler = mockHandlers['facturas:uploadPDF'];
      const uploadParams = {
        tipo: 'compra',
        entidadId: testProviderId,
        entidadNombre: 'Test Proveedor',
        filePath: testPDFPath,
      };
      const uploadResponse = await uploadHandler(null, uploadParams);
      expect(uploadResponse.success).toBe(true);

      // Now get PDF bytes
      const handler = mockHandlers['facturas:getPDFBytes'];
      const response = await handler(null, uploadResponse.data.ruta_relativa);

      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(ArrayBuffer);
      expect(response.data.byteLength).toBeGreaterThan(0);
    });

    it('should return error for path traversal attempt', async () => {
      const handler = mockHandlers['facturas:getPDFBytes'];
      const response = await handler(null, '../../../etc/passwd');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_PATH');
    });

    it('should return error for non-existent file', async () => {
      const handler = mockHandlers['facturas:getPDFBytes'];
      const response = await handler(null, 'compra/test/nonexistent.pdf');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('FILE_NOT_FOUND');
    });

    it('should return error for invalid input', async () => {
      const handler = mockHandlers['facturas:getPDFBytes'];
      const response = await handler(null, null);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });
});

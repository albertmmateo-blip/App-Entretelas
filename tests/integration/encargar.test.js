import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, seedTestData } from '../helpers/db';
import { createEncargar } from '../fixtures/sample-data';

// Mock electron's ipcMain BEFORE any imports that might use it
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
}));

// Mock the database connection module
let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

describe('Encargar IPC Handlers', () => {
  let db;

  const createProveedorFolder = (overrides = {}) => {
    const payload = {
      razon_social: 'Proveedor Carpeta',
      direccion: null,
      nif: null,
      ...overrides,
    };

    const result = db
      .prepare('INSERT INTO proveedores (razon_social, direccion, nif) VALUES (?, ?, ?)')
      .run(payload.razon_social, payload.direccion, payload.nif);

    return Number(result.lastInsertRowid);
  };

  beforeEach(async () => {
    // Clear handlers from previous tests
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    // Create test database
    db = createTestDb();
    mockDb = db;

    // Register handlers
    const { registerEncargarHandlers } = await import('../../src/main/ipc/encargar');
    registerEncargarHandlers({
      ipcMain: mockIpcMain,
      getDatabase: () => db,
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
  });

  describe('encargar:getAll', () => {
    it('should return all encargar entries', async () => {
      // Seed test data
      const testEncargar = [
        createEncargar({ articulo: 'Artículo 1' }),
        createEncargar({ articulo: 'Artículo 2' }),
        createEncargar({ articulo: 'Artículo 3' }),
      ];
      seedTestData(db, 'encargar', testEncargar);

      // Call handler
      const handler = mockHandlers['encargar:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(3);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('articulo');
      expect(response.data[0]).toHaveProperty('fecha_creacion');
    });

    it('should return empty array when no encargar entries exist', async () => {
      const handler = mockHandlers['encargar:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });

  describe('encargar:create', () => {
    it('should create an encargar entry with valid data', async () => {
      const proveedorId = createProveedorFolder({ razon_social: 'Test Supplier' });
      const encargarData = createEncargar({
        articulo: 'New Product',
        proveedor_id: proveedorId,
        urgente: true,
      });

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.articulo).toBe('New Product');
      expect(response.data.proveedor).toBe('Test Supplier');
      expect(response.data.proveedor_id).toBe(proveedorId);
      expect(response.data.urgente).toBe(1);

      // Verify in database
      const encargar = db.prepare('SELECT * FROM encargar WHERE id = ?').get(response.data.id);
      expect(encargar).toBeDefined();
      expect(encargar.articulo).toBe('New Product');
    });

    it('should create an encargar entry with required fields', async () => {
      const proveedorId = createProveedorFolder({ razon_social: 'Proveedor mínimo' });
      const encargarData = { articulo: 'Minimal Product', proveedor_id: proveedorId };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(true);
      expect(response.data.articulo).toBe('Minimal Product');
      expect(response.data.proveedor_id).toBe(proveedorId);
      expect(response.data.ref_interna).toBeNull();
      expect(response.data.descripcion).toBeNull();
      expect(response.data.proveedor).toBe('Proveedor mínimo');
      expect(response.data.ref_proveedor).toBeNull();
    });

    it('should fail when proveedor_id is missing', async () => {
      const encargarData = { articulo: 'Valid Product' };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('proveedor_id is required');
    });

    it('should fail when articulo is missing', async () => {
      const proveedorId = createProveedorFolder({ razon_social: 'Test Supplier' });
      const encargarData = { proveedor_id: proveedorId };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('articulo is required');
    });

    it('should fail when articulo is empty string', async () => {
      const proveedorId = createProveedorFolder();
      const encargarData = { articulo: '   ', proveedor_id: proveedorId };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should fail when articulo exceeds 255 characters', async () => {
      const proveedorId = createProveedorFolder();
      const encargarData = { articulo: 'a'.repeat(256), proveedor_id: proveedorId };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255 characters');
    });

    it('should fail when ref_interna exceeds 255 characters', async () => {
      const proveedorId = createProveedorFolder();
      const encargarData = {
        articulo: 'Valid Product',
        proveedor_id: proveedorId,
        ref_interna: 'a'.repeat(256),
      };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('ref_interna');
    });

    it('should fail when descripcion exceeds 5000 characters', async () => {
      const proveedorId = createProveedorFolder();
      const encargarData = {
        articulo: 'Valid Product',
        proveedor_id: proveedorId,
        descripcion: 'a'.repeat(5001),
      };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('5000 characters');
    });

    it('should fail when proveedor exceeds 255 characters', async () => {
      const proveedorId = createProveedorFolder();
      const encargarData = {
        articulo: 'Valid Product',
        proveedor_id: proveedorId,
        proveedor: 'a'.repeat(256),
      };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('proveedor');
    });

    it('should fail when ref_proveedor exceeds 255 characters', async () => {
      const proveedorId = createProveedorFolder();
      const encargarData = {
        articulo: 'Valid Product',
        proveedor_id: proveedorId,
        ref_proveedor: 'a'.repeat(256),
      };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('ref_proveedor');
    });

    it('should trim whitespace from string fields', async () => {
      const proveedorId = createProveedorFolder({ razon_social: 'Supplier' });
      const encargarData = {
        articulo: '  Product Name  ',
        proveedor_id: proveedorId,
        ref_interna: '  REF-001  ',
      };

      const handler = mockHandlers['encargar:create'];
      const response = await handler(null, encargarData);

      expect(response.success).toBe(true);
      expect(response.data.articulo).toBe('Product Name');
      expect(response.data.ref_interna).toBe('REF-001');
      expect(response.data.proveedor).toBe('Supplier');
    });
  });

  describe('encargar:update', () => {
    it('should update an existing encargar entry', async () => {
      const proveedorOriginalId = createProveedorFolder({ razon_social: 'Original Supplier' });
      const proveedorNuevoId = createProveedorFolder({ razon_social: 'New Supplier' });
      // Create initial entry
      const testEncargar = [
        createEncargar({ articulo: 'Original Product', proveedor_id: proveedorOriginalId }),
      ];
      seedTestData(db, 'encargar', testEncargar);
      const existing = db.prepare('SELECT * FROM encargar').get();

      // Update entry
      const updateData = {
        articulo: 'Updated Product',
        proveedor_id: proveedorNuevoId,
      };

      const handler = mockHandlers['encargar:update'];
      const response = await handler(null, existing.id, updateData);

      expect(response.success).toBe(true);
      expect(response.data.articulo).toBe('Updated Product');
      expect(response.data.proveedor).toBe('New Supplier');
      expect(response.data.proveedor_id).toBe(proveedorNuevoId);

      // Verify in database
      const updated = db.prepare('SELECT * FROM encargar WHERE id = ?').get(existing.id);
      expect(updated.articulo).toBe('Updated Product');
    });

    it('should update only provided fields', async () => {
      const proveedorId = createProveedorFolder({ razon_social: 'Original Supplier' });
      // Create initial entry
      const testEncargar = [
        createEncargar({
          articulo: 'Original Product',
          ref_interna: 'REF-001',
          proveedor: 'Original Supplier',
          proveedor_id: proveedorId,
        }),
      ];
      seedTestData(db, 'encargar', testEncargar);
      const existing = db.prepare('SELECT * FROM encargar').get();

      // Update only articulo
      const updateData = { articulo: 'Updated Product' };

      const handler = mockHandlers['encargar:update'];
      const response = await handler(null, existing.id, updateData);

      expect(response.success).toBe(true);
      expect(response.data.articulo).toBe('Updated Product');
      expect(response.data.ref_interna).toBe('REF-001'); // Should remain unchanged
      expect(response.data.proveedor).toBe('Original Supplier'); // Should remain unchanged
    });

    it('should toggle urgente flag', async () => {
      const testEncargar = [createEncargar({ urgente: 0 })];
      seedTestData(db, 'encargar', testEncargar);
      const existing = db.prepare('SELECT * FROM encargar').get();

      const handler = mockHandlers['encargar:update'];
      const response = await handler(null, existing.id, { urgente: true });

      expect(response.success).toBe(true);
      expect(response.data.urgente).toBe(1);
    });

    it('should fail when entry does not exist', async () => {
      const handler = mockHandlers['encargar:update'];
      const response = await handler(null, 999, { articulo: 'Test' });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should fail when id is invalid', async () => {
      const handler = mockHandlers['encargar:update'];
      const response = await handler(null, 'invalid', { articulo: 'Test' });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return unchanged entry when no updates provided', async () => {
      const testEncargar = [createEncargar({ articulo: 'Original Product' })];
      seedTestData(db, 'encargar', testEncargar);
      const existing = db.prepare('SELECT * FROM encargar').get();

      const handler = mockHandlers['encargar:update'];
      const response = await handler(null, existing.id, {});

      expect(response.success).toBe(true);
      expect(response.data.articulo).toBe('Original Product');
    });
  });

  describe('encargar:delete', () => {
    it('should delete an existing encargar entry', async () => {
      // Create entry
      const testEncargar = [createEncargar({ articulo: 'To Delete' })];
      seedTestData(db, 'encargar', testEncargar);
      const existing = db.prepare('SELECT * FROM encargar').get();

      // Delete entry
      const handler = mockHandlers['encargar:delete'];
      const response = await handler(null, existing.id);

      expect(response.success).toBe(true);

      // Verify deletion
      const deleted = db.prepare('SELECT * FROM encargar WHERE id = ?').get(existing.id);
      expect(deleted).toBeUndefined();
    });

    it('should fail when entry does not exist', async () => {
      const handler = mockHandlers['encargar:delete'];
      const response = await handler(null, 999);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should fail when id is invalid', async () => {
      const handler = mockHandlers['encargar:delete'];
      const response = await handler(null, 'invalid');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });
});

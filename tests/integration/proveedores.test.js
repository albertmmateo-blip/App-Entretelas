import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, seedTestData } from '../helpers/db';
import { createProveedor } from '../fixtures/sample-data';

// Mock electron's ipcMain
const mockHandlers = {};
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel, handler) => {
      mockHandlers[channel] = handler;
    }),
    removeHandler: vi.fn((channel) => {
      delete mockHandlers[channel];
    }),
  },
}));

describe('Proveedores IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    // Create test database
    db = createTestDb();

    // Mock getDatabase to return our test database
    const connectionModule = await import('../../src/main/db/connection');
    connectionModule.getDatabase = () => db;

    // Register handlers
    const { registerProveedoresHandlers } = await import('../../src/main/ipc/proveedores');
    registerProveedoresHandlers();
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

  describe('proveedores:getAll', () => {
    it('should return all proveedores sorted by razon_social', async () => {
      // Seed test data
      const testProveedores = [
        createProveedor({ razon_social: 'Proveedor C' }),
        createProveedor({ razon_social: 'Proveedor A' }),
        createProveedor({ razon_social: 'Proveedor B' }),
      ];
      seedTestData(db, 'proveedores', testProveedores);

      // Call handler
      const handler = mockHandlers['proveedores:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(3);
      // Should be sorted by razon_social ASC
      expect(response.data[0].razon_social).toBe('Proveedor A');
      expect(response.data[1].razon_social).toBe('Proveedor B');
      expect(response.data[2].razon_social).toBe('Proveedor C');
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('fecha_creacion');
      expect(response.data[0]).toHaveProperty('facturas_count');
      expect(response.data[0].facturas_count).toBe(0);
    });

    it('should include uploaded facturas count per proveedor', async () => {
      seedTestData(db, 'proveedores', [
        createProveedor({ razon_social: 'Proveedor Uno' }),
        createProveedor({ razon_social: 'Proveedor Dos' }),
      ]);

      const proveedores = db
        .prepare('SELECT id, razon_social FROM proveedores ORDER BY razon_social ASC')
        .all();

      seedTestData(db, 'facturas_pdf', [
        {
          tipo: 'compra',
          entidad_id: proveedores[1].id,
          entidad_tipo: 'proveedor',
          nombre_original: 'factura-1.pdf',
          nombre_guardado: 'Proveedor - factura-1.pdf',
          ruta_relativa: `compra/proveedor-dos/factura-1-${proveedores[1].id}.pdf`,
        },
        {
          tipo: 'compra',
          entidad_id: proveedores[1].id,
          entidad_tipo: 'proveedor',
          nombre_original: 'factura-2.pdf',
          nombre_guardado: 'Proveedor - factura-2.pdf',
          ruta_relativa: `compra/proveedor-dos/factura-2-${proveedores[1].id}.pdf`,
        },
        {
          tipo: 'venta',
          entidad_id: proveedores[1].id,
          entidad_tipo: 'cliente',
          nombre_original: 'cliente-factura.pdf',
          nombre_guardado: 'Client - cliente-factura.pdf',
          ruta_relativa: `venta/cliente/factura-${proveedores[1].id}.pdf`,
        },
      ]);

      const handler = mockHandlers['proveedores:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].razon_social).toBe('Proveedor Dos');
      expect(response.data[0].facturas_count).toBe(2);
      expect(response.data[1].razon_social).toBe('Proveedor Uno');
      expect(response.data[1].facturas_count).toBe(0);
    });

    it('should return empty array when no proveedores exist', async () => {
      const handler = mockHandlers['proveedores:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });

  describe('proveedores:create', () => {
    it('should create a proveedor with valid data', async () => {
      const proveedorData = createProveedor({ razon_social: 'New Proveedor' });

      const handler = mockHandlers['proveedores:create'];
      const response = await handler(null, proveedorData);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.razon_social).toBe('New Proveedor');

      // Verify in database
      const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(response.data.id);
      expect(proveedor).toBeDefined();
      expect(proveedor.razon_social).toBe('New Proveedor');
    });

    it('should trim whitespace from string fields', async () => {
      const proveedorData = {
        razon_social: '  Spaced Name  ',
        direccion: '  Spaced Address  ',
        nif: '  B12345678  ',
      };

      const handler = mockHandlers['proveedores:create'];
      const response = await handler(null, proveedorData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Spaced Name');
      expect(response.data.direccion).toBe('Spaced Address');
      expect(response.data.nif).toBe('B12345678');
    });

    it('should handle null optional fields', async () => {
      const proveedorData = {
        razon_social: 'Minimal Proveedor',
        direccion: null,
        nif: null,
      };

      const handler = mockHandlers['proveedores:create'];
      const response = await handler(null, proveedorData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Minimal Proveedor');
      expect(response.data.direccion).toBeNull();
      expect(response.data.nif).toBeNull();
    });

    it('should fail when razon_social is missing', async () => {
      const proveedorData = {
        direccion: 'Some Address',
        nif: 'B12345678',
      };

      const handler = mockHandlers['proveedores:create'];
      const response = await handler(null, proveedorData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('razon_social is required');
    });

    it('should fail when razon_social is empty after trimming', async () => {
      const proveedorData = {
        razon_social: '   ',
        direccion: 'Some Address',
      };

      const handler = mockHandlers['proveedores:create'];
      const response = await handler(null, proveedorData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should fail when razon_social exceeds max length', async () => {
      const proveedorData = {
        razon_social: 'a'.repeat(256),
      };

      const handler = mockHandlers['proveedores:create'];
      const response = await handler(null, proveedorData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255 characters');
    });
  });

  describe('proveedores:update', () => {
    it('should update a proveedor with valid data', async () => {
      // Seed initial data
      const testProveedores = [createProveedor({ razon_social: 'Original Name' })];
      seedTestData(db, 'proveedores', testProveedores);
      const proveedorId = db.prepare('SELECT id FROM proveedores LIMIT 1').get().id;

      const updateData = {
        razon_social: 'Updated Name',
        direccion: 'Updated Address',
      };

      const handler = mockHandlers['proveedores:update'];
      const response = await handler(null, proveedorId, updateData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Updated Name');
      expect(response.data.direccion).toBe('Updated Address');
    });

    it('should update only provided fields', async () => {
      // Seed initial data
      const testProveedores = [
        createProveedor({
          razon_social: 'Original Name',
          direccion: 'Original Address',
          nif: 'B12345678',
        }),
      ];
      seedTestData(db, 'proveedores', testProveedores);
      const proveedorId = db.prepare('SELECT id FROM proveedores LIMIT 1').get().id;

      const updateData = {
        razon_social: 'Updated Name',
      };

      const handler = mockHandlers['proveedores:update'];
      const response = await handler(null, proveedorId, updateData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Updated Name');
      expect(response.data.direccion).toBe('Original Address');
      expect(response.data.nif).toBe('B12345678');
    });

    it('should fail when proveedor not found', async () => {
      const updateData = { razon_social: 'Updated Name' };

      const handler = mockHandlers['proveedores:update'];
      const response = await handler(null, 9999, updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toContain('not found');
    });

    it('should fail when id is invalid', async () => {
      const updateData = { razon_social: 'Updated Name' };

      const handler = mockHandlers['proveedores:update'];
      const response = await handler(null, 'invalid', updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should fail when updating razon_social to empty', async () => {
      // Seed initial data
      const testProveedores = [createProveedor({ razon_social: 'Original Name' })];
      seedTestData(db, 'proveedores', testProveedores);
      const proveedorId = db.prepare('SELECT id FROM proveedores LIMIT 1').get().id;

      const updateData = {
        razon_social: '   ',
      };

      const handler = mockHandlers['proveedores:update'];
      const response = await handler(null, proveedorId, updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('proveedores:delete', () => {
    it('should delete an existing proveedor', async () => {
      // Seed initial data
      const testProveedores = [createProveedor({ razon_social: 'To Delete' })];
      seedTestData(db, 'proveedores', testProveedores);
      const proveedorId = db.prepare('SELECT id FROM proveedores LIMIT 1').get().id;

      const handler = mockHandlers['proveedores:delete'];
      const response = await handler(null, proveedorId);

      expect(response.success).toBe(true);

      // Verify deletion
      const proveedor = db.prepare('SELECT * FROM proveedores WHERE id = ?').get(proveedorId);
      expect(proveedor).toBeUndefined();
    });

    it('should fail when proveedor not found', async () => {
      const handler = mockHandlers['proveedores:delete'];
      const response = await handler(null, 9999);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should fail when id is invalid', async () => {
      const handler = mockHandlers['proveedores:delete'];
      const response = await handler(null, null);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });
});

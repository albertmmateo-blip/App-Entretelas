import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, seedTestData } from '../helpers/db';
import { createCliente } from '../fixtures/sample-data';

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

describe('Clientes IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    // Create test database
    db = createTestDb();

    // Mock getDatabase to return our test database
    const connectionModule = await import('../../src/main/db/connection');
    connectionModule.getDatabase = () => db;

    // Register handlers
    const { registerClientesHandlers } = await import('../../src/main/ipc/clientes');
    registerClientesHandlers();
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

  describe('clientes:getAll', () => {
    it('should return all clientes sorted by razon_social', async () => {
      // Seed test data
      const testClientes = [
        createCliente({ razon_social: 'Cliente C', numero_cliente: 'CLI-003' }),
        createCliente({ razon_social: 'Cliente A', numero_cliente: 'CLI-001' }),
        createCliente({ razon_social: 'Cliente B', numero_cliente: 'CLI-002' }),
      ];
      seedTestData(db, 'clientes', testClientes);

      // Call handler
      const handler = mockHandlers['clientes:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(3);
      // Should be sorted by razon_social ASC
      expect(response.data[0].razon_social).toBe('Cliente A');
      expect(response.data[1].razon_social).toBe('Cliente B');
      expect(response.data[2].razon_social).toBe('Cliente C');
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('numero_cliente');
      expect(response.data[0]).toHaveProperty('fecha_creacion');
      expect(response.data[0]).toHaveProperty('facturas_count');
      expect(response.data[0].facturas_count).toBe(0);
    });

    it('should include uploaded facturas count per cliente', async () => {
      seedTestData(db, 'clientes', [
        createCliente({ razon_social: 'Cliente Uno', numero_cliente: 'CLI-001' }),
        createCliente({ razon_social: 'Cliente Dos', numero_cliente: 'CLI-002' }),
      ]);

      const clientes = db
        .prepare('SELECT id, razon_social FROM clientes ORDER BY razon_social ASC')
        .all();

      seedTestData(db, 'facturas_pdf', [
        {
          tipo: 'venta',
          entidad_id: clientes[0].id,
          entidad_tipo: 'cliente',
          nombre_original: 'factura-1.pdf',
          nombre_guardado: 'Client - factura-1.pdf',
          ruta_relativa: `venta/cliente-dos/factura-1-${clientes[0].id}.pdf`,
        },
        {
          tipo: 'venta',
          entidad_id: clientes[0].id,
          entidad_tipo: 'cliente',
          nombre_original: 'factura-2.pdf',
          nombre_guardado: 'Client - factura-2.pdf',
          ruta_relativa: `venta/cliente-dos/factura-2-${clientes[0].id}.pdf`,
        },
        {
          tipo: 'compra',
          entidad_id: clientes[0].id,
          entidad_tipo: 'proveedor',
          nombre_original: 'proveedor-factura.pdf',
          nombre_guardado: 'Proveedor - proveedor-factura.pdf',
          ruta_relativa: `compra/proveedor/factura-${clientes[0].id}.pdf`,
        },
      ]);

      const handler = mockHandlers['clientes:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].razon_social).toBe('Cliente Dos');
      expect(response.data[0].facturas_count).toBe(2);
      expect(response.data[1].razon_social).toBe('Cliente Uno');
      expect(response.data[1].facturas_count).toBe(0);
    });

    it('should return empty array when no clientes exist', async () => {
      const handler = mockHandlers['clientes:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });

  describe('clientes:create', () => {
    it('should create a cliente with valid data', async () => {
      const clienteData = createCliente({
        razon_social: 'New Cliente',
        numero_cliente: 'CLI-999',
      });

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.razon_social).toBe('New Cliente');
      expect(response.data.numero_cliente).toBe('CLI-999');

      // Verify in database
      const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(response.data.id);
      expect(cliente).toBeDefined();
      expect(cliente.razon_social).toBe('New Cliente');
      expect(cliente.numero_cliente).toBe('CLI-999');
    });

    it('should trim whitespace from string fields', async () => {
      const clienteData = {
        razon_social: '  Spaced Name  ',
        numero_cliente: '  CLI-123  ',
        direccion: '  Spaced Address  ',
        nif: '  A98765432  ',
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Spaced Name');
      expect(response.data.numero_cliente).toBe('CLI-123');
      expect(response.data.direccion).toBe('Spaced Address');
      expect(response.data.nif).toBe('A98765432');
    });

    it('should handle null optional fields', async () => {
      const clienteData = {
        razon_social: 'Minimal Cliente',
        numero_cliente: 'CLI-MIN',
        direccion: null,
        nif: null,
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Minimal Cliente');
      expect(response.data.numero_cliente).toBe('CLI-MIN');
      expect(response.data.direccion).toBeNull();
      expect(response.data.nif).toBeNull();
    });

    it('should fail when razon_social is missing', async () => {
      const clienteData = {
        numero_cliente: 'CLI-123',
        direccion: 'Some Address',
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('razon_social is required');
    });

    it('should fail when numero_cliente is missing', async () => {
      const clienteData = {
        razon_social: 'Test Cliente',
        direccion: 'Some Address',
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('numero_cliente is required');
    });

    it('should fail when razon_social is empty after trimming', async () => {
      const clienteData = {
        razon_social: '   ',
        numero_cliente: 'CLI-123',
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should fail when razon_social exceeds max length', async () => {
      const clienteData = {
        razon_social: 'a'.repeat(256),
        numero_cliente: 'CLI-123',
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255 characters');
    });

    it('should fail when numero_cliente exceeds max length', async () => {
      const clienteData = {
        razon_social: 'Test Cliente',
        numero_cliente: 'a'.repeat(51),
      };

      const handler = mockHandlers['clientes:create'];
      const response = await handler(null, clienteData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('50 characters');
    });
  });

  describe('clientes:update', () => {
    it('should update a cliente with valid data', async () => {
      // Seed initial data
      const testClientes = [
        createCliente({ razon_social: 'Original Name', numero_cliente: 'CLI-001' }),
      ];
      seedTestData(db, 'clientes', testClientes);
      const clienteId = db.prepare('SELECT id FROM clientes LIMIT 1').get().id;

      const updateData = {
        razon_social: 'Updated Name',
        direccion: 'Updated Address',
      };

      const handler = mockHandlers['clientes:update'];
      const response = await handler(null, clienteId, updateData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Updated Name');
      expect(response.data.direccion).toBe('Updated Address');
      expect(response.data.numero_cliente).toBe('CLI-001'); // Should remain unchanged
    });

    it('should update only provided fields', async () => {
      // Seed initial data
      const testClientes = [
        createCliente({
          razon_social: 'Original Name',
          numero_cliente: 'CLI-001',
          direccion: 'Original Address',
          nif: 'A12345678',
        }),
      ];
      seedTestData(db, 'clientes', testClientes);
      const clienteId = db.prepare('SELECT id FROM clientes LIMIT 1').get().id;

      const updateData = {
        razon_social: 'Updated Name',
      };

      const handler = mockHandlers['clientes:update'];
      const response = await handler(null, clienteId, updateData);

      expect(response.success).toBe(true);
      expect(response.data.razon_social).toBe('Updated Name');
      expect(response.data.numero_cliente).toBe('CLI-001');
      expect(response.data.direccion).toBe('Original Address');
      expect(response.data.nif).toBe('A12345678');
    });

    it('should fail when cliente not found', async () => {
      const updateData = { razon_social: 'Updated Name' };

      const handler = mockHandlers['clientes:update'];
      const response = await handler(null, 9999, updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toContain('not found');
    });

    it('should fail when id is invalid', async () => {
      const updateData = { razon_social: 'Updated Name' };

      const handler = mockHandlers['clientes:update'];
      const response = await handler(null, 'invalid', updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should fail when updating razon_social to empty', async () => {
      // Seed initial data
      const testClientes = [
        createCliente({ razon_social: 'Original Name', numero_cliente: 'CLI-001' }),
      ];
      seedTestData(db, 'clientes', testClientes);
      const clienteId = db.prepare('SELECT id FROM clientes LIMIT 1').get().id;

      const updateData = {
        razon_social: '   ',
      };

      const handler = mockHandlers['clientes:update'];
      const response = await handler(null, clienteId, updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should fail when updating numero_cliente to empty', async () => {
      // Seed initial data
      const testClientes = [
        createCliente({ razon_social: 'Original Name', numero_cliente: 'CLI-001' }),
      ];
      seedTestData(db, 'clientes', testClientes);
      const clienteId = db.prepare('SELECT id FROM clientes LIMIT 1').get().id;

      const updateData = {
        numero_cliente: '   ',
      };

      const handler = mockHandlers['clientes:update'];
      const response = await handler(null, clienteId, updateData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('clientes:delete', () => {
    it('should delete an existing cliente', async () => {
      // Seed initial data
      const testClientes = [
        createCliente({ razon_social: 'To Delete', numero_cliente: 'CLI-DEL' }),
      ];
      seedTestData(db, 'clientes', testClientes);
      const clienteId = db.prepare('SELECT id FROM clientes LIMIT 1').get().id;

      const handler = mockHandlers['clientes:delete'];
      const response = await handler(null, clienteId);

      expect(response.success).toBe(true);

      // Verify deletion
      const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(clienteId);
      expect(cliente).toBeUndefined();
    });

    it('should fail when cliente not found', async () => {
      const handler = mockHandlers['clientes:delete'];
      const response = await handler(null, 9999);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should fail when id is invalid', async () => {
      const handler = mockHandlers['clientes:delete'];
      const response = await handler(null, null);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });
});

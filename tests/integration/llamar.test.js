import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, seedTestData } from '../helpers/db';
import { createLlamar } from '../fixtures/sample-data';

// Mock electron's ipcMain
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

let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

describe('Llamar IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    // Create test database
    db = createTestDb();
    mockDb = db;

    // Register handlers
    const { registerLlamarHandlers } = await import('../../src/main/ipc/llamar');
    registerLlamarHandlers({
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

  describe('llamar:getAll', () => {
    it('should return all llamar entries', async () => {
      // Seed test data
      const testLlamar = [
        createLlamar({ asunto: 'Llamar 1' }),
        createLlamar({ asunto: 'Llamar 2' }),
        createLlamar({ asunto: 'Llamar 3' }),
      ];
      seedTestData(db, 'llamar', testLlamar);

      // Call handler
      const handler = mockHandlers['llamar:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(3);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('asunto');
      expect(response.data[0]).toHaveProperty('contacto');
      expect(response.data[0]).toHaveProperty('fecha_creacion');
    });

    it('should return empty array when no llamar entries exist', async () => {
      const handler = mockHandlers['llamar:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });

  describe('llamar:create', () => {
    it('should create a llamar entry with valid data', async () => {
      const llamarData = createLlamar({
        asunto: 'New Llamar',
        contacto: 'Contact Person',
        urgente: true,
      });

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.asunto).toBe('New Llamar');
      expect(response.data.contacto).toBe('Contact Person');
      expect(response.data.urgente).toBe(1);

      // Verify in database
      const llamar = db.prepare('SELECT * FROM llamar WHERE id = ?').get(response.data.id);
      expect(llamar).toBeDefined();
      expect(llamar.asunto).toBe('New Llamar');
    });

    it('should trim whitespace from string fields', async () => {
      const llamarData = {
        asunto: '  Spaced Asunto  ',
        contacto: '  Spaced Contact  ',
        nombre: '  Spaced Name  ',
        descripcion: '  Spaced Description  ',
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(true);
      expect(response.data.asunto).toBe('Spaced Asunto');
      expect(response.data.contacto).toBe('Spaced Contact');
      expect(response.data.nombre).toBe('Spaced Name');
      expect(response.data.descripcion).toBe('Spaced Description');
    });

    it('should handle null/undefined optional fields', async () => {
      const llamarData = {
        asunto: 'Required Asunto',
        contacto: 'Required Contact',
        nombre: null,
        descripcion: null,
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(true);
      expect(response.data.nombre).toBeNull();
      expect(response.data.descripcion).toBeNull();
    });

    it('should return INVALID_INPUT error for missing asunto', async () => {
      const llamarData = {
        contacto: 'Contact Person',
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('asunto');
    });

    it('should return INVALID_INPUT error for missing contacto', async () => {
      const llamarData = {
        asunto: 'Asunto',
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('contacto');
    });

    it('should return INVALID_INPUT error for oversized asunto', async () => {
      const llamarData = {
        asunto: 'a'.repeat(256), // Exceeds 255 char limit
        contacto: 'Contact',
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255');
    });

    it('should return INVALID_INPUT error for oversized contacto', async () => {
      const llamarData = {
        asunto: 'Asunto',
        contacto: 'a'.repeat(256), // Exceeds 255 char limit
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255');
    });

    it('should return INVALID_INPUT error for oversized nombre', async () => {
      const llamarData = {
        asunto: 'Asunto',
        contacto: 'Contact',
        nombre: 'a'.repeat(256), // Exceeds 255 char limit
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255');
    });

    it('should return INVALID_INPUT error for oversized descripcion', async () => {
      const llamarData = {
        asunto: 'Asunto',
        contacto: 'Contact',
        descripcion: 'a'.repeat(5001), // Exceeds 5000 char limit
      };

      const handler = mockHandlers['llamar:create'];
      const response = await handler(null, llamarData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('5000');
    });
  });

  describe('llamar:update', () => {
    it('should update an existing llamar entry', async () => {
      // Create llamar entry
      const testLlamar = createLlamar({ asunto: 'Original Asunto' });
      seedTestData(db, 'llamar', [testLlamar]);
      const llamar = db.prepare('SELECT * FROM llamar').get();

      // Update llamar entry
      const handler = mockHandlers['llamar:update'];
      const response = await handler(null, llamar.id, { asunto: 'Updated Asunto' });

      expect(response.success).toBe(true);
      expect(response.data.asunto).toBe('Updated Asunto');

      // Verify in database
      const updated = db.prepare('SELECT * FROM llamar WHERE id = ?').get(llamar.id);
      expect(updated.asunto).toBe('Updated Asunto');
    });

    it('should update only provided fields', async () => {
      // Create llamar entry
      const testLlamar = createLlamar({ asunto: 'Asunto', contacto: 'Contact' });
      seedTestData(db, 'llamar', [testLlamar]);
      const llamar = db.prepare('SELECT * FROM llamar').get();

      // Update only asunto
      const handler = mockHandlers['llamar:update'];
      const response = await handler(null, llamar.id, { asunto: 'New Asunto' });

      expect(response.success).toBe(true);
      expect(response.data.asunto).toBe('New Asunto');
      expect(response.data.contacto).toBe('Contact'); // Unchanged
    });

    it('should toggle urgente status', async () => {
      // Create llamar entry
      const testLlamar = createLlamar({ urgente: 0 });
      seedTestData(db, 'llamar', [testLlamar]);
      const llamar = db.prepare('SELECT * FROM llamar').get();

      // Toggle urgente
      const handler = mockHandlers['llamar:update'];
      const response = await handler(null, llamar.id, { urgente: true });

      expect(response.success).toBe(true);
      expect(response.data.urgente).toBe(1);
    });

    it('should return NOT_FOUND error for non-existent llamar entry', async () => {
      const handler = mockHandlers['llamar:update'];
      const response = await handler(null, 999, { asunto: 'Updated' });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return INVALID_INPUT error for invalid id', async () => {
      const handler = mockHandlers['llamar:update'];
      const response = await handler(null, null, { asunto: 'Updated' });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return INVALID_INPUT error for oversized fields', async () => {
      // Create llamar entry
      const testLlamar = createLlamar();
      seedTestData(db, 'llamar', [testLlamar]);
      const llamar = db.prepare('SELECT * FROM llamar').get();

      const handler = mockHandlers['llamar:update'];
      const response = await handler(null, llamar.id, { asunto: 'a'.repeat(256) });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('llamar:delete', () => {
    it('should delete an existing llamar entry', async () => {
      // Create llamar entry
      const testLlamar = createLlamar();
      seedTestData(db, 'llamar', [testLlamar]);
      const llamar = db.prepare('SELECT * FROM llamar').get();

      // Delete llamar entry
      const handler = mockHandlers['llamar:delete'];
      const response = await handler(null, llamar.id);

      expect(response.success).toBe(true);

      // Verify deleted from database
      const deleted = db.prepare('SELECT * FROM llamar WHERE id = ?').get(llamar.id);
      expect(deleted).toBeUndefined();
    });

    it('should return NOT_FOUND error for non-existent llamar entry', async () => {
      const handler = mockHandlers['llamar:delete'];
      const response = await handler(null, 999);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return INVALID_INPUT error for invalid id', async () => {
      const handler = mockHandlers['llamar:delete'];
      const response = await handler(null, null);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });
});

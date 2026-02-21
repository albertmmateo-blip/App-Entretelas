import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, seedTestData } from '../helpers/db';
import { createNota } from '../fixtures/sample-data';

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
const electronMock = {
  ipcMain: mockIpcMain,
};
vi.mock('electron', () => ({
  __esModule: true,
  default: electronMock,
  ...electronMock,
}));

let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

describe('Notas IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    // Create test database
    db = createTestDb();
    mockDb = db;

    // Register handlers
    const { registerNotasHandlers } = await import('../../src/main/ipc/notas');
    registerNotasHandlers({
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

  describe('notas:getAll', () => {
    it('should return all notas', async () => {
      // Seed test data
      const testNotas = [
        createNota({ nombre: 'Nota 1' }),
        createNota({ nombre: 'Nota 2' }),
        createNota({ nombre: 'Nota 3' }),
      ];
      seedTestData(db, 'notas', testNotas);

      // Call handler
      const handler = mockHandlers['notas:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.length).toBe(3);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('nombre');
      expect(response.data[0]).toHaveProperty('fecha_creacion');
    });

    it('should return empty array when no notas exist', async () => {
      const handler = mockHandlers['notas:getAll'];
      const response = await handler();

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });
  });

  describe('notas:create', () => {
    it('should create a nota with valid data', async () => {
      const notaData = createNota({ nombre: 'New Nota', urgente: true });

      const handler = mockHandlers['notas:create'];
      const response = await handler(null, notaData);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBeDefined();
      expect(response.data.nombre).toBe('New Nota');
      expect(response.data.urgente).toBe(1);

      // Verify in database
      const nota = db.prepare('SELECT * FROM notas WHERE id = ?').get(response.data.id);
      expect(nota).toBeDefined();
      expect(nota.nombre).toBe('New Nota');
    });

    it('should trim whitespace from string fields', async () => {
      const notaData = {
        nombre: '  Spaced Name  ',
        descripcion: '  Spaced Description  ',
        contacto: '  Spaced Contact  ',
      };

      const handler = mockHandlers['notas:create'];
      const response = await handler(null, notaData);

      expect(response.success).toBe(true);
      expect(response.data.nombre).toBe('Spaced Name');
      expect(response.data.descripcion).toBe('Spaced Description');
      expect(response.data.contacto).toBe('Spaced Contact');
    });

    it('should handle null/undefined optional fields', async () => {
      const notaData = {
        nombre: null,
        descripcion: null,
        contacto: null,
      };

      const handler = mockHandlers['notas:create'];
      const response = await handler(null, notaData);

      expect(response.success).toBe(true);
      expect(response.data.nombre).toBeNull();
      expect(response.data.descripcion).toBeNull();
      expect(response.data.contacto).toBeNull();
    });

    it('should return INVALID_INPUT error for oversized nombre', async () => {
      const notaData = {
        nombre: 'a'.repeat(256), // Exceeds 255 char limit
      };

      const handler = mockHandlers['notas:create'];
      const response = await handler(null, notaData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255');
    });

    it('should return INVALID_INPUT error for oversized descripcion', async () => {
      const notaData = {
        descripcion: 'a'.repeat(5001), // Exceeds 5000 char limit
      };

      const handler = mockHandlers['notas:create'];
      const response = await handler(null, notaData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('5000');
    });

    it('should return INVALID_INPUT error for oversized contacto', async () => {
      const notaData = {
        contacto: 'a'.repeat(256), // Exceeds 255 char limit
      };

      const handler = mockHandlers['notas:create'];
      const response = await handler(null, notaData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
      expect(response.error.message).toContain('255');
    });
  });

  describe('notas:update', () => {
    it('should update an existing nota', async () => {
      // Create nota
      const testNota = createNota({ nombre: 'Original Name' });
      seedTestData(db, 'notas', [testNota]);
      const nota = db.prepare('SELECT * FROM notas').get();

      // Update nota
      const handler = mockHandlers['notas:update'];
      const response = await handler(null, nota.id, { nombre: 'Updated Name' });

      expect(response.success).toBe(true);
      expect(response.data.nombre).toBe('Updated Name');

      // Verify in database
      const updated = db.prepare('SELECT * FROM notas WHERE id = ?').get(nota.id);
      expect(updated.nombre).toBe('Updated Name');
    });

    it('should update only provided fields', async () => {
      // Create nota
      const testNota = createNota({ nombre: 'Name', contacto: 'Contact' });
      seedTestData(db, 'notas', [testNota]);
      const nota = db.prepare('SELECT * FROM notas').get();

      // Update only nombre
      const handler = mockHandlers['notas:update'];
      const response = await handler(null, nota.id, { nombre: 'New Name' });

      expect(response.success).toBe(true);
      expect(response.data.nombre).toBe('New Name');
      expect(response.data.contacto).toBe('Contact'); // Unchanged
    });

    it('should toggle urgente status', async () => {
      // Create nota
      const testNota = createNota({ urgente: 0 });
      seedTestData(db, 'notas', [testNota]);
      const nota = db.prepare('SELECT * FROM notas').get();

      // Toggle urgente
      const handler = mockHandlers['notas:update'];
      const response = await handler(null, nota.id, { urgente: true });

      expect(response.success).toBe(true);
      expect(response.data.urgente).toBe(1);
    });

    it('should return NOT_FOUND error for non-existent nota', async () => {
      const handler = mockHandlers['notas:update'];
      const response = await handler(null, 999, { nombre: 'Updated' });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return INVALID_INPUT error for invalid id', async () => {
      const handler = mockHandlers['notas:update'];
      const response = await handler(null, null, { nombre: 'Updated' });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });

    it('should return INVALID_INPUT error for oversized fields', async () => {
      // Create nota
      const testNota = createNota();
      seedTestData(db, 'notas', [testNota]);
      const nota = db.prepare('SELECT * FROM notas').get();

      const handler = mockHandlers['notas:update'];
      const response = await handler(null, nota.id, { nombre: 'a'.repeat(256) });

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });

  describe('notas:delete', () => {
    it('should delete an existing nota', async () => {
      // Create nota
      const testNota = createNota();
      seedTestData(db, 'notas', [testNota]);
      const nota = db.prepare('SELECT * FROM notas').get();

      // Delete nota
      const handler = mockHandlers['notas:delete'];
      const response = await handler(null, nota.id);

      expect(response.success).toBe(true);

      // Verify deleted from database
      const deleted = db.prepare('SELECT * FROM notas WHERE id = ?').get(nota.id);
      expect(deleted).toBeUndefined();
    });

    it('should return NOT_FOUND error for non-existent nota', async () => {
      const handler = mockHandlers['notas:delete'];
      const response = await handler(null, 999);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('NOT_FOUND');
    });

    it('should return INVALID_INPUT error for invalid id', async () => {
      const handler = mockHandlers['notas:delete'];
      const response = await handler(null, null);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_INPUT');
    });
  });
});

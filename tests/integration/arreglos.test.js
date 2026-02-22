import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
}));

let mockDb = null;
vi.mock('../../src/main/db/connection', () => ({
  getDatabase: () => mockDb,
}));

describe('Arreglos IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    db = createTestDb();
    mockDb = db;

    const { registerArreglosHandlers } = await import('../../src/main/ipc/arreglos');
    registerArreglosHandlers({
      ipcMain: mockIpcMain,
      getDatabase: () => db,
    });
  });

  afterEach(() => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    if (db) {
      db.close();
    }
  });

  it('creates an arreglo with required and optional fields', async () => {
    const handler = mockHandlers['arreglos:create'];
    const response = await handler(null, {
      albaran: 'Entretelas',
      fecha: '2026-02-22',
      numero: 'A-001',
      cliente: 'Cliente Demo',
      arreglo: 'Ajuste de largo',
      importe: '12.5 €',
    });

    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({
      albaran: 'Entretelas',
      fecha: '2026-02-22',
      numero: 'A-001',
      cliente: 'Cliente Demo',
      arreglo: 'Ajuste de largo',
    });
    expect(response.data.importe).toBe(12.5);
  });

  it('fails creating when required fields are missing', async () => {
    const handler = mockHandlers['arreglos:create'];
    const response = await handler(null, {
      albaran: 'Entretelas',
      fecha: '2026-02-22',
    });

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INVALID_INPUT');
    expect(response.error.message).toContain('numero is required');
  });

  it('fails creating with invalid albaran option', async () => {
    const handler = mockHandlers['arreglos:create'];
    const response = await handler(null, {
      albaran: 'Otro',
      fecha: '2026-02-22',
      numero: 'A-002',
      importe: 10,
    });

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INVALID_INPUT');
    expect(response.error.message).toContain('must be one of');
  });

  it('returns all arreglos sorted by date desc', async () => {
    const create = mockHandlers['arreglos:create'];
    await create(null, {
      albaran: 'Isa',
      fecha: '2026-01-10',
      numero: 'A-010',
      importe: 10,
    });
    await create(null, {
      albaran: 'Loli',
      fecha: '2026-01-11',
      numero: 'A-011',
      importe: 20,
    });

    const getAll = mockHandlers['arreglos:getAll'];
    const response = await getAll();

    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(2);
    expect(response.data[0].numero).toBe('A-011');
    expect(response.data[1].numero).toBe('A-010');
  });

  it('updates and deletes an arreglo entry', async () => {
    const create = mockHandlers['arreglos:create'];
    const created = await create(null, {
      albaran: 'Isa',
      fecha: '2026-02-20',
      numero: 'A-020',
      importe: 30,
    });

    const update = mockHandlers['arreglos:update'];
    const updated = await update(null, created.data.id, {
      cliente: 'Cliente Editado',
      importe: '45',
    });

    expect(updated.success).toBe(true);
    expect(updated.data.cliente).toBe('Cliente Editado');
    expect(updated.data.importe).toBe(45);

    const remove = mockHandlers['arreglos:delete'];
    const removed = await remove(null, created.data.id);
    expect(removed.success).toBe(true);

    const getAll = mockHandlers['arreglos:getAll'];
    const all = await getAll();
    expect(all.data).toHaveLength(0);
  });
});

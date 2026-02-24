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

describe('Secret Catálogo IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    db = createTestDb();
    mockDb = db;

    const { registerSecretCatalogoHandlers } = await import('../../src/main/ipc/secretCatalogo');
    registerSecretCatalogoHandlers({
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

  it('creates root folder requiring concepto', async () => {
    const handler = mockHandlers['secretCatalogo:createFolder'];

    const response = await handler(null, {
      parentId: null,
      tipo: 'proveedor',
      concepto: 'Tejidos Secret',
    });

    expect(response.success).toBe(true);
    expect(response.data.parent_id).toBeNull();
    expect(response.data.tipo).toBe('proveedor');
    expect(response.data.concepto).toBe('Tejidos Secret');
  });

  it('creates familia folder', async () => {
    const createFolderHandler = mockHandlers['secretCatalogo:createFolder'];

    const response = await createFolderHandler(null, {
      parentId: null,
      tipo: 'familia',
      concepto: 'Mercería Secret',
    });

    expect(response.success).toBe(true);
    expect(response.data.parent_id).toBeNull();
    expect(response.data.tipo).toBe('familia');
    expect(response.data.concepto).toBe('Mercería Secret');
  });

  it('creates entry assigned to proveedor and familia', async () => {
    const createFolderHandler = mockHandlers['secretCatalogo:createFolder'];
    const createEntryHandler = mockHandlers['secretCatalogo:createEntry'];

    const proveedor = await createFolderHandler(null, {
      parentId: null,
      tipo: 'proveedor',
      concepto: 'Accesorios Secret',
    });

    const familia = await createFolderHandler(null, {
      parentId: null,
      tipo: 'familia',
      concepto: 'Botones Secret',
    });

    const response = await createEntryHandler(null, {
      proveedorFolderId: proveedor.data.id,
      familiaFolderId: familia.data.id,
      producto: 'Botón nacarado secret',
      link: 'https://example.com/secret-boton',
    });

    expect(response.success).toBe(true);
    expect(response.data.folder_id).toBe(proveedor.data.id);
    expect(response.data.proveedor_folder_id).toBe(proveedor.data.id);
    expect(response.data.familia_folder_id).toBe(familia.data.id);
    expect(response.data.producto).toBe('Botón nacarado secret');
  });
});

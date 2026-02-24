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

describe('Encargar Catálogo IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    db = createTestDb();
    mockDb = db;

    const { registerEncargarCatalogoHandlers } =
      await import('../../src/main/ipc/encargarCatalogo');
    registerEncargarCatalogoHandlers({
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
    const handler = mockHandlers['encargarCatalogo:createFolder'];

    const response = await handler(null, {
      parentId: null,
      tipo: 'proveedor',
      concepto: 'Tejidos',
    });

    expect(response.success).toBe(true);
    expect(response.data.parent_id).toBeNull();
    expect(response.data.tipo).toBe('proveedor');
    expect(response.data.concepto).toBe('Tejidos');
  });

  it('creates familia folder', async () => {
    const createFolderHandler = mockHandlers['encargarCatalogo:createFolder'];

    const response = await createFolderHandler(null, {
      parentId: null,
      tipo: 'familia',
      concepto: 'Mercería',
    });

    expect(response.success).toBe(true);
    expect(response.data.parent_id).toBeNull();
    expect(response.data.tipo).toBe('familia');
    expect(response.data.concepto).toBe('Mercería');
  });

  it('creates entry assigned to proveedor and familia', async () => {
    const createFolderHandler = mockHandlers['encargarCatalogo:createFolder'];
    const createEntryHandler = mockHandlers['encargarCatalogo:createEntry'];

    const proveedor = await createFolderHandler(null, {
      parentId: null,
      tipo: 'proveedor',
      concepto: 'Accesorios',
    });

    const familia = await createFolderHandler(null, {
      parentId: null,
      tipo: 'familia',
      concepto: 'Botones',
    });

    const response = await createEntryHandler(null, {
      proveedorFolderId: proveedor.data.id,
      familiaFolderId: familia.data.id,
      producto: 'Botón nacarado',
      link: 'https://example.com/boton',
    });

    expect(response.success).toBe(true);
    expect(response.data.folder_id).toBe(proveedor.data.id);
    expect(response.data.proveedor_folder_id).toBe(proveedor.data.id);
    expect(response.data.familia_folder_id).toBe(familia.data.id);
    expect(response.data.producto).toBe('Botón nacarado');
  });
});

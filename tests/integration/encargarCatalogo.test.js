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
      concepto: 'Tejidos',
    });

    expect(response.success).toBe(true);
    expect(response.data.parent_id).toBeNull();
    expect(response.data.concepto).toBe('Tejidos');
  });

  it('creates optional-concept subfolder', async () => {
    const createFolderHandler = mockHandlers['encargarCatalogo:createFolder'];

    const root = await createFolderHandler(null, {
      parentId: null,
      concepto: 'Padre',
    });

    const response = await createFolderHandler(null, {
      parentId: root.data.id,
      concepto: '',
    });

    expect(response.success).toBe(true);
    expect(response.data.parent_id).toBe(root.data.id);
    expect(response.data.concepto).toBeNull();
  });

  it('creates optional entry in folder', async () => {
    const createFolderHandler = mockHandlers['encargarCatalogo:createFolder'];
    const createEntryHandler = mockHandlers['encargarCatalogo:createEntry'];

    const folder = await createFolderHandler(null, {
      parentId: null,
      concepto: 'Accesorios',
    });

    const response = await createEntryHandler(null, {
      folderId: folder.data.id,
      producto: 'Botón nacarado',
      link: 'https://example.com/boton',
    });

    expect(response.success).toBe(true);
    expect(response.data.folder_id).toBe(folder.data.id);
    expect(response.data.producto).toBe('Botón nacarado');
  });
});

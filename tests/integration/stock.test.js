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

describe('Stock IPC Handlers', () => {
  let db;

  beforeEach(async () => {
    Object.keys(mockHandlers).forEach((key) => {
      delete mockHandlers[key];
    });

    db = createTestDb();
    mockDb = db;

    const { registerStockHandlers } = await import('../../src/main/ipc/stock');
    registerStockHandlers({
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

  it('builds a nested tree with variants and totals', async () => {
    const createFamilia = mockHandlers['stock:createFamilia'];
    const createProducto = mockHandlers['stock:createProducto'];
    const createArticulo = mockHandlers['stock:createArticulo'];
    const getTree = mockHandlers['stock:getTree'];

    const familiaRes = await createFamilia(null, {
      nombre: 'Bies',
      codigo: 'F-01',
      descripcion: 'Familia principal',
    });
    expect(familiaRes.success).toBe(true);

    const productoRes = await createProducto(null, {
      familia_id: familiaRes.data.id,
      nombre: 'Bies de algodon',
      ref: 'BIE-ALG',
    });
    expect(productoRes.success).toBe(true);

    const articuloRes = await createArticulo(null, {
      producto_id: productoRes.data.id,
      nombre: 'Bies satinado',
      ref: 'BIE-SAT',
      cantidad: 0,
    });
    expect(articuloRes.success).toBe(true);

    const variantRes = await createArticulo(null, {
      producto_id: productoRes.data.id,
      parent_articulo_id: articuloRes.data.id,
      nombre: 'Rojo',
      ref: 'BIE-SAT-ROJO',
      cantidad: 7,
    });
    expect(variantRes.success).toBe(true);

    const treeRes = await getTree();

    expect(treeRes.success).toBe(true);
    expect(treeRes.data).toHaveLength(1);
    expect(treeRes.data[0].name).toBe('Bies');
    expect(treeRes.data[0].code).toBe('F-01');
    expect(treeRes.data[0].products).toHaveLength(1);
    expect(treeRes.data[0].stock_total).toBe(7);

    const product = treeRes.data[0].products[0];
    expect(product.name).toBe('Bies de algodon');
    expect(product.articles).toHaveLength(1);
    expect(product.stock_total).toBe(7);

    const article = product.articles[0];
    expect(article.name).toBe('Bies satinado');
    expect(article.quantity).toBe(0);
    expect(article.stock_total).toBe(7);
    expect(article.variants).toHaveLength(1);
    expect(article.variants[0].name).toBe('Rojo');
    expect(article.variants[0].quantity).toBe(7);
  });

  it('updates article quantities and clamps at zero', async () => {
    const createFamilia = mockHandlers['stock:createFamilia'];
    const createProducto = mockHandlers['stock:createProducto'];
    const createArticulo = mockHandlers['stock:createArticulo'];
    const setArticuloCantidad = mockHandlers['stock:setArticuloCantidad'];
    const adjustArticuloCantidad = mockHandlers['stock:adjustArticuloCantidad'];

    const familiaRes = await createFamilia(null, { nombre: 'Cinta', codigo: 'F-02' });
    const productoRes = await createProducto(null, {
      familia_id: familiaRes.data.id,
      nombre: 'Cinta de raso',
    });
    const articuloRes = await createArticulo(null, {
      producto_id: productoRes.data.id,
      nombre: 'Negra 15 mm',
      cantidad: 3,
    });

    let response = await setArticuloCantidad(null, articuloRes.data.id, 9);
    expect(response.success).toBe(true);
    expect(response.data.cantidad).toBe(9);

    response = await adjustArticuloCantidad(null, articuloRes.data.id, -12);
    expect(response.success).toBe(true);
    expect(response.data.cantidad).toBe(0);
  });

  it('rejects variants that do not belong to the selected product', async () => {
    const createFamilia = mockHandlers['stock:createFamilia'];
    const createProducto = mockHandlers['stock:createProducto'];
    const createArticulo = mockHandlers['stock:createArticulo'];

    const familiaRes = await createFamilia(null, { nombre: 'Familia', codigo: 'F-03' });
    const otherFamiliaRes = await createFamilia(null, { nombre: 'Otra', codigo: 'F-04' });

    const productoRes = await createProducto(null, {
      familia_id: familiaRes.data.id,
      nombre: 'Producto A',
    });
    const otherProductoRes = await createProducto(null, {
      familia_id: otherFamiliaRes.data.id,
      nombre: 'Producto B',
    });

    const parentRes = await createArticulo(null, {
      producto_id: productoRes.data.id,
      nombre: 'Base',
    });

    const response = await createArticulo(null, {
      producto_id: otherProductoRes.data.id,
      parent_articulo_id: parentRes.data.id,
      nombre: 'Invalid variant',
    });

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INVALID_INPUT');
  });
});

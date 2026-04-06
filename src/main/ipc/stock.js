const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../db/connection');

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function validateTextField(value, fieldName, maxLength = 255, required = true) {
  if (value === undefined || value === null) {
    if (required) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: `${fieldName} is required` },
      };
    }
    return { valid: true };
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: `${fieldName} must be a string` },
    };
  }

  if (value.trim().length === 0) {
    if (required) {
      return {
        valid: false,
        error: { code: 'INVALID_INPUT', message: `${fieldName} is required` },
      };
    }
    return { valid: true };
  }

  if (value.length > maxLength) {
    return {
      valid: false,
      error: {
        code: 'INVALID_INPUT',
        message: `${fieldName} must be ${maxLength} characters or less`,
      },
    };
  }

  return { valid: true };
}

function validateQuantity(value) {
  if (!Number.isInteger(value) || value < 0) {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'cantidad must be a non-negative integer' },
    };
  }

  return { valid: true };
}

function mapArticulo(row) {
  return {
    id: row.id,
    producto_id: row.producto_id,
    familia_id: row.familia_id,
    parent_articulo_id: row.parent_articulo_id,
    name: row.nombre,
    ref: row.ref,
    color: row.color,
    color_hex: row.color_hex,
    description: row.descripcion,
    notes: row.notas,
    quantity: row.cantidad,
    order: row.orden,
    has_foto: Boolean(row.has_foto),
    fecha_creacion: row.fecha_creacion,
    fecha_mod: row.fecha_mod,
  };
}

function buildTree(db) {
  const familias = db
    .prepare('SELECT * FROM stock_familias ORDER BY orden ASC, nombre COLLATE NOCASE ASC, id ASC')
    .all();
  const productos = db
    .prepare(
      'SELECT * FROM stock_productos ORDER BY familia_id ASC, orden ASC, nombre COLLATE NOCASE ASC, id ASC'
    )
    .all();
  const articulos = db
    .prepare(
      `SELECT id, producto_id, familia_id, parent_articulo_id, nombre, ref, color, color_hex,
              descripcion, notas, cantidad, orden, fecha_creacion, fecha_mod,
              EXISTS(SELECT 1 FROM stock_articulo_fotos WHERE stock_articulo_fotos.articulo_id = stock_articulos.id) AS has_foto
       FROM stock_articulos
       ORDER BY COALESCE(producto_id, 0) ASC, COALESCE(familia_id, 0) ASC, COALESCE(parent_articulo_id, 0) ASC, orden ASC, nombre COLLATE NOCASE ASC, id ASC`
    )
    .all();

  const productosByFamilia = productos.reduce((acc, producto) => {
    if (!acc[producto.familia_id]) acc[producto.familia_id] = [];
    acc[producto.familia_id].push(producto);
    return acc;
  }, {});

  const articulosByProducto = articulos.reduce((acc, articulo) => {
    if (articulo.producto_id === null || articulo.producto_id === undefined) return acc;
    if (!acc[articulo.producto_id]) acc[articulo.producto_id] = [];
    acc[articulo.producto_id].push(articulo);
    return acc;
  }, {});

  const directArticulosByFamilia = articulos.reduce((acc, articulo) => {
    if (articulo.producto_id !== null && articulo.producto_id !== undefined) return acc;
    if (articulo.familia_id === null || articulo.familia_id === undefined) return acc;
    if (!acc[articulo.familia_id]) acc[articulo.familia_id] = [];
    acc[articulo.familia_id].push(articulo);
    return acc;
  }, {});

  const variantsByParent = articulos.reduce((acc, articulo) => {
    if (!articulo.parent_articulo_id) return acc;
    if (!acc[articulo.parent_articulo_id]) acc[articulo.parent_articulo_id] = [];
    acc[articulo.parent_articulo_id].push(articulo);
    return acc;
  }, {});

  function mapRootWithVariants(articulo) {
    const variants = (variantsByParent[articulo.id] || []).map(mapArticulo);
    const variantTotal = variants.reduce((sum, v) => sum + v.quantity, 0);
    return {
      ...mapArticulo(articulo),
      variants,
      stock_total: articulo.cantidad + variantTotal,
    };
  }

  return familias.map((familia) => {
    const familyProducts = (productosByFamilia[familia.id] || []).map((producto) => {
      const rootArticulos = (articulosByProducto[producto.id] || [])
        .filter((articulo) => !articulo.parent_articulo_id)
        .map(mapRootWithVariants);

      const stockTotal = rootArticulos.reduce((sum, articulo) => sum + articulo.stock_total, 0);

      return {
        id: producto.id,
        family_id: producto.familia_id,
        name: producto.nombre,
        ref: producto.ref,
        description: producto.descripcion,
        notes: producto.descripcion,
        order: producto.orden,
        fecha_creacion: producto.fecha_creacion,
        fecha_mod: producto.fecha_mod,
        articles: rootArticulos,
        stock_total: stockTotal,
      };
    });

    const directArticulos = (directArticulosByFamilia[familia.id] || [])
      .filter((a) => !a.parent_articulo_id)
      .map(mapRootWithVariants);

    const productStockTotal = familyProducts.reduce((sum, p) => sum + p.stock_total, 0);
    const directStockTotal = directArticulos.reduce((sum, a) => sum + a.stock_total, 0);

    return {
      id: familia.id,
      name: familia.nombre,
      code: familia.codigo,
      description: familia.descripcion,
      notes: familia.descripcion,
      order: familia.orden,
      fecha_creacion: familia.fecha_creacion,
      fecha_mod: familia.fecha_mod,
      products: familyProducts,
      direct_articles: directArticulos,
      stock_total: productStockTotal + directStockTotal,
    };
  });
}

function ensureParentMatchesScope(db, parentArticuloId, productoId, familiaId) {
  if (parentArticuloId === null || parentArticuloId === undefined) {
    return { valid: true };
  }

  const parent = db
    .prepare(
      'SELECT id, producto_id, familia_id, parent_articulo_id FROM stock_articulos WHERE id = ?'
    )
    .get(parentArticuloId);

  if (!parent) {
    return { valid: false, error: { code: 'NOT_FOUND', message: 'parent_articulo_id not found' } };
  }

  if (productoId !== null && productoId !== undefined) {
    if (parent.producto_id !== productoId) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'parent_articulo_id must belong to the same producto',
        },
      };
    }
  } else if (familiaId !== null && familiaId !== undefined) {
    if (parent.familia_id !== familiaId || parent.producto_id !== null) {
      return {
        valid: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'parent_articulo_id must be a direct article of the same familia',
        },
      };
    }
  }

  if (parent.parent_articulo_id) {
    return {
      valid: false,
      error: { code: 'INVALID_INPUT', message: 'Variants can only be nested one level deep' },
    };
  }

  return { valid: true };
}

function registerStockHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const getDb = deps.getDatabase || getDatabase;

  ipc.handle('stock:getTree', async () => {
    try {
      const db = getDb();
      return { success: true, data: buildTree(db) };
    } catch (error) {
      console.error('Error in stock:getTree:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:createFamilia', async (_event, data) => {
    try {
      const validation = validateTextField(data?.nombre, 'nombre');
      if (!validation.valid) return { success: false, error: validation.error };

      const db = getDb();
      const nextOrden =
        db.prepare('SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM stock_familias').get()
          .maxOrden + 1;

      const info = db
        .prepare(
          'INSERT INTO stock_familias (nombre, codigo, descripcion, orden) VALUES (?, ?, ?, ?)'
        )
        .run(
          normalizeText(data.nombre),
          normalizeText(data.codigo),
          normalizeText(data.descripcion),
          Number.isInteger(data?.orden) ? data.orden : nextOrden
        );

      const created = db
        .prepare('SELECT * FROM stock_familias WHERE id = ?')
        .get(info.lastInsertRowid);
      return {
        success: true,
        data: {
          id: created.id,
          name: created.nombre,
          code: created.codigo,
          description: created.descripcion,
          notes: created.descripcion,
          order: created.orden,
          fecha_creacion: created.fecha_creacion,
          fecha_mod: created.fecha_mod,
          products: [],
          stock_total: 0,
        },
      };
    } catch (error) {
      console.error('Error in stock:createFamilia:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:updateFamilia', async (_event, id, data) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      const validation = validateTextField(data?.nombre, 'nombre');
      if (!validation.valid) return { success: false, error: validation.error };

      const db = getDb();
      const existing = db.prepare('SELECT id FROM stock_familias WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Familia not found' } };
      }

      db.prepare(
        'UPDATE stock_familias SET nombre = ?, codigo = ?, descripcion = ? WHERE id = ?'
      ).run(
        normalizeText(data.nombre),
        normalizeText(data.codigo),
        normalizeText(data.descripcion),
        id
      );

      const updated = db.prepare('SELECT * FROM stock_familias WHERE id = ?').get(id);
      const tree = buildTree(db);
      const family = tree.find((entry) => entry.id === id) || { products: [] };

      return {
        success: true,
        data: {
          id: updated.id,
          name: updated.nombre,
          code: updated.codigo,
          description: updated.descripcion,
          notes: updated.descripcion,
          order: updated.orden,
          fecha_creacion: updated.fecha_creacion,
          fecha_mod: updated.fecha_mod,
          products: family.products || [],
          stock_total: family.stock_total || 0,
        },
      };
    } catch (error) {
      console.error('Error in stock:updateFamilia:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:deleteFamilia', async (_event, id) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare('SELECT id FROM stock_familias WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Familia not found' } };
      }

      db.prepare('DELETE FROM stock_familias WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in stock:deleteFamilia:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:createProducto', async (_event, data) => {
    try {
      if (!isPositiveInteger(data?.familia_id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'familia_id is required' },
        };
      }
      const validation = validateTextField(data?.nombre, 'nombre');
      if (!validation.valid) return { success: false, error: validation.error };

      const db = getDb();
      const familia = db.prepare('SELECT id FROM stock_familias WHERE id = ?').get(data.familia_id);
      if (!familia) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Familia not found' } };
      }

      const nextOrden =
        db
          .prepare(
            'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM stock_productos WHERE familia_id = ?'
          )
          .get(data.familia_id).maxOrden + 1;

      const info = db
        .prepare(
          'INSERT INTO stock_productos (familia_id, nombre, ref, descripcion, orden) VALUES (?, ?, ?, ?, ?)'
        )
        .run(
          data.familia_id,
          normalizeText(data.nombre),
          normalizeText(data.ref),
          normalizeText(data.descripcion),
          Number.isInteger(data?.orden) ? data.orden : nextOrden
        );

      const created = db
        .prepare('SELECT * FROM stock_productos WHERE id = ?')
        .get(info.lastInsertRowid);
      return {
        success: true,
        data: {
          id: created.id,
          family_id: created.familia_id,
          name: created.nombre,
          ref: created.ref,
          description: created.descripcion,
          notes: created.descripcion,
          order: created.orden,
          fecha_creacion: created.fecha_creacion,
          fecha_mod: created.fecha_mod,
          articles: [],
          stock_total: 0,
        },
      };
    } catch (error) {
      console.error('Error in stock:createProducto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:updateProducto', async (_event, id, data) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      const validation = validateTextField(data?.nombre, 'nombre');
      if (!validation.valid) return { success: false, error: validation.error };
      if (!isPositiveInteger(data?.familia_id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'familia_id is required' },
        };
      }

      const db = getDb();
      const existing = db.prepare('SELECT id FROM stock_productos WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
      }

      const familia = db.prepare('SELECT id FROM stock_familias WHERE id = ?').get(data.familia_id);
      if (!familia) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Familia not found' } };
      }

      db.prepare(
        'UPDATE stock_productos SET familia_id = ?, nombre = ?, ref = ?, descripcion = ?, orden = ? WHERE id = ?'
      ).run(
        data.familia_id,
        normalizeText(data.nombre),
        normalizeText(data.ref),
        normalizeText(data.descripcion),
        Number.isInteger(data?.orden) ? data.orden : 0,
        id
      );

      const updated = db.prepare('SELECT * FROM stock_productos WHERE id = ?').get(id);
      return {
        success: true,
        data: {
          id: updated.id,
          family_id: updated.familia_id,
          name: updated.nombre,
          ref: updated.ref,
          description: updated.descripcion,
          notes: updated.descripcion,
          order: updated.orden,
          fecha_creacion: updated.fecha_creacion,
          fecha_mod: updated.fecha_mod,
          articles: [],
          stock_total: 0,
        },
      };
    } catch (error) {
      console.error('Error in stock:updateProducto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:deleteProducto', async (_event, id) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare('SELECT id FROM stock_productos WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
      }

      db.prepare('DELETE FROM stock_productos WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error in stock:deleteProducto:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:createArticulo', async (_event, data) => {
    try {
      const hasProducto = isPositiveInteger(data?.producto_id);
      const hasFamilia = isPositiveInteger(data?.familia_id);
      if (hasProducto === hasFamilia) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Either producto_id or familia_id is required (but not both)',
          },
        };
      }
      const validation = validateTextField(data?.nombre, 'nombre');
      if (!validation.valid) return { success: false, error: validation.error };
      if (data?.cantidad !== undefined) {
        const quantityValidation = validateQuantity(data.cantidad);
        if (!quantityValidation.valid) return { success: false, error: quantityValidation.error };
      }

      const db = getDb();
      let resolvedProductoId = null;
      let resolvedFamiliaId = null;

      if (hasProducto) {
        const producto = db
          .prepare('SELECT id FROM stock_productos WHERE id = ?')
          .get(data.producto_id);
        if (!producto) {
          return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
        }
        resolvedProductoId = data.producto_id;
      } else {
        const familia = db
          .prepare('SELECT id FROM stock_familias WHERE id = ?')
          .get(data.familia_id);
        if (!familia) {
          return { success: false, error: { code: 'NOT_FOUND', message: 'Familia not found' } };
        }
        resolvedFamiliaId = data.familia_id;
      }

      const parentArticuloId = data?.parent_articulo_id ?? null;
      if (parentArticuloId !== null) {
        if (!isPositiveInteger(parentArticuloId)) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'parent_articulo_id must be a positive integer',
            },
          };
        }
        const parentCheck = ensureParentMatchesScope(
          db,
          parentArticuloId,
          resolvedProductoId,
          resolvedFamiliaId
        );
        if (!parentCheck.valid) return { success: false, error: parentCheck.error };
      }

      let nextOrden;
      if (resolvedProductoId !== null) {
        nextOrden =
          db
            .prepare(
              'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM stock_articulos WHERE producto_id = ? AND COALESCE(parent_articulo_id, 0) = COALESCE(?, 0)'
            )
            .get(resolvedProductoId, parentArticuloId).maxOrden + 1;
      } else {
        nextOrden =
          db
            .prepare(
              'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM stock_articulos WHERE familia_id = ? AND producto_id IS NULL AND COALESCE(parent_articulo_id, 0) = COALESCE(?, 0)'
            )
            .get(resolvedFamiliaId, parentArticuloId).maxOrden + 1;
      }

      const info = db
        .prepare(
          'INSERT INTO stock_articulos (producto_id, familia_id, parent_articulo_id, nombre, ref, color, color_hex, descripcion, notas, cantidad, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          resolvedProductoId,
          resolvedFamiliaId,
          parentArticuloId,
          normalizeText(data.nombre),
          normalizeText(data.ref),
          normalizeText(data.color),
          normalizeText(data.color_hex),
          normalizeText(data.descripcion),
          normalizeText(data.notas),
          Number.isInteger(data?.cantidad) ? data.cantidad : 0,
          Number.isInteger(data?.orden) ? data.orden : nextOrden
        );

      const created = db
        .prepare('SELECT * FROM stock_articulos WHERE id = ?')
        .get(info.lastInsertRowid);
      return { success: true, data: { ...mapArticulo(created), variants: [] } };
    } catch (error) {
      console.error('Error in stock:createArticulo:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:updateArticulo', async (_event, id, data) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare('SELECT * FROM stock_articulos WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      // Resolve producto_id / familia_id — caller passes whichever applies
      const incomingProductoId =
        'producto_id' in (data || {}) ? data.producto_id : existing.producto_id;
      const incomingFamiliaId =
        'familia_id' in (data || {}) ? data.familia_id : existing.familia_id;

      let nextProductoId = null;
      let nextFamiliaId = null;

      if (isPositiveInteger(incomingProductoId)) {
        const producto = db
          .prepare('SELECT id FROM stock_productos WHERE id = ?')
          .get(incomingProductoId);
        if (!producto) {
          return { success: false, error: { code: 'NOT_FOUND', message: 'Producto not found' } };
        }
        nextProductoId = incomingProductoId;
      } else if (isPositiveInteger(incomingFamiliaId)) {
        const familia = db
          .prepare('SELECT id FROM stock_familias WHERE id = ?')
          .get(incomingFamiliaId);
        if (!familia) {
          return { success: false, error: { code: 'NOT_FOUND', message: 'Familia not found' } };
        }
        nextFamiliaId = incomingFamiliaId;
      } else {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'producto_id or familia_id is required' },
        };
      }

      const nextParentArticuloId =
        data?.parent_articulo_id === undefined
          ? existing.parent_articulo_id
          : data.parent_articulo_id;
      if (nextParentArticuloId !== null) {
        if (!isPositiveInteger(nextParentArticuloId)) {
          return {
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'parent_articulo_id must be a positive integer',
            },
          };
        }
        const parentCheck = ensureParentMatchesScope(
          db,
          nextParentArticuloId,
          nextProductoId,
          nextFamiliaId
        );
        if (!parentCheck.valid) return { success: false, error: parentCheck.error };
      }

      const nextName = validateTextField(data?.nombre, 'nombre').valid
        ? normalizeText(data.nombre)
        : existing.nombre;
      const nextQuantity = data?.cantidad === undefined ? existing.cantidad : data.cantidad;
      if (data?.cantidad !== undefined) {
        const quantityValidation = validateQuantity(data.cantidad);
        if (!quantityValidation.valid) return { success: false, error: quantityValidation.error };
      }

      db.prepare(
        'UPDATE stock_articulos SET producto_id = ?, familia_id = ?, parent_articulo_id = ?, nombre = ?, ref = ?, color = ?, color_hex = ?, descripcion = ?, notas = ?, cantidad = ?, orden = ? WHERE id = ?'
      ).run(
        nextProductoId,
        nextFamiliaId,
        nextParentArticuloId,
        nextName,
        'ref' in (data || {}) ? normalizeText(data.ref) : existing.ref,
        'color' in (data || {}) ? normalizeText(data.color) : existing.color,
        'color_hex' in (data || {}) ? normalizeText(data.color_hex) : existing.color_hex,
        'descripcion' in (data || {}) ? normalizeText(data.descripcion) : existing.descripcion,
        'notas' in (data || {}) ? normalizeText(data.notas) : existing.notas,
        nextQuantity,
        Number.isInteger(data?.orden) ? data.orden : existing.orden,
        id
      );

      const updated = db.prepare('SELECT * FROM stock_articulos WHERE id = ?').get(id);
      return { success: true, data: { ...mapArticulo(updated), variants: [] } };
    } catch (error) {
      console.error('Error in stock:updateArticulo:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:deleteArticulo', async (_event, id) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare('SELECT id FROM stock_articulos WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      // Collect all articulo IDs that will be cascade-deleted (self + child variants)
      const childIds = db
        .prepare('SELECT id FROM stock_articulos WHERE parent_articulo_id = ?')
        .all(id)
        .map((r) => r.id);
      const allIds = [id, ...childIds];

      db.prepare('DELETE FROM stock_articulos WHERE id = ?').run(id);

      // Clean up photo files on disk (best-effort)
      const baseDir = path.join(app.getPath('userData'), 'stock_fotos');
      for (const articuloId of allIds) {
        const articuloDir = path.join(baseDir, String(articuloId));
        try {
          if (fs.existsSync(articuloDir)) {
            fs.rmSync(articuloDir, { recursive: true, force: true });
          }
        } catch {
          // Best-effort cleanup
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in stock:deleteArticulo:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:setArticuloCantidad', async (_event, id, cantidad) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      const quantityValidation = validateQuantity(cantidad);
      if (!quantityValidation.valid) return { success: false, error: quantityValidation.error };

      const db = getDb();
      const existing = db.prepare('SELECT id FROM stock_articulos WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      db.prepare('UPDATE stock_articulos SET cantidad = ? WHERE id = ?').run(cantidad, id);
      const updated = db.prepare('SELECT * FROM stock_articulos WHERE id = ?').get(id);
      return {
        success: true,
        data: { ...mapArticulo(updated), cantidad: updated.cantidad, variants: [] },
      };
    } catch (error) {
      console.error('Error in stock:setArticuloCantidad:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });

  ipc.handle('stock:adjustArticuloCantidad', async (_event, id, delta) => {
    try {
      if (!isPositiveInteger(id)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'id must be a positive integer' },
        };
      }
      if (!Number.isInteger(delta)) {
        return {
          success: false,
          error: { code: 'INVALID_INPUT', message: 'delta must be an integer' },
        };
      }

      const db = getDb();
      const existing = db.prepare('SELECT id, cantidad FROM stock_articulos WHERE id = ?').get(id);
      if (!existing) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Articulo not found' } };
      }

      const nextCantidad = Math.max(0, existing.cantidad + delta);

      db.prepare('UPDATE stock_articulos SET cantidad = ? WHERE id = ?').run(nextCantidad, id);
      const updated = db.prepare('SELECT * FROM stock_articulos WHERE id = ?').get(id);
      return {
        success: true,
        data: { ...mapArticulo(updated), cantidad: updated.cantidad, variants: [] },
      };
    } catch (error) {
      console.error('Error in stock:adjustArticuloCantidad:', error);
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }
  });
}

module.exports = { registerStockHandlers };

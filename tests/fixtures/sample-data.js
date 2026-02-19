/**
 * Factory functions for creating test entities with default values.
 * Each function accepts an overrides object to customize specific fields.
 */

/**
 * Creates a test nota with default values.
 * @param {Object} overrides - Fields to override from defaults
 * @returns {Object} Nota object
 */
export function createNota(overrides = {}) {
  return {
    nombre: 'Test Nota',
    descripcion: 'This is a test nota description',
    contacto: 'Juan Pérez - 555-1234',
    urgente: 0,
    ...overrides,
  };
}

/**
 * Creates a test llamar entry with default values.
 * @param {Object} overrides - Fields to override from defaults
 * @returns {Object} Llamar object
 */
export function createLlamar(overrides = {}) {
  return {
    asunto: 'Test Call',
    contacto: '555-5678',
    nombre: 'María García',
    descripcion: 'Need to discuss the order details',
    urgente: 0,
    ...overrides,
  };
}

/**
 * Creates a test encargar entry with default values.
 * @param {Object} overrides - Fields to override from defaults
 * @returns {Object} Encargar object
 */
export function createEncargar(overrides = {}) {
  return {
    articulo: 'Test Product',
    ref_interna: 'REF-001',
    descripcion: 'Product description for testing',
    proveedor: 'Test Supplier Co.',
    ref_proveedor: 'SUP-REF-123',
    urgente: 0,
    ...overrides,
  };
}

/**
 * Creates a test proveedor with default values.
 * @param {Object} overrides - Fields to override from defaults
 * @returns {Object} Proveedor object
 */
export function createProveedor(overrides = {}) {
  return {
    razon_social: 'Test Supplier S.L.',
    direccion: 'Calle Test 123, Madrid',
    nif: 'B12345678',
    ...overrides,
  };
}

/**
 * Creates a test cliente with default values.
 * @param {Object} overrides - Fields to override from defaults
 * @returns {Object} Cliente object
 */
export function createCliente(overrides = {}) {
  return {
    razon_social: 'Test Client S.A.',
    numero_cliente: 'CLI-001',
    direccion: 'Avenida Test 456, Barcelona',
    nif: 'A98765432',
    ...overrides,
  };
}

/**
 * Creates multiple entities of a given type.
 * @param {Function} factoryFn - Factory function to use (createNota, createLlamar, etc.)
 * @param {number} count - Number of entities to create
 * @param {Function} overridesFn - Optional function that returns overrides for each entity (receives index)
 * @returns {Array} Array of entities
 */
export function createMany(factoryFn, count, overridesFn = null) {
  return Array.from({ length: count }, (_, index) => {
    const overrides = overridesFn ? overridesFn(index) : {};
    return factoryFn(overrides);
  });
}

/**
 * Creates a full set of test data for all modules.
 * Useful for setting up a complete test database.
 * @returns {Object} Object containing arrays of test entities for each module
 */
export function createFullTestData() {
  return {
    notas: [
      createNota({ nombre: 'Nota 1', urgente: 1 }),
      createNota({ nombre: 'Nota 2', urgente: 0 }),
      createNota({ nombre: 'Nota 3', contacto: null }),
    ],
    llamar: [
      createLlamar({ asunto: 'Llamada urgente', urgente: 1 }),
      createLlamar({ asunto: 'Seguimiento', urgente: 0 }),
    ],
    encargar: [
      createEncargar({ articulo: 'Artículo A', urgente: 1 }),
      createEncargar({ articulo: 'Artículo B', urgente: 0 }),
      createEncargar({ articulo: 'Artículo C', proveedor: null }),
    ],
    proveedores: [
      createProveedor({ razon_social: 'Proveedor A' }),
      createProveedor({ razon_social: 'Proveedor B', nif: 'B87654321' }),
    ],
    clientes: [
      createCliente({ razon_social: 'Cliente A', numero_cliente: 'CLI-001' }),
      createCliente({ razon_social: 'Cliente B', numero_cliente: 'CLI-002' }),
    ],
  };
}

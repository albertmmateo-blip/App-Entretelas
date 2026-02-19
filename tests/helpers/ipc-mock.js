import { vi } from 'vitest';

// Store mock responses for each channel
const mockResponses = new Map();

/**
 * Sets up a mock response for a specific IPC channel.
 * @param {string} channel - The IPC channel name (e.g., 'notas:getAll')
 * @param {any} response - The response to return when the channel is called
 */
export function mockIPCResponse(channel, response) {
  mockResponses.set(channel, response);
}

/**
 * Clears all mock IPC responses.
 */
export function clearIPCMocks() {
  mockResponses.clear();
}

/**
 * Creates a mock implementation of window.electronAPI for testing.
 * This should be set up before rendering components that use IPC.
 * @returns {Object} Mock electronAPI object
 */
export function createMockElectronAPI() {
  // Generic IPC handler factory
  const createMockHandler = (channel) => {
    return vi.fn(async (...args) => {
      const response = mockResponses.get(channel);

      if (response === undefined) {
        // Return a default success response if no mock is set
        return { success: true, data: null };
      }

      // If response is a function, call it with the arguments
      if (typeof response === 'function') {
        return response(...args);
      }

      // Otherwise return the response directly
      return response;
    });
  };

  // Mock structure matching the real window.electronAPI
  const mockAPI = {
    notas: {
      getAll: createMockHandler('notas:getAll'),
      create: createMockHandler('notas:create'),
      update: createMockHandler('notas:update'),
      delete: createMockHandler('notas:delete'),
    },
    llamar: {
      getAll: createMockHandler('llamar:getAll'),
      create: createMockHandler('llamar:create'),
      update: createMockHandler('llamar:update'),
      delete: createMockHandler('llamar:delete'),
    },
    encargar: {
      getAll: createMockHandler('encargar:getAll'),
      create: createMockHandler('encargar:create'),
      update: createMockHandler('encargar:update'),
      delete: createMockHandler('encargar:delete'),
    },
    proveedores: {
      getAll: createMockHandler('proveedores:getAll'),
      create: createMockHandler('proveedores:create'),
      update: createMockHandler('proveedores:update'),
      delete: createMockHandler('proveedores:delete'),
    },
    clientes: {
      getAll: createMockHandler('clientes:getAll'),
      create: createMockHandler('clientes:create'),
      update: createMockHandler('clientes:update'),
      delete: createMockHandler('clientes:delete'),
    },
    facturas: {
      uploadPDF: createMockHandler('facturas:uploadPDF'),
      deletePDF: createMockHandler('facturas:deletePDF'),
      getAllForEntidad: createMockHandler('facturas:getAllForEntidad'),
      getPDFBytes: createMockHandler('facturas:getPDFBytes'),
    },
    db: {
      listBackups: createMockHandler('db:listBackups'),
      restoreBackup: createMockHandler('db:restoreBackup'),
    },
  };

  return mockAPI;
}

/**
 * Sets up window.electronAPI mock before component tests.
 * Call this in beforeEach or at the start of your test.
 * @returns {Object} The mock electronAPI object
 */
export function setupIPCMock() {
  const mockAPI = createMockElectronAPI();
  global.window.electronAPI = mockAPI;
  return mockAPI;
}

/**
 * Cleans up window.electronAPI mock after tests.
 * Call this in afterEach.
 */
export function teardownIPCMock() {
  delete global.window.electronAPI;
  clearIPCMocks();
}

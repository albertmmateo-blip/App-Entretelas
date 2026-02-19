import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupIPCMock, teardownIPCMock, mockIPCResponse } from '../helpers/ipc-mock';
import { createNota, createLlamar, createEncargar } from '../fixtures/sample-data';

describe('Test Utilities - IPC Mock', () => {
  beforeEach(() => {
    setupIPCMock();
  });

  afterEach(() => {
    teardownIPCMock();
  });

  it('should set up window.electronAPI mock', () => {
    expect(window.electronAPI).toBeDefined();
    expect(window.electronAPI.notas).toBeDefined();
    expect(window.electronAPI.llamar).toBeDefined();
    expect(window.electronAPI.encargar).toBeDefined();
  });

  it('should return mock response for notas:getAll', async () => {
    const testData = [createNota({ nombre: 'Test Nota' })];

    mockIPCResponse('notas:getAll', {
      success: true,
      data: testData,
    });

    const result = await window.electronAPI.notas.getAll();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(testData);
    expect(result.data[0].nombre).toBe('Test Nota');
  });

  it('should handle dynamic mock responses', async () => {
    mockIPCResponse('notas:create', (data) => ({
      success: true,
      data: { id: 123, ...data },
    }));

    const newNota = createNota({ nombre: 'Dynamic Nota' });
    const result = await window.electronAPI.notas.create(newNota);

    expect(result.success).toBe(true);
    expect(result.data.id).toBe(123);
    expect(result.data.nombre).toBe('Dynamic Nota');
  });

  it('should return default success response when no mock is set', async () => {
    const result = await window.electronAPI.llamar.getAll();

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

describe('Test Utilities - Sample Data', () => {
  it('should create nota with default values', () => {
    const nota = createNota();

    expect(nota).toHaveProperty('nombre');
    expect(nota).toHaveProperty('descripcion');
    expect(nota).toHaveProperty('contacto');
    expect(nota.urgente).toBe(0);
  });

  it('should override nota fields', () => {
    const nota = createNota({
      nombre: 'Custom Name',
      urgente: 1,
    });

    expect(nota.nombre).toBe('Custom Name');
    expect(nota.urgente).toBe(1);
  });

  it('should create llamar with required fields', () => {
    const llamar = createLlamar();

    expect(llamar).toHaveProperty('asunto');
    expect(llamar).toHaveProperty('contacto');
    expect(llamar.asunto).toBeTruthy();
    expect(llamar.contacto).toBeTruthy();
  });

  it('should create encargar with required fields', () => {
    const encargar = createEncargar();

    expect(encargar).toHaveProperty('articulo');
    expect(encargar.articulo).toBeTruthy();
  });
});

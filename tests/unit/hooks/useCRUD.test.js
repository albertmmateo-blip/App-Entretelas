import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import errorMessages from '../../../src/renderer/utils/errorMessages';
import useCRUD, { resetCrudStore } from '../../../src/renderer/hooks/useCRUD';

const showToast = vi.fn();

vi.mock('../../../src/renderer/hooks/useToast', () => ({
  default: () => ({ showToast }),
}));

describe('useCRUD hook', () => {
  beforeEach(() => {
    showToast.mockReset();
    resetCrudStore('notas');
    window.electronAPI = {
      notas: {
        getAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
  });

  it('fetches entries successfully', async () => {
    window.electronAPI.notas.getAll.mockResolvedValue({
      success: true,
      data: [{ id: 1, nombre: 'Test' }],
    });

    const { result } = renderHook(() => useCRUD('notas'));

    await act(async () => {
      await result.current.fetchAll();
    });

    expect(result.current.entries).toEqual([{ id: 1, nombre: 'Test' }]);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows toast on fetch error', async () => {
    window.electronAPI.notas.getAll.mockResolvedValue({
      success: false,
      error: { code: 'DB_ERROR', message: 'fail' },
    });

    const { result } = renderHook(() => useCRUD('notas'));

    await act(async () => {
      await result.current.fetchAll();
    });

    expect(result.current.entries).toEqual([]);
    expect(showToast).toHaveBeenCalledWith(errorMessages.DB_ERROR, 'error');
  });

  it('creates and updates entries', async () => {
    window.electronAPI.notas.create.mockResolvedValue({
      success: true,
      data: { id: 1, nombre: 'Nueva' },
    });
    window.electronAPI.notas.update.mockResolvedValue({
      success: true,
      data: { id: 1, nombre: 'Actualizada' },
    });

    const { result } = renderHook(() => useCRUD('notas'));

    await act(async () => {
      await result.current.create({ nombre: 'Nueva' });
    });

    expect(result.current.entries[0].nombre).toBe('Nueva');
    expect(showToast).toHaveBeenCalledWith('Guardado correctamente', 'success');

    showToast.mockClear();

    await act(async () => {
      await result.current.update(1, { nombre: 'Actualizada' });
    });

    expect(result.current.entries[0].nombre).toBe('Actualizada');
    expect(showToast).toHaveBeenCalledWith('Guardado correctamente', 'success');
  });

  it('deletes entries', async () => {
    window.electronAPI.notas.create.mockResolvedValue({
      success: true,
      data: { id: 1, nombre: 'Borrar' },
    });
    window.electronAPI.notas.delete.mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useCRUD('notas'));

    await act(async () => {
      await result.current.create({ nombre: 'Borrar' });
    });

    expect(result.current.entries).toHaveLength(1);

    await act(async () => {
      await result.current.delete(1);
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it('toggles urgente status and reverts on failure', async () => {
    window.electronAPI.notas.create.mockResolvedValue({
      success: true,
      data: { id: 1, nombre: 'Urgente', urgente: 0 },
    });

    window.electronAPI.notas.update
      .mockResolvedValueOnce({
        success: true,
        data: { id: 1, nombre: 'Urgente', urgente: 1 },
      })
      .mockResolvedValueOnce({
        success: false,
        error: { code: 'DB_ERROR', message: 'fail' },
      });

    const { result } = renderHook(() => useCRUD('notas'));

    await act(async () => {
      await result.current.create({ nombre: 'Urgente' });
    });

    await act(async () => {
      await result.current.toggleUrgente(1, true);
    });

    expect(result.current.entries[0].urgente).toBe(1);

    await act(async () => {
      await result.current.toggleUrgente(1, false);
    });

    expect(result.current.entries[0].urgente).toBe(1);
    expect(showToast).toHaveBeenCalledWith(errorMessages.DB_ERROR, 'error');
  });
});

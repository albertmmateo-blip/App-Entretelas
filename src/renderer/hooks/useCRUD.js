import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import errorMessages from '../utils/errorMessages';
import useToast from './useToast';

const MODULES = ['notas', 'llamar', 'encargar', 'proveedores', 'clientes'];
const stores = {};

const createCrudStore = (moduleName) =>
  create((set, get) => ({
    entries: [],
    loading: false,
    error: null,

    fetchAll: async (showToast) => {
      set({ loading: true, error: null });
      try {
        const response = await window.electronAPI[moduleName].getAll();

        if (response.success) {
          set({ entries: response.data, loading: false });
          return response.data;
        }

        const errorMsg = errorMessages[response.error.code] || response.error.message;
        set({ error: response.error, loading: false });
        showToast?.(errorMsg, 'error');
        return null;
      } catch (error) {
        set({ error, loading: false });
        showToast?.(errorMessages.DB_ERROR, 'error');
        return null;
      }
    },

    createEntry: async (data, showToast) => {
      set({ loading: true, error: null });
      try {
        const response = await window.electronAPI[moduleName].create(data);

        if (response.success) {
          set((state) => ({
            entries: [response.data, ...state.entries],
            loading: false,
          }));
          showToast?.('Guardado correctamente', 'success');
          return response.data;
        }

        const errorMsg = errorMessages[response.error.code] || response.error.message;
        set({ error: response.error, loading: false });
        showToast?.(errorMsg, 'error');
        return null;
      } catch (error) {
        set({ error, loading: false });
        showToast?.(errorMessages.DB_ERROR, 'error');
        return null;
      }
    },

    updateEntry: async (id, data, showToast) => {
      set({ loading: true, error: null });
      try {
        const response = await window.electronAPI[moduleName].update(id, data);

        if (response.success) {
          set((state) => ({
            entries: state.entries.map((entry) => (entry.id === id ? response.data : entry)),
            loading: false,
          }));
          showToast?.('Guardado correctamente', 'success');
          return response.data;
        }

        const errorMsg = errorMessages[response.error.code] || response.error.message;
        set({ error: response.error, loading: false });
        showToast?.(errorMsg, 'error');
        return null;
      } catch (error) {
        set({ error, loading: false });
        showToast?.(errorMessages.DB_ERROR, 'error');
        return null;
      }
    },

    deleteEntry: async (id, showToast) => {
      set({ loading: true, error: null });
      try {
        const response = await window.electronAPI[moduleName].delete(id);

        if (response.success) {
          set((state) => ({
            entries: state.entries.filter((entry) => entry.id !== id),
            loading: false,
          }));
          showToast?.('Eliminado correctamente', 'success');
          return true;
        }

        const errorMsg = errorMessages[response.error.code] || response.error.message;
        set({ error: response.error, loading: false });
        showToast?.(errorMsg, 'error');
        return false;
      } catch (error) {
        set({ error, loading: false });
        showToast?.(errorMessages.DB_ERROR, 'error');
        return false;
      }
    },

    toggleUrgenteEntry: async (id, urgente, showToast) => {
      const previousEntries = get().entries;
      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id ? { ...entry, urgente: urgente ? 1 : 0 } : entry
        ),
      }));

      try {
        const response = await window.electronAPI[moduleName].update(id, { urgente });

        if (response.success) {
          set((state) => ({
            entries: state.entries.map((entry) => (entry.id === id ? response.data : entry)),
          }));
          return true;
        }

        set({ entries: previousEntries });
        const errorMsg = errorMessages[response.error.code] || response.error.message;
        showToast?.(errorMsg, 'error');
        return false;
      } catch (error) {
        set({ entries: previousEntries });
        showToast?.(errorMessages.DB_ERROR, 'error');
        return false;
      }
    },
  }));

const getStore = (moduleName) => {
  if (!MODULES.includes(moduleName)) {
    throw new Error(`Unsupported module: ${moduleName}`);
  }

  if (!stores[moduleName]) {
    stores[moduleName] = createCrudStore(moduleName);
  }

  return stores[moduleName];
};

export const resetCrudStore = (moduleName) => {
  if (stores[moduleName]) {
    stores[moduleName].setState({ entries: [], loading: false, error: null });
  }
};

function useCRUD(moduleName) {
  const { showToast } = useToast();
  const store = useMemo(() => getStore(moduleName), [moduleName]);
  const state = store();

  const fetchAll = useCallback(() => store.getState().fetchAll(showToast), [store, showToast]);
  const createEntry = useCallback(
    (data) => store.getState().createEntry(data, showToast),
    [store, showToast]
  );
  const update = useCallback(
    (id, data) => store.getState().updateEntry(id, data, showToast),
    [store, showToast]
  );
  const deleteEntry = useCallback(
    (id) => store.getState().deleteEntry(id, showToast),
    [store, showToast]
  );
  const toggleUrgente = useCallback(
    (id, urgente) => store.getState().toggleUrgenteEntry(id, urgente, showToast),
    [store, showToast]
  );

  return {
    entries: state.entries,
    loading: state.loading,
    error: state.error,
    fetchAll,
    create: createEntry,
    update,
    delete: deleteEntry,
    toggleUrgente,
  };
}

export default useCRUD;

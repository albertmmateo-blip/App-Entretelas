import { create } from 'zustand';
import errorMessages from '../utils/errorMessages';

const useNotasStore = create((set, get) => ({
  notas: [],
  loading: false,
  error: null,

  /**
   * Fetch all notas from the database
   * @param {Function} showToast - Toast notification function
   */
  fetchAll: async (showToast) => {
    set({ loading: true, error: null });
    try {
      const response = await window.electronAPI.notas.getAll();

      if (response.success) {
        set({ notas: response.data, loading: false });
      } else {
        const errorMsg = errorMessages[response.error.code] || response.error.message;
        set({ error: response.error, loading: false });
        if (showToast) {
          showToast(errorMsg, 'error');
        }
      }
    } catch (error) {
      console.error('Error fetching notas:', error);
      set({ error, loading: false });
      if (showToast) {
        showToast(errorMessages.DB_ERROR, 'error');
      }
    }
  },

  /**
   * Create a new nota
   * @param {Object} data - The nota data
   * @param {Function} showToast - Toast notification function
   * @returns {Promise<Object|null>} The created nota or null on error
   */
  create: async (data, showToast) => {
    set({ loading: true, error: null });
    try {
      const response = await window.electronAPI.notas.create(data);

      if (response.success) {
        set((state) => ({
          notas: [response.data, ...state.notas],
          loading: false,
        }));
        if (showToast) {
          showToast('Guardado correctamente', 'success');
        }
        return response.data;
      }

      const errorMsg = errorMessages[response.error.code] || response.error.message;
      set({ error: response.error, loading: false });
      if (showToast) {
        showToast(errorMsg, 'error');
      }
      return null;
    } catch (error) {
      console.error('Error creating nota:', error);
      set({ error, loading: false });
      if (showToast) {
        showToast(errorMessages.DB_ERROR, 'error');
      }
      return null;
    }
  },

  /**
   * Update an existing nota
   * @param {number} id - The nota ID
   * @param {Object} data - The nota data to update
   * @param {Function} showToast - Toast notification function
   * @returns {Promise<Object|null>} The updated nota or null on error
   */
  update: async (id, data, showToast) => {
    set({ loading: true, error: null });
    try {
      const response = await window.electronAPI.notas.update(id, data);

      if (response.success) {
        set((state) => ({
          notas: state.notas.map((nota) => (nota.id === id ? response.data : nota)),
          loading: false,
        }));
        if (showToast) {
          showToast('Guardado correctamente', 'success');
        }
        return response.data;
      }

      const errorMsg = errorMessages[response.error.code] || response.error.message;
      set({ error: response.error, loading: false });
      if (showToast) {
        showToast(errorMsg, 'error');
      }
      return null;
    } catch (error) {
      console.error('Error updating nota:', error);
      set({ error, loading: false });
      if (showToast) {
        showToast(errorMessages.DB_ERROR, 'error');
      }
      return null;
    }
  },

  /**
   * Delete a nota
   * @param {number} id - The nota ID
   * @param {Function} showToast - Toast notification function
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  delete: async (id, showToast) => {
    set({ loading: true, error: null });
    try {
      const response = await window.electronAPI.notas.delete(id);

      if (response.success) {
        set((state) => ({
          notas: state.notas.filter((nota) => nota.id !== id),
          loading: false,
        }));
        if (showToast) {
          showToast('Eliminado correctamente', 'success');
        }
        return true;
      }

      const errorMsg = errorMessages[response.error.code] || response.error.message;
      set({ error: response.error, loading: false });
      if (showToast) {
        showToast(errorMsg, 'error');
      }
      return false;
    } catch (error) {
      console.error('Error deleting nota:', error);
      set({ error, loading: false });
      if (showToast) {
        showToast(errorMessages.DB_ERROR, 'error');
      }
      return false;
    }
  },

  /**
   * Toggle urgente status of a nota
   * @param {number} id - The nota ID
   * @param {boolean} urgente - The new urgente status
   * @param {Function} showToast - Toast notification function
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  toggleUrgente: async (id, urgente, showToast) => {
    // Optimistic update
    const previousNotas = get().notas;
    set((state) => ({
      notas: state.notas.map((nota) =>
        nota.id === id ? { ...nota, urgente: urgente ? 1 : 0 } : nota
      ),
    }));

    try {
      const response = await window.electronAPI.notas.update(id, { urgente });

      if (response.success) {
        // Update with server response to ensure consistency
        set((state) => ({
          notas: state.notas.map((nota) => (nota.id === id ? response.data : nota)),
        }));
        return true;
      }

      // Revert on error
      set({ notas: previousNotas });
      const errorMsg = errorMessages[response.error.code] || response.error.message;
      if (showToast) {
        showToast(errorMsg, 'error');
      }
      return false;
    } catch (error) {
      console.error('Error toggling urgente:', error);
      // Revert on error
      set({ notas: previousNotas });
      if (showToast) {
        showToast(errorMessages.DB_ERROR, 'error');
      }
      return false;
    }
  },
}));

export default useNotasStore;

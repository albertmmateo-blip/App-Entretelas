const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database backup operations
  db: {
    listBackups: () => ipcRenderer.invoke('db:listBackups'),
    restoreBackup: (backupFilename) => ipcRenderer.invoke('db:restoreBackup', backupFilename),
  },
  system: {
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
  },
  // Notas module
  notas: {
    getAll: () => ipcRenderer.invoke('notas:getAll'),
    create: (data) => ipcRenderer.invoke('notas:create', data),
    update: (id, data) => ipcRenderer.invoke('notas:update', id, data),
    delete: (id) => ipcRenderer.invoke('notas:delete', id),
  },
  // Llamar module
  llamar: {
    getAll: () => ipcRenderer.invoke('llamar:getAll'),
    create: (data) => ipcRenderer.invoke('llamar:create', data),
    update: (id, data) => ipcRenderer.invoke('llamar:update', id, data),
    delete: (id) => ipcRenderer.invoke('llamar:delete', id),
  },
  // Encargar module
  encargar: {
    getAll: () => ipcRenderer.invoke('encargar:getAll'),
    create: (data) => ipcRenderer.invoke('encargar:create', data),
    update: (id, data) => ipcRenderer.invoke('encargar:update', id, data),
    delete: (id) => ipcRenderer.invoke('encargar:delete', id),
  },
  // Proveedores module
  proveedores: {
    getAll: () => ipcRenderer.invoke('proveedores:getAll'),
    create: (data) => ipcRenderer.invoke('proveedores:create', data),
    update: (id, data) => ipcRenderer.invoke('proveedores:update', id, data),
    delete: (id) => ipcRenderer.invoke('proveedores:delete', id),
  },
  // Clientes module
  clientes: {
    getAll: () => ipcRenderer.invoke('clientes:getAll'),
    create: (data) => ipcRenderer.invoke('clientes:create', data),
    update: (id, data) => ipcRenderer.invoke('clientes:update', id, data),
    delete: (id) => ipcRenderer.invoke('clientes:delete', id),
  },
  // Facturas module
  facturas: {
    uploadPDF: (params) => ipcRenderer.invoke('facturas:uploadPDF', params),
    deletePDF: (id) => ipcRenderer.invoke('facturas:deletePDF', id),
    getAllForEntidad: (params) => ipcRenderer.invoke('facturas:getAllForEntidad', params),
    getStatsByTipo: (params) => ipcRenderer.invoke('facturas:getStatsByTipo', params),
    updatePDFMetadata: (id, data) => ipcRenderer.invoke('facturas:updatePDFMetadata', id, data),
    getPDFBytes: (pdfPath) => ipcRenderer.invoke('facturas:getPDFBytes', pdfPath),
    openStoredFile: (relativePath) => ipcRenderer.invoke('facturas:openStoredFile', relativePath),
  },
});

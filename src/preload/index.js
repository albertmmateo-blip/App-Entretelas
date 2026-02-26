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
    openArreglosMonthlySummariesWindow: (scope) =>
      ipcRenderer.invoke('system:openArreglosMonthlySummariesWindow', scope),
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
  encargarCatalogo: {
    getFolders: (params = null) => ipcRenderer.invoke('encargarCatalogo:getFolders', params),
    getFolderById: (id) => ipcRenderer.invoke('encargarCatalogo:getFolderById', id),
    createFolder: (data) => ipcRenderer.invoke('encargarCatalogo:createFolder', data),
    updateFolder: (id, data) => ipcRenderer.invoke('encargarCatalogo:updateFolder', id, data),
    deleteFolder: (id) => ipcRenderer.invoke('encargarCatalogo:deleteFolder', id),
    getEntries: (params = null) => ipcRenderer.invoke('encargarCatalogo:getEntries', params),
    getEntryById: (id) => ipcRenderer.invoke('encargarCatalogo:getEntryById', id),
    createEntry: (data) => ipcRenderer.invoke('encargarCatalogo:createEntry', data),
    updateEntry: (id, data) => ipcRenderer.invoke('encargarCatalogo:updateEntry', id, data),
    deleteEntry: (id) => ipcRenderer.invoke('encargarCatalogo:deleteEntry', id),
  },
  secretCatalogo: {
    getFolders: (params = null) => ipcRenderer.invoke('secretCatalogo:getFolders', params),
    getFolderById: (id) => ipcRenderer.invoke('secretCatalogo:getFolderById', id),
    createFolder: (data) => ipcRenderer.invoke('secretCatalogo:createFolder', data),
    updateFolder: (id, data) => ipcRenderer.invoke('secretCatalogo:updateFolder', id, data),
    deleteFolder: (id) => ipcRenderer.invoke('secretCatalogo:deleteFolder', id),
    getEntries: (params = null) => ipcRenderer.invoke('secretCatalogo:getEntries', params),
    getEntryById: (id) => ipcRenderer.invoke('secretCatalogo:getEntryById', id),
    createEntry: (data) => ipcRenderer.invoke('secretCatalogo:createEntry', data),
    updateEntry: (id, data) => ipcRenderer.invoke('secretCatalogo:updateEntry', id, data),
    deleteEntry: (id) => ipcRenderer.invoke('secretCatalogo:deleteEntry', id),
  },
  // Arreglos module
  arreglos: {
    getAll: () => ipcRenderer.invoke('arreglos:getAll'),
    create: (data) => ipcRenderer.invoke('arreglos:create', data),
    update: (id, data) => ipcRenderer.invoke('arreglos:update', id, data),
    delete: (id) => ipcRenderer.invoke('arreglos:delete', id),
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
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb) => {
      ipcRenderer.on('window:maximized', (_, val) => cb(val));
    },
  },
  // Guardado module
  guardado: {
    getLugares: () => ipcRenderer.invoke('guardado:getLugares'),
    createLugar: (data) => ipcRenderer.invoke('guardado:createLugar', data),
    updateLugar: (id, data) => ipcRenderer.invoke('guardado:updateLugar', id, data),
    deleteLugar: (id) => ipcRenderer.invoke('guardado:deleteLugar', id),
    createCompartimento: (data) => ipcRenderer.invoke('guardado:createCompartimento', data),
    updateCompartimento: (id, data) => ipcRenderer.invoke('guardado:updateCompartimento', id, data),
    deleteCompartimento: (id) => ipcRenderer.invoke('guardado:deleteCompartimento', id),
    getProductos: () => ipcRenderer.invoke('guardado:getProductos'),
    createProducto: (data) => ipcRenderer.invoke('guardado:createProducto', data),
    updateProducto: (id, data) => ipcRenderer.invoke('guardado:updateProducto', id, data),
    deleteProducto: (id) => ipcRenderer.invoke('guardado:deleteProducto', id),
    getAsignaciones: () => ipcRenderer.invoke('guardado:getAsignaciones'),
    createAsignacion: (data) => ipcRenderer.invoke('guardado:createAsignacion', data),
    updateAsignacion: (id, data) => ipcRenderer.invoke('guardado:updateAsignacion', id, data),
    deleteAsignacion: (id) => ipcRenderer.invoke('guardado:deleteAsignacion', id),
    createArticulo: (data) => ipcRenderer.invoke('guardado:createArticulo', data),
    updateArticulo: (id, data) => ipcRenderer.invoke('guardado:updateArticulo', id, data),
    deleteArticulo: (id) => ipcRenderer.invoke('guardado:deleteArticulo', id),
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

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database backup operations
  db: {
    listBackups: () => ipcRenderer.invoke('db:listBackups'),
    restoreBackup: (backupFilename) => ipcRenderer.invoke('db:restoreBackup', backupFilename),
  },
  // Notas module
  notas: {
    getAll: () => ipcRenderer.invoke('notas:getAll'),
    create: (data) => ipcRenderer.invoke('notas:create', data),
    update: (id, data) => ipcRenderer.invoke('notas:update', id, data),
    delete: (id) => ipcRenderer.invoke('notas:delete', id),
  },
});

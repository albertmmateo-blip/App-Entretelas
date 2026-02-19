const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for future IPC handlers
  // Example: notas: {
  //   getAll: () => ipcRenderer.invoke('notas:getAll'),
  //   create: (data) => ipcRenderer.invoke('notas:create', data),
  //   update: (id, data) => ipcRenderer.invoke('notas:update', id, data),
  //   delete: (id) => ipcRenderer.invoke('notas:delete', id),
  // }
});

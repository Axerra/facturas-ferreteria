const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    savePDF: (data) => ipcRenderer.invoke('save-pdf', data),
    saveJson: (data) => ipcRenderer.invoke('save-json', data),
    getBackupPath: () => ipcRenderer.invoke('get-backup-path')
});

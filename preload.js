const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    saveProject: (data) => ipcRenderer.invoke('file:saveProject', data),
    getLibrary: (folderPath) => ipcRenderer.invoke('file:getLibrary', folderPath),
    loadAudioFile: (filePath) => ipcRenderer.invoke('file:loadAudio', filePath),
    deleteProject: (folderPath, projectName) => ipcRenderer.invoke('file:deleteProject', { folderPath, projectName })
});

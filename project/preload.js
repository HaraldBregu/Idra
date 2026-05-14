const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('glassWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  platform: () => ipcRenderer.invoke('app:platform'),
  onMaximizedChange: (callback) => {
    const listener = (_event, isMaximized) => callback(Boolean(isMaximized));
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  }
});

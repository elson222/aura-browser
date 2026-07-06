const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // === Search ===
  performNavigation: (query) => ipcRenderer.send('perform-navigation', query),
  cancelSearch: () => ipcRenderer.send('cancel-search'),
  onFocusSearch: (callback) => ipcRenderer.on('focus-search', (_event, ...args) => callback(...args)),

  // === Extensions ===
  listExtensions: () => ipcRenderer.invoke('list-extensions'),
  installExtension: () => ipcRenderer.invoke('install-extension'),
  removeExtension: (id) => ipcRenderer.invoke('remove-extension', id),
  toggleExtension: (id, enabled) => ipcRenderer.invoke('toggle-extension', id, enabled),
  onExtensionsUpdated: (callback) => ipcRenderer.on('extensions-updated', (_event, data) => callback(data)),
  cancelExtensions: () => ipcRenderer.send('cancel-extensions'),

  // === Dark Mode ===
  toggleDarkMode: () => ipcRenderer.invoke('toggle-dark-mode'),
  getDarkModeStatus: () => ipcRenderer.invoke('get-dark-mode-status'),

  // === Glassmorphism Mode ===
  toggleGlassmorphism: () => ipcRenderer.invoke('toggle-glassmorphism'),
  getGlassmorphismStatus: () => ipcRenderer.invoke('get-glassmorphism-status'),

  // === Downloads ===
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  getDetectedMedia: () => ipcRenderer.invoke('get-detected-media'),
  startDownload: (url) => ipcRenderer.send('start-download', url),
  pauseDownload: (id) => ipcRenderer.send('pause-download', id),
  resumeDownload: (id) => ipcRenderer.send('resume-download', id),
  cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
  openDownload: (id) => ipcRenderer.send('open-download', id),
  openDownloadFolder: (id) => ipcRenderer.send('open-download-folder', id),
  clearDownloads: () => ipcRenderer.send('clear-downloads'),
  retryDownload: (id) => ipcRenderer.send('retry-download', id),
  cancelPopup: () => ipcRenderer.send('cancel-popup'),
  onMediaDetected: (callback) => ipcRenderer.on('media-detected', (_event, data) => callback(data)),
  onDownloadsUpdated: (callback) => ipcRenderer.on('downloads-updated', (_event, data) => callback(data)),
});

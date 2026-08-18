const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, scoped electronAPI to internal renderer windows and overlays
contextBridge.exposeInMainWorld('electronAPI', {
  // === Search & Navigation ===
  performNavigation: (query) => ipcRenderer.send('perform-navigation', query),
  cancelSearch: () => ipcRenderer.send('cancel-search'),
  onFocusSearch: (callback) => ipcRenderer.on('focus-search', (_event, ...args) => callback(...args)),

  // === Exit Modal ===
  confirmExit: () => ipcRenderer.send('confirm-exit'),
  cancelExitModal: () => ipcRenderer.send('cancel-exit-modal'),

  // === Extensions ===
  listExtensions: () => ipcRenderer.invoke('list-extensions'),
  installExtension: () => ipcRenderer.invoke('install-extension'),
  installExtensionPackage: () => ipcRenderer.invoke('install-extension-package'),
  installExtensionWebStore: (urlOrId) => ipcRenderer.invoke('install-extension-webstore', urlOrId),
  removeExtension: (id) => ipcRenderer.invoke('remove-extension', id),
  onExtensionsUpdated: (callback) => ipcRenderer.on('extensions-updated', (_event, data) => callback(data)),
  cancelExtensions: () => ipcRenderer.send('cancel-extensions'),

  // === History ===
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // === Dark Mode ===
  toggleDarkMode: () => ipcRenderer.invoke('toggle-dark-mode'),
  getDarkModeStatus: () => ipcRenderer.invoke('get-dark-mode-status'),

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

  // === Tabs ===
  createTab: (url) => ipcRenderer.invoke('create-tab', url),
  closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
  switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  onTabsUpdated: (callback) => ipcRenderer.on('tabs-updated', (_event, data) => callback(data)),

  // === Settings & Controls ===
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSetting: (key, value) => ipcRenderer.invoke('save-setting', { key, value }),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data'),
  cancelSettings: () => ipcRenderer.send('cancel-settings'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
  scanMedia: () => ipcRenderer.invoke('scan-media'),
  triggerAction: (action) => ipcRenderer.send('trigger-action', action),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (_event, data) => callback(data)),
  onAdblockCountUpdated: (callback) => ipcRenderer.on('adblock-count-updated', (_event, data) => callback(data)),
  toggleVpn: () => ipcRenderer.invoke('toggle-vpn'),
  getVpnStatus: () => ipcRenderer.invoke('get-vpn-status'),
});

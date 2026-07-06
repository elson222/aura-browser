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

  // === Settings ===
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSetting: (key, value) => ipcRenderer.invoke('save-setting', key, value),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data'),
  cancelSettings: () => ipcRenderer.send('cancel-settings'),
  scanMedia: () => ipcRenderer.invoke('scan-media'),
});

function injectDownloaderButton() {
  if (document.getElementById('aura-floating-downloader')) return;

  const btn = document.createElement('div');
  btn.id = 'aura-floating-downloader';
  btn.innerHTML = '📥';
  btn.title = 'Scan for video downloads';

  const style = document.createElement('style');
  style.textContent = `
    #aura-floating-downloader {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 48px !important;
      height: 48px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #7b2cbf, #5a189a) !important;
      box-shadow: 0 4px 15px rgba(123, 44, 191, 0.4) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 20px !important;
      z-index: 2147483647 !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease !important;
      user-select: none !important;
    }
    #aura-floating-downloader:hover {
      transform: scale(1.08) !important;
      box-shadow: 0 6px 20px rgba(123, 44, 191, 0.6) !important;
    }
    #aura-floating-downloader:active {
      transform: scale(0.95) !important;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(btn);

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    btn.innerHTML = '⏳';
    btn.style.pointerEvents = 'none';
    try {
      await ipcRenderer.invoke('scan-media');
    } catch (err) {
      console.error('Scan media failed:', err);
    } finally {
      btn.innerHTML = '📥';
      btn.style.pointerEvents = 'auto';
    }
  });
}

if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', injectDownloaderButton);
  } else {
    injectDownloaderButton();
  }
}

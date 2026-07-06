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
  triggerAction: (action) => ipcRenderer.send('trigger-action', action),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (_event, data) => callback(data)),
  toggleVpn: () => ipcRenderer.invoke('toggle-vpn'),
  getVpnStatus: () => ipcRenderer.invoke('get-vpn-status'),
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

function injectSidePanel() {
  if (document.getElementById('aura-sidebar')) return;

  const trigger = document.createElement('div');
  trigger.id = 'aura-sidebar-trigger';

  const panel = document.createElement('div');
  panel.id = 'aura-sidebar';

  panel.innerHTML = `
    <div class="sidebar-header">
      <h3>✦ Aura Panel</h3>
      <button id="aura-pin-btn" title="Pin Panel">📌</button>
    </div>
    
    <div class="sidebar-section">
      <h4>Toggles</h4>
      <div class="sidebar-row">
        <span>🛡️ Ad Blocker</span>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-adblock">
          <span class="aura-slider"></span>
        </label>
      </div>
      <div class="sidebar-row">
        <span>🕶️ Dark Mode</span>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-darkmode">
          <span class="aura-slider"></span>
        </label>
      </div>
      <div class="sidebar-row" id="aura-sidebar-darkstyle-row">
        <span>🎨 Dark Style</span>
        <select class="sidebar-select" id="aura-sidebar-darkstyle">
          <option value="grey">Aura Grey</option>
          <option value="black">Deep Black</option>
        </select>
      </div>

      <div class="sidebar-row">
        <span>🕒 Save History</span>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-history">
          <span class="aura-slider"></span>
        </label>
      </div>
      <div class="sidebar-row">
        <span>🌐 Free VPN</span>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-vpn">
          <span class="aura-slider"></span>
        </label>
      </div>
    </div>

    <div class="sidebar-section">
      <h4>Tools & Actions</h4>
      <button class="sidebar-btn" id="aura-btn-search">Search / Open URL <kbd>Ctrl+T</kbd></button>
      <button class="sidebar-btn" id="aura-btn-downloads">Downloads manager <kbd>Ctrl+J</kbd></button>
      <button class="sidebar-btn" id="aura-btn-extensions">Extension manager <kbd>Ctrl+⇧+E</kbd></button>
      <button class="sidebar-btn" id="aura-btn-settings">⚙️ Settings panel <kbd>Ctrl+,</kbd></button>
      <button class="sidebar-btn" id="aura-btn-reload">🔄 Reload Page <kbd>F5</kbd></button>
      <button class="sidebar-btn" id="aura-btn-zoom-in">➕ Zoom In <kbd>Ctrl++</kbd></button>
      <button class="sidebar-btn" id="aura-btn-zoom-out">➖ Zoom Out <kbd>Ctrl+-</kbd></button>
      <button class="sidebar-btn" id="aura-btn-print">🖨️ Print Webpage <kbd>Ctrl+P</kbd></button>
      <button class="sidebar-btn" id="aura-btn-drivers">🔧 Optimize PC Drivers <kbd>Admin</kbd></button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #aura-sidebar-trigger {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 12px !important;
      z-index: 2147483646 !important;
      background: transparent !important;
    }

    #aura-sidebar {
      position: fixed !important;
      top: 0 !important;
      right: -280px !important;
      bottom: 0 !important;
      width: 280px !important;
      background: rgba(10, 10, 10, 0.96) !important;
      backdrop-filter: blur(25px) saturate(1.2) !important;
      -webkit-backdrop-filter: blur(25px) saturate(1.2) !important;
      border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
      z-index: 2147483647 !important;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5) !important;
      transition: right 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 24px !important;
      box-sizing: border-box !important;
      color: #ffffff !important;
      font-family: 'Outfit', sans-serif !important;
      user-select: none !important;
    }

    #aura-sidebar.visible {
      right: 0 !important;
    }

    .sidebar-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 24px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      padding-bottom: 12px !important;
    }

    .sidebar-header h3 {
      font-size: 16px !important;
      font-weight: 700 !important;
      margin: 0 !important;
      color: #ffffff !important;
    }

    #aura-pin-btn {
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.3) !important;
      cursor: pointer !important;
      font-size: 16px !important;
      padding: 4px !important;
      transition: color 0.15s ease, text-shadow 0.15s ease !important;
    }

    #aura-pin-btn.pinned {
      color: #ffffff !important;
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.6) !important;
    }

    .sidebar-section {
      display: flex !important;
      flex-direction: column !important;
      gap: 14px !important;
      margin-bottom: 24px !important;
    }

    .sidebar-section h4 {
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #555555 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      margin: 0 0 4px 0 !important;
    }

    .sidebar-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 13px !important;
      color: #dddddd !important;
    }

    .sidebar-select {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 6px !important;
      color: #ffffff !important;
      padding: 4px 8px !important;
      font-family: inherit !important;
      font-size: 11px !important;
      outline: none !important;
      cursor: pointer !important;
      transition: background-color 0.15s ease, border-color 0.15s ease !important;
    }
    .sidebar-select:hover {
      background: rgba(255, 255, 255, 0.1) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }
    .sidebar-select option {
      background: #0b0b0b !important;
      color: #ffffff !important;
    }

    /* Switches */
    .aura-switch {
      position: relative !important;
      display: inline-block !important;
      width: 36px !important;
      height: 20px !important;
    }

    .aura-switch input {
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
    }

    .aura-slider {
      position: absolute !important;
      cursor: pointer !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background-color: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      transition: .2s ease !important;
      border-radius: 20px !important;
    }

    .aura-slider:before {
      position: absolute !important;
      content: "" !important;
      height: 12px !important;
      width: 12px !important;
      left: 3px !important;
      bottom: 3px !important;
      background-color: #ffffff !important;
      transition: .2s ease !important;
      border-radius: 50% !important;
    }

    .aura-switch input:checked + .aura-slider {
      background-color: #ffffff !important;
    }

    .aura-switch input:checked + .aura-slider:before {
      transform: translateX(16px) !important;
      background-color: #000000 !important;
    }

    /* Buttons */
    .sidebar-btn {
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      color: #dddddd !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-size: 12px !important;
      text-align: left !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      transition: background 0.15s ease, border-color 0.15s ease !important;
    }

    .sidebar-btn:hover {
      background: rgba(255, 255, 255, 0.07) !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }

    .sidebar-btn kbd {
      font-family: inherit !important;
      font-size: 9px !important;
      color: #666666 !important;
      background: rgba(0, 0, 0, 0.25) !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      border: 1px solid rgba(255, 255, 255, 0.04) !important;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(trigger);
  document.body.appendChild(panel);

  let isPinned = localStorage.getItem('aura-panel-pinned') === 'true';
  if (isPinned) {
    panel.classList.add('visible');
    document.getElementById('aura-pin-btn').classList.add('pinned');
  }

  // Hover events
  trigger.addEventListener('mouseenter', () => {
    panel.classList.add('visible');
    syncToggleStates();
  });

  panel.addEventListener('mouseleave', () => {
    if (!isPinned) {
      panel.classList.remove('visible');
    }
  });

  // Pin Toggle
  const pinBtn = document.getElementById('aura-pin-btn');
  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    localStorage.setItem('aura-panel-pinned', isPinned);
    pinBtn.classList.toggle('pinned', isPinned);
  });

  // Sync state functions
  async function syncToggleStates() {
    try {
      const settings = await ipcRenderer.invoke('get-settings');
      if (settings) {
        document.getElementById('aura-sidebar-adblock').checked = settings.adBlockerEnabled;
        document.getElementById('aura-sidebar-darkmode').checked = settings.darkModeEnabled;
        document.getElementById('aura-sidebar-history').checked = settings.saveHistoryEnabled;
        document.getElementById('aura-sidebar-vpn').checked = settings.vpnEnabled;
        
        const styleSelect = document.getElementById('aura-sidebar-darkstyle');
        const styleRow = document.getElementById('aura-sidebar-darkstyle-row');
        if (settings.darkThemeStyle) {
          styleSelect.value = settings.darkThemeStyle;
        }
        
        const updateStyleRow = () => {
          if (document.getElementById('aura-sidebar-darkmode').checked) {
            styleRow.style.display = 'flex';
          } else {
            styleRow.style.display = 'none';
          }
        };
        updateStyleRow();
        
        document.getElementById('aura-sidebar-darkmode').addEventListener('change', updateStyleRow);
        
        styleSelect.addEventListener('change', async (e) => {
          try {
            await ipcRenderer.invoke('save-setting', { key: 'darkThemeStyle', value: e.target.value });
          } catch (err) {
            console.error('Failed to change style:', err);
          }
        });
      }
    } catch (e) {
      console.error('Failed to sync sidebar states:', e);
    }
  }

  // Bind settings toggles
  const bindToggle = (id, key) => {
    document.getElementById(id).addEventListener('change', async (e) => {
      try {
        await ipcRenderer.invoke('save-setting', { key, value: e.target.checked });
      } catch (err) {
        console.error('Failed to toggle:', err);
        e.target.checked = !e.target.checked;
      }
    });
  };

  bindToggle('aura-sidebar-adblock', 'adBlockerEnabled');
  bindToggle('aura-sidebar-darkmode', 'darkModeEnabled');
  bindToggle('aura-sidebar-history', 'saveHistoryEnabled');
  bindToggle('aura-sidebar-vpn', 'vpnEnabled');

  // Bind Action Buttons
  const bindAction = (id, action) => {
    document.getElementById(id).addEventListener('click', () => {
      ipcRenderer.send('trigger-action', action);
    });
  };

  bindAction('aura-btn-search', 'search');
  bindAction('aura-btn-downloads', 'downloads');
  bindAction('aura-btn-extensions', 'extensions');
  bindAction('aura-btn-settings', 'settings');
  bindAction('aura-btn-reload', 'reload');
  bindAction('aura-btn-zoom-in', 'zoom-in');
  bindAction('aura-btn-zoom-out', 'zoom-out');
  bindAction('aura-btn-print', 'print');
  bindAction('aura-btn-drivers', 'optimize-drivers');
}

// Call on ready
if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      injectDownloaderButton();
      injectSidePanel();
    });
  } else {
    injectDownloaderButton();
    injectSidePanel();
  }
}

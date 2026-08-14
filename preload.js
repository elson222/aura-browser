const { contextBridge, ipcRenderer } = require('electron');
const { initMouseGestures } = require('./mouse-gestures');
const { initAutoPiP } = require('./pip-engine');
const { initZenFeatures } = require('./zen-features');

contextBridge.exposeInMainWorld('electronAPI', {
  // === Search ===
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

  // === Settings & Stats ===
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSetting: (key, value) => ipcRenderer.invoke('save-setting', { key, value }),
  clearBrowsingData: () => ipcRenderer.invoke('clear-browsing-data'),
  cancelSettings: () => ipcRenderer.send('cancel-settings'),
  scanMedia: () => ipcRenderer.invoke('scan-media'),
  triggerAction: (action) => ipcRenderer.send('trigger-action', action),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (_event, data) => callback(data)),
  onAdblockCountUpdated: (callback) => ipcRenderer.on('adblock-count-updated', (_event, data) => callback(data)),
  toggleVpn: () => ipcRenderer.invoke('toggle-vpn'),
  getVpnStatus: () => ipcRenderer.invoke('get-vpn-status'),
});

// ============================================================
// INJECTED FLOATING DOWNLOADER BUTTON (NO EMOJIS - PURE SVG)
// ============================================================

function injectDownloaderButton() {
  if (document.getElementById('aura-floating-downloader')) return;

  const btn = document.createElement('div');
  btn.id = 'aura-floating-downloader';
  btn.title = 'Scan media for download';
  btn.innerHTML = `
    <svg class="dl-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    <svg class="dl-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: none; animation: spin 1s linear infinite;">
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #aura-floating-downloader {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 44px !important;
      height: 44px !important;
      border-radius: 50% !important;
      background: #111114 !important;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483640 !important;
      transition: transform 0.2s ease, border-color 0.2s ease !important;
      user-select: none !important;
    }
    #aura-floating-downloader:hover {
      transform: scale(1.08) !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      background: #18181c !important;
    }
    #aura-floating-downloader:active {
      transform: scale(0.95) !important;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(btn);

  const dlIcon = btn.querySelector('.dl-icon');
  const dlSpinner = btn.querySelector('.dl-spinner');

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dlIcon.style.display = 'none';
    dlSpinner.style.display = 'block';
    btn.style.pointerEvents = 'none';

    try {
      await ipcRenderer.invoke('scan-media');
    } catch (err) {
      console.error('Scan media error:', err);
    } finally {
      dlIcon.style.display = 'block';
      dlSpinner.style.display = 'none';
      btn.style.pointerEvents = 'auto';
    }
  });
}

// ============================================================
// INJECTED SIDEBAR (NO EMOJIS - CRISP VECTOR ICONS)
// ============================================================

function injectSidePanel() {
  if (document.getElementById('aura-sidebar')) return;

  const trigger = document.createElement('div');
  trigger.id = 'aura-sidebar-trigger';

  const panel = document.createElement('div');
  panel.id = 'aura-sidebar';

  panel.innerHTML = `
    <div class="sidebar-header">
      <div class="brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <h3>Aura Panel</h3>
      </div>
      <button id="aura-pin-btn" title="Pin Panel">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="17" x2="12" y2="22"/>
          <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
        </svg>
      </button>
    </div>
    
    <div class="sidebar-section">
      <h4>Shields & Controls</h4>
      
      <div class="sidebar-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Ad Blocker</span>
        </div>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-adblock">
          <span class="aura-slider"></span>
        </label>
      </div>

      <div class="sidebar-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="14" x="2" y="3" rx="2"/>
            <rect width="8" height="6" x="12" y="9" rx="1"/>
          </svg>
          <span>Auto PiP</span>
        </div>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-autopip">
          <span class="aura-slider"></span>
        </label>
      </div>

      <div class="sidebar-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span>Dark Mode</span>
        </div>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-darkmode">
          <span class="aura-slider"></span>
        </label>
      </div>

      <div class="sidebar-row" id="aura-sidebar-darkstyle-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2v20M12 12 2.1 12"/>
          </svg>
          <span>Dark Style</span>
        </div>
        <select class="sidebar-select" id="aura-sidebar-darkstyle">
          <option value="grey">Aura Grey</option>
          <option value="black">Deep Black</option>
        </select>
      </div>

      <div class="sidebar-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"/>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span>Mouse Gestures</span>
        </div>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-gestures">
          <span class="aura-slider"></span>
        </label>
      </div>

      <div class="sidebar-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Save History</span>
        </div>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-history">
          <span class="aura-slider"></span>
        </label>
      </div>

      <div class="sidebar-row">
        <div class="row-label">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>Free VPN</span>
        </div>
        <label class="aura-switch">
          <input type="checkbox" id="aura-sidebar-vpn">
          <span class="aura-slider"></span>
        </label>
      </div>
    </div>

    <div class="sidebar-section">
      <h4>Actions & Tools</h4>
      <button class="sidebar-btn" id="aura-btn-search">
        <span>Search / Open URL</span>
        <kbd>Ctrl+T</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-downloads">
        <span>Downloads</span>
        <kbd>Ctrl+J</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-extensions">
        <span>Extensions</span>
        <kbd>Ctrl+⇧+E</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-settings">
        <span>Settings</span>
        <kbd>Ctrl+,</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-reload">
        <span>Reload Page</span>
        <kbd>F5</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-zoom-in">
        <span>Zoom In</span>
        <kbd>Ctrl++</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-zoom-out">
        <span>Zoom Out</span>
        <kbd>Ctrl+-</kbd>
      </button>
      <button class="sidebar-btn" id="aura-btn-print">
        <span>Print Page</span>
        <kbd>Ctrl+P</kbd>
      </button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #aura-sidebar-trigger {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 10px !important;
      z-index: 2147483646 !important;
      background: transparent !important;
    }

    #aura-sidebar {
      position: fixed !important;
      top: 0 !important;
      right: -300px !important;
      bottom: 0 !important;
      width: 300px !important;
      background: rgba(12, 12, 14, 0.96) !important;
      backdrop-filter: blur(24px) saturate(1.2) !important;
      -webkit-backdrop-filter: blur(24px) saturate(1.2) !important;
      border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
      z-index: 2147483647 !important;
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6) !important;
      transition: right 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 24px 20px !important;
      box-sizing: border-box !important;
      color: #ffffff !important;
      font-family: 'Outfit', -apple-system, sans-serif !important;
      user-select: none !important;
      overflow-y: auto !important;
    }

    #aura-sidebar.visible {
      right: 0 !important;
    }

    .sidebar-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 20px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      padding-bottom: 12px !important;
    }

    .sidebar-header .brand {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      color: #ffffff !important;
    }

    .sidebar-header h3 {
      font-size: 15px !important;
      font-weight: 700 !important;
      margin: 0 !important;
      letter-spacing: -0.2px !important;
    }

    #aura-pin-btn {
      background: transparent !important;
      border: none !important;
      color: rgba(255, 255, 255, 0.3) !important;
      cursor: pointer !important;
      padding: 4px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: color 0.15s ease !important;
    }

    #aura-pin-btn.pinned {
      color: #ffffff !important;
    }

    .sidebar-section {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      margin-bottom: 22px !important;
    }

    .sidebar-section h4 {
      font-size: 10px !important;
      font-weight: 600 !important;
      color: #71717a !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      margin: 0 0 2px 0 !important;
    }

    .sidebar-row {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 13px !important;
      color: #e4e4e7 !important;
    }

    .row-label {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      color: #e4e4e7 !important;
    }

    .sidebar-select {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      color: #ffffff !important;
      padding: 4px 8px !important;
      font-family: inherit !important;
      font-size: 11px !important;
      outline: none !important;
      cursor: pointer !important;
    }
    .sidebar-select option {
      background: #111114 !important;
      color: #ffffff !important;
    }

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
      background-color: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
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
      background-color: #09090b !important;
    }

    .sidebar-btn {
      background: rgba(255, 255, 255, 0.03) !important;
      border: 1px solid rgba(255, 255, 255, 0.06) !important;
      color: #e4e4e7 !important;
      padding: 8px 10px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-size: 12px !important;
      text-align: left !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      transition: all 0.15s ease !important;
    }

    .sidebar-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      border-color: rgba(255, 255, 255, 0.16) !important;
      color: #ffffff !important;
    }

    .sidebar-btn kbd {
      font-family: inherit !important;
      font-size: 9px !important;
      color: #888888 !important;
      background: rgba(0, 0, 0, 0.3) !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
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

  trigger.addEventListener('mouseenter', () => {
    panel.classList.add('visible');
    syncToggleStates();
  });

  panel.addEventListener('mouseleave', () => {
    if (!isPinned) {
      panel.classList.remove('visible');
    }
  });

  const pinBtn = document.getElementById('aura-pin-btn');
  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    localStorage.setItem('aura-panel-pinned', isPinned);
    pinBtn.classList.toggle('pinned', isPinned);
  });

  async function syncToggleStates() {
    try {
      const settings = await ipcRenderer.invoke('get-settings');
      if (settings) {
        document.getElementById('aura-sidebar-adblock').checked = settings.adBlockerEnabled;
        if (document.getElementById('aura-sidebar-autopip')) {
          document.getElementById('aura-sidebar-autopip').checked = settings.autoPipEnabled !== false;
        }
        document.getElementById('aura-sidebar-darkmode').checked = settings.darkModeEnabled;
        document.getElementById('aura-sidebar-gestures').checked = settings.mouseGesturesEnabled;
        document.getElementById('aura-sidebar-history').checked = settings.saveHistoryEnabled;
        document.getElementById('aura-sidebar-vpn').checked = settings.vpnEnabled;

        const styleSelect = document.getElementById('aura-sidebar-darkstyle');
        const styleRow = document.getElementById('aura-sidebar-darkstyle-row');
        if (settings.darkThemeStyle) {
          styleSelect.value = settings.darkThemeStyle;
        }

        const updateStyleRow = () => {
          styleRow.style.display = document.getElementById('aura-sidebar-darkmode').checked ? 'flex' : 'none';
        };
        updateStyleRow();

        document.getElementById('aura-sidebar-darkmode').addEventListener('change', updateStyleRow);

        styleSelect.addEventListener('change', async (e) => {
          try {
            await ipcRenderer.invoke('save-setting', { key: 'darkThemeStyle', value: e.target.value });
          } catch (err) {}
        });
      }
    } catch (e) {}
  }

  const bindToggle = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', async (e) => {
      try {
        await ipcRenderer.invoke('save-setting', { key, value: e.target.checked });
      } catch (err) {
        e.target.checked = !e.target.checked;
      }
    });
  };

  bindToggle('aura-sidebar-adblock', 'adBlockerEnabled');
  bindToggle('aura-sidebar-autopip', 'autoPipEnabled');
  bindToggle('aura-sidebar-darkmode', 'darkModeEnabled');
  bindToggle('aura-sidebar-gestures', 'mouseGesturesEnabled');
  bindToggle('aura-sidebar-history', 'saveHistoryEnabled');
  bindToggle('aura-sidebar-vpn', 'vpnEnabled');

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
}

// ============================================================
// INITIALIZATION ON WEB PAGE
// ============================================================

if (typeof window !== 'undefined') {
  function startEnhancements() {
    initMouseGestures(ipcRenderer);
    if (window.location.protocol.startsWith('http')) {
      initAutoPiP(ipcRenderer);
      initZenFeatures(ipcRenderer);
      injectDownloaderButton();
      injectSidePanel();
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startEnhancements);
  } else {
    startEnhancements();
  }
}

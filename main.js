const { app, BrowserWindow, ipcMain, screen, session, dialog, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// Internal Modules
const darkMode = require('./dark-mode');
const downloadsModule = require('./downloads');
const vpnModule = require('./vpn');
const adblocker = require('./adblocker');
const crxLoader = require('./crx-loader');
const { TabManager } = require('./tab-manager');

// Hardware GPU Acceleration & High-Performance Video Decoding Flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,CanvasOopRasterization,UseSkiaRenderer');

let tabManager = null;

// User Preferences State
let darkModeEnabled = true;
let adBlockerEnabled = true;
let autoPipEnabled = true;
let saveHistoryEnabled = true;
let mouseGesturesEnabled = true;
let vpnEnabled = false;
let darkThemeStyle = 'grey'; // 'grey' or 'black'
let deepBlackCssKey = null;
let adblockCosmeticCssKey = null;

// Esc timing tracking for fast double-press exit
let lastEscTimestamp = 0;
const DOUBLE_ESC_THRESHOLD_MS = 400;

// User Data Path
const userDataPath = path.join(app.getPath('userData'), 'userData.json');
const extensionsDir = path.join(app.getPath('userData'), 'extensions');

let userData = {
  history: [],
  bookmarks: [
    { title: "Google", url: "https://www.google.com" },
    { title: "GitHub", url: "https://github.com" },
    { title: "YouTube", url: "https://www.youtube.com" },
    { title: "Wikipedia", url: "https://www.wikipedia.org" }
  ],
  darkModeEnabled: true,
  adBlockerEnabled: true,
  autoPipEnabled: true,
  saveHistoryEnabled: true,
  mouseGesturesEnabled: true,
  vpnEnabled: false,
  darkThemeStyle: 'grey',
  extensions: []
};

// Ensure extensions directory exists
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

const userDataBackupPath = path.join(app.getPath('userData'), 'userData.json.bak');

function loadUserData() {
  try {
    if (fs.existsSync(userDataPath)) {
      try {
        const content = fs.readFileSync(userDataPath, 'utf8');
        const loaded = JSON.parse(content);
        userData = { ...userData, ...loaded };
      } catch (parseErr) {
        console.warn("userData.json corrupted, attempting restore from backup...", parseErr);
        if (fs.existsSync(userDataBackupPath)) {
          const backupContent = fs.readFileSync(userDataBackupPath, 'utf8');
          const loadedBackup = JSON.parse(backupContent);
          userData = { ...userData, ...loadedBackup };
        }
      }

      darkModeEnabled = userData.darkModeEnabled === true;
      adBlockerEnabled = userData.adBlockerEnabled !== false;
      autoPipEnabled = userData.autoPipEnabled !== false;
      saveHistoryEnabled = userData.saveHistoryEnabled !== false;
      mouseGesturesEnabled = userData.mouseGesturesEnabled !== false;
      vpnEnabled = userData.vpnEnabled === true;
      darkThemeStyle = userData.darkThemeStyle || 'black';
    } else {
      saveUserData(true);
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
  }
}

let saveUserDataTimer = null;
function saveUserData(immediate = false) {
  if (saveUserDataTimer) clearTimeout(saveUserDataTimer);

  const doSave = async () => {
    try {
      userData.darkModeEnabled = darkModeEnabled;
      userData.adBlockerEnabled = adBlockerEnabled;
      userData.autoPipEnabled = autoPipEnabled;
      userData.saveHistoryEnabled = saveHistoryEnabled;
      userData.mouseGesturesEnabled = mouseGesturesEnabled;
      userData.vpnEnabled = vpnEnabled;
      userData.darkThemeStyle = darkThemeStyle;

      const payload = JSON.stringify(userData, null, 2);
      const tempPath = userDataPath + '.tmp';

      // Atomic write: write to temp file then atomic rename
      await fs.promises.writeFile(tempPath, payload, 'utf8');
      
      // Save backup copy
      if (fs.existsSync(userDataPath)) {
        await fs.promises.copyFile(userDataPath, userDataBackupPath).catch(() => {});
      }

      await fs.promises.rename(tempPath, userDataPath);
    } catch (err) {
      console.error("Failed to atomically save user data:", err);
    }
  };

  if (immediate) {
    doSave();
  } else {
    saveUserDataTimer = setTimeout(doSave, 300);
  }
}

// Early settings load with corruption resilience
try {
  if (fs.existsSync(userDataPath)) {
    const loaded = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    darkModeEnabled = loaded.darkModeEnabled === true;
    adBlockerEnabled = loaded.adBlockerEnabled !== false;
  }
} catch (e) {
  try {
    if (fs.existsSync(userDataBackupPath)) {
      const loaded = JSON.parse(fs.readFileSync(userDataBackupPath, 'utf8'));
      darkModeEnabled = loaded.darkModeEnabled === true;
      adBlockerEnabled = loaded.adBlockerEnabled !== false;
    }
  } catch (e2) {}
}

// Window References
let mainWindow = null;
let searchWindow = null;
let extensionsWindow = null;
let downloadPopupWindow = null;
let settingsWindow = null;
let exitModalWindow = null;
let darkModeCssKey = null;

// ============================================================
// MAIN WINDOW CREATION
// ============================================================

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenu(null);

  tabManager = new TabManager(mainWindow, adblocker, darkMode);
  tabManager.createTab();

  mainWindow.on('resize', () => {
    if (tabManager && tabManager.getActiveTab()) {
      const bounds = tabManager.getBounds();
      tabManager.getActiveTab().view.setBounds(bounds);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (searchWindow) searchWindow.close();
    if (extensionsWindow) extensionsWindow.close();
    if (downloadPopupWindow) downloadPopupWindow.close();
    if (settingsWindow) settingsWindow.close();
    if (exitModalWindow) exitModalWindow.close();
  });

  // Global error safety handlers
  process.on('uncaughtException', (err) => {
    console.error('Safe caught exception:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Safe caught rejection:', reason);
  });

  // ============================================================
  // KEYBOARD SHORTCUTS & ESCAPE LOGIC
  // ============================================================
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key.toLowerCase();
    const ctrl = input.control;
    const shift = input.shift;
    const alt = input.alt;

    // Ctrl+M or Alt+Enter or F11 -> Minimize / Toggle Window Mode
    if ((ctrl && !shift && key === 'm') || (alt && input.key === 'Enter') || key === 'f11') {
      event.preventDefault();
      handleCtrlEsc();
      return;
    }

    // Ctrl+B -> Toggle Zen Side Panel / Dock
    if (ctrl && !shift && key === 'b') {
      event.preventDefault();
      if (mainWindow) mainWindow.webContents.send('toggle-zen-dock');
      return;
    }

    // Escape Key Handling (Single Esc Confirm / Double Esc Instant Exit)
    if (input.key === 'Escape' && !ctrl && !shift && !alt) {
      event.preventDefault();

      // If an overlay window is currently open, close it instead of showing exit prompt
      if (isAnyOverlayVisible()) {
        hideAllOverlays();
        return;
      }

      // Check for fast double Escape press
      const now = Date.now();
      if (now - lastEscTimestamp <= DOUBLE_ESC_THRESHOLD_MS) {
        app.quit();
        return;
      }
      lastEscTimestamp = now;

      // Show Exit Confirmation Modal
      showExitModal();
      return;
    }

    // Ctrl+T -> New Tab
    if (ctrl && !shift && key === 't') {
      event.preventDefault();
      if (tabManager) tabManager.createTab();
      return;
    }

    // Ctrl+W -> Close Tab
    if (ctrl && !shift && key === 'w') {
      event.preventDefault();
      if (tabManager && tabManager.activeTabId) tabManager.closeTab(tabManager.activeTabId);
      return;
    }

    // Ctrl+Tab -> Next Tab
    if (ctrl && !shift && input.key === 'Tab') {
      event.preventDefault();
      if (tabManager) tabManager.nextTab();
      return;
    }

    // Ctrl+Shift+Tab -> Previous Tab
    if (ctrl && shift && input.key === 'Tab') {
      event.preventDefault();
      if (tabManager) tabManager.prevTab();
      return;
    }

    // Ctrl+1..9 -> Switch Tab
    if (ctrl && !shift && !alt && key >= '1' && key <= '9') {
      const idx = parseInt(key) - 1;
      if (tabManager && tabManager.tabs[idx]) {
        event.preventDefault();
        tabManager.switchTab(tabManager.tabs[idx].id);
        return;
      }
    }

    // Ctrl+L — Search Omnibox
    if (ctrl && !shift && key === 'l') {
      event.preventDefault();
      showSearchOverlay();
      return;
    }

    // Ctrl+D — Bookmark current page
    if (ctrl && !shift && key === 'd') {
      event.preventDefault();
      bookmarkCurrentPage();
      return;
    }

    // Ctrl+, — Settings overlay
    if (ctrl && !shift && input.key === ',') {
      event.preventDefault();
      showSettingsOverlay();
      return;
    }

    // Ctrl+R or F5 — Reload
    if ((ctrl && !shift && key === 'r') || key === 'f5') {
      event.preventDefault();
      mainWindow.webContents.reload();
      return;
    }

    // Ctrl+Shift+R — Hard reload
    if (ctrl && shift && key === 'r') {
      event.preventDefault();
      mainWindow.webContents.reloadIgnoringCache();
      return;
    }

    // Backspace — Go back (when not editing an input or textarea)
    if (!ctrl && !alt && !shift && input.key === 'Backspace') {
      if (mainWindow) {
        mainWindow.webContents.executeJavaScript(`
          (function() {
            const el = document.activeElement;
            if (!el) return true;
            const tag = el.tagName.toLowerCase();
            const isEditable = el.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
            return !isEditable;
          })()
        `).then(shouldGoBack => {
          if (shouldGoBack && mainWindow && mainWindow.webContents.canGoBack()) {
            mainWindow.webContents.goBack();
          }
        }).catch(() => {});
      }
    }

    // Alt+Left — Go back
    if (alt && input.key === 'ArrowLeft') {
      if (mainWindow.webContents.canGoBack()) mainWindow.webContents.goBack();
      return;
    }

    // Alt+Right — Go forward
    if (alt && input.key === 'ArrowRight') {
      if (mainWindow.webContents.canGoForward()) mainWindow.webContents.goForward();
      return;
    }

    // Ctrl+J — Downloads manager
    if (ctrl && !shift && key === 'j') {
      event.preventDefault();
      showDownloadsManager();
      return;
    }

    // Ctrl+Shift+D — Toggle dark mode
    if (ctrl && shift && key === 'd') {
      event.preventDefault();
      toggleDarkMode();
      return;
    }

    // Ctrl+Shift+E — Extensions manager
    if (ctrl && shift && key === 'e') {
      event.preventDefault();
      showExtensionsOverlay();
      return;
    }

    // Ctrl+H — History
    if (ctrl && !shift && key === 'h') {
      event.preventDefault();
      showSearchOverlay();
      return;
    }

    // Ctrl+= or Ctrl++ — Zoom in
    if (ctrl && (key === '=' || key === '+')) {
      event.preventDefault();
      const level = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(Math.min(level + 0.5, 5));
      return;
    }

    // Ctrl+- — Zoom out
    if (ctrl && key === '-') {
      event.preventDefault();
      const level = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(Math.max(level - 0.5, -5));
      return;
    }

    // Ctrl+0 — Reset zoom
    if (ctrl && key === '0') {
      event.preventDefault();
      mainWindow.webContents.setZoomLevel(0);
      return;
    }

    // Ctrl+P — Print
    if (ctrl && !shift && key === 'p') {
      event.preventDefault();
      mainWindow.webContents.print();
      return;
    }

    // Ctrl+S — Save page
    if (ctrl && !shift && key === 's') {
      event.preventDefault();
      savePage();
      return;
    }

    // Ctrl+U — View source
    if (ctrl && !shift && key === 'u') {
      event.preventDefault();
      const currentUrl = mainWindow.webContents.getURL();
      if (!currentUrl.startsWith('file://')) {
        mainWindow.loadURL('view-source:' + currentUrl);
      }
      return;
    }

    // F11 — Fullscreen toggle
    if (key === 'f11') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return;
    }

    // F12 or Ctrl+Shift+I — DevTools
    if (key === 'f12' || (ctrl && shift && key === 'i')) {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
      return;
    }

    // Ctrl+Shift+Delete — Clear browsing data
    if (ctrl && shift && key === 'delete') {
      event.preventDefault();
      clearBrowsingData();
      return;
    }
  });
}

function handleCtrlEsc() {
  if (!mainWindow) return;
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
    mainWindow.setSize(1280, 800);
    mainWindow.center();
  } else if (!mainWindow.isMinimized()) {
    mainWindow.minimize();
  } else {
    mainWindow.restore();
    mainWindow.setFullScreen(true);
  }
}

function isAnyOverlayVisible() {
  return (
    (searchWindow && searchWindow.isVisible()) ||
    (settingsWindow && settingsWindow.isVisible()) ||
    (extensionsWindow && extensionsWindow.isVisible()) ||
    (downloadPopupWindow && downloadPopupWindow.isVisible()) ||
    (exitModalWindow && exitModalWindow.isVisible())
  );
}

function hideAllOverlays() {
  if (searchWindow && searchWindow.isVisible()) searchWindow.hide();
  if (settingsWindow && settingsWindow.isVisible()) settingsWindow.hide();
  if (extensionsWindow && extensionsWindow.isVisible()) extensionsWindow.hide();
  if (downloadPopupWindow && downloadPopupWindow.isVisible()) downloadPopupWindow.hide();
  if (exitModalWindow && exitModalWindow.isVisible()) exitModalWindow.hide();
  if (mainWindow) mainWindow.focus();
}

async function savePage() {
  if (!mainWindow) return;
  const currentUrl = mainWindow.webContents.getURL();
  if (currentUrl.startsWith('file://')) return;

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('downloads'), (mainWindow.webContents.getTitle() || 'page') + '.html'),
    filters: [
      { name: 'Web Page', extensions: ['html'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (filePath) {
    mainWindow.webContents.savePage(filePath, 'HTMLComplete');
  }
}

async function clearBrowsingData() {
  userData.history = [];
  saveUserData();

  await session.defaultSession.clearCache();
  await session.defaultSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'sessionstorage', 'cachestorage']
  });
}

function bookmarkCurrentPage() {
  if (!mainWindow) return;
  const currentUrl = mainWindow.webContents.getURL();
  if (currentUrl.startsWith('file://')) return;
  const title = mainWindow.webContents.getTitle() || currentUrl;

  const alreadyBookmarked = userData.bookmarks.some(b => b.url === currentUrl);
  if (!alreadyBookmarked) {
    userData.bookmarks.unshift({ title, url: currentUrl });
    saveUserData();
  }
}

// ============================================================
// EXIT MODAL WINDOW
// ============================================================

function createExitModalWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  exitModalWindow = new BrowserWindow({
    width: 500,
    height: 380,
    x: Math.floor((width - 500) / 2),
    y: Math.floor((height - 380) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  exitModalWindow.loadFile(path.join(__dirname, 'exit-modal.html'));

  exitModalWindow.on('blur', () => {
    hideExitModal();
  });
}

function showExitModal() {
  if (!exitModalWindow) return;
  exitModalWindow.show();
  exitModalWindow.focus();
}

function hideExitModal() {
  if (!exitModalWindow) return;
  exitModalWindow.hide();
  if (mainWindow) mainWindow.focus();
}

// ============================================================
// SEARCH / OMNIBOX OVERLAY
// ============================================================

function createSearchWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const overlayWidth = 680;
  const overlayHeight = 420;

  searchWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.floor((width - overlayWidth) / 2),
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  searchWindow.loadFile(path.join(__dirname, 'search.html'));

  searchWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      event.preventDefault();
      hideSearchOverlay();
    }
  });

  searchWindow.on('blur', () => {
    hideSearchOverlay();
  });
}

function showSearchOverlay(mode = 'search') {
  if (!searchWindow || searchWindow.isDestroyed()) {
    createSearchWindow();
  }
  searchWindow.webContents.send('focus-search', {
    history: userData.history,
    bookmarks: userData.bookmarks,
    mode: mode
  });
  searchWindow.show();
  searchWindow.focus();
}

function hideSearchOverlay() {
  if (searchWindow && !searchWindow.isDestroyed()) {
    searchWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
}

// ============================================================
// EXTENSIONS WINDOW & ENGINE
// ============================================================

function createExtensionsWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const overlayWidth = 560;
  const overlayHeight = 540;

  extensionsWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.floor((width - overlayWidth) / 2),
    y: Math.floor((height - overlayHeight) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  extensionsWindow.loadFile(path.join(__dirname, 'extensions.html'));

  extensionsWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      event.preventDefault();
      hideExtensionsOverlay();
    }
  });

  extensionsWindow.on('blur', () => {
    hideExtensionsOverlay();
  });
}

function showExtensionsOverlay() {
  if (!extensionsWindow || extensionsWindow.isDestroyed()) {
    createExtensionsWindow();
  }
  const extensions = getInstalledExtensions();
  extensionsWindow.webContents.send('extensions-updated', extensions);
  extensionsWindow.show();
  extensionsWindow.focus();
}

function hideExtensionsOverlay() {
  if (extensionsWindow && !extensionsWindow.isDestroyed()) {
    extensionsWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
}

function getInstalledExtensions() {
  try {
    const allExtensions = session.defaultSession.getAllExtensions();
    return allExtensions.map(ext => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      path: ext.path,
      description: ext.manifest?.description || '',
      enabled: true
    }));
  } catch {
    return [];
  }
}

async function installExtensionFolder() {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Select Unpacked Extension Folder',
    properties: ['openDirectory'],
    buttonLabel: 'Load Extension'
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const ext = await session.defaultSession.loadExtension(filePaths[0], {
        allowFileAccess: true
      });

      const destDir = path.join(extensionsDir, ext.id);
      if (!fs.existsSync(destDir)) {
        copyDirectory(filePaths[0], destDir);
      }

      return { success: true, extension: { id: ext.id, name: ext.name, version: ext.version } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No folder selected' };
}

async function installExtensionFromPackage() {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Select Extension Package (.crx or .zip)',
    filters: [
      { name: 'Chrome Extension Packages', extensions: ['crx', 'zip'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile'],
    buttonLabel: 'Install Package'
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const pkgPath = filePaths[0];
      const tempExtId = 'pkg_' + Date.now();
      const destDir = path.join(extensionsDir, tempExtId);
      crxLoader.extractCrx(pkgPath, destDir);

      const ext = await session.defaultSession.loadExtension(destDir, {
        allowFileAccess: true
      });

      return { success: true, extension: { id: ext.id, name: ext.name, version: ext.version } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No file selected' };
}

async function installExtensionFromWebStore(inputUrlOrId) {
  const extensionId = crxLoader.parseExtensionId(inputUrlOrId);
  if (!extensionId) {
    return { success: false, error: 'Invalid Chrome Web Store URL or 32-character Extension ID.' };
  }

  try {
    const crxBuffer = await crxLoader.downloadCrxFromWebStore(extensionId);
    const destDir = path.join(extensionsDir, extensionId);
    crxLoader.extractCrx(crxBuffer, destDir);

    const ext = await session.defaultSession.loadExtension(destDir, {
      allowFileAccess: true
    });

    return { success: true, extension: { id: ext.id, name: ext.name, version: ext.version } };
  } catch (err) {
    return { success: false, error: 'Failed to install extension: ' + err.message };
  }
}

function removeExtension(extensionId) {
  try {
    if (!extensionId || typeof extensionId !== 'string') return false;
    const safeId = extensionId.replace(/[^a-zA-Z0-9_\-]/g, '');
    session.defaultSession.removeExtension(safeId);
    const extDir = path.join(extensionsDir, safeId);
    const resolvedExtDir = path.resolve(extDir);
    const resolvedBase = path.resolve(extensionsDir);
    if (resolvedExtDir.startsWith(resolvedBase) && fs.existsSync(resolvedExtDir)) {
      fs.rmSync(resolvedExtDir, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

function loadSavedExtensions() {
  try {
    // 1. Load native bundled extensions (uBlock Origin built-in)
    const bundledUblock = path.join(__dirname, 'default-extensions', 'ublock-origin');
    if (fs.existsSync(path.join(bundledUblock, 'manifest.json'))) {
      try {
        session.defaultSession.loadExtension(bundledUblock, { allowFileAccess: false });
        console.log('Native uBlock Origin loaded into session.');
      } catch (err) {
        console.error('Failed to load bundled uBlock Origin:', err.message);
      }
    }

    // 2. Load user installed extensions
    if (fs.existsSync(extensionsDir)) {
      const dirs = fs.readdirSync(extensionsDir);
      for (const dir of dirs) {
        const extPath = path.join(extensionsDir, dir);
        if (fs.existsSync(extPath) && fs.statSync(extPath).isDirectory()) {
          const manifestPath = path.join(extPath, 'manifest.json');
          if (fs.existsSync(manifestPath)) {
            try {
              session.defaultSession.loadExtension(extPath, { allowFileAccess: false });
            } catch (err) {
              console.error(`Failed to load extension ${dir}:`, err.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to load saved extensions:', err.message);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ============================================================
// SETTINGS OVERLAY
// ============================================================

function createSettingsWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const overlayWidth = 720;
  const overlayHeight = 540;

  settingsWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.floor((width - overlayWidth) / 2),
    y: Math.floor((height - overlayHeight) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      event.preventDefault();
      hideSettingsOverlay();
    }
  });

  settingsWindow.on('blur', () => {
    hideSettingsOverlay();
  });
}

function showSettingsOverlay() {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    createSettingsWindow();
  }
  settingsWindow.webContents.send('settings-loaded', {
    adBlockerEnabled,
    darkModeEnabled,
    saveHistoryEnabled,
    mouseGesturesEnabled,
    vpnEnabled,
    darkThemeStyle,
    blockedCount: adblocker.getBlockedCount()
  });
  settingsWindow.show();
  settingsWindow.focus();
}

function hideSettingsOverlay() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
}

// ============================================================
// EXIT MODAL OVERLAY
// ============================================================

function createExitModalWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const overlayWidth = 440;
  const overlayHeight = 240;

  exitModalWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: Math.floor((width - overlayWidth) / 2),
    y: Math.floor((height - overlayHeight) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  exitModalWindow.loadFile(path.join(__dirname, 'exit-modal.html'));

  exitModalWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'Escape' || input.key === 'Enter') {
        event.preventDefault();
        app.quit();
      } else if (input.key === ' ' || input.key === 'Spacebar') {
        event.preventDefault();
        hideExitModal();
      }
    }
  });

  exitModalWindow.on('blur', () => {
    hideExitModal();
  });
}

function showExitModal() {
  if (!exitModalWindow || exitModalWindow.isDestroyed()) {
    createExitModalWindow();
  }
  exitModalWindow.show();
  exitModalWindow.focus();
}

function hideExitModal() {
  if (exitModalWindow && !exitModalWindow.isDestroyed()) {
    exitModalWindow.hide();
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
}

// ============================================================
// DOWNLOAD POPUP & MANAGER
// ============================================================

function createDownloadPopupWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  downloadPopupWindow = new BrowserWindow({
    width: 400,
    height: 450,
    x: width - 420,
    y: height - 470,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  downloadPopupWindow.loadFile(path.join(__dirname, 'download-popup.html'));
}

function showDownloadsManager() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, 'downloads-manager.html'));
}

// ============================================================
// DARK THEME & AD BLOCKER STYLES
// ============================================================

async function toggleDarkMode() {
  darkModeEnabled = !darkModeEnabled;
  nativeTheme.themeSource = darkModeEnabled ? 'dark' : 'light';
  saveUserData();
  if (mainWindow) {
    mainWindow.webContents.send('settings-changed', { darkModeEnabled });
  }
  return darkModeEnabled;
}

async function applyDarkThemeStyle() {
  if (!mainWindow) return;
  if (deepBlackCssKey) {
    try {
      await mainWindow.webContents.removeInsertedCSS(deepBlackCssKey);
    } catch (e) {}
    deepBlackCssKey = null;
  }
}

async function applyAdBlockerCosmetics() {
  if (!mainWindow) return;

  if (adblockCosmeticCssKey) {
    try {
      await mainWindow.webContents.removeInsertedCSS(adblockCosmeticCssKey);
    } catch (e) {}
    adblockCosmeticCssKey = null;
  }

  if (adBlockerEnabled) {
    adblockCosmeticCssKey = await adblocker.injectCosmeticFilters(mainWindow.webContents, true);
  }
}

// ============================================================
// SEARCH QUERY PARSER
// ============================================================

function parseSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  let url = query.trim().substring(0, 2048);
  if (!url) return '';

  // Security: Disallow dangerous pseudo-protocols
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return 'https://www.google.com/search?q=' + encodeURIComponent(query);
  }

  // Security: Only allow internal homepage for file://
  if (lower.startsWith('file://')) {
    if (url.endsWith('homepage.html')) return url;
    return 'https://www.google.com/search?q=' + encodeURIComponent(query);
  }

  if (url.startsWith('!')) {
    const spaceIndex = url.indexOf(' ');
    if (spaceIndex !== -1) {
      const shortcut = url.substring(0, spaceIndex).toLowerCase();
      const searchTerms = url.substring(spaceIndex + 1).trim();

      if (shortcut === '!d' || shortcut === '!ddg') {
        return 'https://duckduckgo.com/?q=' + encodeURIComponent(searchTerms);
      }
      if (shortcut === '!b' || shortcut === '!bing') {
        return 'https://www.bing.com/search?q=' + encodeURIComponent(searchTerms);
      }
      if (shortcut === '!w' || shortcut === '!wiki') {
        return 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(searchTerms);
      }
      if (shortcut === '!y' || shortcut === '!yt') {
        return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(searchTerms);
      }
      if (shortcut === '!g') {
        return 'https://www.google.com/search?q=' + encodeURIComponent(searchTerms);
      }
    }
  }

  if (!/^https?:\/\//i.test(url)) {
    const isDomain = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(url);
    const isLocalhost = /^(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(\/.*)?$/i.test(url);

    if (isDomain) {
      url = 'https://' + url;
    } else if (isLocalhost) {
      url = 'http://' + url;
    } else {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
    }
  }

  return url;
}

// ============================================================
// IPC COMMUNICATION
// ============================================================

// Tab Management IPC
ipcMain.handle('create-tab', (event, url) => {
  if (!tabManager) return null;
  const tab = tabManager.createTab(url);
  return tab ? tab.id : null;
});

ipcMain.handle('close-tab', (event, tabId) => {
  if (!tabManager) return false;
  tabManager.closeTab(tabId);
  return true;
});

ipcMain.handle('switch-tab', (event, tabId) => {
  if (!tabManager) return false;
  tabManager.switchTab(tabId);
  return true;
});

ipcMain.handle('get-tabs', () => {
  if (!tabManager) return [];
  return tabManager.getPublicTabs();
});

// Search Navigation
ipcMain.on('perform-navigation', (event, query) => {
  const url = parseSearchQuery(query);
  if (url && tabManager) {
    tabManager.navigateActiveTab(url);
  } else if (url && mainWindow) {
    mainWindow.loadURL(url);
  }
  hideSearchOverlay();
});

ipcMain.on('cancel-search', () => {
  hideSearchOverlay();
});

// Exit Modal
ipcMain.on('confirm-exit', () => {
  app.quit();
});

ipcMain.on('cancel-exit-modal', () => {
  hideExitModal();
});

// Extensions
ipcMain.handle('list-extensions', () => {
  return getInstalledExtensions();
});

ipcMain.handle('install-extension', async () => {
  const result = await installExtensionFolder();
  if (extensionsWindow) {
    extensionsWindow.webContents.send('extensions-updated', getInstalledExtensions());
  }
  return result;
});

ipcMain.handle('install-extension-package', async () => {
  const result = await installExtensionFromPackage();
  if (extensionsWindow) {
    extensionsWindow.webContents.send('extensions-updated', getInstalledExtensions());
  }
  return result;
});

ipcMain.handle('install-extension-webstore', async (event, urlOrId) => {
  const result = await installExtensionFromWebStore(urlOrId);
  if (extensionsWindow) {
    extensionsWindow.webContents.send('extensions-updated', getInstalledExtensions());
  }
  return result;
});

ipcMain.handle('remove-extension', (event, id) => {
  const result = removeExtension(id);
  if (extensionsWindow) {
    extensionsWindow.webContents.send('extensions-updated', getInstalledExtensions());
  }
  return result;
});

ipcMain.on('cancel-extensions', () => {
  hideExtensionsOverlay();
});

ipcMain.handle('get-history', () => {
  return userData.history || [];
});

ipcMain.handle('clear-history', () => {
  userData.history = [];
  saveUserData();
  return true;
});

// Dark Mode
ipcMain.handle('toggle-dark-mode', async () => {
  return await toggleDarkMode();
});

ipcMain.handle('get-dark-mode-status', () => {
  return darkModeEnabled;
});

let themeMode = 'dark'; // 'dark', 'light', 'system'

// Settings
ipcMain.handle('get-settings', () => {
  return {
    adBlockerEnabled,
    autoPipEnabled,
    darkModeEnabled,
    themeMode,
    saveHistoryEnabled,
    mouseGesturesEnabled,
    vpnEnabled,
    darkThemeStyle,
    blockedCount: adblocker.getBlockedCount()
  };
});

ipcMain.handle('save-setting', async (event, data) => {
  const { key, value } = data || {};
  if (key === 'themeMode') {
    themeMode = value;
    if (themeMode === 'light') {
      darkModeEnabled = false;
      nativeTheme.themeSource = 'light';
    } else if (themeMode === 'dark') {
      darkModeEnabled = true;
      nativeTheme.themeSource = 'dark';
    } else {
      nativeTheme.themeSource = 'system';
      darkModeEnabled = nativeTheme.shouldUseDarkColors;
    }
    if (mainWindow) {
      mainWindow.webContents.send('settings-changed', { themeMode, darkModeEnabled });
    }
  } else if (key === 'adBlockerEnabled') {
    adBlockerEnabled = value;
    await applyAdBlockerCosmetics();
    if (mainWindow) {
      mainWindow.webContents.send('settings-changed', { adBlockerEnabled });
    }
  } else if (key === 'autoPipEnabled') {
    autoPipEnabled = value;
    if (mainWindow) {
      mainWindow.webContents.send('settings-changed', { autoPipEnabled });
    }
  } else if (key === 'darkModeEnabled') {
    if (darkModeEnabled !== value) {
      await toggleDarkMode();
    }
  } else if (key === 'saveHistoryEnabled') {
    saveHistoryEnabled = value;
  } else if (key === 'mouseGesturesEnabled') {
    mouseGesturesEnabled = value;
    if (mainWindow) {
      mainWindow.webContents.send('settings-changed', { mouseGesturesEnabled });
    }
  } else if (key === 'vpnEnabled') {
    if (vpnEnabled !== value) {
      vpnEnabled = value;
      if (vpnEnabled) {
        await vpnModule.startVPN();
      } else {
        await vpnModule.stopVPN();
      }
      if (mainWindow) {
        mainWindow.webContents.send('settings-changed', { vpnEnabled });
      }
    }
  } else if (key === 'darkThemeStyle') {
    darkThemeStyle = value;
    await applyDarkThemeStyle();
  }
  saveUserData();
  return true;
});

ipcMain.handle('toggle-vpn', async () => {
  vpnEnabled = !vpnEnabled;
  if (vpnEnabled) {
    await vpnModule.startVPN();
  } else {
    await vpnModule.stopVPN();
  }
  saveUserData();
  if (mainWindow) {
    mainWindow.webContents.send('settings-changed', { vpnEnabled });
  }
  return vpnEnabled;
});

ipcMain.handle('get-vpn-status', () => {
  return vpnEnabled;
});

ipcMain.handle('clear-browsing-data', async () => {
  await clearBrowsingData();
  return true;
});

ipcMain.on('cancel-settings', () => {
  hideSettingsOverlay();
});

ipcMain.on('close-settings', () => {
  hideSettingsOverlay();
});

ipcMain.handle('submit-feedback', async (event, data) => {
  try {
    if (!data || typeof data !== 'object') return { success: false, error: 'Invalid feedback data' };
    
    const safeCategory = typeof data.category === 'string' ? data.category.substring(0, 50) : 'General';
    const safeEmail = typeof data.email === 'string' ? data.email.substring(0, 100) : 'anonymous@aurabrowser.app';
    const safeMessage = typeof data.message === 'string' ? data.message.substring(0, 5000) : '';
    const safeRating = typeof data.rating === 'number' ? Math.max(1, Math.min(5, data.rating)) : 5;

    const feedbackEntry = {
      category: safeCategory,
      email: safeEmail,
      message: safeMessage,
      rating: safeRating,
      recipient: 'info@cornel.media',
      timestamp: Date.now()
    };

    if (!userData.feedbackLog) userData.feedbackLog = [];
    userData.feedbackLog.push(feedbackEntry);
    saveUserData();

    // Send payload to email via formspree/endpoint if available
    try {
      const { net } = require('electron');
      const req = net.request({
        method: 'POST',
        url: 'https://formspree.io/f/mwpkjjov',
        headers: { 'Content-Type': 'application/json' }
      });
      req.write(JSON.stringify({
        email: safeEmail,
        message: `[Aura Browser Feedback] [${safeCategory}]: ${safeMessage}`,
        recipient: 'info@cornel.media',
        appVersion: '2.1.0'
      }));
      req.end();
    } catch (e) {}

    return { success: true, email: 'info@cornel.media' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Downloads
ipcMain.handle('get-downloads', () => {
  return downloadsModule.getPublicDownloads();
});

ipcMain.handle('get-detected-media', () => {
  if (!mainWindow) return [];
  const url = mainWindow.webContents.getURL();
  return downloadsModule.getDetectedMedia(url);
});

ipcMain.handle('scan-media', async () => {
  if (!mainWindow) return [];
  const mediaItems = await downloadsModule.scanPageForMedia(mainWindow.webContents);
  if (downloadPopupWindow && mediaItems.length > 0) {
    downloadPopupWindow.webContents.send('media-detected', mediaItems);
    downloadPopupWindow.show();
  }
  return mediaItems;
});

ipcMain.on('start-download', (event, url) => {
  downloadsModule.startDownload(mainWindow, url);
});

ipcMain.on('pause-download', (event, id) => {
  downloadsModule.pauseDownload(id);
});

ipcMain.on('resume-download', (event, id) => {
  downloadsModule.resumeDownload(id);
});

ipcMain.on('cancel-download', (event, id) => {
  downloadsModule.cancelDownload(id);
});

ipcMain.on('open-download', (event, id) => {
  downloadsModule.openDownload(id);
});

ipcMain.on('open-download-folder', (event, id) => {
  downloadsModule.openDownloadFolder(id);
});

ipcMain.on('clear-downloads', () => {
  downloadsModule.clearDownloads();
});

ipcMain.on('retry-download', (event, id) => {
  downloadsModule.retryDownload(mainWindow, id);
});

// Global Trigger Actions
function triggerGlobalAction(action) {
  if (action === 'search') showSearchOverlay('search');
  else if (action === 'history') showSearchOverlay('history');
  else if (action === 'downloads') showDownloadsManager();
  else if (action === 'extensions') showExtensionsOverlay();
  else if (action === 'settings') showSettingsOverlay();
  else if (action === 'new-tab') { if (tabManager) tabManager.createTab(); }
  else if (action === 'close-tab') { if (tabManager) tabManager.closeTab(tabManager.activeTabId); }
  else if (action === 'restore-tab') { if (tabManager) tabManager.restoreClosedTab(); }
  else if (action === 'reload') { if (tabManager) tabManager.reloadActiveTab(); }
  else if (action === 'go-back') { if (tabManager) tabManager.goBackActiveTab(); }
  else if (action === 'go-forward') { if (tabManager) tabManager.goForwardActiveTab(); }
  else if (action === 'home') { if (tabManager) tabManager.navigateActiveTab('homepage'); }
  else if (action === 'toggle-adblock') {
    adBlockerEnabled = !adBlockerEnabled;
    saveUserData();
    applyAdBlockerCosmetics();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-changed', { adBlockerEnabled });
    }
  }
  else if (action === 'zoom-in') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const level = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(Math.min(level + 0.5, 5));
    }
  }
  else if (action === 'zoom-out') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const level = mainWindow.webContents.getZoomLevel();
      mainWindow.webContents.setZoomLevel(Math.max(level - 0.5, -5));
    }
  }
  else if (action === 'print') {
    if (tabManager && tabManager.getActiveTab()) {
      tabManager.getActiveTab().view.webContents.print();
    }
  }
  else if (action === 'optimize-drivers') {
    const { exec } = require('child_process');
    const scriptPath = path.join(app.getAppPath(), 'install_drivers.ps1');
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoExit -ExecutionPolicy Bypass -File \\\"${scriptPath}\\\"' -Verb RunAs"`);
  }
}

ipcMain.on('trigger-action', (event, action) => {
  triggerGlobalAction(action);
});

module.exports = { triggerGlobalAction };

ipcMain.on('cancel-popup', () => {
  if (downloadPopupWindow) downloadPopupWindow.hide();
});

// ============================================================
// APP LIFECYCLE
// ============================================================

app.whenReady().then(() => {
  loadUserData();
  nativeTheme.themeSource = darkModeEnabled ? 'dark' : 'light';

  // Modern Chrome User-Agent (Strips Electron tags and presents latest Chrome 131 compatibility)
  const modernChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  session.defaultSession.setUserAgent(modernChromeUA);

  // Windows transparency registry hint
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('powershell -Command "Set-ItemProperty -Path \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize\' -Name \'EnableTransparency\' -Value 1"', () => {});
  }

  // Security: Enforce strict session permission handlers
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['fullscreen', 'notifications'];
    if (allowed.includes(permission)) {
      return callback(true);
    }
    if (permission === 'media' || permission === 'geolocation') {
      const url = webContents.getURL();
      if (url && url.startsWith('https://')) {
        return callback(true);
      }
    }
    return callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (permission === 'fullscreen' || permission === 'notifications') return true;
    if ((permission === 'media' || permission === 'geolocation') && requestingOrigin && requestingOrigin.startsWith('https://')) {
      return true;
    }
    return false;
  });

  // Setup Ad Blocker WebRequest filtering (Enabled by default)
  adblocker.setupAdBlocker(session.defaultSession, () => adBlockerEnabled, (count) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('adblock-count-updated', count);
    }
  });

  // Setup download tracking
  downloadsModule.setupDownloadTracking(session.defaultSession, (downloads) => {
    if (mainWindow) {
      mainWindow.webContents.send('downloads-updated', downloads);
    }
  });

  // Load saved unpacked & crx extensions
  loadSavedExtensions();

  if (vpnEnabled) {
    vpnModule.startVPN().catch(err => console.error("VPN Startup error:", err));
  }

  // Create primary browser window (overlays are loaded lazily on demand)
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAll().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

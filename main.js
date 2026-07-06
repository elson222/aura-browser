const { app, BrowserWindow, ipcMain, screen, session, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const darkMode = require('./dark-mode');
const downloadsModule = require('./downloads');
const glassmorphism = require('./glassmorphism');

let mainWindow;
let searchWindow;
let extensionsWindow;
let downloadPopupWindow;
let darkModeCssKey = null;
let darkModeEnabled = true; // Default on
let glassmorphismCssKey = null;
let glassmorphismEnabled = false; // Default off

// Ad Blocker domains list
const adDomains = [
  'doubleclick.net',
  'google-analytics.com',
  'googletagservices.com',
  'googletagmanager.com',
  'adservice.google.com',
  'adservice.google.co.in',
  'googleads.g.doubleclick.net',
  'stats.g.doubleclick.net',
  'adnxs.com',
  'advertising.com',
  'adtech.de',
  'casalemedia.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'criteo.com',
  'yieldmanager.com',
  'outbrain.com',
  'taboola.com',
  'adroll.com',
  'smartadserver.com',
  'exponential.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'zeroredirect1.com'
];

// User Data (History & Bookmarks)
const userDataPath = path.join(app.getPath('userData'), 'userData.json');
let userData = {
  history: [],
  bookmarks: [
    { title: "Google", url: "https://www.google.com" },
    { title: "GitHub", url: "https://github.com" },
    { title: "YouTube", url: "https://www.youtube.com" }
  ],
  darkModeEnabled: true,
  extensions: []
};

// Extensions directory
const extensionsDir = path.join(app.getPath('userData'), 'extensions');
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

function loadUserData() {
  try {
    if (fs.existsSync(userDataPath)) {
      const content = fs.readFileSync(userDataPath, 'utf8');
      const loaded = JSON.parse(content);
      userData = { ...userData, ...loaded };
      darkModeEnabled = userData.darkModeEnabled !== false;
      glassmorphismEnabled = userData.glassmorphismEnabled === true;
    } else {
      saveUserData();
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
  }
}

function saveUserData() {
  try {
    userData.darkModeEnabled = darkModeEnabled;
    userData.glassmorphismEnabled = glassmorphismEnabled;
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to save user data:", err);
  }
}

// ============================================================
// WINDOWS
// ============================================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    vibrancy: 'under-window',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  try {
    mainWindow.setBackgroundMaterial('acrylic');
  } catch (e) {
    // Ignore unsupported platform or version
  }

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'homepage.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (searchWindow) searchWindow.close();
    if (extensionsWindow) extensionsWindow.close();
    if (downloadPopupWindow) downloadPopupWindow.close();
  });

  // Track History on Navigation
  mainWindow.webContents.on('did-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    
    setTimeout(() => {
      if (!mainWindow) return;
      const title = mainWindow.webContents.getTitle() || url;
      
      userData.history = userData.history.filter(item => item.url !== url);
      userData.history.unshift({ title, url, timestamp: Date.now() });
      
      if (userData.history.length > 200) {
        userData.history.pop();
      }
      saveUserData();
    }, 1000);
  });

  // Inject dark mode and glassmorphism on page load
  mainWindow.webContents.on('dom-ready', async () => {
    darkModeCssKey = await darkMode.injectDarkMode(mainWindow.webContents, darkModeEnabled);
    glassmorphismCssKey = await glassmorphism.injectGlassmorphism(mainWindow.webContents, glassmorphismEnabled);

    // Check for YouTube and detect media
    const url = mainWindow.webContents.getURL();
    if (downloadsModule.isYouTubeVideo(url)) {
      const ytMedia = await downloadsModule.detectYouTubeMedia(mainWindow.webContents);
      if (ytMedia.length > 0 && downloadPopupWindow) {
        downloadPopupWindow.webContents.send('media-detected', ytMedia);
        downloadPopupWindow.show();
      }
    }
  });

  // Also re-inject on in-page navigation (SPA sites)
  mainWindow.webContents.on('did-navigate-in-page', async () => {
    darkModeCssKey = await darkMode.injectDarkMode(mainWindow.webContents, darkModeEnabled);
    glassmorphismCssKey = await glassmorphism.injectGlassmorphism(mainWindow.webContents, glassmorphismEnabled);

    const url = mainWindow.webContents.getURL();
    if (downloadsModule.isYouTubeVideo(url)) {
      setTimeout(async () => {
        const ytMedia = await downloadsModule.detectYouTubeMedia(mainWindow.webContents);
        if (ytMedia.length > 0 && downloadPopupWindow) {
          downloadPopupWindow.webContents.send('media-detected', ytMedia);
          downloadPopupWindow.show();
        }
      }, 2000);
    }
  });

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key.toLowerCase();
    const ctrl = input.control;
    const shift = input.shift;
    const alt = input.alt;

    // Ctrl+T or Ctrl+L — Search overlay
    if (ctrl && !shift && (key === 't' || key === 'l')) {
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

    // Ctrl+Shift+G — Toggle glassmorphism mode
    if (ctrl && shift && key === 'g') {
      event.preventDefault();
      toggleGlassmorphism();
      return;
    }

    // Ctrl+Shift+E — Extensions manager
    if (ctrl && shift && key === 'e') {
      event.preventDefault();
      showExtensionsOverlay();
      return;
    }

    // Ctrl+H — History (show in search overlay with history focus)
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

    // Ctrl+F — Find in page
    if (ctrl && !shift && key === 'f') {
      // Let Electron handle find-in-page natively
      // We'll implement a custom one later if needed
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
      const url = mainWindow.webContents.getURL();
      if (!url.startsWith('file://')) {
        mainWindow.loadURL('view-source:' + url);
      }
      return;
    }

    // F11 — Toggle fullscreen
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

    // Escape — Stop loading or go home
    if (key === 'escape') {
      if (mainWindow.webContents.isLoading()) {
        mainWindow.webContents.stop();
      }
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

async function savePage() {
  if (!mainWindow) return;
  const url = mainWindow.webContents.getURL();
  if (url.startsWith('file://')) return;

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('downloads'), mainWindow.webContents.getTitle() + '.html'),
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
  const url = mainWindow.webContents.getURL();
  if (url.startsWith('file://')) return;
  const title = mainWindow.webContents.getTitle() || url;

  const alreadyBookmarked = userData.bookmarks.some(b => b.url === url);
  if (!alreadyBookmarked) {
    userData.bookmarks.unshift({ title, url });
    saveUserData();
  }
}

// ============================================================
// SEARCH OVERLAY
// ============================================================

function createSearchWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const overlayWidth = 650;
  const overlayHeight = 380;

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

function showSearchOverlay() {
  if (!searchWindow) return;
  searchWindow.webContents.send('focus-search', {
    history: userData.history,
    bookmarks: userData.bookmarks
  });
  searchWindow.show();
  searchWindow.focus();
}

function hideSearchOverlay() {
  if (!searchWindow) return;
  searchWindow.hide();
  if (mainWindow) mainWindow.focus();
}

// ============================================================
// EXTENSIONS OVERLAY
// ============================================================

function createExtensionsWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const overlayWidth = 500;
  const overlayHeight = 500;

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
  if (!extensionsWindow) return;
  const extensions = getInstalledExtensions();
  extensionsWindow.webContents.send('extensions-updated', extensions);
  extensionsWindow.show();
  extensionsWindow.focus();
}

function hideExtensionsOverlay() {
  if (!extensionsWindow) return;
  extensionsWindow.hide();
  if (mainWindow) mainWindow.focus();
}

// ============================================================
// EXTENSIONS ENGINE
// ============================================================

function getInstalledExtensions() {
  try {
    const allExtensions = session.defaultSession.getAllExtensions();
    return allExtensions.map(ext => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      path: ext.path,
      enabled: true
    }));
  } catch {
    return [];
  }
}

async function installExtension() {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Select Extension Folder (unpacked)',
    properties: ['openDirectory'],
    buttonLabel: 'Load Extension'
  });

  if (filePaths && filePaths.length > 0) {
    try {
      const ext = await session.defaultSession.loadExtension(filePaths[0], {
        allowFileAccess: true
      });

      // Copy to extensions directory for persistence
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

function removeExtension(extensionId) {
  try {
    session.defaultSession.removeExtension(extensionId);
    const extDir = path.join(extensionsDir, extensionId);
    if (fs.existsSync(extDir)) {
      fs.rmSync(extDir, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

function loadSavedExtensions() {
  try {
    if (!fs.existsSync(extensionsDir)) return;
    const dirs = fs.readdirSync(extensionsDir);
    for (const dir of dirs) {
      const extPath = path.join(extensionsDir, dir);
      if (fs.statSync(extPath).isDirectory()) {
        try {
          session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
        } catch (err) {
          console.error(`Failed to load extension ${dir}:`, err.message);
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
// DOWNLOAD POPUP
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

  downloadPopupWindow.on('blur', () => {
    // Don't auto-hide, user might be clicking download buttons
  });
}

// ============================================================
// DOWNLOADS MANAGER
// ============================================================

function showDownloadsManager() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, 'downloads-manager.html'));
}

// ============================================================
// DARK MODE
// ============================================================

async function toggleDarkMode() {
  darkModeEnabled = !darkModeEnabled;
  saveUserData();

  if (mainWindow) {
    if (darkModeEnabled) {
      darkModeCssKey = await darkMode.injectDarkMode(mainWindow.webContents, true);
    } else {
      await darkMode.removeDarkMode(mainWindow.webContents, darkModeCssKey);
      darkModeCssKey = null;
    }
  }
}

// ============================================================
// GLASSMORPHISM MODE
// ============================================================

async function toggleGlassmorphism() {
  glassmorphismEnabled = !glassmorphismEnabled;
  saveUserData();

  if (mainWindow) {
    if (glassmorphismEnabled) {
      glassmorphismCssKey = await glassmorphism.injectGlassmorphism(mainWindow.webContents, true);
    } else {
      await glassmorphism.removeGlassmorphism(mainWindow.webContents, glassmorphismCssKey);
      glassmorphismCssKey = null;
    }
  }
}

// ============================================================
// SEARCH QUERY PARSING
// ============================================================

function parseSearchQuery(query) {
  let url = query.trim();
  if (!url) return '';

  // Check for search engine shortcuts
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

  // Check if it's a URL or search query
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

// Search
ipcMain.on('perform-navigation', (event, query) => {
  const url = parseSearchQuery(query);
  if (url && mainWindow) {
    mainWindow.loadURL(url);
  }
  hideSearchOverlay();
});

ipcMain.on('cancel-search', () => {
  hideSearchOverlay();
});

// Extensions
ipcMain.handle('list-extensions', () => {
  return getInstalledExtensions();
});

ipcMain.handle('install-extension', async () => {
  const result = await installExtension();
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

// Dark Mode
ipcMain.handle('toggle-dark-mode', async () => {
  await toggleDarkMode();
  return darkModeEnabled;
});

ipcMain.handle('get-dark-mode-status', () => {
  return darkModeEnabled;
});

// Glassmorphism Mode
ipcMain.handle('toggle-glassmorphism', async () => {
  await toggleGlassmorphism();
  return glassmorphismEnabled;
});

ipcMain.handle('get-glassmorphism-status', () => {
  return glassmorphismEnabled;
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

ipcMain.on('cancel-popup', () => {
  if (downloadPopupWindow) downloadPopupWindow.hide();
});

// ============================================================
// APP STARTUP
// ============================================================

app.whenReady().then(() => {
  loadUserData();

  // Setup Ad Blocker WebRequest interceptor
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const isAd = adDomains.some(domain => url.includes(domain));
    if (isAd) {
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });

  // Setup media detection
  downloadsModule.setupMediaDetection(session.defaultSession, (pageUrl, mediaItems) => {
    if (downloadPopupWindow && mediaItems.length > 0) {
      downloadPopupWindow.webContents.send('media-detected', mediaItems);
      downloadPopupWindow.show();
    }
  });

  // Setup download tracking
  downloadsModule.setupDownloadTracking(session.defaultSession, (downloads) => {
    // Send updates to downloads manager if it's showing
    if (mainWindow) {
      mainWindow.webContents.send('downloads-updated', downloads);
    }
  });

  // Load saved extensions
  loadSavedExtensions();

  // Create all windows
  createMainWindow();
  createSearchWindow();
  createExtensionsWindow();
  createDownloadPopupWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAll().length === 0) {
      createMainWindow();
      createSearchWindow();
      createExtensionsWindow();
      createDownloadPopupWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

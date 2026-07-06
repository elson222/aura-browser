const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let searchWindow;

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
  ]
};

function loadUserData() {
  try {
    if (fs.existsSync(userDataPath)) {
      const content = fs.readFileSync(userDataPath, 'utf8');
      userData = JSON.parse(content);
    } else {
      saveUserData();
    }
  } catch (err) {
    console.error("Failed to load user data:", err);
  }
}

function saveUserData() {
  try {
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to save user data:", err);
  }
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'homepage.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (searchWindow) searchWindow.close();
  });

  // Track History on Navigation
  mainWindow.webContents.on('did-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    
    // Fetch title after a tiny delay so it loads, or use the URL
    setTimeout(() => {
      if (!mainWindow) return;
      const title = mainWindow.webContents.getTitle() || url;
      
      // Update history
      userData.history = userData.history.filter(item => item.url !== url);
      userData.history.unshift({ title, url, timestamp: Date.now() });
      
      if (userData.history.length > 50) {
        userData.history.pop();
      }
      saveUserData();
    }, 1000);
  });

  // Intercept shortcuts directly on the webContents
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 't' && input.type === 'keyDown') {
      event.preventDefault();
      showSearchOverlay();
    }
    // Ctrl + D to Bookmark current page
    if (input.control && input.key.toLowerCase() === 'd' && input.type === 'keyDown') {
      event.preventDefault();
      bookmarkCurrentPage();
    }
    // Browser Navigation shortcuts
    if (input.alt && input.key === 'ArrowLeft' && input.type === 'keyDown') {
      if (mainWindow.webContents.canGoBack()) {
        mainWindow.webContents.goBack();
      }
    }
    if (input.alt && input.key === 'ArrowRight' && input.type === 'keyDown') {
      if (mainWindow.webContents.canGoForward()) {
        mainWindow.webContents.goForward();
      }
    }
    if (input.control && input.key.toLowerCase() === 'r' && input.type === 'keyDown') {
      mainWindow.webContents.reload();
    }
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

function createSearchWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const overlayWidth = 650;
  const overlayHeight = 380; // Taller window to accommodate suggestions list

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
  // Send data to search window
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
  if (mainWindow) {
    mainWindow.focus();
  }
}

// Search Query Parsing with engine shortcuts
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

// IPC Communication
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

  createMainWindow();
  createSearchWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAll().length === 0) {
      createMainWindow();
      createSearchWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

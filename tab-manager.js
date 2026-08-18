// Aura Multi-Tab Management Engine (Zen & Chrome Style)
const { BrowserView, app } = require('electron');
const path = require('path');

class TabManager {
  constructor(mainWindow, adblocker, darkMode) {
    this.mainWindow = mainWindow;
    this.adblocker = adblocker;
    this.darkMode = darkMode;
    this.tabs = []; // Array of { id, title, url, view, favicon }
    this.activeTabId = null;
    this.tabCounter = 0;
  }

  getBounds() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return { width: 1920, height: 1080 };
    const [width, height] = this.mainWindow.getSize();
    return { x: 0, y: 0, width, height };
  }

  createTab(initialUrl = null) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return null;

    this.tabCounter++;
    const tabId = 'tab_' + Date.now() + '_' + this.tabCounter;

    const view = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        navigateOnDragDrop: false,
        sandbox: false
      }
    });

    const tab = {
      id: tabId,
      title: 'New Tab',
      url: initialUrl || 'homepage',
      view: view,
      favicon: null
    };

    this.tabs.push(tab);

    // Setup View WebContents Listeners
    const wc = view.webContents;
    wc.setVisualZoomLevelLimits(1, 3);

    // Security: Block webview tag injection
    wc.on('will-attach-webview', (event) => {
      event.preventDefault();
    });

    // Security: Intercept window.open popups and open safely in new isolated tabs
    wc.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          this.createTab(url);
        }
      } catch (e) {}
      return { action: 'deny' };
    });

    // Security: Navigation Guards to block malicious protocols & file:// traversal
    wc.on('will-navigate', (event, targetUrl) => {
      try {
        const currentUrl = tab.url || '';
        const parsedTarget = new URL(targetUrl);

        // Disallow remote websites from navigating to file://, javascript:, or data: html
        if (parsedTarget.protocol === 'file:') {
          const isInternalHome = targetUrl.endsWith('homepage.html');
          if (!isInternalHome && !currentUrl.startsWith('file://')) {
            event.preventDefault();
            return;
          }
        }

        if (parsedTarget.protocol === 'javascript:' || parsedTarget.protocol === 'vbscript:') {
          event.preventDefault();
          return;
        }
      } catch (e) {
        event.preventDefault();
      }
    });

    wc.on('page-title-updated', (_e, title) => {
      tab.title = title || 'Aura Tab';
      this.broadcastTabs();
    });

    wc.on('page-favicon-updated', (_e, favicons) => {
      if (favicons && favicons.length > 0) {
        tab.favicon = favicons[0];
        this.broadcastTabs();
      }
    });

    wc.on('did-navigate', (_e, url) => {
      tab.url = url;
      if (!url.startsWith('file://')) {
        tab.title = wc.getTitle() || url;
      } else {
        tab.title = 'New Tab';
      }
      this.broadcastTabs();
    });

    wc.on('did-navigate-in-page', (_e, url) => {
      tab.url = url;
      this.broadcastTabs();
    });

    // Keyboard Shortcuts within View
    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const key = input.key.toLowerCase();
      const ctrl = input.control;
      const shift = input.shift;
      const alt = input.alt;

      // Ctrl + T -> New Tab
      if (ctrl && !shift && key === 't') {
        event.preventDefault();
        this.createTab();
        return;
      }

      // Ctrl + W -> Close Tab
      if (ctrl && !shift && key === 'w') {
        event.preventDefault();
        this.closeTab(this.activeTabId);
        return;
      }

      // Ctrl + Tab -> Next Tab
      if (ctrl && !shift && input.key === 'Tab') {
        event.preventDefault();
        this.nextTab();
        return;
      }

      // Ctrl + Shift + Tab -> Previous Tab
      if (ctrl && shift && input.key === 'Tab') {
        event.preventDefault();
        this.prevTab();
        return;
      }

      // Ctrl + 1..9 -> Switch Tab
      if (ctrl && !shift && !alt && key >= '1' && key <= '9') {
        const index = parseInt(key) - 1;
        if (this.tabs[index]) {
          event.preventDefault();
          this.switchTab(this.tabs[index].id);
          return;
        }
      }

      // Ctrl + L -> Omnibox Search
      if (ctrl && !shift && key === 'l') {
        event.preventDefault();
        const { ipcMain } = require('electron');
        if (this.mainWindow) this.mainWindow.webContents.send('trigger-action', 'search');
        return;
      }

      // Ctrl + E -> Extensions Manager
      if (ctrl && !shift && key === 'e') {
        event.preventDefault();
        if (this.mainWindow) this.mainWindow.webContents.send('trigger-action', 'extensions');
        return;
      }

      // Ctrl + B -> Toggle Zen Sidebar
      if (ctrl && !shift && key === 'b') {
        event.preventDefault();
        wc.send('toggle-zen-dock');
        return;
      }

      // Ctrl + , -> Settings
      if (ctrl && !shift && input.key === ',') {
        event.preventDefault();
        if (this.mainWindow) this.mainWindow.webContents.send('trigger-action', 'settings');
        return;
      }

      // Ctrl + J -> Downloads
      if (ctrl && !shift && key === 'j') {
        event.preventDefault();
        if (this.mainWindow) this.mainWindow.webContents.send('trigger-action', 'downloads');
        return;
      }

      // Ctrl + R or F5 -> Reload
      if ((ctrl && !shift && key === 'r') || key === 'f5') {
        event.preventDefault();
        wc.reload();
        return;
      }

      // Ctrl + Shift + R -> Hard Reload
      if (ctrl && shift && key === 'r') {
        event.preventDefault();
        wc.reloadIgnoringCache();
        return;
      }
    });

    // Load initial content
    if (initialUrl && !initialUrl.startsWith('homepage')) {
      if (/^https?:\/\//i.test(initialUrl)) {
        wc.loadURL(initialUrl);
      } else {
        wc.loadURL('https://www.google.com/search?q=' + encodeURIComponent(initialUrl));
      }
    } else {
      wc.loadFile(path.join(__dirname, 'homepage.html'));
    }

    this.switchTab(tabId);
    return tab;
  }

  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab || !this.mainWindow || this.mainWindow.isDestroyed()) return;

    this.activeTabId = tabId;
    this.mainWindow.setBrowserView(tab.view);
    const bounds = this.getBounds();
    tab.view.setBounds(bounds);
    tab.view.setAutoResize({ width: true, height: true });
    tab.view.webContents.focus();

    this.broadcastTabs();
  }

  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const tab = this.tabs[index];

    // If only 1 tab remaining, reset it to homepage instead of closing whole app
    if (this.tabs.length === 1) {
      tab.view.webContents.loadFile(path.join(__dirname, 'homepage.html'));
      tab.title = 'New Tab';
      tab.url = 'homepage';
      tab.favicon = null;
      this.broadcastTabs();
      return;
    }

    // Remove view from window
    try {
      if (this.activeTabId === tabId) {
        this.mainWindow.removeBrowserView(tab.view);
      }
      tab.view.webContents.destroy();
    } catch (e) {}

    this.tabs.splice(index, 1);

    // Switch to adjacent tab
    if (this.activeTabId === tabId) {
      const nextIndex = Math.max(0, index - 1);
      if (this.tabs[nextIndex]) {
        this.switchTab(this.tabs[nextIndex].id);
      }
    } else {
      this.broadcastTabs();
    }
  }

  nextTab() {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.switchTab(this.tabs[nextIndex].id);
  }

  prevTab() {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    this.switchTab(this.tabs[prevIndex].id);
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId) || null;
  }

  getPublicTabs() {
    return this.tabs.map(t => ({
      id: t.id,
      title: t.title || 'New Tab',
      url: t.url || '',
      favicon: t.favicon,
      isActive: t.id === this.activeTabId
    }));
  }

  broadcastTabs() {
    const list = this.getPublicTabs();
    this.tabs.forEach(t => {
      try {
        if (!t.view.webContents.isDestroyed()) {
          t.view.webContents.send('tabs-updated', list);
        }
      } catch (e) {}
    });
  }

  navigateActiveTab(query) {
    const tab = this.getActiveTab();
    if (!tab) {
      this.createTab(query);
      return;
    }

    const wc = tab.view.webContents;
    let url = query.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
      const isDomain = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(url);
      if (isDomain) {
        url = 'https://' + url;
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
      }
    }

    wc.loadURL(url);
  }

  reloadActiveTab() {
    const tab = this.getActiveTab();
    if (tab && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.reload();
    }
  }

  goBackActiveTab() {
    const tab = this.getActiveTab();
    if (tab && !tab.view.webContents.isDestroyed() && tab.view.webContents.canGoBack()) {
      tab.view.webContents.goBack();
    }
  }

  goForwardActiveTab() {
    const tab = this.getActiveTab();
    if (tab && !tab.view.webContents.isDestroyed() && tab.view.webContents.canGoForward()) {
      tab.view.webContents.goForward();
    }
  }
}

module.exports = { TabManager };

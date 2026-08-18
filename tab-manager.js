// Aura Multi-Tab Management Engine (Zen & Chrome Style)
const { BrowserView, Menu, clipboard, app } = require('electron');
const path = require('path');

class TabManager {
  constructor(mainWindow, adblocker, darkMode) {
    this.mainWindow = mainWindow;
    this.adblocker = adblocker;
    this.darkMode = darkMode;
    this.tabs = []; // Array of { id, title, url, view, favicon }
    this.activeTabId = null;
    this.tabCounter = 0;
    this.closedTabsHistory = []; // Stack for Ctrl+Shift+T restore
  }

  getBounds() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return { x: 0, y: 0, width: 1920, height: 1080 };
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

    // Crash Recovery
    wc.on('render-process-gone', (event, details) => {
      console.warn(`Tab ${tab.id} crashed (${details.reason}). Attempting recovery...`);
      if (details.reason !== 'clean-exit' && !wc.isDestroyed()) {
        setTimeout(() => {
          try { wc.reload(); } catch (e) {}
        }, 500);
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

    // Native Right-Click Context Menu
    wc.on('context-menu', (event, params) => {
      event.preventDefault();
      const menuTemplate = [];

      if (params.linkURL) {
        menuTemplate.push(
          {
            label: 'Open Link in New Tab',
            click: () => this.createTab(params.linkURL)
          },
          {
            label: 'Copy Link Address',
            click: () => clipboard.writeText(params.linkURL)
          },
          { type: 'separator' }
        );
      }

      if (params.hasImageContents || params.mediaType === 'image') {
        if (params.srcURL) {
          menuTemplate.push(
            {
              label: 'Open Image in New Tab',
              click: () => this.createTab(params.srcURL)
            },
            {
              label: 'Save Image As...',
              click: () => wc.downloadURL(params.srcURL)
            },
            {
              label: 'Copy Image Address',
              click: () => clipboard.writeText(params.srcURL)
            },
            { type: 'separator' }
          );
        }
      }

      if (params.selectionText) {
        menuTemplate.push(
          {
            label: `Search for "${params.selectionText.length > 25 ? params.selectionText.substring(0, 22) + '...' : params.selectionText}"`,
            click: () => this.createTab('https://www.google.com/search?q=' + encodeURIComponent(params.selectionText))
          },
          {
            label: 'Copy',
            role: 'copy'
          },
          { type: 'separator' }
        );
      }

      if (params.isEditable) {
        menuTemplate.push(
          { label: 'Undo', role: 'undo' },
          { label: 'Redo', role: 'redo' },
          { type: 'separator' },
          { label: 'Cut', role: 'cut' },
          { label: 'Copy', role: 'copy' },
          { label: 'Paste', role: 'paste' },
          { label: 'Select All', role: 'selectAll' },
          { type: 'separator' }
        );
      }

      menuTemplate.push(
        {
          label: 'Back',
          enabled: wc.canGoBack(),
          click: () => this.goBackActiveTab()
        },
        {
          label: 'Forward',
          enabled: wc.canGoForward(),
          click: () => this.goForwardActiveTab()
        },
        {
          label: 'Reload',
          click: () => this.reloadActiveTab()
        },
        { type: 'separator' },
        {
          label: 'Inspect Element',
          click: () => wc.inspectElement(params.x, params.y)
        }
      );

      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup({ window: this.mainWindow });
    });

    // Keyboard Shortcuts within View
    wc.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const key = input.key.toLowerCase();
      const ctrl = input.control;
      const shift = input.shift;
      const alt = input.alt;

      // Ctrl + Shift + T -> Restore Closed Tab
      if (ctrl && shift && key === 't') {
        event.preventDefault();
        this.restoreClosedTab();
        return;
      }

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

      // Ctrl + 1..8 -> Switch Tab 1..8
      if (ctrl && !shift && !alt && key >= '1' && key <= '8') {
        const index = parseInt(key) - 1;
        if (this.tabs[index]) {
          event.preventDefault();
          this.switchTab(this.tabs[index].id);
          return;
        }
      }

      // Ctrl + 9 -> Switch to Last Tab
      if (ctrl && !shift && !alt && key === '9') {
        event.preventDefault();
        if (this.tabs.length > 0) {
          this.switchTab(this.tabs[this.tabs.length - 1].id);
          return;
        }
      }

      // Alt + Left -> Back
      if (alt && !ctrl && input.key === 'ArrowLeft') {
        event.preventDefault();
        this.goBackActiveTab();
        return;
      }

      // Alt + Right -> Forward
      if (alt && !ctrl && input.key === 'ArrowRight') {
        event.preventDefault();
        this.goForwardActiveTab();
        return;
      }

      // Ctrl + H -> History Search
      if (ctrl && !shift && key === 'h') {
        event.preventDefault();
        if (this.mainWindow) {
          const { triggerGlobalAction } = require('./main');
          if (triggerGlobalAction) triggerGlobalAction('history');
        }
        return;
      }

      // Ctrl + L -> Omnibox Search HUD
      if (ctrl && !shift && key === 'l') {
        event.preventDefault();
        if (this.mainWindow) {
          const { triggerGlobalAction } = require('./main');
          if (triggerGlobalAction) triggerGlobalAction('search');
        }
        return;
      }

      // Ctrl + E -> Extensions Manager
      if (ctrl && !shift && key === 'e') {
        event.preventDefault();
        if (this.mainWindow) {
          const { triggerGlobalAction } = require('./main');
          if (triggerGlobalAction) triggerGlobalAction('extensions');
        }
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
        if (this.mainWindow) {
          const { triggerGlobalAction } = require('./main');
          if (triggerGlobalAction) triggerGlobalAction('settings');
        }
        return;
      }

      // Ctrl + J -> Downloads
      if (ctrl && !shift && key === 'j') {
        event.preventDefault();
        if (this.mainWindow) {
          const { triggerGlobalAction } = require('./main');
          if (triggerGlobalAction) triggerGlobalAction('downloads');
        }
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

    // Save to closed history stack for Ctrl+Shift+T restore
    if (tab.url && !tab.url.startsWith('file://')) {
      this.closedTabsHistory.push({ url: tab.url, title: tab.title });
      if (this.closedTabsHistory.length > 30) this.closedTabsHistory.shift();
    }

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

  restoreClosedTab() {
    if (this.closedTabsHistory.length === 0) return null;
    const lastClosed = this.closedTabsHistory.pop();
    if (lastClosed && lastClosed.url) {
      return this.createTab(lastClosed.url);
    }
    return null;
  }

  duplicateTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && tab.url) {
      return this.createTab(tab.url);
    }
    return null;
  }

  reorderTab(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.tabs.length || toIndex < 0 || toIndex >= this.tabs.length) return;
    const [moved] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, moved);
    this.broadcastTabs();
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

  reloadActiveTab(bypassCache = false) {
    const tab = this.getActiveTab();
    if (tab && !tab.view.webContents.isDestroyed()) {
      if (bypassCache) {
        tab.view.webContents.reloadIgnoringCache();
      } else {
        tab.view.webContents.reload();
      }
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

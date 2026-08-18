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

// Passive Trackpad 2-Finger Horizontal Swipe Navigation (100% Non-intrusive)
if (typeof window !== 'undefined' && window === window.top) {
  let swipeAccumulator = 0;
  let swipeTimeout = null;

  window.addEventListener('wheel', (e) => {
    // Only detect horizontal touchpad swipes (deltaX dominant)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5 && Math.abs(e.deltaX) > 10) {
      swipeAccumulator += e.deltaX;
      clearTimeout(swipeTimeout);
      swipeTimeout = setTimeout(() => { swipeAccumulator = 0; }, 250);

      // Swipe Left (deltaX > 0) -> Forward, Swipe Right (deltaX < 0) -> Back
      if (swipeAccumulator > 150) {
        swipeAccumulator = 0;
        ipcRenderer.send('trigger-action', 'go-forward');
      } else if (swipeAccumulator < -150) {
        swipeAccumulator = 0;
        ipcRenderer.send('trigger-action', 'go-back');
      }
    }
  }, { passive: true });
}

// Native YouTube Zero-Ad Scriptlet Engine (Pre-empts player ad initialization at document_start)
if (typeof window !== 'undefined' && typeof location !== 'undefined' && (location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com'))) {
  const ytScript = document.createElement('script');
  ytScript.textContent = `
    (function() {
      if (window.__aura_yt_zero_ad_active__) return;
      window.__aura_yt_zero_ad_active__ = true;

      function purgeAdsFromObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        try {
          delete obj.adPlacements;
          delete obj.playerAds;
          delete obj.adSlots;
          delete obj.adSlotsAuxiliary;
          delete obj.adBreakHeartbeatParams;
          if (obj.playbackTracking) {
            delete obj.playbackTracking.videostatsPlaybackUrl;
            delete obj.playbackTracking.videostatsDelayplayUrl;
            delete obj.playbackTracking.videostatsWatchtimeUrl;
            delete obj.playbackTracking.qoeUrl;
            delete obj.playbackTracking.atrUrl;
          }
        } catch (e) {}
        return obj;
      }

      // 1. Intercept ytInitialPlayerResponse at definition
      let _ytPlayerResponse = undefined;
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() { return _ytPlayerResponse; },
        set(val) { _ytPlayerResponse = purgeAdsFromObject(val); },
        configurable: true,
        enumerable: true
      });

      // 2. Intercept window.fetch for /youtubei/v1/player and /next
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await origFetch.apply(this, args);
        const url = (args[0] && typeof args[0] === 'string') ? args[0] : ((args[0] && args[0].url) ? args[0].url : '');
        if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
          try {
            const clone = response.clone();
            const json = await clone.json();
            purgeAdsFromObject(json);
            return new Response(JSON.stringify(json), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          } catch (e) {}
        }
        return response;
      };

      // 3. Intercept XMLHttpRequest for player data
      const origXhrOpen = XMLHttpRequest.prototype.open;
      const origXhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = url;
        return origXhrOpen.apply(this, [method, url, ...rest]);
      };
      XMLHttpRequest.prototype.send = function(...args) {
        if (this._url && typeof this._url === 'string' && (this._url.includes('/youtubei/v1/player') || this._url.includes('/youtubei/v1/next'))) {
          this.addEventListener('readystatechange', function() {
            if (this.readyState === 4 && this.status === 200) {
              try {
                const parsed = JSON.parse(this.responseText);
                purgeAdsFromObject(parsed);
                Object.defineProperty(this, 'responseText', { value: JSON.stringify(parsed) });
                Object.defineProperty(this, 'response', { value: JSON.stringify(parsed) });
              } catch (e) {}
            }
          });
        }
        return origXhrSend.apply(this, args);
      };

      // 4. Fail-safe fast-forward and instant click
      function cleanAds() {
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .videoAdUiSkipButton, button.ytp-ad-skip-button-text');
        if (skipBtn) skipBtn.click();

        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
        const video = document.querySelector('video');
        if (adShowing && video && !isNaN(video.duration) && isFinite(video.duration)) {
          video.muted = true;
          video.playbackRate = 16.0;
          video.currentTime = video.duration - 0.1;
        }

        const adContainers = document.querySelectorAll('ytd-action-companion-ad-renderer, ytd-banner-promo-renderer, ytd-ad-slot-renderer, ytd-promoted-sparkles-web-renderer, #player-ads, .ytp-ad-overlay-container, ytd-in-feed-ad-layout-renderer, ytd-display-ad-renderer');
        adContainers.forEach(c => c.remove());
      }

      setInterval(cleanAds, 50);
      document.addEventListener('DOMContentLoaded', cleanAds);
    })();
  `;
  try {
    (document.head || document.documentElement).appendChild(ytScript);
    ytScript.remove();
  } catch (e) {}
}

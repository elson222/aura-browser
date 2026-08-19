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

// Native YouTube Zero-Ad Engine (Document-Start Main World Injection)
if (typeof window !== 'undefined' && typeof location !== 'undefined' && (location.hostname.includes('youtube.com') || location.hostname.includes('youtube-nocookie.com'))) {
  const ytScript = document.createElement('script');
  ytScript.textContent = `
    (function() {
      if (window.__aura_yt_engine_v3__) return;
      window.__aura_yt_engine_v3__ = true;

      // 1. Sanitize Player Objects
      function purgeAds(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        try {
          delete obj.adPlacements;
          delete obj.playerAds;
          delete obj.adSlots;
          delete obj.adSlotsAuxiliary;
          delete obj.adBreakHeartbeatParams;
        } catch (e) {}
        return obj;
      }

      let _ytPlayerResponse = undefined;
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() { return _ytPlayerResponse; },
        set(val) { _ytPlayerResponse = purgeAds(val); },
        configurable: true,
        enumerable: true
      });

      // 2. Intercept fetch & XHR for player responses
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await origFetch.apply(this, args);
        const url = (args[0] && typeof args[0] === 'string') ? args[0] : ((args[0] && args[0].url) ? args[0].url : '');
        if (url && (url.includes('/youtubei/v1/player') || url.includes('/youtubei/v1/next'))) {
          try {
            const clone = response.clone();
            const json = await clone.json();
            purgeAds(json);
            return new Response(JSON.stringify(json), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });
          } catch (e) {}
        }
        return response;
      };

      // 3. High-Frequency Real-Time Video Ad Destroyer
      let wasMutedByAd = false;
      function checkAndKillAds() {
        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        const video = document.querySelector('video.html5-main-video') || document.querySelector('video');

        const isAd = player && (
          player.classList.contains('ad-showing') ||
          player.classList.contains('ad-interrupting') ||
          player.classList.contains('ad-created')
        );

        if (isAd && video) {
          if (!video.muted) {
            video.muted = true;
            wasMutedByAd = true;
          }
          video.playbackRate = 16.0;
          if (!isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
            video.currentTime = video.duration;
          }
          const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .videoAdUiSkipButton, button.ytp-ad-skip-button-text');
          if (skipBtn) skipBtn.click();
        } else if (!isAd && video && wasMutedByAd) {
          video.muted = false;
          video.playbackRate = 1.0;
          wasMutedByAd = false;
        }

        // Clean banner and overlay elements
        const overlays = document.querySelectorAll('.ytp-ad-overlay-container, ytd-action-companion-ad-renderer, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, #player-ads');
        overlays.forEach(el => el.remove());
      }

      // Run on interval and on media events
      setInterval(checkAndKillAds, 25);
      document.addEventListener('timeupdate', checkAndKillAds, true);
      document.addEventListener('play', checkAndKillAds, true);
      document.addEventListener('playing', checkAndKillAds, true);
      document.addEventListener('DOMContentLoaded', checkAndKillAds);
    })();
  `;
  try {
    (document.head || document.documentElement).appendChild(ytScript);
    ytScript.remove();
  } catch (e) {}
}

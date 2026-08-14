// Aura Automatic Picture-in-Picture (PiP) Engine
// Automatically pops out videos when scrolled out of view or tab switched

function initAutoPiP(ipcRenderer) {
  if (window !== window.top) return; // Top frame only

  let autoPipEnabled = true;
  let activeVideo = null;
  let isFloatingMiniPlayer = false;
  let miniPlayerEl = null;

  // Load PiP setting
  ipcRenderer.invoke('get-settings').then(settings => {
    if (settings && typeof settings.autoPipEnabled !== 'undefined') {
      autoPipEnabled = settings.autoPipEnabled;
    }
  }).catch(() => {});

  ipcRenderer.on('settings-changed', (_e, data) => {
    if (typeof data.autoPipEnabled !== 'undefined') {
      autoPipEnabled = data.autoPipEnabled;
    }
  });

  // Inject mini player styles
  const style = document.createElement('style');
  style.textContent = `
    .aura-video-pip-btn {
      position: absolute !important;
      top: 14px !important;
      right: 14px !important;
      width: 34px !important;
      height: 34px !important;
      background: rgba(10, 10, 14, 0.85) !important;
      backdrop-filter: blur(8px) !important;
      -webkit-backdrop-filter: blur(8px) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      border-radius: 8px !important;
      color: #ffffff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 2147483640 !important;
      opacity: 0 !important;
      transition: opacity 0.2s ease, transform 0.15s ease, background 0.15s ease !important;
      pointer-events: auto !important;
    }

    video:hover + .aura-video-pip-btn,
    .aura-video-pip-btn:hover {
      opacity: 1 !important;
    }

    .aura-video-pip-btn:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      transform: scale(1.08) !important;
    }

    .aura-video-pip-btn:active {
      transform: scale(0.95) !important;
    }

    /* Floating Fallback MiniPlayer */
    #aura-floating-miniplayer {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 360px !important;
      height: 202px !important;
      background: #09090b !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 14px !important;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 20px rgba(123, 44, 191, 0.2) !important;
      z-index: 2147483645 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      animation: miniPlayerIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    #aura-floating-miniplayer .miniplayer-header {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 32px !important;
      background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%) !important;
      display: flex !important;
      justify-content: flex-end !important;
      align-items: center !important;
      padding: 0 8px !important;
      z-index: 10 !important;
      opacity: 0 !important;
      transition: opacity 0.2s ease !important;
    }

    #aura-floating-miniplayer:hover .miniplayer-header {
      opacity: 1 !important;
    }

    #aura-floating-miniplayer .miniplayer-close {
      background: rgba(255, 255, 255, 0.15) !important;
      border: none !important;
      border-radius: 50% !important;
      width: 22px !important;
      height: 22px !important;
      color: #fff !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      font-size: 12px !important;
    }

    @keyframes miniPlayerIn {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Monitor playing videos on page
  function attachVideoListeners(video) {
    if (video._auraPipAttached) return;
    video._auraPipAttached = true;

    // Track active playing video
    video.addEventListener('play', () => {
      activeVideo = video;
    });

    video.addEventListener('pause', () => {
      if (activeVideo === video) {
        // If paused, keep track
      }
    });

    // Create PiP button overlay on video parent container
    const pipBtn = document.createElement('div');
    pipBtn.className = 'aura-video-pip-btn';
    pipBtn.title = 'Picture-in-Picture';
    pipBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <rect x="11" y="9" width="9" height="6" rx="1" fill="rgba(255,255,255,0.2)"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    `;

    pipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleVideoPiP(video);
    });

    try {
      if (video.parentElement) {
        const parentPos = window.getComputedStyle(video.parentElement).position;
        if (parentPos === 'static') {
          video.parentElement.style.position = 'relative';
        }
        video.parentElement.appendChild(pipBtn);
      }
    } catch (e) {}

    // IntersectionObserver to detect when playing video leaves viewport
    const observer = new IntersectionObserver((entries) => {
      if (!autoPipEnabled) return;
      entries.forEach(async (entry) => {
        const isPlaying = !video.paused && !video.ended && video.readyState > 2;

        if (!entry.isIntersecting && isPlaying && entry.intersectionRatio < 0.25) {
          // Video scrolled off-screen -> auto trigger PiP
          if (document.pictureInPictureElement !== video && !isFloatingMiniPlayer) {
            try {
              if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
                await video.requestPictureInPicture();
              }
            } catch (err) {
              // Browser / gesture policy fallback
            }
          }
        } else if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Video is back in view -> exit PiP
          if (document.pictureInPictureElement === video) {
            try {
              await document.exitPictureInPicture();
            } catch (err) {}
          }
        }
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1.0] });

    observer.observe(video);
  }

  async function toggleVideoPiP(video) {
    if (!video) return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Native PiP failed:', err.message);
    }
  }

  // Scan for existing and dynamic videos
  function scanVideos() {
    document.querySelectorAll('video').forEach(attachVideoListeners);
  }

  scanVideos();
  const mutationObserver = new MutationObserver(scanVideos);
  mutationObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

module.exports = { initAutoPiP };

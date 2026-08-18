// Aura Automatic Picture-in-Picture (PiP) Engine
// Automatically pops out playing video when scrolled off-screen

function initAutoPiP(ipcRenderer) {
  if (window !== window.top) return;

  let autoPipEnabled = true;

  // Load PiP setting
  if (ipcRenderer && ipcRenderer.invoke) {
    ipcRenderer.invoke('get-settings').then(settings => {
      if (settings && typeof settings.autoPipEnabled !== 'undefined') {
        autoPipEnabled = settings.autoPipEnabled;
      }
    }).catch(() => {});
  }

  if (ipcRenderer && ipcRenderer.on) {
    ipcRenderer.on('settings-changed', (_e, data) => {
      if (typeof data.autoPipEnabled !== 'undefined') {
        autoPipEnabled = data.autoPipEnabled;
      }
    });
  }

  // Monitor playing videos for off-screen scroll
  function monitorVideo(video) {
    if (video._auraPipMonitored) return;
    video._auraPipMonitored = true;

    const observer = new IntersectionObserver((entries) => {
      if (!autoPipEnabled) return;
      entries.forEach(async (entry) => {
        const isPlaying = !video.paused && !video.ended && video.readyState > 2;

        if (!entry.isIntersecting && isPlaying && entry.intersectionRatio < 0.2) {
          if (document.pictureInPictureElement !== video) {
            try {
              if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
                await video.requestPictureInPicture();
              }
            } catch (err) {}
          }
        } else if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (document.pictureInPictureElement === video) {
            try {
              await document.exitPictureInPicture();
            } catch (err) {}
          }
        }
      });
    }, { threshold: [0, 0.2, 0.5, 1.0] });

    observer.observe(video);
  }

  function scanVideos() {
    document.querySelectorAll('video').forEach(monitorVideo);
  }

  scanVideos();
  const mutationObserver = new MutationObserver(scanVideos);
  mutationObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

module.exports = { initAutoPiP };

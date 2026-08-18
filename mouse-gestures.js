// Aura Mouse Gestures Engine with glowing visual trail and real-time action HUD

function initMouseGestures(ipcRenderer) {
  if (window !== window.top) return; // Only top frame

  let isTracking = false;
  let startX = 0;
  let startY = 0;
  let points = [];
  let directions = [];
  let lastDirection = null;
  let canvas = null;
  let ctx = null;
  let hud = null;
  let animationId = null;
  let gesturesEnabled = true;

  // Load gesture enabled setting
  ipcRenderer.invoke('get-settings').then(settings => {
    if (settings && typeof settings.mouseGesturesEnabled !== 'undefined') {
      gesturesEnabled = settings.mouseGesturesEnabled;
    }
  }).catch(() => {});

  ipcRenderer.on('settings-changed', (_e, data) => {
    if (typeof data.mouseGesturesEnabled !== 'undefined') {
      gesturesEnabled = data.mouseGesturesEnabled;
    }
  });

  const gestureActions = {
    'L': { name: 'Go Back', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>', action: () => window.history.back() },
    'R': { name: 'Go Forward', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>', action: () => window.history.forward() },
    'U': { name: 'Scroll to Top', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    'D': { name: 'Scroll to Bottom', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>', action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) },
    'UD': { name: 'Reload Page', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', action: () => window.location.reload() },
    'DR': { name: 'Close / Go Home', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', action: () => ipcRenderer.send('trigger-action', 'home') },
    'DU': { name: 'Search / Open URL', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', action: () => ipcRenderer.send('trigger-action', 'search') },
    'LU': { name: 'Zoom Out', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="8" y1="11" x2="14" y2="11"/></svg>', action: () => ipcRenderer.send('trigger-action', 'zoom-out') },
    'RU': { name: 'Zoom In', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>', action: () => ipcRenderer.send('trigger-action', 'zoom-in') },
    'LD': { name: 'Toggle Dark Mode', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>', action: () => ipcRenderer.invoke('toggle-dark-mode') },
    'RD': { name: 'Toggle Ad Blocker', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', action: () => ipcRenderer.send('trigger-action', 'toggle-adblock') }
  };

  function createElements() {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'aura-gesture-canvas';
      canvas.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483645 !important;
        display: none;
      `;
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
    }

    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'aura-gesture-hud';
      hud.style.cssText = `
        position: fixed !important;
        bottom: 40px !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(20px) scale(0.9) !important;
        background: rgba(14, 14, 18, 0.94) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 12px !important;
        padding: 10px 18px !important;
        color: #ffffff !important;
        font-family: 'Outfit', -apple-system, sans-serif !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
        opacity: 0 !important;
        transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
      `;
      document.body.appendChild(hud);
    }
  }

  function resizeCanvas() {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  function getDirection(dx, dy) {
    const minThreshold = 25;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < minThreshold && absY < minThreshold) return null;

    if (absX > absY * 1.4) {
      return dx > 0 ? 'R' : 'L';
    } else if (absY > absX * 1.4) {
      return dy > 0 ? 'D' : 'U';
    }
    return null;
  }

  function updateHUD(gestureStr) {
    if (!hud) return;
    const matched = gestureActions[gestureStr];
    if (matched) {
      hud.innerHTML = `${matched.icon}<span>${matched.name}</span>`;
      hud.style.opacity = '1';
      hud.style.transform = 'translateX(-50%) translateY(0px) scale(1)';
    } else if (gestureStr.length > 0) {
      hud.innerHTML = `<span>Gesture: ${gestureStr}</span>`;
      hud.style.opacity = '0.8';
      hud.style.transform = 'translateX(-50%) translateY(0px) scale(1)';
    } else {
      hud.style.opacity = '0';
      hud.style.transform = 'translateX(-50%) translateY(20px) scale(0.9)';
    }
  }

  function renderTrail() {
    if (!ctx || points.length < 2) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Secondary core stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.stroke();
  }

  function onMouseMove(e) {
    if (!isTracking) return;

    points.push({ x: e.clientX, y: e.clientY });
    renderTrail();

    const lastPoint = points[points.length - 2] || points[0];
    const dx = e.clientX - lastPoint.x;
    const dy = e.clientY - lastPoint.y;

    const dir = getDirection(dx, dy);
    if (dir && dir !== lastDirection) {
      directions.push(dir);
      lastDirection = dir;
      updateHUD(directions.join(''));
    }
  }

  function onMouseUp(e) {
    if (!isTracking) return;
    isTracking = false;

    window.removeEventListener('mousemove', onMouseMove, { capture: true });
    window.removeEventListener('mouseup', onMouseUp, { capture: true });

    const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY);
    const gestureKey = directions.join('');

    if (canvas) {
      let fadeOpacity = 1;
      const fadeInterval = setInterval(() => {
        fadeOpacity -= 0.15;
        if (fadeOpacity <= 0) {
          clearInterval(fadeInterval);
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.display = 'none';
        } else if (canvas) {
          canvas.style.opacity = fadeOpacity;
        }
      }, 20);
    }

    if (hud) {
      setTimeout(() => {
        hud.style.opacity = '0';
        hud.style.transform = 'translateX(-50%) translateY(20px) scale(0.9)';
      }, 400);
    }

    if (totalDist > 20 && gestureKey && gestureActions[gestureKey]) {
      gestureActions[gestureKey].action();
    }
  }

  window.addEventListener('mousedown', (e) => {
    if (!gesturesEnabled) return;
    if (e.button === 2) { // Right click
      createElements();
      resizeCanvas();
      isTracking = true;
      startX = e.clientX;
      startY = e.clientY;
      points = [{ x: startX, y: startY }];
      directions = [];
      lastDirection = null;
      canvas.style.display = 'block';

      window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
      window.addEventListener('mouseup', onMouseUp, { capture: true });
    }
  }, { capture: true });

  // Suppress context menu if a gesture was performed
  window.addEventListener('contextmenu', (e) => {
    if (!gesturesEnabled) return;
    const totalDist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (totalDist > 20 || directions.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  window.addEventListener('resize', resizeCanvas);
}

module.exports = { initMouseGestures };

// Zen Browser Inspired Features for Aura Browser:
// Rich Vertical Tabs Sidebar, Workspaces, Web Panels (Quick Apps)

function initZenFeatures(ipcRenderer) {
  if (window !== window.top) return;

  // Prevent duplicate injection
  if (document.getElementById('aura-zen-dock')) return;

  // Toggle Tab on left edge
  const tab = document.createElement('div');
  tab.id = 'aura-zen-tab';
  tab.title = 'Zen Tabs & Sidebar (Ctrl+B)';
  tab.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `;

  const dock = document.createElement('div');
  dock.id = 'aura-zen-dock';

  dock.innerHTML = `
    <div class="zen-dock-inner">
      <!-- Header -->
      <div class="zen-header">
        <div class="zen-brand-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span class="zen-brand-text">Aura</span>
        </div>
        <button class="zen-icon-btn" id="zen-btn-newtab" title="New Tab (Ctrl+T)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <!-- Open Tabs Section (Zen Vertical Tabs) -->
      <div class="zen-section-title">
        <span>OPEN TABS</span>
      </div>
      <div class="zen-tabs-container" id="zen-tabs-container">
        <!-- Injected Dynamically -->
      </div>

      <div class="zen-divider"></div>

      <!-- Workspaces Switcher -->
      <div class="zen-section-title">
        <span>WORKSPACES</span>
      </div>
      <div class="zen-workspaces-row">
        <div class="zen-ws-btn active" id="zen-ws-personal" title="Workspace: Personal">Personal</div>
        <div class="zen-ws-btn" id="zen-ws-work" title="Workspace: Work">Work</div>
        <div class="zen-ws-btn" id="zen-ws-dev" title="Workspace: Dev">Dev</div>
      </div>

      <div class="zen-divider"></div>

      <!-- Quick Apps & Superpowers -->
      <div class="zen-section-title">
        <span>QUICK APPS</span>
      </div>
      <div class="zen-apps-grid">
        <button class="zen-app-item" id="zen-app-ai" title="AI Web Assistant">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
          <span>AI Assistant</span>
        </button>
        <button class="zen-app-item" id="zen-app-notes" title="Quick Notes Scratchpad">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
          <span>Notes</span>
        </button>
        <button class="zen-app-item" id="zen-app-split" title="Search Omnibox (Ctrl+L)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search</span>
        </button>
      </div>

      <div class="zen-spacer"></div>

      <!-- Footer Quick Controls -->
      <div class="zen-footer">
        <button class="zen-footer-btn" id="zen-btn-vpn" title="Privacy Shield (Encrypted DNS & Proxy)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </button>
        <button class="zen-footer-btn" id="zen-btn-downloads" title="Downloads (Ctrl+J)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="zen-footer-btn" id="zen-btn-settings" title="Settings (Ctrl+,)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </div>
  `;

  // Floating Web Panel Drawer (for Notes / AI / Web Apps)
  const panelDrawer = document.createElement('div');
  panelDrawer.id = 'aura-zen-drawer';
  panelDrawer.innerHTML = `
    <div class="drawer-header">
      <h4 id="drawerTitle">Side App</h4>
      <button id="drawerClose">✕</button>
    </div>
    <div class="drawer-content" id="drawerContent"></div>
  `;

  // Zen CSS Styles
  const style = document.createElement('style');
  style.textContent = `
    #aura-zen-tab {
      position: fixed !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      left: 0 !important;
      width: 16px !important;
      height: 48px !important;
      background: rgba(18, 18, 24, 0.92) !important;
      border: 1px solid rgba(255, 255, 255, 0.16) !important;
      border-left: none !important;
      border-radius: 0 10px 10px 0 !important;
      z-index: 2147483645 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #a1a1aa !important;
      cursor: pointer !important;
      backdrop-filter: blur(20px) !important;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
      box-shadow: 4px 0 16px rgba(0, 0, 0, 0.6) !important;
    }

    #aura-zen-tab:hover {
      width: 24px !important;
      color: #ffffff !important;
      background: rgba(28, 28, 36, 0.98) !important;
    }

    #aura-zen-dock {
      position: fixed !important;
      top: 0 !important;
      left: -240px !important;
      bottom: 0 !important;
      width: 220px !important;
      background: rgba(12, 12, 16, 0.95) !important;
      backdrop-filter: blur(32px) saturate(1.5) !important;
      -webkit-backdrop-filter: blur(32px) saturate(1.5) !important;
      border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
      z-index: 2147483647 !important;
      transition: left 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 18px 0 44px rgba(0, 0, 0, 0.75) !important;
      user-select: none !important;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
    }

    #aura-zen-dock.visible {
      left: 0 !important;
    }

    .zen-dock-inner {
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 16px 12px !important;
      gap: 10px !important;
      overflow: hidden !important;
    }

    .zen-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 0 4px 4px !important;
    }

    .zen-brand-wrap {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      font-size: 14px !important;
    }

    .zen-brand-text {
      letter-spacing: -0.2px !important;
    }

    .zen-icon-btn {
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      color: #ffffff !important;
      width: 28px !important;
      height: 28px !important;
      border-radius: 8px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }

    .zen-icon-btn:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      transform: scale(1.05) !important;
    }

    .zen-section-title {
      font-size: 10px !important;
      font-weight: 700 !important;
      color: #71717a !important;
      letter-spacing: 0.8px !important;
      padding: 2px 6px !important;
    }

    .zen-tabs-container {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      max-height: 280px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding-right: 2px !important;
    }

    .zen-tab-item {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 8px 10px !important;
      border-radius: 8px !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      color: #a1a1aa !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      position: relative !important;
    }

    .zen-tab-item:hover {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #ffffff !important;
    }

    .zen-tab-item.active {
      background: rgba(255, 255, 255, 0.12) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.18) !important;
      font-weight: 600 !important;
    }

    .zen-tab-favicon {
      width: 14px !important;
      height: 14px !important;
      border-radius: 3px !important;
      flex-shrink: 0 !important;
    }

    .zen-tab-favicon-fallback {
      width: 14px !important;
      height: 14px !important;
      border-radius: 3px !important;
      background: rgba(255, 255, 255, 0.1) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 8px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      flex-shrink: 0 !important;
    }

    .zen-tab-title {
      flex: 1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .zen-tab-close {
      width: 16px !important;
      height: 16px !important;
      border-radius: 4px !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      color: #71717a !important;
      font-size: 10px !important;
      cursor: pointer !important;
    }

    .zen-tab-item:hover .zen-tab-close {
      display: flex !important;
    }

    .zen-tab-close:hover {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ef4444 !important;
    }

    .zen-divider {
      height: 1px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      margin: 4px 0 !important;
    }

    .zen-workspaces-row {
      display: flex !important;
      gap: 4px !important;
      padding: 0 2px !important;
    }

    .zen-ws-btn {
      flex: 1 !important;
      padding: 5px 0 !important;
      text-align: center !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #71717a !important;
      background: rgba(255, 255, 255, 0.04) !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }

    .zen-ws-btn:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.08) !important;
    }

    .zen-ws-btn.active {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.14) !important;
    }

    .zen-apps-grid {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
    }

    .zen-app-item {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 7px 10px !important;
      background: transparent !important;
      border: none !important;
      color: #a1a1aa !important;
      font-family: inherit !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }

    .zen-app-item:hover {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #ffffff !important;
    }

    .zen-spacer {
      flex: 1 !important;
    }

    .zen-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: space-around !important;
      padding: 8px 4px 0 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    .zen-footer-btn {
      background: transparent !important;
      border: none !important;
      color: #71717a !important;
      width: 32px !important;
      height: 32px !important;
      border-radius: 8px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }

    .zen-footer-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #ffffff !important;
    }

    /* Drawer */
    #aura-zen-drawer {
      position: fixed !important;
      top: 0 !important;
      left: -360px !important;
      bottom: 0 !important;
      width: 360px !important;
      background: rgba(14, 14, 18, 0.98) !important;
      backdrop-filter: blur(28px) !important;
      border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
      z-index: 2147483646 !important;
      box-shadow: 15px 0 40px rgba(0, 0, 0, 0.7) !important;
      transition: left 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      color: #ffffff !important;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif !important;
    }

    #aura-zen-drawer.open {
      left: 220px !important;
    }

    .drawer-header {
      padding: 16px 20px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    }

    .drawer-header h4 {
      font-size: 15px !important;
      font-weight: 700 !important;
      margin: 0 !important;
    }

    #drawerClose {
      background: transparent !important;
      border: none !important;
      color: #8e8e93 !important;
      cursor: pointer !important;
      font-size: 14px !important;
    }

    .drawer-content {
      flex: 1 !important;
      padding: 16px !important;
      overflow-y: auto !important;
    }
  `;

  function mountZenUI() {
    if (!document.body || !document.head) return false;
    if (document.getElementById('aura-zen-dock')) return true;

    document.head.appendChild(style);
    document.body.appendChild(tab);
    document.body.appendChild(dock);
    document.body.appendChild(panelDrawer);
    return true;
  }

  if (!mountZenUI()) {
    document.addEventListener('DOMContentLoaded', mountZenUI);
    window.addEventListener('load', mountZenUI);
  }

  let isDrawerOpen = false;

  function showDock() {
    dock.classList.add('visible');
    tab.style.transform = 'translateY(-50%) rotate(180deg)';
  }

  function hideDock() {
    if (!isDrawerOpen) {
      dock.classList.remove('visible');
      tab.style.transform = 'translateY(-50%) rotate(0deg)';
    }
  }

  function toggleDock() {
    if (dock.classList.contains('visible')) {
      isDrawerOpen = false;
      panelDrawer.classList.remove('open');
      hideDock();
    } else {
      showDock();
    }
  }

  // 100% Reliable Edge Mouse Move Listener (Triggers when mouse approaches left edge <= 16px)
  window.addEventListener('mousemove', (e) => {
    if (e.clientX <= 16) {
      showDock();
    } else if (e.clientX > 230 && !isDrawerOpen) {
      hideDock();
    }
  }, { passive: true });

  tab.addEventListener('click', toggleDock);

  dock.addEventListener('mouseleave', () => {
    if (!isDrawerOpen) hideDock();
  });

  // Global shortcut (Ctrl+B)
  if (ipcRenderer && ipcRenderer.on) {
    ipcRenderer.on('toggle-zen-dock', toggleDock);
  }

  // New Tab Button (Ctrl+T)
  document.getElementById('zen-btn-newtab')?.addEventListener('click', () => {
    if (ipcRenderer && ipcRenderer.invoke) {
      ipcRenderer.invoke('create-tab');
    }
  });

  // Render Tabs in Zen Sidebar
  function updateTabsList(tabs) {
    const container = document.getElementById('zen-tabs-container');
    if (!container || !Array.isArray(tabs)) return;

    container.innerHTML = '';
    tabs.forEach((t, idx) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'zen-tab-item' + (t.isActive ? ' active' : '');
      tabEl.title = `${t.title}\nCtrl+${idx + 1}`;

      let iconHtml = `<div class="zen-tab-favicon-fallback">${idx + 1}</div>`;
      if (t.favicon) {
        iconHtml = `<img class="zen-tab-favicon" src="${t.favicon}" onerror="this.outerHTML='<div class=\\'zen-tab-favicon-fallback\\'>${idx + 1}</div>'"/>`;
      }

      tabEl.innerHTML = `
        ${iconHtml}
        <span class="zen-tab-title">${t.title || 'New Tab'}</span>
        <span class="zen-tab-close" title="Close Tab (Ctrl+W)">✕</span>
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('zen-tab-close')) {
          e.stopPropagation();
          ipcRenderer.invoke('close-tab', t.id);
        } else {
          ipcRenderer.invoke('switch-tab', t.id);
        }
      });

      container.appendChild(tabEl);
    });
  }

  if (ipcRenderer && ipcRenderer.on) {
    ipcRenderer.on('tabs-updated', (_event, tabs) => {
      updateTabsList(tabs);
    });
  }

  if (ipcRenderer && ipcRenderer.invoke) {
    ipcRenderer.invoke('get-tabs').then(tabs => {
      if (tabs) updateTabsList(tabs);
    }).catch(() => {});
  }

  // Split / Omnibox Button (Ctrl+L)
  document.getElementById('zen-app-split').addEventListener('click', () => {
    ipcRenderer.send('trigger-action', 'search');
  });

  // VPN Quick Toggle
  const vpnBtn = document.getElementById('zen-btn-vpn');
  vpnBtn.addEventListener('click', async () => {
    try {
      const active = await ipcRenderer.invoke('toggle-vpn');
      if (active) {
        vpnBtn.querySelector('svg').style.stroke = '#34d399';
      } else {
        vpnBtn.querySelector('svg').style.stroke = 'currentColor';
      }
    } catch (e) {}
  });

  // Notes Drawer App
  const notesBtn = document.getElementById('zen-app-notes');
  const drawer = document.getElementById('aura-zen-drawer');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerContent = document.getElementById('drawerContent');
  const drawerClose = document.getElementById('drawerClose');

  notesBtn.addEventListener('click', () => {
    isDrawerOpen = true;
    drawerTitle.textContent = 'Quick Scratchpad';
    drawerContent.innerHTML = `
      <textarea id="zenQuickNotes" placeholder="Jot down notes, links, or ideas here..." style="width:100%; height:85%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; padding:12px; font-family:inherit; font-size:13px; resize:none; outline:none;"></textarea>
      <div style="font-size:11px; color:#71717a; margin-top:8px;">Auto-saved locally in browser storage.</div>
    `;
    drawer.classList.add('open');

    const textarea = document.getElementById('zenQuickNotes');
    if (textarea) {
      textarea.value = localStorage.getItem('aura_zen_notes') || '';
      textarea.addEventListener('input', (e) => {
        localStorage.setItem('aura_zen_notes', e.target.value);
      });
    }
  });

  // AI Assistant Drawer
  const aiBtn = document.getElementById('zen-app-ai');
  aiBtn.addEventListener('click', () => {
    isDrawerOpen = true;
    drawerTitle.textContent = 'AI Web Assistant';
    drawerContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; height:100%;">
        <div style="font-size:12px; color:#a1a1aa;">Quick prompt or summarization:</div>
        <textarea id="aiPrompt" placeholder="Summarize this page or ask a question..." style="width:100%; height:90px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; padding:10px; font-family:inherit; font-size:12px; resize:none; outline:none;"></textarea>
        <button id="aiSend" style="background:#fff; color:#000; font-weight:600; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:12px;">Search with AI</button>
        <div id="aiResponse" style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:10px; font-size:12px; color:#d4d4d8; overflow-y:auto;">Ready for questions.</div>
      </div>
    `;
    drawer.classList.add('open');

    document.getElementById('aiSend')?.addEventListener('click', () => {
      const q = document.getElementById('aiPrompt').value.trim();
      if (q) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
      }
    });
  });

  drawerClose.addEventListener('click', () => {
    isDrawerOpen = false;
    drawer.classList.remove('open');
    hideDock();
  });

  // Action Buttons
  document.getElementById('zen-btn-downloads').addEventListener('click', () => {
    ipcRenderer.send('trigger-action', 'downloads');
  });

  document.getElementById('zen-btn-settings').addEventListener('click', () => {
    ipcRenderer.send('trigger-action', 'settings');
  });

  // Workspaces Toggles
  ['zen-ws-personal', 'zen-ws-work', 'zen-ws-dev'].forEach(id => {
    document.getElementById(id).addEventListener('click', (e) => {
      document.querySelectorAll('.zen-workspaces-row .zen-ws-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });
}

module.exports = { initZenFeatures };

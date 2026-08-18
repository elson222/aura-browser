// Zen Browser Inspired Features for Aura Browser:
// Multi-Tab Management, Split View, Workspaces, Web Panels (Quick Apps)

function initZenFeatures(ipcRenderer) {
  if (window !== window.top) return;

  // Prevent duplicate injection
  if (document.getElementById('aura-zen-dock')) return;

  // Toggle Tab on left edge
  const tab = document.createElement('div');
  tab.id = 'aura-zen-tab';
  tab.title = 'Zen Side Panel (Ctrl+B)';
  tab.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `;

  const dock = document.createElement('div');
  dock.id = 'aura-zen-dock';

  dock.innerHTML = `
    <div class="zen-dock-inner">
      <div class="zen-brand" title="Aura Browser">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>

      <!-- New Tab Action (Ctrl+T) -->
      <div class="zen-section">
        <div class="zen-btn highlight" id="zen-btn-newtab" title="New Tab (Ctrl+T)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      </div>

      <div class="zen-divider"></div>

      <!-- Open Tabs List (Vertical Tabs) -->
      <div class="zen-section zen-tabs-list" id="zen-tabs-container">
        <!-- Injected Dynamically -->
      </div>

      <div class="zen-divider"></div>

      <!-- Workspaces Switcher -->
      <div class="zen-section">
        <div class="zen-btn active" id="zen-ws-personal" title="Workspace: Personal">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="zen-btn" id="zen-ws-work" title="Workspace: Work">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <div class="zen-btn" id="zen-ws-dev" title="Workspace: Dev & Research">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
      </div>

      <div class="zen-divider"></div>

      <!-- Web Panels (Side Apps) -->
      <div class="zen-section">
        <div class="zen-btn" id="zen-app-ai" title="AI Web Assistant">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
        </div>
        <div class="zen-btn" id="zen-app-notes" title="Quick Notes Scratchpad">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
        </div>
        <div class="zen-btn" id="zen-app-split" title="Omnibox Search (Ctrl+L)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      <div class="zen-divider"></div>

      <!-- Shields Quick Toggles -->
      <div class="zen-section">
        <div class="zen-btn active" id="zen-btn-adblock" title="Ad Blocker Shield (Active)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="zen-btn" id="zen-btn-vpn" title="Free VPN Tunnel">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
      </div>

      <div class="zen-spacer"></div>

      <!-- Quick Actions -->
      <div class="zen-section">
        <div class="zen-btn" id="zen-btn-downloads" title="Downloads Manager (Ctrl+J)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <div class="zen-btn" id="zen-btn-settings" title="Settings (Ctrl+,)">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
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
      height: 44px !important;
      background: rgba(18, 18, 24, 0.9) !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      border-left: none !important;
      border-radius: 0 8px 8px 0 !important;
      z-index: 2147483645 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #8e8e93 !important;
      cursor: pointer !important;
      backdrop-filter: blur(16px) !important;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      box-shadow: 4px 0 14px rgba(0, 0, 0, 0.5) !important;
    }

    #aura-zen-tab:hover {
      width: 22px !important;
      color: #ffffff !important;
      background: rgba(28, 28, 36, 0.98) !important;
    }

    #aura-zen-dock {
      position: fixed !important;
      top: 0 !important;
      left: -60px !important;
      bottom: 0 !important;
      width: 54px !important;
      background: rgba(10, 10, 14, 0.96) !important;
      backdrop-filter: blur(28px) saturate(1.4) !important;
      -webkit-backdrop-filter: blur(28px) saturate(1.4) !important;
      border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
      z-index: 2147483647 !important;
      transition: left 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 14px 0 40px rgba(0, 0, 0, 0.65) !important;
      user-select: none !important;
    }

    #aura-zen-dock.visible {
      left: 0 !important;
    }

    .zen-dock-inner {
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      padding: 16px 0 !important;
      gap: 10px !important;
    }

    .zen-brand {
      color: #ffffff !important;
      opacity: 0.9 !important;
      margin-bottom: 2px !important;
    }

    .zen-section {
      display: flex !important;
      flex-direction: column !important;
      gap: 6px !important;
      width: 100% !important;
      align-items: center !important;
    }

    .zen-tabs-list {
      max-height: 180px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      padding: 2px 0 !important;
    }

    .zen-divider {
      width: 24px !important;
      height: 1px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      margin: 2px 0 !important;
    }

    .zen-spacer {
      flex: 1 !important;
    }

    .zen-btn {
      width: 36px !important;
      height: 36px !important;
      border-radius: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #8e8e93 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      background: transparent !important;
      border: 1px solid transparent !important;
      position: relative !important;
    }

    .zen-btn:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
    }

    .zen-btn.highlight {
      background: rgba(255, 255, 255, 0.06) !important;
      color: #ffffff !important;
    }

    .zen-btn.highlight:hover {
      background: rgba(255, 255, 255, 0.18) !important;
      transform: scale(1.05) !important;
    }

    .zen-btn.active {
      background: rgba(255, 255, 255, 0.14) !important;
      color: #ffffff !important;
      border-color: rgba(255, 255, 255, 0.3) !important;
      box-shadow: 0 0 12px rgba(255, 255, 255, 0.1) !important;
    }

    .tab-badge-num {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: inherit !important;
    }

    .tab-close-icon {
      position: absolute !important;
      top: -2px !important;
      right: -2px !important;
      width: 14px !important;
      height: 14px !important;
      background: #ef4444 !important;
      color: #ffffff !important;
      border-radius: 50% !important;
      display: none !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 9px !important;
      font-weight: 900 !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
    }

    .zen-btn:hover .tab-close-icon {
      display: flex !important;
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
      left: 54px !important;
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

  document.head.appendChild(style);
  document.body.appendChild(tab);
  document.body.appendChild(dock);
  document.body.appendChild(panelDrawer);

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

  // 100% Reliable Edge Mouse Move Listener
  window.addEventListener('mousemove', (e) => {
    if (e.clientX <= 8) {
      showDock();
    } else if (e.clientX > 64 && !isDrawerOpen) {
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

  // New Tab Button
  document.getElementById('zen-btn-newtab')?.addEventListener('click', () => {
    if (ipcRenderer && ipcRenderer.invoke) {
      ipcRenderer.invoke('create-tab');
    }
  });

  // Render Tabs in Zen Dock
  function updateTabsList(tabs) {
    const container = document.getElementById('zen-tabs-container');
    if (!container || !Array.isArray(tabs)) return;

    container.innerHTML = '';
    tabs.forEach((t, idx) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'zen-btn' + (t.isActive ? ' active' : '');
      tabEl.title = `${t.title} (Ctrl+${idx + 1})`;
      tabEl.innerHTML = `
        <span class="tab-badge-num">${idx + 1}</span>
        <span class="tab-close-icon" title="Close Tab (Ctrl+W)">✕</span>
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close-icon')) {
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
        vpnBtn.classList.add('active');
        vpnBtn.querySelector('svg').style.stroke = '#34d399';
      } else {
        vpnBtn.classList.remove('active');
        vpnBtn.querySelector('svg').style.stroke = 'currentColor';
      }
    } catch (e) {}
  });

  // Adblock Quick Toggle
  const adbBtn = document.getElementById('zen-btn-adblock');
  adbBtn.addEventListener('click', async () => {
    try {
      const settings = await ipcRenderer.invoke('get-settings');
      const newState = !settings.adBlockerEnabled;
      await ipcRenderer.invoke('save-setting', { key: 'adBlockerEnabled', value: newState });
      adbBtn.classList.toggle('active', newState);
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
      document.querySelectorAll('.zen-section .zen-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });
}

module.exports = { initZenFeatures };

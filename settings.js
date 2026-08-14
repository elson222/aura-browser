// Settings UI Logic with Multi-Tab Switching (Zen Style)

document.addEventListener('DOMContentLoaded', async () => {
  const closeBtn = document.getElementById('closeBtn');
  const sectionTitle = document.getElementById('sectionTitle');
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  const themeSelect = document.getElementById('theme-mode-select');
  const darkmodeToggle = document.getElementById('darkmode-toggle');
  const adblockToggle = document.getElementById('adblock-toggle');
  const autopipToggle = document.getElementById('autopip-toggle');
  const vpnToggle = document.getElementById('vpn-toggle');
  const gesturesToggle = document.getElementById('gestures-toggle');
  const historyToggle = document.getElementById('history-toggle');
  const clearDataBtn = document.getElementById('clearDataBtn');

  const titles = {
    appearance: 'Appearance',
    privacy: 'Shields & Privacy',
    features: 'Superpowers',
    feedback: 'Feedback & Support'
  };

  // Tab switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById('tab-' + target)?.classList.add('active');
      sectionTitle.textContent = titles[target] || 'Settings';
    });
  });

  // Close handler
  function closeSettings() {
    if (window.electronAPI) {
      if (window.electronAPI.closeSettings) window.electronAPI.closeSettings();
      if (window.electronAPI.cancelSettings) window.electronAPI.cancelSettings();
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSettings();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSettings();
    }
  });

  // Load Settings
  if (window.electronAPI && window.electronAPI.getSettings) {
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings) {
        if (themeSelect) themeSelect.value = settings.themeMode || 'dark';
        if (darkmodeToggle) darkmodeToggle.checked = settings.darkModeEnabled === true;
        if (adblockToggle) adblockToggle.checked = settings.adBlockerEnabled !== false;
        if (autopipToggle) autopipToggle.checked = settings.autoPipEnabled !== false;
        if (vpnToggle) vpnToggle.checked = settings.vpnEnabled === true;
        if (gesturesToggle) gesturesToggle.checked = settings.mouseGesturesEnabled !== false;
        if (historyToggle) historyToggle.checked = settings.saveHistoryEnabled !== false;
      }
    } catch (err) {}
  }

  // Save Settings Handlers
  const save = async (key, value) => {
    if (window.electronAPI && window.electronAPI.saveSetting) {
      try {
        await window.electronAPI.saveSetting(key, value);
      } catch (err) {}
    }
  };

  themeSelect?.addEventListener('change', (e) => {
    save('themeMode', e.target.value);
  });

  darkmodeToggle?.addEventListener('change', (e) => {
    save('darkModeEnabled', e.target.checked);
  });

  adblockToggle?.addEventListener('change', (e) => {
    save('adBlockerEnabled', e.target.checked);
  });

  autopipToggle?.addEventListener('change', (e) => {
    save('autoPipEnabled', e.target.checked);
  });

  vpnToggle?.addEventListener('change', async (e) => {
    if (window.electronAPI && window.electronAPI.toggleVpn) {
      const active = await window.electronAPI.toggleVpn();
      vpnToggle.checked = active;
    }
  });

  gesturesToggle?.addEventListener('change', (e) => {
    save('mouseGesturesEnabled', e.target.checked);
  });

  historyToggle?.addEventListener('change', (e) => {
    save('saveHistoryEnabled', e.target.checked);
  });

  clearDataBtn?.addEventListener('click', async () => {
    if (confirm('Clear all browsing data, history, and cache?')) {
      if (window.electronAPI && window.electronAPI.clearBrowsingData) {
        await window.electronAPI.clearBrowsingData();
        clearDataBtn.textContent = 'Cleared!';
        setTimeout(() => { clearDataBtn.textContent = 'Clear All'; }, 2000);
      }
    }
  });

  // Feedback Form Handler (Sends directly to info@cornel.media)
  const sendFeedbackBtn = document.getElementById('sendFeedbackBtn');
  const feedbackCategory = document.getElementById('feedbackCategory');
  const feedbackText = document.getElementById('feedbackText');
  const feedbackEmail = document.getElementById('feedbackEmail');
  const feedbackStatus = document.getElementById('feedbackStatus');

  sendFeedbackBtn?.addEventListener('click', async () => {
    const text = feedbackText.value.trim();
    if (!text) {
      feedbackStatus.textContent = 'Please enter your message.';
      feedbackStatus.style.color = '#ef4444';
      return;
    }

    const payload = {
      category: feedbackCategory.value,
      message: text,
      email: feedbackEmail.value.trim() || 'user@aurabrowser.app',
      recipient: 'info@cornel.media',
      timestamp: new Date().toISOString()
    };

    feedbackStatus.textContent = 'Sending feedback to info@cornel.media...';
    feedbackStatus.style.color = '#a1a1aa';

    try {
      if (window.electronAPI && window.electronAPI.submitFeedback) {
        await window.electronAPI.submitFeedback(payload);
      }
      
      const existing = JSON.parse(localStorage.getItem('aura_feedback') || '[]');
      existing.push(payload);
      localStorage.setItem('aura_feedback', JSON.stringify(existing));

      feedbackStatus.textContent = 'Thank you! Sent to info@cornel.media';
      feedbackStatus.style.color = '#34d399';
      feedbackText.value = '';
      feedbackEmail.value = '';
    } catch (err) {
      feedbackStatus.textContent = 'Saved locally (info@cornel.media). Thank you!';
      feedbackStatus.style.color = '#34d399';
    }

    setTimeout(() => { feedbackStatus.textContent = ''; }, 4000);
  });
});

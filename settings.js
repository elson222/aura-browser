/* ============================================================
   AuraBrowser — Settings Overlay Logic
   Manages user preferences, mouse gestures, ad blocker, and data clearance
   ============================================================ */

(() => {
  'use strict';

  const settingsContainer = document.getElementById('settingsContainer');
  const closeBtn = document.getElementById('closeBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const actionStatus = document.getElementById('actionStatus');

  const toggles = {
    adBlockerEnabled: document.getElementById('adblock-toggle'),
    mouseGesturesEnabled: document.getElementById('gestures-toggle'),
    darkModeEnabled: document.getElementById('darkmode-toggle'),
    saveHistoryEnabled: document.getElementById('history-toggle'),
    vpnEnabled: document.getElementById('vpn-toggle')
  };

  const darkStyleSelect = document.getElementById('dark-style-select');
  const darkStyleRow = document.getElementById('dark-style-row');

  function updateStyleRowVisibility() {
    if (toggles.darkModeEnabled && toggles.darkModeEnabled.checked) {
      darkStyleRow.style.display = 'flex';
    } else {
      darkStyleRow.style.display = 'none';
    }
  }

  // Preload API: Get Settings on load
  if (window.electronAPI) {
    window.electronAPI.getSettings().then(settings => {
      if (settings) {
        Object.keys(toggles).forEach(key => {
          if (toggles[key] && settings[key] !== undefined) {
            toggles[key].checked = settings[key];
          }
        });
        if (settings.darkThemeStyle && darkStyleSelect) {
          darkStyleSelect.value = settings.darkThemeStyle;
        }
        updateStyleRowVisibility();
      }
    }).catch(err => {
      console.error('Failed to load settings:', err);
    });
  }

  // Toggle Event Listeners
  Object.keys(toggles).forEach(key => {
    const el = toggles[key];
    if (el) {
      el.addEventListener('change', async () => {
        if (window.electronAPI) {
          try {
            await window.electronAPI.saveSetting(key, el.checked);
          } catch (err) {
            console.error(`Failed to save setting ${key}:`, err);
            el.checked = !el.checked;
          }
        }
      });
    }
  });

  if (darkStyleSelect) {
    darkStyleSelect.addEventListener('change', async () => {
      if (window.electronAPI) {
        try {
          await window.electronAPI.saveSetting('darkThemeStyle', darkStyleSelect.value);
        } catch (err) {
          console.error('Failed to save darkThemeStyle:', err);
        }
      }
    });
  }

  if (toggles.darkModeEnabled) {
    toggles.darkModeEnabled.addEventListener('change', updateStyleRowVisibility);
  }

  // Clear Browsing Data
  clearDataBtn.addEventListener('click', async () => {
    if (window.electronAPI) {
      clearDataBtn.disabled = true;
      clearDataBtn.querySelector('span').textContent = 'Clearing...';
      try {
        await window.electronAPI.clearBrowsingData();
        showStatus('Browsing data cleared successfully!');
      } catch (err) {
        console.error('Failed to clear browsing data:', err);
        showStatus('Failed to clear data.', true);
      } finally {
        clearDataBtn.disabled = false;
        clearDataBtn.querySelector('span').textContent = 'Clear Browsing Data';
      }
    }
  });

  function closeSettings() {
    settingsContainer.style.animation = 'none';
    settingsContainer.offsetHeight; // force reflow
    settingsContainer.style.animation = 'slideDown 0.18s cubic-bezier(0.4, 0, 1, 1) forwards';
    setTimeout(() => {
      if (window.electronAPI && window.electronAPI.cancelSettings) {
        window.electronAPI.cancelSettings();
      }
    }, 160);
  }

  closeBtn.addEventListener('click', closeSettings);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
    }
  });

  let statusTimeout;
  function showStatus(text, isError = false) {
    actionStatus.textContent = text;
    actionStatus.style.color = isError ? '#f87171' : '#34d399';
    actionStatus.classList.add('show');

    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      actionStatus.classList.remove('show');
    }, 3000);
  }
})();

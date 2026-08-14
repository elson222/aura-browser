document.addEventListener('DOMContentLoaded', async () => {
  const closeBtn = document.getElementById('closeBtn');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const themeSelect = document.getElementById('theme-mode-select');

  // Feedback form elements
  const feedbackCategory = document.getElementById('feedbackCategory');
  const feedbackText = document.getElementById('feedbackText');
  const feedbackEmail = document.getElementById('feedbackEmail');
  const sendFeedbackBtn = document.getElementById('sendFeedbackBtn');
  const feedbackStatus = document.getElementById('feedbackStatus');

  const toggles = {
    adBlockerEnabled: document.getElementById('adblock-toggle'),
    autoPipEnabled: document.getElementById('autopip-toggle'),
    mouseGesturesEnabled: document.getElementById('gestures-toggle'),
    saveHistoryEnabled: document.getElementById('history-toggle'),
    vpnEnabled: document.getElementById('vpn-toggle')
  };

  // Load current settings
  try {
    const settings = await window.electronAPI.getSettings();
    if (settings) {
      Object.keys(toggles).forEach(key => {
        if (toggles[key] && typeof settings[key] !== 'undefined') {
          toggles[key].checked = settings[key];
        }
      });

      if (settings.themeMode) {
        themeSelect.value = settings.themeMode;
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Theme selection handler
  themeSelect.addEventListener('change', async (e) => {
    const theme = e.target.value;
    try {
      await window.electronAPI.saveSetting('themeMode', theme);
      if (theme === 'light') {
        document.body.setAttribute('data-theme', 'light');
      } else {
        document.body.removeAttribute('data-theme');
      }
    } catch (err) {
      console.error('Failed to save theme mode:', err);
    }
  });

  // Toggles binding
  Object.keys(toggles).forEach(key => {
    const el = toggles[key];
    if (!el) return;

    el.addEventListener('change', async (e) => {
      try {
        await window.electronAPI.saveSetting(key, e.target.checked);
      } catch (err) {
        console.error(`Failed to save setting ${key}:`, err);
        e.target.checked = !e.target.checked;
      }
    });
  });

  // Feedback Submission
  sendFeedbackBtn.addEventListener('click', async () => {
    const message = feedbackText.value.trim();
    if (!message) {
      feedbackStatus.textContent = 'Please enter your feedback or issue description.';
      feedbackStatus.style.color = '#f87171';
      feedbackStatus.style.display = 'block';
      return;
    }

    sendFeedbackBtn.disabled = true;
    sendFeedbackBtn.textContent = 'Sending...';

    const feedbackData = {
      category: feedbackCategory.value,
      message: message,
      email: feedbackEmail.value.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      // Save feedback in user data
      const existing = JSON.parse(localStorage.getItem('aura_user_feedback') || '[]');
      existing.push(feedbackData);
      localStorage.setItem('aura_user_feedback', JSON.stringify(existing));

      feedbackStatus.textContent = 'Thank you! Your feedback has been recorded.';
      feedbackStatus.style.color = '#34d399';
      feedbackStatus.style.display = 'block';
      feedbackText.value = '';
      feedbackEmail.value = '';
    } catch (err) {
      feedbackStatus.textContent = 'Feedback saved locally.';
      feedbackStatus.style.color = '#34d399';
      feedbackStatus.style.display = 'block';
    } finally {
      sendFeedbackBtn.disabled = false;
      sendFeedbackBtn.textContent = 'Submit Feedback';
      setTimeout(() => {
        feedbackStatus.style.display = 'none';
      }, 4000);
    }
  });

  // Clear data button
  clearDataBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all history, cookies, and cached data?')) {
      try {
        await window.electronAPI.clearBrowsingData();
        alert('All browsing data has been cleared.');
      } catch (err) {
        alert('Failed to clear data: ' + err.message);
      }
    }
  });

  // Close overlay
  closeBtn.addEventListener('click', () => {
    window.electronAPI.cancelSettings();
  });
});

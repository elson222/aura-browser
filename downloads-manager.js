/* ============================================
   AuraBrowser — Downloads Manager Logic
   Full-page downloads view with real-time updates
   ============================================ */

(() => {
  'use strict';

  // ── DOM References ──
  const downloadsList = document.getElementById('downloadsList');
  const emptyState = document.getElementById('emptyState');
  const noResultsState = document.getElementById('noResultsState');
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const backBtn = document.getElementById('backBtn');

  // ── State ──
  let downloads = [];
  let searchQuery = '';

  // ── SVG Icons ──
  const icons = {
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>`,
    play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>`,
    cancel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`,
    retry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>`,
    openFile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>`
  };

  // ── Utilities ──
  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec <= 0) return '';
    return `${formatSize(bytesPerSec)}/s`;
  }

  function formatETA(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';
    if (seconds < 60) return `${Math.ceil(seconds)}s left`;
    if (seconds < 3600) {
      const m = Math.floor(seconds / 60);
      const s = Math.ceil(seconds % 60);
      return `${m}m ${s}s left`;
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m left`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getProgress(dl) {
    if (!dl.size || dl.size <= 0) return 0;
    return Math.min(100, Math.round((dl.received / dl.size) * 100));
  }

  function getETA(dl) {
    if (!dl.speed || dl.speed <= 0 || !dl.size) return 0;
    const remaining = dl.size - (dl.received || 0);
    return remaining / dl.speed;
  }

  // ── Get icon for download state ──
  function getStateIcon(state) {
    switch (state) {
      case 'downloading': return icons.download;
      case 'paused': return icons.pause;
      case 'completed': return icons.check;
      case 'failed': return icons.alert;
      case 'cancelled': return icons.cancel;
      default: return icons.file;
    }
  }

  // ── Build action buttons based on state ──
  function buildActions(dl) {
    let html = '';

    switch (dl.state) {
      case 'downloading':
        html += `
          <button class="action-btn" data-action="pause" data-id="${dl.id}" title="Pause">
            ${icons.pause}
          </button>
          <button class="action-btn danger" data-action="cancel" data-id="${dl.id}" title="Cancel">
            ${icons.cancel}
          </button>
        `;
        break;

      case 'paused':
        html += `
          <button class="action-btn primary" data-action="resume" data-id="${dl.id}" title="Resume">
            ${icons.play}
          </button>
          <button class="action-btn danger" data-action="cancel" data-id="${dl.id}" title="Cancel">
            ${icons.cancel}
          </button>
        `;
        break;

      case 'completed':
        html += `
          <button class="action-btn success" data-action="open" data-id="${dl.id}" title="Open file">
            ${icons.openFile}
          </button>
          <button class="action-btn" data-action="openFolder" data-id="${dl.id}" title="Show in folder">
            ${icons.folder}
          </button>
        `;
        break;

      case 'failed':
        html += `
          <button class="action-btn-text retry" data-action="retry" data-id="${dl.id}">
            ${icons.retry}
            Retry
          </button>
        `;
        break;

      case 'cancelled':
        html += `
          <button class="action-btn-text retry" data-action="retry" data-id="${dl.id}">
            ${icons.retry}
            Retry
          </button>
        `;
        break;
    }

    return html;
  }

  // ── Build progress section ──
  function buildProgress(dl) {
    if (dl.state !== 'downloading' && dl.state !== 'paused') return '';

    const progress = getProgress(dl);
    const isPaused = dl.state === 'paused';
    const speed = !isPaused ? formatSpeed(dl.speed) : '';
    const eta = !isPaused ? formatETA(getETA(dl)) : 'Paused';

    return `
      <div class="progress-container">
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${isPaused ? 'paused' : ''}" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${formatSize(dl.received || 0)} of ${formatSize(dl.size)} — ${progress}%</span>
          <span>${speed}${speed && eta ? ' · ' : ''}${eta}</span>
        </div>
      </div>
    `;
  }

  // ── Build file meta line ──
  function buildMeta(dl) {
    const parts = [];

    if (dl.size && dl.size > 0) {
      parts.push(formatSize(dl.size));
    }

    if (dl.url) {
      try {
        const hostname = new URL(dl.url).hostname;
        parts.push(hostname);
      } catch {
        // skip invalid URLs
      }
    }

    return parts.map((p, i) =>
      i > 0 ? `<span class="sep"></span><span>${escapeHtml(p)}</span>` : `<span>${escapeHtml(p)}</span>`
    ).join('');
  }

  // ── Create download card ──
  function createDownloadCard(dl, index) {
    const card = document.createElement('div');
    card.className = 'download-card';
    card.dataset.downloadId = dl.id;
    card.style.animationDelay = `${index * 40}ms`;

    const isClickable = dl.state === 'completed';
    const statusLabel = dl.state.charAt(0).toUpperCase() + dl.state.slice(1);

    card.innerHTML = `
      <div class="file-icon ${dl.state}">
        ${getStateIcon(dl.state)}
      </div>
      <div class="file-info">
        <div class="file-name-row">
          <span class="file-name ${isClickable ? 'clickable' : ''}" title="${escapeHtml(dl.filename)}"
                ${isClickable ? `data-action="open" data-id="${dl.id}"` : ''}>
            ${escapeHtml(dl.filename)}
          </span>
          <span class="status-badge ${dl.state}">
            <span class="status-badge-dot"></span>
            ${statusLabel}
          </span>
        </div>
        <div class="file-meta">
          ${buildMeta(dl)}
        </div>
        ${buildProgress(dl)}
      </div>
      <div class="card-actions">
        ${buildActions(dl)}
      </div>
    `;

    return card;
  }

  // ── Render downloads list ──
  function render() {
    const filtered = searchQuery
      ? downloads.filter(dl =>
          dl.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dl.url && dl.url.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : downloads;

    downloadsList.innerHTML = '';

    if (downloads.length === 0) {
      emptyState.classList.remove('hidden');
      noResultsState.classList.add('hidden');
      downloadsList.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    if (filtered.length === 0) {
      noResultsState.classList.remove('hidden');
      downloadsList.classList.add('hidden');
      return;
    }

    noResultsState.classList.add('hidden');
    downloadsList.classList.remove('hidden');

    // Sort: active first, then by most recent (reverse order)
    const sortOrder = { downloading: 0, paused: 1, failed: 2, cancelled: 3, completed: 4 };
    const sorted = [...filtered].sort((a, b) => {
      const oa = sortOrder[a.state] ?? 5;
      const ob = sortOrder[b.state] ?? 5;
      return oa - ob;
    });

    sorted.forEach((dl, index) => {
      downloadsList.appendChild(createDownloadCard(dl, index));
    });
  }

  // ── Update a single card in-place (for progress updates) ──
  function updateCardInPlace(dl) {
    const card = downloadsList.querySelector(`[data-download-id="${dl.id}"]`);
    if (!card) return false;

    // Update progress bar
    const progressFill = card.querySelector('.progress-bar-fill');
    if (progressFill) {
      const progress = getProgress(dl);
      progressFill.style.width = `${progress}%`;

      if (dl.state === 'paused') {
        progressFill.classList.add('paused');
      } else {
        progressFill.classList.remove('paused');
      }
    }

    // Update progress text
    const progressText = card.querySelector('.progress-text');
    if (progressText && (dl.state === 'downloading' || dl.state === 'paused')) {
      const progress = getProgress(dl);
      const isPaused = dl.state === 'paused';
      const speed = !isPaused ? formatSpeed(dl.speed) : '';
      const eta = !isPaused ? formatETA(getETA(dl)) : 'Paused';

      progressText.innerHTML = `
        <span>${formatSize(dl.received || 0)} of ${formatSize(dl.size)} — ${progress}%</span>
        <span>${speed}${speed && eta ? ' · ' : ''}${eta}</span>
      `;
    }

    return true;
  }

  // ── Handle action clicks (event delegation) ──
  function handleAction(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;

    if (!window.electronAPI) return;

    switch (action) {
      case 'pause':
        if (window.electronAPI.pauseDownload) window.electronAPI.pauseDownload(id);
        break;
      case 'resume':
        if (window.electronAPI.resumeDownload) window.electronAPI.resumeDownload(id);
        break;
      case 'cancel':
        if (window.electronAPI.cancelDownload) window.electronAPI.cancelDownload(id);
        break;
      case 'open':
        if (window.electronAPI.openDownload) window.electronAPI.openDownload(id);
        break;
      case 'openFolder':
        if (window.electronAPI.openDownloadFolder) window.electronAPI.openDownloadFolder(id);
        break;
      case 'retry':
        if (window.electronAPI.retryDownload) window.electronAPI.retryDownload(id);
        break;
    }
  }

  // ── Search ──
  function handleSearch() {
    searchQuery = searchInput.value.trim();
    searchClear.classList.toggle('visible', searchQuery.length > 0);
    render();
  }

  function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    searchClear.classList.remove('visible');
    render();
    searchInput.focus();
  }

  // ── Clear All ──
  function handleClearAll() {
    if (window.electronAPI && window.electronAPI.clearDownloads) {
      window.electronAPI.clearDownloads();
    }
    downloads = [];
    render();
  }

  // ── Back navigation ──
  function handleBack() {
    if (window.electronAPI && window.electronAPI.performNavigation) {
      window.electronAPI.performNavigation('back');
    } else {
      window.history.back();
    }
  }

  // ── Initial load ──
  async function loadDownloads() {
    if (window.electronAPI && window.electronAPI.getDownloads) {
      try {
        const result = await window.electronAPI.getDownloads();
        downloads = result || [];
      } catch {
        downloads = [];
      }
    }
    render();
  }

  // ── Real-time updates ──
  function setupRealtimeUpdates() {
    if (window.electronAPI && window.electronAPI.onDownloadsUpdated) {
      window.electronAPI.onDownloadsUpdated((updatedDownloads) => {
        const previousStates = new Map(downloads.map(dl => [dl.id, dl.state]));
        downloads = updatedDownloads || [];

        // Check if we need a full re-render or just progress updates
        let needsFullRender = false;

        for (const dl of downloads) {
          const prevState = previousStates.get(dl.id);
          if (prevState === undefined || prevState !== dl.state) {
            needsFullRender = true;
            break;
          }
        }

        if (previousStates.size !== downloads.length) {
          needsFullRender = true;
        }

        if (needsFullRender) {
          render();
        } else {
          // Just update progress bars in-place for smooth performance
          downloads.forEach(dl => {
            if (dl.state === 'downloading' || dl.state === 'paused') {
              updateCardInPlace(dl);
            }
          });
        }
      });
    }
  }

  // ── Event Listeners ──
  downloadsList.addEventListener('click', handleAction);
  searchInput.addEventListener('input', handleSearch);
  searchClear.addEventListener('click', clearSearch);
  clearAllBtn.addEventListener('click', handleClearAll);
  backBtn.addEventListener('click', handleBack);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+F or Cmd+F focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }

    // Escape clears search when focused
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      clearSearch();
      searchInput.blur();
    }
  });

  // ── Initialize ──
  loadDownloads();
  setupRealtimeUpdates();

  // ── Expose for external use ──
  window.downloadsManager = {
    refresh: loadDownloads,
    setDownloads: (data) => {
      downloads = data || [];
      render();
    }
  };
})();

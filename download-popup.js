/* ============================================
   AuraBrowser — Download Popup Logic
   Populates detected media, handles downloads
   ============================================ */

(() => {
  'use strict';

  // ── DOM References ──
  const mediaList = document.getElementById('mediaList');
  const mediaCount = document.getElementById('mediaCount');
  const emptyState = document.getElementById('emptyState');
  const popupFooter = document.getElementById('popupFooter');
  const closeBtn = document.getElementById('closeBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // ── State ──
  let detectedMedia = [];
  const downloadStates = new Map(); // mediaId -> 'idle' | 'downloading' | 'done'

  // ── SVG Icons ──
  const icons = {
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>`,
    audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`,
    spinner: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <path d="M12 2a10 10 0 0 1 10 10"/>
    </svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`
  };

  // ── Utility: Format file size ──
  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // ── Utility: Get format from filename ──
  function getFormat(filename) {
    if (!filename) return '';
    const ext = filename.split('.').pop();
    return ext ? ext.toUpperCase() : '';
  }

  // ── Render a single media item ──
  function createMediaItem(media, index) {
    const item = document.createElement('div');
    item.className = 'media-item';
    item.style.animationDelay = `${index * 50}ms`;
    item.dataset.mediaId = media.id;

    const typeClass = media.type || 'video';
    const format = media.quality || getFormat(media.filename);
    const hasQualities = media.qualities && media.qualities.length > 1;

    item.innerHTML = `
      <div class="media-type-icon ${typeClass}">
        ${icons[typeClass] || icons.video}
      </div>
      <div class="media-info">
        <span class="media-filename" title="${escapeHtml(media.filename)}">${escapeHtml(media.filename)}</span>
        <div class="media-meta">
          <span class="media-format">${escapeHtml(format)}</span>
          <span class="separator"></span>
          <span class="media-size">${formatSize(media.size)}</span>
        </div>
      </div>
      ${hasQualities ? createQualitySelector(media) : ''}
      <button class="download-btn" data-media-id="${media.id}" title="Download">
        ${icons.download}
      </button>
    `;

    // Download button handler
    const btn = item.querySelector('.download-btn');
    btn.addEventListener('click', () => handleDownload(media, item));

    return item;
  }

  // ── Create quality selector dropdown ──
  function createQualitySelector(media) {
    const options = media.qualities
      .map(q => `<option value="${escapeHtml(q)}" ${q === media.quality ? 'selected' : ''}>${escapeHtml(q)}</option>`)
      .join('');

    return `
      <div class="quality-selector">
        <select class="quality-select" data-media-id="${media.id}">
          ${options}
        </select>
      </div>
    `;
  }

  // ── Handle single download ──
  function handleDownload(media, itemElement) {
    const btn = itemElement.querySelector('.download-btn');
    const state = downloadStates.get(media.id);

    if (state === 'downloading' || state === 'done') return;

    // Get selected quality if available
    const qualitySelect = itemElement.querySelector('.quality-select');
    const selectedQuality = qualitySelect ? qualitySelect.value : media.quality;

    // Update UI to downloading state
    downloadStates.set(media.id, 'downloading');
    btn.classList.add('downloading');
    btn.innerHTML = icons.spinner;

    // Trigger download via preload API
    if (window.electronAPI && window.electronAPI.startDownload) {
      window.electronAPI.startDownload(media.id, selectedQuality);
    }
  }

  // ── Mark download as complete ──
  function markDownloadComplete(mediaId) {
    downloadStates.set(mediaId, 'done');
    const item = mediaList.querySelector(`[data-media-id="${mediaId}"]`);
    if (!item) return;

    const btn = item.querySelector('.download-btn');
    btn.classList.remove('downloading');
    btn.classList.add('done');
    btn.innerHTML = icons.check;
  }

  // ── Populate media list ──
  function populateMedia(mediaItems) {
    detectedMedia = mediaItems || [];
    mediaList.innerHTML = '';
    downloadStates.clear();

    // Update count badge
    mediaCount.textContent = detectedMedia.length;

    if (detectedMedia.length === 0) {
      emptyState.classList.add('visible');
      popupFooter.classList.remove('visible');
      mediaList.classList.add('hidden');
      return;
    }

    emptyState.classList.remove('visible');
    popupFooter.classList.add('visible');
    mediaList.classList.remove('hidden');

    detectedMedia.forEach((media, index) => {
      downloadStates.set(media.id, 'idle');
      const item = createMediaItem(media, index);
      mediaList.appendChild(item);
    });
  }

  // ── Download All ──
  function downloadAll() {
    detectedMedia.forEach(media => {
      const item = mediaList.querySelector(`[data-media-id="${media.id}"]`);
      if (item && downloadStates.get(media.id) === 'idle') {
        handleDownload(media, item);
      }
    });
  }

  // ── Close popup ──
  function closePopup() {
    const container = document.getElementById('popupContainer');
    container.style.animation = 'none';
    container.offsetHeight; // force reflow
    container.style.animation = 'slideDown 0.2s cubic-bezier(0.4, 0, 1, 1) forwards';
    setTimeout(() => {
      if (window.electronAPI && window.electronAPI.cancelPopup) {
        window.electronAPI.cancelPopup();
      }
    }, 180);
  }

  // ── Escape HTML ──
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Slide-down exit animation ──
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes slideDown {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to { opacity: 0; transform: translateY(8px) scale(0.97); }
    }
  `;
  document.head.appendChild(styleSheet);

  // ── Event Listeners ──
  closeBtn.addEventListener('click', closePopup);
  downloadAllBtn.addEventListener('click', downloadAll);

  // ── Keyboard shortcut ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePopup();
    }
  });

  // ── Preload API: Listen for detected media ──
  if (window.electronAPI && window.electronAPI.onMediaDetected) {
    window.electronAPI.onMediaDetected((mediaItems) => {
      populateMedia(mediaItems);
    });
  }

  // ── Preload API: Listen for download completion ──
  if (window.electronAPI && window.electronAPI.onDownloadComplete) {
    window.electronAPI.onDownloadComplete((mediaId) => {
      markDownloadComplete(mediaId);
    });
  }

  // ── Expose for external calls (e.g., from main process) ──
  window.downloadPopup = {
    populate: populateMedia,
    markComplete: markDownloadComplete,
    close: closePopup
  };
})();

/**
 * AuraBrowser — Extension Manager Overlay
 * Handles listing, toggling, removing, and installing Chromium extensions.
 */

(function () {
  'use strict';

  // --- DOM References ---
  const extensionsList = document.getElementById('extensionsList');
  const emptyState = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');
  const searchInput = document.getElementById('searchInput');
  const btnInstall = document.getElementById('btnInstall');
  const btnClose = document.getElementById('btnClose');
  const extensionCount = document.getElementById('extensionCount');

  /** @type {Array<{id: string, name: string, version: string, enabled: boolean, path: string}>} */
  let extensions = [];
  let searchQuery = '';

  // --- Initialization ---
  async function init() {
    showSkeletons(3);

    try {
      extensions = await window.electronAPI.listExtensions();
    } catch (err) {
      console.error('Failed to load extensions:', err);
      extensions = [];
    }

    render();
    bindEvents();
  }

  // --- Event Binding ---
  function bindEvents() {
    // Close overlay
    btnClose.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });

    // Click backdrop to close
    document.getElementById('overlayBackdrop').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    // Install extension
    btnInstall.addEventListener('click', async () => {
      btnInstall.disabled = true;
      try {
        await window.electronAPI.installExtension();
      } catch (err) {
        console.error('Install cancelled or failed:', err);
      } finally {
        btnInstall.disabled = false;
      }
    });

    // Search
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    // Listen for live updates from main process
    if (window.electronAPI.onExtensionsUpdated) {
      window.electronAPI.onExtensionsUpdated((updatedList) => {
        extensions = updatedList;
        render();
      });
    }
  }

  // --- Close ---
  function close() {
    const container = document.getElementById('managerContainer');
    container.style.animation = 'slideDown 0.22s cubic-bezier(0.4, 0, 1, 1) forwards';

    const backdrop = document.getElementById('overlayBackdrop');
    backdrop.style.animation = 'fadeOut 0.22s ease-in forwards';

    setTimeout(() => {
      if (window.electronAPI.cancelExtensions) {
        window.electronAPI.cancelExtensions();
      }
    }, 200);
  }

  // Inject close animations
  const closeStyles = document.createElement('style');
  closeStyles.textContent = `
    @keyframes slideDown {
      to { opacity: 0; transform: translateY(16px) scale(0.97); }
    }
    @keyframes fadeOut {
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(closeStyles);

  // --- Render ---
  function render() {
    const filtered = extensions.filter((ext) =>
      ext.name.toLowerCase().includes(searchQuery) ||
      ext.id.toLowerCase().includes(searchQuery)
    );

    // Update subtitle
    const total = extensions.length;
    const enabled = extensions.filter((e) => e.enabled).length;
    extensionCount.textContent = total === 0
      ? 'No extensions installed'
      : `${total} extension${total !== 1 ? 's' : ''} · ${enabled} active`;

    // Show/hide states
    if (total === 0) {
      extensionsList.classList.add('hidden');
      noResults.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    if (filtered.length === 0) {
      extensionsList.classList.add('hidden');
      emptyState.classList.add('hidden');
      noResults.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    noResults.classList.add('hidden');
    extensionsList.classList.remove('hidden');

    extensionsList.innerHTML = '';

    filtered.forEach((ext, i) => {
      const card = createExtensionCard(ext, i);
      extensionsList.appendChild(card);
    });
  }

  // --- Create Extension Card ---
  function createExtensionCard(ext, index) {
    const card = document.createElement('div');
    card.className = `extension-card${ext.enabled ? '' : ' disabled'}`;
    card.style.animationDelay = `${index * 0.04}s`;
    card.dataset.id = ext.id;

    // Icon
    const iconEl = createIcon(ext);

    // Info
    const info = document.createElement('div');
    info.className = 'ext-info';

    const name = document.createElement('div');
    name.className = 'ext-name';
    name.textContent = ext.name;
    name.title = ext.name;

    const meta = document.createElement('div');
    meta.className = 'ext-meta';

    const version = document.createElement('span');
    version.className = 'ext-version';
    version.textContent = `v${ext.version}`;

    const id = document.createElement('span');
    id.className = 'ext-id';
    id.textContent = ext.id;
    id.title = ext.id;

    meta.appendChild(version);
    meta.appendChild(id);
    info.appendChild(name);
    info.appendChild(meta);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'ext-actions';

    // Toggle
    const toggle = createToggle(ext);
    actions.appendChild(toggle);

    // Remove
    const removeBtn = createRemoveButton(ext, card);
    actions.appendChild(removeBtn);

    card.appendChild(iconEl);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
  }

  // --- Create Icon ---
  function createIcon(ext) {
    // Try to load icon from extension path
    const iconPaths = [
      'icon128.png', 'icon48.png', 'icon32.png', 'icon16.png',
      'icons/128.png', 'icons/48.png', 'icons/32.png', 'icons/16.png',
      'icon.png'
    ];

    const img = document.createElement('img');
    img.className = 'ext-icon';
    img.alt = ext.name;
    img.loading = 'lazy';

    // Attempt first icon path
    const basePath = ext.path.replace(/\\/g, '/');
    img.src = `file:///${basePath}/${iconPaths[0]}`;

    let attempt = 1;
    img.onerror = function () {
      if (attempt < iconPaths.length) {
        img.src = `file:///${basePath}/${iconPaths[attempt]}`;
        attempt++;
      } else {
        // Fallback to initial letter
        const fallback = document.createElement('div');
        fallback.className = 'ext-icon-fallback';
        fallback.textContent = ext.name.charAt(0).toUpperCase();
        img.replaceWith(fallback);
      }
    };

    return img;
  }

  // --- Create Toggle Switch ---
  function createToggle(ext) {
    const label = document.createElement('label');
    label.className = 'toggle-switch';
    label.title = ext.enabled ? 'Disable extension' : 'Enable extension';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = ext.enabled;
    input.setAttribute('aria-label', `Toggle ${ext.name}`);

    input.addEventListener('change', async () => {
      const newState = input.checked;
      const card = label.closest('.extension-card');

      // Optimistic UI update
      card.classList.toggle('disabled', !newState);
      label.title = newState ? 'Disable extension' : 'Enable extension';

      // Update local state
      const extData = extensions.find((e) => e.id === ext.id);
      if (extData) extData.enabled = newState;

      // Update count
      const total = extensions.length;
      const enabled = extensions.filter((e) => e.enabled).length;
      extensionCount.textContent = `${total} extension${total !== 1 ? 's' : ''} · ${enabled} active`;

      try {
        await window.electronAPI.toggleExtension(ext.id, newState);
      } catch (err) {
        console.error('Toggle failed:', err);
        // Revert on failure
        input.checked = !newState;
        card.classList.toggle('disabled', newState);
        if (extData) extData.enabled = !newState;
      }
    });

    const track = document.createElement('span');
    track.className = 'toggle-track';

    label.appendChild(input);
    label.appendChild(track);
    return label;
  }

  // --- Create Remove Button ---
  function createRemoveButton(ext, card) {
    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.title = `Remove ${ext.name}`;
    btn.setAttribute('aria-label', `Remove ${ext.name}`);
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
    `;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      card.classList.add('removing');

      try {
        await window.electronAPI.removeExtension(ext.id);
        // Remove from local state after animation
        setTimeout(() => {
          extensions = extensions.filter((e) => e.id !== ext.id);
          render();
        }, 280);
      } catch (err) {
        console.error('Remove failed:', err);
        card.classList.remove('removing');
        btn.disabled = false;
      }
    });

    return btn;
  }

  // --- Loading Skeletons ---
  function showSkeletons(count) {
    extensionsList.innerHTML = '';
    extensionsList.classList.remove('hidden');
    emptyState.classList.add('hidden');
    noResults.classList.add('hidden');

    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      skeleton.innerHTML = `
        <div class="skeleton-icon"></div>
        <div class="skeleton-info">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
        <div class="skeleton-toggle"></div>
      `;
      extensionsList.appendChild(skeleton);
    }
  }

  // --- Bootstrap ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

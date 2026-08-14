/**
 * AuraBrowser — Extension Manager Overlay
 * Handles listing, toggling, removing, and installing Chromium extensions (Web Store, CRX/Zip, Folder).
 */

(function () {
  'use strict';

  // --- DOM References ---
  const extensionsList = document.getElementById('extensionsList');
  const emptyState = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');
  const searchInput = document.getElementById('searchInput');
  const btnInstall = document.getElementById('btnInstall');
  const btnInstallPackage = document.getElementById('btnInstallPackage');
  const btnWebstoreInstall = document.getElementById('btnWebstoreInstall');
  const webstoreInput = document.getElementById('webstoreInput');
  const installStatus = document.getElementById('installStatus');
  const btnClose = document.getElementById('btnClose');
  const extensionCount = document.getElementById('extensionCount');

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

  function showStatus(text, isError = false) {
    if (!installStatus) return;
    installStatus.textContent = text;
    installStatus.className = `install-status show${isError ? ' error' : ''}`;
    setTimeout(() => {
      installStatus.className = 'install-status';
    }, 4000);
  }

  // --- Event Binding ---
  function bindEvents() {
    btnClose.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });

    document.getElementById('overlayBackdrop').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    // 1. Install Unpacked Folder
    btnInstall.addEventListener('click', async () => {
      btnInstall.disabled = true;
      try {
        const res = await window.electronAPI.installExtension();
        if (res && res.success) {
          showStatus(`Installed "${res.extension.name}" successfully!`);
        } else if (res && res.error && res.error !== 'No folder selected') {
          showStatus(`Install failed: ${res.error}`, true);
        }
      } catch (err) {
        showStatus(`Install error: ${err.message}`, true);
      } finally {
        btnInstall.disabled = false;
      }
    });

    // 2. Install .CRX / .ZIP Package
    btnInstallPackage.addEventListener('click', async () => {
      btnInstallPackage.disabled = true;
      try {
        const res = await window.electronAPI.installExtensionPackage();
        if (res && res.success) {
          showStatus(`Installed "${res.extension.name}" from package!`);
        } else if (res && res.error && res.error !== 'No file selected') {
          showStatus(`Install failed: ${res.error}`, true);
        }
      } catch (err) {
        showStatus(`Package install error: ${err.message}`, true);
      } finally {
        btnInstallPackage.disabled = false;
      }
    });

    // 3. Install directly from Chrome Web Store
    async function handleWebstoreInstall() {
      const inputVal = webstoreInput.value.trim();
      if (!inputVal) return;

      btnWebstoreInstall.disabled = true;
      btnWebstoreInstall.textContent = 'Downloading...';

      try {
        const res = await window.electronAPI.installExtensionWebStore(inputVal);
        if (res && res.success) {
          showStatus(`Installed "${res.extension.name}" from Chrome Web Store!`);
          webstoreInput.value = '';
        } else {
          showStatus(res.error || 'Failed to install from Web Store', true);
        }
      } catch (err) {
        showStatus(err.message, true);
      } finally {
        btnWebstoreInstall.disabled = false;
        btnWebstoreInstall.textContent = 'Install from Web Store';
      }
    }

    btnWebstoreInstall.addEventListener('click', handleWebstoreInstall);
    webstoreInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleWebstoreInstall();
      }
    });

    // Search
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    // Listen for live updates
    if (window.electronAPI.onExtensionsUpdated) {
      window.electronAPI.onExtensionsUpdated((updatedList) => {
        extensions = updatedList;
        render();
      });
    }
  }

  function close() {
    const container = document.getElementById('managerContainer');
    container.style.animation = 'slideDown 0.18s cubic-bezier(0.4, 0, 1, 1) forwards';

    const backdrop = document.getElementById('overlayBackdrop');
    backdrop.style.animation = 'fadeOut 0.18s ease-in forwards';

    setTimeout(() => {
      if (window.electronAPI.cancelExtensions) {
        window.electronAPI.cancelExtensions();
      }
    }, 160);
  }

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

    const total = extensions.length;
    const enabled = extensions.filter((e) => e.enabled).length;
    extensionCount.textContent = total === 0
      ? 'No extensions installed'
      : `${total} extension${total !== 1 ? 's' : ''} installed`;

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

    filtered.forEach((ext) => {
      const card = createExtensionCard(ext);
      extensionsList.appendChild(card);
    });
  }

  // --- Create Extension Card ---
  function createExtensionCard(ext) {
    const card = document.createElement('div');
    card.className = `extension-card${ext.enabled ? '' : ' disabled'}`;
    card.dataset.id = ext.id;

    // Icon fallback
    const iconEl = document.createElement('div');
    iconEl.className = 'ext-icon-fallback';
    iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;

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

    // Remove
    const removeBtn = createRemoveButton(ext, card);
    actions.appendChild(removeBtn);

    card.appendChild(iconEl);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
  }

  // --- Create Remove Button ---
  function createRemoveButton(ext, card) {
    const btn = document.createElement('button');
    btn.className = 'btn-remove';
    btn.title = `Remove ${ext.name}`;
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    `;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await window.electronAPI.removeExtension(ext.id);
        extensions = extensions.filter((e) => e.id !== ext.id);
        render();
        showStatus(`Removed "${ext.name}"`);
      } catch (err) {
        console.error('Remove failed:', err);
        btn.disabled = false;
      }
    });

    return btn;
  }

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
      `;
      extensionsList.appendChild(skeleton);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

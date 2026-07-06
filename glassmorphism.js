/**
 * Aura Glassmorphism Mode Module
 * Injects CSS to make websites semi-transparent and apply backdrop-filter blur,
 * showing the native Windows Acrylic/Mica background through the page.
 */

const GLASS_CSS = `
  /* === AURA GLASSMORPHISM MODE === */
  
  /* Make page root transparent with a single hardware-accelerated backdrop blur */
  html, body {
    background: rgba(10, 8, 22, 0.35) !important;
    background-color: rgba(10, 8, 22, 0.35) !important;
    backdrop-filter: blur(25px) saturate(1.8) !important;
    -webkit-backdrop-filter: blur(25px) saturate(1.8) !important;
  }

  /* Strip layout backgrounds to let Acrylic show through */
  div, section, article, main, header, footer, nav, aside,
  .container, .wrapper, .main, .content, .sidebar, .panel, .card,
  ul, ol, table, form, fieldset, details, dialog {
    background-color: transparent !important;
    border-color: rgba(255, 255, 255, 0.05) !important;
    /* NO backdrop-filter here to avoid layout lagging */
  }

  /* Remove heavy background gradients */
  * {
    background-image: none !important;
  }

  /* Subtle card contrast */
  [class*="card"], [class*="box"], [class*="item"], [class*="wrapper"], [class*="container"] {
    background-color: rgba(255, 255, 255, 0.02) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
  }

  /* Headers and navigation bars get a subtle tint */
  header, nav, [role="navigation"], [class*="nav"], [class*="menu"], [class*="header"] {
    background-color: rgba(10, 8, 22, 0.45) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  }

  /* Override custom background styles */
  [style*="background-color: rgb("], [style*="background-color: #"] {
    background-color: transparent !important;
  }

  /* Text readability improvements */
  p, span, h1, h2, h3, h4, h5, h6, li, td, th, label, a {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
  }

  /* Media elements remain untouched */
  img, video, canvas, svg, iframe, picture {
    background-color: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
`;

/**
 * Inject glassmorphism CSS into a webContents
 * @param {Electron.WebContents} webContents
 * @param {boolean} enabled
 * @returns {Promise<string|null>} CSS key for removal, or null
 */
async function injectGlassmorphism(webContents, enabled) {
  if (!enabled) return null;

  try {
    const url = webContents.getURL();
    if (url.startsWith('file://') || url.startsWith('chrome://') || url.startsWith('devtools://')) {
      return null;
    }

    const key = await webContents.insertCSS(GLASS_CSS);
    return key;
  } catch (err) {
    console.error('Glassmorphism injection failed:', err.message);
    return null;
  }
}

/**
 * Remove glassmorphism CSS
 * @param {Electron.WebContents} webContents
 * @param {string} cssKey
 */
async function removeGlassmorphism(webContents, cssKey) {
  if (!cssKey) return;
  try {
    await webContents.removeInsertedCSS(cssKey);
  } catch (err) {
    // Page may have navigated
  }
}

module.exports = {
  injectGlassmorphism,
  removeGlassmorphism,
  GLASS_CSS
};

/**
 * Aura Glassmorphism Mode Module
 * Injects CSS to make websites semi-transparent and apply backdrop-filter blur,
 * showing the native Windows Acrylic/Mica background through the page.
 */

const GLASS_CSS = `
  /* === AURA GLASSMORPHISM MODE === */
  
  /* Make page root transparent */
  html, body {
    background: transparent !important;
    background-color: transparent !important;
  }

  /* Target main container divs, panels, and cards and make them semi-transparent glass */
  div, section, article, main, header, footer, nav, aside,
  .container, .wrapper, .main, .content, .sidebar, .panel, .card,
  ul, ol, table, form, fieldset, details, dialog {
    /* If the element has a background color, make it semi-transparent */
    background-color: rgba(18, 14, 32, 0.45) !important;
    backdrop-filter: blur(20px) saturate(1.6) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.6) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  /* Make sure background gradients are removed/softened */
  * {
    background-image: none !important;
  }

  /* Opaque cards and boxes should also be semi-transparent */
  [class*="card"], [class*="box"], [class*="item"], [class*="wrapper"], [class*="container"] {
    background-color: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(15px) !important;
    -webkit-backdrop-filter: blur(15px) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
  }

  /* Opaque headers, navigation bars, and menus */
  header, nav, [role="navigation"], [class*="nav"], [class*="menu"], [class*="header"] {
    background-color: rgba(10, 8, 20, 0.6) !important;
    backdrop-filter: blur(25px) !important;
    -webkit-backdrop-filter: blur(25px) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  }

  /* Specific dark theme selectors to override opaque black/grey colors */
  [style*="background-color: rgb("], [style*="background-color: #"] {
    background-color: rgba(18, 14, 32, 0.45) !important;
  }

  /* Text readability improvements */
  p, span, h1, h2, h3, h4, h5, h6, li, td, th, label {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
  }

  /* Preserve media elements fully */
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

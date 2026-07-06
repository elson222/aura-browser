/**
 * Aura Dark Mode Module
 * Smart dark mode that:
 * 1. Works in harmony with native prefers-color-scheme setting
 * 2. Inverts only light theme pages to dark while preserving images and videos
 * 3. Supports customizable AMOLED Deep Black vs YouTube Aura Grey background styles
 */

const GREY_TO_BLACK_CSS = `
  /* === AURA DARK MODE — GREY TO BLACK === */
  html, body {
    background-color: #000000 !important;
  }
  div, section, main, header, footer, nav, article, aside,
  [class*="dark"], [class*="theme"], [data-theme],
  [class*="bg-"], [class*="background"] {
    background-color: #000000 !important;
  }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #000 !important; }
  ::-webkit-scrollbar-thumb { background: #1a1a1a !important; border-radius: 4px; }
`;

const DETECT_DARK_MODE_SCRIPT = `
  (function() {
    try {
      const colorScheme = document.querySelector('meta[name="color-scheme"]');
      if (colorScheme && colorScheme.content.includes('dark')) return 'dark';

      const htmlStyle = getComputedStyle(document.documentElement);
      if (htmlStyle.colorScheme && htmlStyle.colorScheme.includes('dark')) return 'dark';

      const html = document.documentElement;
      const body = document.body;
      const theme = html.getAttribute('data-theme') || html.getAttribute('data-color-mode') ||
                     body.getAttribute('data-theme') || body.getAttribute('data-color-mode') ||
                     html.className || body.className;
      if (theme && /dark|night|black/i.test(theme)) return 'dark';

      let bgColor = getComputedStyle(body).backgroundColor;
      let match = bgColor.match(/\\d+/g);

      if (!match || (match.length === 4 && parseFloat(match[3]) === 0)) {
        bgColor = getComputedStyle(html).backgroundColor;
        match = bgColor.match(/\\d+/g);
      }

      if (!match || (match.length === 4 && parseFloat(match[3]) === 0)) {
        return 'light';
      }

      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        const a = match.length === 4 ? parseFloat(match[3]) : 1;

        if (a < 0.1) return 'light';

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        if (luminance < 80) return 'dark';
        return 'light';
      }
      return 'light';
    } catch(e) {
      return 'light';
    }
  })()
`;

/**
 * Inject dark mode CSS into a webContents
 * @param {Electron.WebContents} webContents
 * @param {boolean} enabled - Whether dark mode is enabled
 * @param {string} style - Dark style selection ('grey' or 'black')
 * @returns {Promise<string|null>} CSS key for removal, or null
 */
async function injectDarkMode(webContents, enabled, style = 'grey') {
  if (!enabled) return null;

  try {
    const url = webContents.getURL();
    if (url.startsWith('file://') || url.startsWith('chrome://') || url.startsWith('devtools://')) {
      return null;
    }

    const mode = await webContents.executeJavaScript(DETECT_DARK_MODE_SCRIPT);

    if (mode === 'dark') {
      if (style === 'black') {
        const key = await webContents.insertCSS(GREY_TO_BLACK_CSS);
        return key;
      }
      return null;
    } else {
      const preInversionColor = (style === 'black') ? '#ffffff' : '#f4f4f4';
      const SMART_INVERT_CSS = `
        /* === AURA SMART INVERT DARK MODE === */
        html {
          background-color: ${preInversionColor} !important;
          filter: invert(1) hue-rotate(180deg) !important;
        }
        img, video, canvas, iframe, [style*="background-image"], svg:not([class*="icon"]):not([id*="icon"]):not([class*="logo"]):not([id*="logo"]) {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
      const key = await webContents.insertCSS(SMART_INVERT_CSS);
      return key;
    }
  } catch (err) {
    console.error('Dark mode injection failed:', err.message);
    return null;
  }
}

/**
 * Remove previously injected dark mode CSS
 * @param {Electron.WebContents} webContents
 * @param {string} cssKey
 */
async function removeDarkMode(webContents, cssKey) {
  if (!cssKey) return;
  try {
    await webContents.removeInsertedCSS(cssKey);
  } catch (err) {
    // ignore
  }
}

module.exports = {
  injectDarkMode,
  removeDarkMode,
  GREY_TO_BLACK_CSS,
  DETECT_DARK_MODE_SCRIPT
};

/**
 * Aura Dark Mode Module
 * Smart dark mode that:
 * 1. Detects if a site already has dark mode
 * 2. If light → forces deep black (#000) with readable text, images/video untouched
 * 3. If already dark but grey → replaces greys with pure black
 */

// CSS for forcing light sites to deep black
const FULL_DARK_CSS = `
  /* === AURA DARK MODE — FULL FORCE === */
  html, body {
    background-color: #000000 !important;
    color: #e8e6e3 !important;
  }

  *, *::before, *::after {
    border-color: #1a1a1a !important;
    text-decoration-color: #e8e6e3 !important;
  }

  /* Force backgrounds to black — excluding media elements */
  div, span, p, section, main, header, footer, nav, article, aside,
  ul, ol, li, table, thead, tbody, tr, td, th, form, fieldset,
  details, summary, dialog, menu, menuitem,
  h1, h2, h3, h4, h5, h6, blockquote, pre, code,
  figure, figcaption, label, legend, input, textarea, select, button {
    background-color: #000000 !important;
    color: #e8e6e3 !important;
  }

  /* Links */
  a, a:visited { color: #7b9ff0 !important; }
  a:hover { color: #a4bff7 !important; }

  /* Input fields — slightly lighter for distinction */
  input, textarea, select {
    background-color: #0a0a0a !important;
    color: #e8e6e3 !important;
    border: 1px solid #222 !important;
  }

  /* Buttons */
  button, [role="button"], input[type="submit"], input[type="button"] {
    background-color: #111 !important;
    color: #e8e6e3 !important;
    border: 1px solid #333 !important;
  }
  button:hover, [role="button"]:hover {
    background-color: #1a1a1a !important;
  }

  /* Code blocks */
  pre, code, .highlight, .code-block {
    background-color: #0a0a0a !important;
    color: #c9d1d9 !important;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #000 !important; }
  ::-webkit-scrollbar-thumb { background: #222 !important; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #333 !important; }

  /* ===== PRESERVE MEDIA — CRITICAL ===== */
  img, video, canvas, svg, picture,
  img *, video *, canvas *, svg *, picture *,
  [style*="background-image"],
  iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"],
  .video-player, .html5-video-container {
    color: initial !important;
    background-color: transparent !important;
  }

  img, video, canvas, picture {
    filter: none !important;
    mix-blend-mode: normal !important;
    opacity: 1 !important;
  }

  /* SVG icons should adapt */
  svg:not([class*="logo"]):not([class*="brand"]) {
    fill: currentColor !important;
  }
`;

// CSS for sites that already have dark mode but use greys instead of pure black
const GREY_TO_BLACK_CSS = `
  /* === AURA DARK MODE — GREY TO BLACK === */
  html, body {
    background-color: #000000 !important;
  }

  /* Target common dark-mode grey backgrounds */
  div, section, main, header, footer, nav, article, aside,
  [class*="dark"], [class*="theme"], [data-theme],
  [class*="bg-"], [class*="background"] {
    background-color: #000000 !important;
  }

  /* Common grey values used by dark themes */
  [style*="background-color: rgb(18"], [style*="background-color: rgb(26"],
  [style*="background-color: rgb(30"], [style*="background-color: rgb(32"],
  [style*="background-color: rgb(33"], [style*="background-color: rgb(34"],
  [style*="background-color: rgb(35"], [style*="background-color: rgb(36"],
  [style*="background-color: rgb(42"], [style*="background-color: rgb(48"],
  [style*="background-color: rgb(50"], [style*="background-color: rgb(51"],
  [style*="background-color: rgb(15"], [style*="background-color: rgb(20"],
  [style*="background-color: rgb(22"], [style*="background-color: rgb(24"],
  [style*="background: rgb(18"], [style*="background: rgb(26"],
  [style*="background: rgb(30"], [style*="background: rgb(32"],
  [style*="background: rgb(33"], [style*="background: rgb(35"],
  [style*="background: rgb(42"], [style*="background: rgb(48"],
  [style*="background: rgb(15"], [style*="background: rgb(20"],
  [style*="#121212"], [style*="#1a1a1a"], [style*="#1e1e1e"],
  [style*="#212121"], [style*="#222222"], [style*="#232323"],
  [style*="#242424"], [style*="#252525"], [style*="#262626"],
  [style*="#282828"], [style*="#2a2a2a"], [style*="#2d2d2d"],
  [style*="#303030"], [style*="#333333"], [style*="#363636"],
  [style*="#383838"], [style*="#0f0f0f"], [style*="#111111"],
  [style*="#181818"], [style*="#1c1c1c"], [style*="#202020"] {
    background-color: #000000 !important;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #000 !important; }
  ::-webkit-scrollbar-thumb { background: #1a1a1a !important; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #333 !important; }

  /* ===== PRESERVE MEDIA ===== */
  img, video, canvas, picture {
    filter: none !important;
    mix-blend-mode: normal !important;
  }
`;

// JavaScript to detect if a site already has dark mode
const DETECT_DARK_MODE_SCRIPT = `
  (function() {
    try {
      // Check meta tag
      const colorScheme = document.querySelector('meta[name="color-scheme"]');
      if (colorScheme && colorScheme.content.includes('dark')) return 'dark';

      // Check CSS color-scheme property
      const htmlStyle = getComputedStyle(document.documentElement);
      if (htmlStyle.colorScheme && htmlStyle.colorScheme.includes('dark')) return 'dark';

      // Check data-theme attributes
      const html = document.documentElement;
      const body = document.body;
      const theme = html.getAttribute('data-theme') || html.getAttribute('data-color-mode') ||
                     body.getAttribute('data-theme') || body.getAttribute('data-color-mode') ||
                     html.className || body.className;
      if (theme && /dark|night|black/i.test(theme)) return 'dark';

      // Measure actual background luminance
      let bgColor = getComputedStyle(body).backgroundColor;
      let match = bgColor.match(/\\d+/g);

      // If transparent, try html
      if (!match || (match.length === 4 && parseFloat(match[3]) === 0)) {
        bgColor = getComputedStyle(html).backgroundColor;
        match = bgColor.match(/\\d+/g);
      }

      // If still transparent or not matching, default to light browser background
      if (!match || (match.length === 4 && parseFloat(match[3]) === 0)) {
        return 'light';
      }

      if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        const a = match.length === 4 ? parseFloat(match[3]) : 1;

        // If high transparency, it will show the default browser light background
        if (a < 0.1) return 'light';

        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

        if (luminance < 40) return 'dark';  // Already very dark
        if (luminance < 80) return 'grey';  // Dark but grey
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
 * @returns {Promise<string|null>} CSS key for removal, or null
 */
async function injectDarkMode(webContents, enabled) {
  if (!enabled) return null;

  try {
    // Skip internal pages
    const url = webContents.getURL();
    if (url.startsWith('file://') || url.startsWith('chrome://') || url.startsWith('devtools://')) {
      return null;
    }

    // Detect existing dark mode
    const mode = await webContents.executeJavaScript(DETECT_DARK_MODE_SCRIPT);

    let css;
    if (mode === 'dark') {
      // Already dark — just make greys into pure black
      css = GREY_TO_BLACK_CSS;
    } else if (mode === 'grey') {
      // Darkish but grey — same treatment
      css = GREY_TO_BLACK_CSS;
    } else {
      // Light site — full dark mode conversion
      css = FULL_DARK_CSS;
    }

    const key = await webContents.insertCSS(css);
    return key;
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
    // Page may have navigated, ignore
  }
}

module.exports = {
  injectDarkMode,
  removeDarkMode,
  FULL_DARK_CSS,
  GREY_TO_BLACK_CSS,
  DETECT_DARK_MODE_SCRIPT
};

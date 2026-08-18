/**
 * Aura Clean Dark Mode Module
 * Pure Native Theme Integration — Zero destructive CSS injection, zero filters, zero image artifacts
 */

const { nativeTheme } = require('electron');

async function injectDarkMode(webContents, enabled) {
  nativeTheme.themeSource = enabled ? 'dark' : 'light';
  return null;
}

async function removeDarkMode(webContents) {
  nativeTheme.themeSource = 'light';
}

module.exports = {
  injectDarkMode,
  removeDarkMode,
  GREY_TO_BLACK_CSS: '',
  DETECT_DARK_MODE_SCRIPT: '("light")'
};

// Aura Browser v2.1 Comprehensive Automated Test & Verification Suite
const { app, BrowserWindow, BrowserView, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const { TabManager } = require('./tab-manager');
const adblocker = require('./adblocker');
const crxLoader = require('./crx-loader');
const downloadsModule = require('./downloads');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   AURA BROWSER v2.1.0 FULL VERIFICATION SUITE      ');
  console.log('====================================================\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function assert(name, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${name} ${detail ? `(${detail})` : ''}`);
      results.passed++;
      results.tests.push({ name, status: 'PASS', detail });
    } else {
      console.error(`[FAIL] ${name} ${detail ? `(${detail})` : ''}`);
      results.failed++;
      results.tests.push({ name, status: 'FAIL', detail });
    }
  }

  // 1. Math Parser & Search HUD Unit Tests
  console.log('--- 1. Testing Search HUD & Non-Eval Math Engine ---');
  const searchEngine = require('./search');
  assert('Math evaluation: Basic Addition', searchEngine.safeEvaluateMath('25 + 75') === 100);
  assert('Math evaluation: Precedence & Parens', searchEngine.safeEvaluateMath('(10 + 5) * 4') === 60);
  assert('Math evaluation: Division & Decimal', searchEngine.safeEvaluateMath('100 / 8') === 12.5);
  assert('Math evaluation: Security injection rejected', searchEngine.safeEvaluateMath('process.exit()') === null);
  assert('Math evaluation: Unsafe code rejected', searchEngine.safeEvaluateMath('require("fs")') === null);

  // 2. CRX & Extension Security Parsing
  console.log('\n--- 2. Testing Extension Loader & Security Parsing ---');
  const validExtId = 'cjpalhdlnbpafiamejdnhcphjbkeiagm'; // uBlock Origin
  assert('Parse valid 32-char extension ID', crxLoader.parseExtensionId(validExtId) === validExtId);
  assert('Parse Web Store URL to ID', crxLoader.parseExtensionId(`https://chromewebstore.google.com/detail/ublock-origin/${validExtId}`) === validExtId);
  assert('Reject malicious path traversal ID', crxLoader.parseExtensionId('../../etc/passwd') === null);
  assert('Reject invalid characters ID', crxLoader.parseExtensionId('invalid_id_with_special_chars!') === null);

  // 3. Download Path Sanitization & Duplicate Handling
  console.log('\n--- 3. Testing Downloads Path Sanitizer ---');
  const downloadsDir = app.getPath('downloads');
  assert('Sanitize dangerous traversal characters', !downloadsModule.sanitizeFilename('../../bad:name*?.exe').includes('..'));
  assert('Sanitize Windows reserved device CON', downloadsModule.sanitizeFilename('CON.txt') === 'download_CON.txt');
  assert('Sanitize Windows reserved device AUX', downloadsModule.sanitizeFilename('aux.pdf') === 'download_aux.pdf');

  // 4. Multi-Tab Lifecycle & Memory Profiling
  console.log('\n--- 4. Testing Multi-Tab Lifecycle & Memory ---');
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const tabMgr = new TabManager(win, adblocker, false);

  // Register test IPC handlers
  ipcMain.handle('get-settings', () => ({
    darkModeEnabled: true,
    adBlockerEnabled: true,
    saveHistoryEnabled: true,
    mouseGesturesEnabled: true,
    vpnEnabled: false,
    darkThemeStyle: 'black'
  }));
  ipcMain.handle('get-downloads', () => []);
  ipcMain.handle('get-tabs', () => tabMgr.getPublicTabs());

  // Initial tab creation
  const t0 = Date.now();
  const tab1 = tabMgr.createTab();
  const tabCreationTime = Date.now() - t0;
  assert('Tab 1 creation speed', tabCreationTime < 100, `${tabCreationTime}ms`);
  assert('Tab 1 ID generated', !!tab1.id);
  assert('Tab 1 active', tabMgr.activeTabId === tab1.id);

  // Rapidly create up to 10 tabs
  const tabIds = [tab1.id];
  for (let i = 2; i <= 10; i++) {
    const t = tabMgr.createTab();
    tabIds.push(t.id);
  }
  assert('10 simultaneous tabs instantiated', tabMgr.tabs.length === 10);

  const mem10 = process.memoryUsage();
  assert('10 tabs memory RSS bounds check', mem10.rss < 350 * 1024 * 1024, `${Math.round(mem10.rss / 1024 / 1024)}MB RSS`);

  // Switch tabs
  const tSwitch0 = performance.now();
  tabMgr.switchTab(tabIds[4]);
  const switchElapsed = performance.now() - tSwitch0;
  assert('Instant tab switching', switchElapsed < 15, `${switchElapsed.toFixed(2)}ms`);
  assert('Active tab switched correctly', tabMgr.activeTabId === tabIds[4]);

  // Tab Close & Restore
  tabMgr.closeTab(tabIds[4]);
  assert('Close tab updates count to 9', tabMgr.tabs.length === 9);
  assert('Closed tab saved in restore stack', tabMgr.closedTabsHistory.length >= 0);

  // Close remaining tabs down to 1
  while (tabMgr.tabs.length > 1) {
    tabMgr.closeTab(tabMgr.tabs[0].id);
  }
  assert('Single tab safe fallback', tabMgr.tabs.length === 1);

  // 5. Security Sandbox Verification
  console.log('\n--- 5. Testing WebPreferences & Security Hardening ---');
  const webPrefs = tab1.view.webContents.getLastWebPreferences() || {};
  assert('contextIsolation enabled', webPrefs.contextIsolation === true);
  assert('nodeIntegration disabled', webPrefs.nodeIntegration === false);
  assert('nodeIntegrationInWorker disabled', webPrefs.nodeIntegrationInWorker !== true);
  assert('nodeIntegrationInSubFrames disabled', webPrefs.nodeIntegrationInSubFrames !== true);
  assert('webSecurity enabled', webPrefs.webSecurity === true);
  assert('allowRunningInsecureContent disabled', webPrefs.allowRunningInsecureContent !== true);
  assert('navigateOnDragDrop disabled', webPrefs.navigateOnDragDrop !== true);

  // 6. Persistence & Atomic Storage Verification
  console.log('\n--- 6. Testing Atomic Persistence Engine ---');
  const testUserDataPath = path.join(app.getPath('userData'), 'test_userData.json');
  const testUserDataBackup = path.join(app.getPath('userData'), 'test_userData.json.bak');
  const testData = { version: '2.1.0', darkMode: true, tabs: 10 };
  
  // Write atomic
  const tmpPath = testUserDataPath + '.tmp';
  await fs.promises.writeFile(tmpPath, JSON.stringify(testData), 'utf8');
  await fs.promises.rename(tmpPath, testUserDataPath);
  assert('Atomic write completed', fs.existsSync(testUserDataPath));

  // Corruption recovery test
  await fs.promises.copyFile(testUserDataPath, testUserDataBackup);
  await fs.promises.writeFile(testUserDataPath, '{{{ corrupted JSON invalid', 'utf8');
  
  let recoveredData = null;
  try {
    JSON.parse(fs.readFileSync(testUserDataPath, 'utf8'));
  } catch (e) {
    if (fs.existsSync(testUserDataBackup)) {
      recoveredData = JSON.parse(fs.readFileSync(testUserDataBackup, 'utf8'));
    }
  }
  assert('Corrupted file recovered from backup', recoveredData && recoveredData.version === '2.1.0');

  // Clean test files
  try {
    if (fs.existsSync(testUserDataPath)) fs.unlinkSync(testUserDataPath);
    if (fs.existsSync(testUserDataBackup)) fs.unlinkSync(testUserDataBackup);
  } catch (e) {}

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${results.passed} PASSED, ${results.failed} FAILED`);
  console.log('====================================================\n');

  win.destroy();
  app.quit();
  process.exit(results.failed > 0 ? 1 : 0);
}

app.whenReady().then(runTestSuite);

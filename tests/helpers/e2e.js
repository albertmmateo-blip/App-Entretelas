// eslint-disable-next-line import/no-unresolved
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Starts the Electron app for E2E testing.
 * @returns {Promise<Object>} Playwright ElectronApplication instance
 */
async function launchApp() {
  // Create a temporary user data directory for testing
  const testUserDataDir = path.join(os.tmpdir(), `app-entretelas-test-${Date.now()}`);

  // Ensure directory exists
  if (!fs.existsSync(testUserDataDir)) {
    fs.mkdirSync(testUserDataDir, { recursive: true });
  }

  // Launch Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../../src/main/index.js'), `--user-data-dir=${testUserDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    },
  });

  // Wait for the first window to open
  const window = await electronApp.firstWindow();

  // Wait for the app to be ready
  await window.waitForLoadState('domcontentloaded');

  // Return both app and window for convenience
  electronApp.testWindow = window;
  electronApp.testUserDataDir = testUserDataDir;

  return electronApp;
}

/**
 * Cleans the test database between E2E tests.
 * This deletes the SQLite database file to ensure a fresh state.
 * @param {Object} electronApp - Playwright ElectronApplication instance (optional)
 */
async function cleanDatabase(electronApp = null) {
  let userDataDir;

  if (electronApp && electronApp.testUserDataDir) {
    userDataDir = electronApp.testUserDataDir;
  } else {
    // Fallback to default temp directory
    userDataDir = path.join(os.tmpdir(), 'app-entretelas-test');
  }

  const dbPath = path.join(userDataDir, 'entretelas.db');

  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (error) {
      console.warn(`Failed to delete test database: ${error.message}`);
    }
  }

  // Also clean up backup directory
  const backupsDir = path.join(userDataDir, 'backups');
  if (fs.existsSync(backupsDir)) {
    try {
      fs.rmSync(backupsDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to delete backups directory: ${error.message}`);
    }
  }
}

/**
 * Closes the Electron app after tests.
 * Also cleans up the temporary user data directory.
 * @param {Object} electronApp - Playwright ElectronApplication instance
 */
async function closeApp(electronApp) {
  if (!electronApp) {
    return;
  }

  try {
    // Close the app
    await electronApp.close();

    // Clean up temporary user data directory
    if (electronApp.testUserDataDir && fs.existsSync(electronApp.testUserDataDir)) {
      fs.rmSync(electronApp.testUserDataDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn(`Failed to close app or clean up: ${error.message}`);
  }
}

module.exports = {
  launchApp,
  cleanDatabase,
  closeApp,
};

const { BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const ALBARAN_OPTIONS = new Set(['Entretelas', 'Isa', 'Loli']);

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function registerSystemHandlers(deps = {}) {
  const ipc = deps.ipcMain || ipcMain;
  const shellModule = deps.shell || shell;
  const BrowserWindowCtor = deps.BrowserWindow || BrowserWindow;

  ipc.handle('system:openExternal', async (_event, url) => {
    if (typeof url !== 'string' || url.trim() === '') {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'URL must be a non-empty string',
        },
      };
    }

    if (!isSafeExternalUrl(url)) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROTOCOL',
          message: 'Only http:// and https:// URLs are allowed',
        },
      };
    }

    try {
      await shellModule.openExternal(url);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPEN_EXTERNAL_FAILED',
          message: error.message,
        },
      };
    }
  });

  ipc.handle('system:openArreglosMonthlySummariesWindow', async (event, scope = 'all') => {
    const scopeValue = typeof scope === 'string' ? scope.trim() : 'all';
    const normalizedScope = ALBARAN_OPTIONS.has(scopeValue) ? scopeValue : 'all';

    try {
      const senderUrl = event.sender.getURL();
      const targetUrl = new URL(senderUrl);
      targetUrl.hash = `/contabilidad/arreglos/resumenes-mensuales?scope=${encodeURIComponent(
        normalizedScope
      )}`;

      const popupWindow = new BrowserWindowCtor({
        width: 980,
        height: 760,
        minWidth: 640,
        minHeight: 420,
        autoHideMenuBar: true,
        resizable: true,
        title: 'Resúmenes mensuales · Arreglos',
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          webviewTag: true,
          preload: path.join(__dirname, '../../preload/index.js'),
        },
      });

      popupWindow.loadURL(targetUrl.toString());
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OPEN_WINDOW_FAILED',
          message: error.message,
        },
      };
    }
  });
}

module.exports = {
  registerSystemHandlers,
};

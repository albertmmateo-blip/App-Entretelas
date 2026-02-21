const { ipcMain, shell } = require('electron');

function isSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function registerSystemHandlers() {
  ipcMain.handle('system:openExternal', async (_event, url) => {
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
      await shell.openExternal(url);
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
}

module.exports = {
  registerSystemHandlers,
};

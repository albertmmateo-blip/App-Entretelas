const { app, BrowserWindow } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const { getDatabase } = require('./db/connection');

let mainWindow;

function createWindow() {
  // Load window state (position, size)
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 800,
    file: 'window-state.json',
  });

  // Create the browser window with security settings
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    title: 'App-Entretelas',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  // Register window state manager
  mainWindowState.manage(mainWindow);

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

// Quit when all windows are closed (Windows behavior)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Close database connection cleanly before quitting
app.on('before-quit', () => {
  const db = getDatabase();
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
});

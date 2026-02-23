const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const windowStateKeeper = require('electron-window-state');
const { getDatabase } = require('./db/connection');
const { registerDbHandlers } = require('./ipc/db');
const { registerNotasHandlers } = require('./ipc/notas');
const { registerLlamarHandlers } = require('./ipc/llamar');
const { registerEncargarHandlers } = require('./ipc/encargar');
const { registerEncargarCatalogoHandlers } = require('./ipc/encargarCatalogo');
const { registerSecretCatalogoHandlers } = require('./ipc/secretCatalogo');
const { registerArreglosHandlers } = require('./ipc/arreglos');
const { registerProveedoresHandlers } = require('./ipc/proveedores');
const { registerClientesHandlers } = require('./ipc/clientes');
const { registerFacturasHandlers } = require('./ipc/facturas');
const { registerSystemHandlers } = require('./ipc/system');

let mainWindow;
let tray;
let isQuitting = false;

function getTrayIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.ico');
  }

  return path.join(__dirname, '../renderer/assets/icon.ico');
}

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
    icon: getTrayIconPath(),
    title: 'App-Entretelas',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
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

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function createTray() {
  if (tray) {
    return;
  }

  const trayIcon = nativeImage.createFromPath(getTrayIconPath());
  tray = new Tray(trayIcon);
  tray.setToolTip('App-Entretelas');

  tray.on('click', () => {
    showMainWindow();
  });

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir App-Entretelas',
      click: () => {
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(trayMenu);
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    showMainWindow();
  });

  app.whenReady().then(() => {
    // Register IPC handlers
    registerDbHandlers();
    registerNotasHandlers();
    registerLlamarHandlers();
    registerEncargarHandlers();
    registerEncargarCatalogoHandlers();
    registerSecretCatalogoHandlers();
    registerArreglosHandlers();
    registerProveedoresHandlers();
    registerClientesHandlers();
    registerFacturasHandlers();
    registerSystemHandlers();

    createTray();
    createWindow();

    app.on('activate', () => {
      showMainWindow();
    });
  });
}

// Keep process running for tray behavior unless quitting explicitly
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

// Close database connection cleanly before quitting
app.on('before-quit', () => {
  isQuitting = true;

  if (tray) {
    tray.destroy();
    tray = null;
  }

  const db = getDatabase();
  if (db) {
    db.close();
    console.log('Database connection closed');
  }
});

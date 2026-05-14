const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('node:path');

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

if (isLinux) {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-background-timer-throttling');

function getPlatformWindowOptions() {
  if (isMac) {
    return {
      vibrancy: 'under-window',
      visualEffectState: 'active',
      roundedCorners: true
    };
  }

  if (isWindows) {
    return {
      backgroundMaterial: 'acrylic',
      thickFrame: true
    };
  }

  return {};
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 760,
    minHeight: 540,
    show: false,
    useContentSize: true,
    frame: false,
    transparent: true,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    hasShadow: true,
    autoHideMenuBar: true,
    backgroundColor: '#00000000',
    title: 'Glass Desktop',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    },
    ...getPlatformWindowOptions()
  });

  win.setBackgroundColor('#00000000');
  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    win.setBackgroundColor('#00000000');
    win.show();
  });

  win.on('maximize', () => {
    win.webContents.send('window:maximized', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:maximized', false);
  });

  win.on('enter-full-screen', () => {
    win.webContents.send('window:maximized', true);
  });

  win.on('leave-full-screen', () => {
    win.webContents.send('window:maximized', win.isMaximized());
  });

  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        win.webContents.toggleDevTools();
      }
    });
  }

  return win;
}

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.handle('window:minimize', (event) => {
  getSenderWindow(event)?.minimize();
});

ipcMain.handle('window:toggle-maximize', (event) => {
  const win = getSenderWindow(event);
  if (!win) return false;

  if (win.isMaximized()) {
    win.unmaximize();
    return false;
  }

  win.maximize();
  return true;
});

ipcMain.handle('window:close', (event) => {
  getSenderWindow(event)?.close();
});

ipcMain.handle('window:is-maximized', (event) => {
  return getSenderWindow(event)?.isMaximized() ?? false;
});

ipcMain.handle('app:platform', () => {
  return {
    platform: process.platform,
    isMac,
    isWindows,
    isLinux,
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

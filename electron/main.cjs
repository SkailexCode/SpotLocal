const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');

let mainWindow = null;
let serverProcess = null;

function resolveMusicDir() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (portableDir) {
    const sideBySide = path.join(portableDir, 'music');
    if (fs.existsSync(sideBySide)) {
      return sideBySide;
    }
  }
  const userDir = path.join(app.getPath('music'), 'SpotLocal');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

function getFreePort(preferred = 3478) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => {
      const fallback = net.createServer();
      fallback.listen(0, '127.0.0.1', () => {
        const addr = fallback.address();
        const port = typeof addr === 'object' && addr ? addr.port : 3479;
        fallback.close(() => resolve(port));
      });
    });
    probe.listen(preferred, '127.0.0.1', () => {
      probe.close(() => resolve(preferred));
    });
  });
}

function waitForServer(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
        } else if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Server returned status ${res.statusCode}`));
        } else {
          setTimeout(check, 150);
        }
      });
      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error('Le serveur local SpotLocal ne répond pas.'));
        } else {
          setTimeout(check, 150);
        }
      });
    };
    check();
  });
}

function startLocalServer(port, musicDir) {
  const appRoot = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
  const bundledServer = path.join(appRoot, 'dist-electron', 'server.cjs');
  const devServer = path.join(appRoot, 'server.ts');
  const entry = fs.existsSync(bundledServer) ? bundledServer : devServer;

  serverProcess = spawn(process.execPath, [entry], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(port),
      SPOTLOCAL_DESKTOP: '1',
      SPOTLOCAL_APP_ROOT: appRoot,
      SPOTLOCAL_MUSIC_DIR: musicDir,
    },
    stdio: 'ignore',
    windowsHide: true,
  });
}

function createWindow(port) {
  const iconPath = path.join(__dirname, 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    show: false,
    backgroundColor: '#000000',
    title: 'SpotLocal',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  void mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('spotlocal:get-music-dir', () => resolveMusicDir());
ipcMain.handle('spotlocal:open-music-dir', async () => {
  const dir = resolveMusicDir();
  await shell.openPath(dir);
  return dir;
});
ipcMain.handle('spotlocal:pick-audio-files', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer des musiques locales',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'm4a', 'ogg', 'aac', 'opus'] },
    ],
  });
  return res.canceled ? [] : res.filePaths;
});

app.setName('SpotLocal');

app.whenReady().then(async () => {
  const port = await getFreePort(3478);
  const musicDir = resolveMusicDir();
  startLocalServer(port, musicDir);
  try {
    await waitForServer(port);
  } catch (err) {
    dialog.showErrorBox(
      'SpotLocal — Erreur de démarrage',
      err instanceof Error ? err.message : 'Impossible de démarrer le serveur audio local.'
    );
  }
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

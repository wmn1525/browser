import { app, BrowserWindow, Menu } from 'electron';
import { join } from 'node:path';

import { checkForAppUpdatesAtStartup, registerAppUpdateIpc } from './app-updater';
import { registerBrowserIpc } from './ipc';

/** Electron 管理壳启动入口。 */

/** 创建 Electron 管理壳窗口，业务能力全部经 preload 暴露。 */
function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 620,
    title: 'Im-Run Fingerprint Browser',
    icon: getWindowIconPath(),
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void window.loadFile(join(__dirname, '..', 'renderer', 'index.html'));
}

function getWindowIconPath(): string {
  return process.env.ELECTRON_RENDERER_URL
    ? join(process.cwd(), 'resources', 'icon.ico')
    : join(__dirname, '..', '..', 'resources', 'icon.ico');
}

/** 正式安装包启动后检查线上版本，开发环境不访问发布源。 */
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppUpdateIpc();
  registerBrowserIpc();
  createMainWindow();
  checkForAppUpdatesAtStartup();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

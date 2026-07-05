import { app, BrowserWindow, Menu, Tray } from 'electron';
import { join } from 'node:path';

import { checkForAppUpdatesAtStartup, registerAppUpdateIpc } from './app-updater';
import { configureAppDataDirectory } from './app-settings-store';
import { installConsoleSanitizer } from './console-sanitizer';

/** Electron 管理壳启动入口。 */

installConsoleSanitizer();

const appSettingsReady = configureAppDataDirectory(app);

let mainWindow: BrowserWindow | undefined;
let tray: Tray | undefined;
let isQuitting = false;
let stopLocalApiServer: (() => void) | undefined;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  isQuitting = true;
  app.quit();
}

/** 创建 Electron 管理壳窗口，业务能力全部经 preload 暴露。 */
function createMainWindow(): void {
  if (mainWindow) {
    showMainWindow();
    return;
  }

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

  mainWindow = window;
  window.on('close', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    window.hide();
  });
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = undefined;
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

/** 显示管理壳主窗口，托盘恢复和系统激活都走同一入口。 */
function showMainWindow(): void {
  if (!mainWindow) {
    createMainWindow();
    return;
  }

  mainWindow.show();
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

/** 第二次启动只唤起现有后台实例，避免托盘常驻时再开一个主进程。 */
function showMainWindowAfterReady(): void {
  if (app.isReady()) {
    showMainWindow();
    return;
  }

  void app.whenReady().then(showMainWindow);
}

/** 创建系统托盘入口，让关闭窗口后的常驻状态可被用户明确控制。 */
function createTray(): void {
  if (tray) {
    return;
  }

  tray = new Tray(getWindowIconPath());
  tray.setToolTip('ImRun Browser');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开主窗口', click: showMainWindow },
    { type: 'separator' },
    { label: '退出应用', click: quitApp }
  ]));
  tray.on('double-click', showMainWindow);
}

/** 显式退出才结束 Electron 进程，普通关闭只隐藏窗口。 */
function quitApp(): void {
  isQuitting = true;
  app.quit();
}

/** 正式安装包启动后检查线上版本，开发环境不访问发布源。 */
if (singleInstanceLock) {
  app.on('second-instance', showMainWindowAfterReady);
}

if (singleInstanceLock) {
  app.whenReady().then(async () => {
    await appSettingsReady;
    const [{ localApiServer }, { registerBrowserIpc }] = await Promise.all([
      import('./browser-services'),
      import('./ipc')
    ]);
    stopLocalApiServer = () => {
      void localApiServer.stop();
    };
    Menu.setApplicationMenu(null);
    registerAppUpdateIpc();
    registerBrowserIpc();
    void localApiServer.start();
    createMainWindow();
    createTray();
    checkForAppUpdatesAtStartup();

    app.on('activate', () => {
      showMainWindow();
    });
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  stopLocalApiServer?.();
});

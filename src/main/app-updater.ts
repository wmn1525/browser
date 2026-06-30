import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';

import type { AppUpdateEvent, AppUpdateInfo } from '../shared/types';

let configured = false;
let checking = false;
let latestUpdate: AppUpdateInfo | undefined;

/** 注册应用升级 IPC，并绑定 electron-updater 的状态事件。 */
export function registerAppUpdateIpc(): void {
  configureAppUpdater();

  ipcMain.handle('app-updates:check', () => checkForAppUpdates());
  ipcMain.handle('app-updates:download', () => downloadAppUpdate());
  ipcMain.handle('app-updates:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}

/** 正式安装包启动后自动检查更新，给 renderer 留出订阅事件的时间。 */
export function checkForAppUpdatesAtStartup(): void {
  if (!app.isPackaged) {
    return;
  }

  setTimeout(() => {
    void checkForAppUpdates();
  }, 3_000);
}

/** 主动检查线上版本，返回结果也会同步广播给所有窗口。 */
async function checkForAppUpdates(): Promise<AppUpdateEvent> {
  if (!app.isPackaged) {
    return emitUpdateEvent({
      status: 'not-available',
      message: '开发环境不检查应用更新。',
      update: { currentVersion: app.getVersion(), version: app.getVersion() }
    });
  }

  if (checking) {
    return { status: 'checking', message: '正在检查更新。' };
  }

  checking = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.isUpdateAvailable) {
      latestUpdate = toAppUpdateInfo(result.updateInfo);
      return emitUpdateEvent({ status: 'available', update: latestUpdate });
    }

    return emitUpdateEvent({
      status: 'not-available',
      update: { currentVersion: app.getVersion(), version: app.getVersion() }
    });
  } catch {
    return emitUpdateEvent({ status: 'error', message: '检查应用更新失败。' });
  } finally {
    checking = false;
  }
}

/** 下载已检测到的新版本，下载完成后由事件通知 renderer。 */
async function downloadAppUpdate(): Promise<AppUpdateEvent> {
  if (!app.isPackaged) {
    return { status: 'error', message: '开发环境不能下载安装包。' };
  }

  if (!latestUpdate) {
    return { status: 'error', message: '请先检查更新。' };
  }

  void autoUpdater.downloadUpdate().catch(() => {
    emitUpdateEvent({ status: 'error', message: '下载应用更新失败。' });
  });
  return emitUpdateEvent({ status: 'downloading', update: latestUpdate });
}

/** 只配置一次更新器事件，避免重复注册导致状态多次推送。 */
function configureAppUpdater(): void {
  if (configured) {
    return;
  }

  configured = true;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    emitUpdateEvent({ status: 'checking', message: '正在检查更新。' });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    latestUpdate = toAppUpdateInfo(info);
    emitUpdateEvent({ status: 'available', update: latestUpdate });
  });

  autoUpdater.on('update-not-available', () => {
    emitUpdateEvent({
      status: 'not-available',
      update: { currentVersion: app.getVersion(), version: app.getVersion() }
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    emitUpdateEvent({
      status: 'downloading',
      progress: {
        bytesPerSecond: progress.bytesPerSecond,
        percent: Math.round(progress.percent),
        total: progress.total,
        transferred: progress.transferred
      },
      update: latestUpdate
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    latestUpdate = toAppUpdateInfo(info);
    emitUpdateEvent({ status: 'downloaded', update: latestUpdate });
  });

  autoUpdater.on('error', () => {
    emitUpdateEvent({ status: 'error', message: '应用更新失败。' });
  });
}

/** 将 electron-updater 的完整元信息收敛成 renderer 需要的稳定 DTO。 */
function toAppUpdateInfo(info: UpdateInfo): AppUpdateInfo {
  return {
    currentVersion: app.getVersion(),
    releaseDate: info.releaseDate,
    releaseName: info.releaseName ?? undefined,
    releaseNotes: formatReleaseNotes(info),
    version: info.version
  };
}

/** releaseNotes 可能是字符串或分版本列表，这里统一为普通文本。 */
function formatReleaseNotes(info: UpdateInfo): string | undefined {
  if (typeof info.releaseNotes === 'string') {
    return info.releaseNotes;
  }

  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes
      .map((note) => [note.version, note.note].filter(Boolean).join('\n'))
      .join('\n\n');
  }

  return undefined;
}

/** 广播状态，并把同一份结果返回给当前 IPC 调用方。 */
function emitUpdateEvent(event: AppUpdateEvent): AppUpdateEvent {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('app-updates:event', event);
  }
  return event;
}

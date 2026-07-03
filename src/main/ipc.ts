import { randomUUID } from 'node:crypto';

import { BrowserWindow, dialog, ipcMain, shell, type OpenDialogOptions, type WebContents } from 'electron';

import {
  persistExtensionFolder,
  persistUploadedExtension,
  type PersistedExtensionFiles
} from '../core/extension-manager';
import type { BrowserKernelDownloadProgress, ManagedExtension, ManagedExtensionEngine, ManagedExtensionUpdate } from '../shared/types';
import type { ProfileDraft } from '../shared/types';
import type { ProxyPoolItem } from '../shared/types';
import type { ProfileGroup } from '../shared/types';
import type { PublicIpInfo } from '../shared/types';
import type { WindowSyncStartRequest } from '../shared/window-sync-types';
import {
  browserEngine,
  deleteManagedExtension,
  localApiServer,
  managedExtensionStore,
  profileGroupStore,
  proxyPoolStore,
  regenerateOpenApiKey,
  startOpenApiServer,
  stopOpenApiServer,
  windowSyncService
} from './browser-services';
import { getAppSettingsStore } from './app-settings-store';

interface IpWhoIsResponse {
  readonly success: boolean;
  readonly ip?: string;
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly message?: string;
}

/** Electron 主进程 IPC 入口，负责把管理壳请求转交给核心引擎。 */
browserEngine.onChanged(() => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('profiles:changed');
  }
});

/** 注册管理壳与核心引擎之间的 IPC 通道。 */
export function registerBrowserIpc(): void {
  ipcMain.handle('profiles:list', () => browserEngine.listProfiles());

  ipcMain.handle('profiles:get', (_event, profileId: string) =>
    browserEngine.getProfile(profileId)
  );

  ipcMain.handle('profiles:create', (_event, draft: ProfileDraft) =>
    browserEngine.createProfile(draft)
  );

  ipcMain.handle('profiles:update', (_event, profileId: string, draft: ProfileDraft) =>
    browserEngine.updateProfile(profileId, draft)
  );

  ipcMain.handle('profiles:duplicate', (_event, profileId: string) =>
    browserEngine.duplicateProfile(profileId)
  );

  ipcMain.handle('profiles:export', (_event, profileId: string) =>
    browserEngine.exportProfile(profileId)
  );

  ipcMain.handle('profiles:launch', (_event, idOrName: string) =>
    browserEngine.launchProfile(idOrName)
  );

  ipcMain.handle('profiles:close', (_event, profileId: string) =>
    browserEngine.closeProfile(profileId)
  );

  ipcMain.handle('profiles:delete', (_event, profileId: string) =>
    browserEngine.deleteProfile(profileId)
  );

  ipcMain.handle('network:get-public-ip', async (): Promise<PublicIpInfo> => {
    const response = await fetch('https://ipwho.is/');
    const data: IpWhoIsResponse = await response.json();
    if (!response.ok || !data.success || !data.ip) {
      throw new Error(data.message ?? 'Failed to resolve public IP.');
    }

    return {
      ip: data.ip,
      regionLabel: buildRegionLabel(data)
    };
  });

  ipcMain.handle('groups:list', () => profileGroupStore.list());

  ipcMain.handle('groups:save', (_event, groups: readonly ProfileGroup[]) =>
    profileGroupStore.save(groups)
  );

  ipcMain.handle('proxies:list', () => proxyPoolStore.list());

  ipcMain.handle('proxies:save', (_event, items: readonly ProxyPoolItem[]) =>
    proxyPoolStore.save(items)
  );

  ipcMain.handle('extensions:list', () => managedExtensionStore.list());

  ipcMain.handle('extensions:import-package', async (event, managedEngine: ManagedExtensionEngine, displayName: string) => {
    const sourcePath = await chooseExtensionPackage(event.sender, managedEngine);
    if (!sourcePath) {
      return undefined;
    }

    const extensionId = randomUUID();
    const files = persistUploadedExtension({
      rootDir: managedExtensionStore.getExtensionsRoot(),
      engine: managedEngine,
      extensionId,
      displayName,
      sourcePath
    });
    return managedExtensionStore.append(toManagedExtension(extensionId, managedEngine, files));
  });

  ipcMain.handle('extensions:import-folder', async (event, managedEngine: ManagedExtensionEngine, displayName: string) => {
    const folderPath = await chooseExtensionFolder(event.sender);
    if (!folderPath) {
      return undefined;
    }

    const extensionId = randomUUID();
    const files = persistExtensionFolder({
      rootDir: managedExtensionStore.getExtensionsRoot(),
      engine: managedEngine,
      extensionId,
      displayName,
      folderPath
    });
    return managedExtensionStore.append(toManagedExtension(extensionId, managedEngine, files));
  });

  ipcMain.handle('extensions:update', (_event, extensionId: string, update: ManagedExtensionUpdate) =>
    managedExtensionStore.update(extensionId, update)
  );

  ipcMain.handle('extensions:delete', async (_event, extensionId: string) => {
    await deleteManagedExtension(extensionId);
  });

  ipcMain.handle('app-settings:data-directory', () =>
    getAppSettingsStore().getDataDirectoryInfo()
  );

  ipcMain.handle('app-settings:choose-data-directory', async (event) => {
    const folderPath = await choosePath(event.sender, { properties: ['openDirectory', 'createDirectory'] });
    if (!folderPath) {
      return getAppSettingsStore().getDataDirectoryInfo();
    }
    return getAppSettingsStore().setDataDirectory(folderPath);
  });

  ipcMain.handle('app-settings:reset-data-directory', () =>
    getAppSettingsStore().resetDataDirectory()
  );

  ipcMain.handle('app-settings:open-data-directory', async () => {
    const info = await getAppSettingsStore().getDataDirectoryInfo();
    const errorMessage = await shell.openPath(info.currentPath);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
  });

  ipcMain.handle('open-api:info', () => localApiServer.getInfo());

  ipcMain.handle('open-api:start', () => startOpenApiServer());

  ipcMain.handle('open-api:stop', () => stopOpenApiServer());

  ipcMain.handle('open-api:regenerate-key', () => regenerateOpenApiKey());

  ipcMain.handle('window-sync:profiles', () => windowSyncService.listProfiles());

  ipcMain.handle('window-sync:session', () => windowSyncService.getSession());

  ipcMain.handle('window-sync:start', (_event, request: WindowSyncStartRequest) =>
    windowSyncService.start(request)
  );

  ipcMain.handle('window-sync:stop', () => windowSyncService.stop());

  ipcMain.handle('window-sync:restart', (_event, request: WindowSyncStartRequest) =>
    windowSyncService.restart(request)
  );

  ipcMain.handle('kernels:list', () => browserEngine.listBrowserKernels());

  ipcMain.handle('kernels:download', (event, kernelId: string) =>
    browserEngine.downloadBrowserKernel(kernelId, (progress: BrowserKernelDownloadProgress) => {
      event.sender.send('kernels:download-progress', progress);
    })
  );

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle('window:toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return;
    }

    if (window.isMaximized()) {
      window.unmaximize();
      return;
    }

    window.maximize();
  });

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

/** 拼接公网 IP 的区域展示文案，缺失字段会自动跳过。 */
function buildRegionLabel(data: IpWhoIsResponse): string {
  const parts = [data.country, data.region, data.city].filter(
    (value): value is string => Boolean(value)
  );
  return parts.length > 0 ? parts.join(' ') : '未知区域';
}

/** 选择本地扩展包，后缀按浏览器内核限制，避免把任意文件传给解包层。 */
async function chooseExtensionPackage(
  sender: WebContents,
  managedEngine: ManagedExtensionEngine
): Promise<string | undefined> {
  const options: OpenDialogOptions = {
    properties: ['openFile'],
    filters: managedEngine === 'chromium'
      ? [{ name: 'Chromium 扩展', extensions: ['zip', 'crx'] }]
      : [{ name: 'Firefox 扩展', extensions: ['xpi', 'zip'] }]
  };
  return choosePath(sender, options);
}

/** 选择本地扩展目录，目录内容由 core 层继续校验 manifest。 */
async function chooseExtensionFolder(sender: WebContents): Promise<string | undefined> {
  return choosePath(sender, { properties: ['openDirectory'] });
}

/** 用触发 IPC 的窗口打开系统选择框，取消时保持 undefined 语义。 */
async function choosePath(sender: WebContents, options: OpenDialogOptions): Promise<string | undefined> {
  const window = BrowserWindow.fromWebContents(sender);
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  return result.canceled ? undefined : result.filePaths[0];
}

/** 把文件持久化结果封装为应用中心元数据。 */
function toManagedExtension(
  extensionId: string,
  managedEngine: ManagedExtensionEngine,
  files: PersistedExtensionFiles
): ManagedExtension {
  const now = new Date().toISOString();
  return {
    id: extensionId,
    engine: managedEngine,
    name: files.name,
    source: files.source,
    fileName: files.fileName,
    storedPath: files.storedPath,
    unpackedPath: files.unpackedPath,
    effectivePath: files.effectivePath,
    enabled: true,
    exists: true,
    createdAt: now,
    updatedAt: now
  };
}

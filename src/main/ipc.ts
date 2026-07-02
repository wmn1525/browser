import { BrowserWindow, ipcMain } from 'electron';

import { BrowserEngine } from '../core/browser-engine';
import type { BrowserKernelDownloadProgress } from '../shared/types';
import type { ProfileDraft } from '../shared/types';
import type { ProxyPoolItem } from '../shared/types';
import type { ProfileGroup } from '../shared/types';
import type { PublicIpInfo } from '../shared/types';
import { ProfileGroupStore } from './profile-group-store';
import { ProxyPoolStore } from './proxy-pool-store';

interface IpWhoIsResponse {
  readonly success: boolean;
  readonly ip?: string;
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly message?: string;
}

/** Electron 主进程 IPC 入口，负责把管理壳请求转交给核心引擎。 */
const engine = new BrowserEngine();
const profileGroupStore = new ProfileGroupStore();
const proxyPoolStore = new ProxyPoolStore();
engine.onChanged(() => {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('profiles:changed');
  }
});

/** 注册管理壳与核心引擎之间的 IPC 通道。 */
export function registerBrowserIpc(): void {
  ipcMain.handle('profiles:list', () => engine.listProfiles());

  ipcMain.handle('profiles:get', (_event, profileId: string) =>
    engine.getProfile(profileId)
  );

  ipcMain.handle('profiles:create', (_event, draft: ProfileDraft) =>
    engine.createProfile(draft)
  );

  ipcMain.handle('profiles:update', (_event, profileId: string, draft: ProfileDraft) =>
    engine.updateProfile(profileId, draft)
  );

  ipcMain.handle('profiles:duplicate', (_event, profileId: string) =>
    engine.duplicateProfile(profileId)
  );

  ipcMain.handle('profiles:export', (_event, profileId: string) =>
    engine.exportProfile(profileId)
  );

  ipcMain.handle('profiles:launch', (_event, idOrName: string) =>
    engine.launchProfile(idOrName)
  );

  ipcMain.handle('profiles:close', (_event, profileId: string) =>
    engine.closeProfile(profileId)
  );

  ipcMain.handle('profiles:delete', (_event, profileId: string) =>
    engine.deleteProfile(profileId)
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

  ipcMain.handle('kernels:list', () => engine.listBrowserKernels());

  ipcMain.handle('kernels:download', (event, kernelId: string) =>
    engine.downloadBrowserKernel(kernelId, (progress: BrowserKernelDownloadProgress) => {
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

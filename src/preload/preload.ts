import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type {
  AppUpdateEvent,
  BrowserKernelDownloadResult,
  BrowserKernelDownloadProgress,
  BrowserKernelInfo,
  BrowserShellApi,
  LaunchResult,
  ProfileDetail,
  ProfileDraft,
  ProfileGroup,
  ProfileSummary,
  ProxyPoolItem,
  PublicIpInfo
} from '../shared/types';

/** 受控暴露给 renderer 的浏览器管理 API。 */
const api: BrowserShellApi = {
  listProfiles: () => ipcRenderer.invoke('profiles:list') as Promise<readonly ProfileSummary[]>,
  getProfile: (profileId: string) =>
    ipcRenderer.invoke('profiles:get', profileId) as Promise<ProfileDetail>,
  createProfile: (draft: ProfileDraft) =>
    ipcRenderer.invoke('profiles:create', draft) as Promise<ProfileSummary>,
  updateProfile: (profileId: string, draft: ProfileDraft) =>
    ipcRenderer.invoke('profiles:update', profileId, draft) as Promise<ProfileSummary>,
  duplicateProfile: (profileId: string) =>
    ipcRenderer.invoke('profiles:duplicate', profileId) as Promise<ProfileSummary>,
  exportProfile: (profileId: string) =>
    ipcRenderer.invoke('profiles:export', profileId) as Promise<string>,
  launchProfile: (idOrName: string) =>
    ipcRenderer.invoke('profiles:launch', idOrName) as Promise<LaunchResult>,
  closeProfile: (profileId: string) =>
    ipcRenderer.invoke('profiles:close', profileId) as Promise<void>,
  deleteProfile: (profileId: string) =>
    ipcRenderer.invoke('profiles:delete', profileId) as Promise<void>,
  minimizeWindow: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  toggleMaximizeWindow: () =>
    ipcRenderer.invoke('window:toggle-maximize') as Promise<void>,
  closeWindow: () => ipcRenderer.invoke('window:close') as Promise<void>,
  getPublicIp: () => ipcRenderer.invoke('network:get-public-ip') as Promise<PublicIpInfo>,
  listProfileGroups: () =>
    ipcRenderer.invoke('groups:list') as Promise<readonly ProfileGroup[]>,
  saveProfileGroups: (groups: readonly ProfileGroup[]) =>
    ipcRenderer.invoke('groups:save', groups) as Promise<void>,
  listProxyPool: () =>
    ipcRenderer.invoke('proxies:list') as Promise<readonly ProxyPoolItem[]>,
  saveProxyPool: (items: readonly ProxyPoolItem[]) =>
    ipcRenderer.invoke('proxies:save', items) as Promise<void>,
  listBrowserKernels: () =>
    ipcRenderer.invoke('kernels:list') as Promise<readonly BrowserKernelInfo[]>,
  downloadBrowserKernel: (kernelId: string) =>
    ipcRenderer.invoke('kernels:download', kernelId) as Promise<BrowserKernelDownloadResult>,
  checkForAppUpdates: () =>
    ipcRenderer.invoke('app-updates:check') as Promise<AppUpdateEvent>,
  downloadAppUpdate: () =>
    ipcRenderer.invoke('app-updates:download') as Promise<AppUpdateEvent>,
  installAppUpdate: () =>
    ipcRenderer.invoke('app-updates:install') as Promise<void>,
  onBrowserKernelDownloadProgress: (listener: (progress: BrowserKernelDownloadProgress) => void) => {
    const channelListener = (_event: IpcRendererEvent, progress: BrowserKernelDownloadProgress): void => listener(progress);
    ipcRenderer.on('kernels:download-progress', channelListener);
    return () => ipcRenderer.off('kernels:download-progress', channelListener);
  },
  onAppUpdateEvent: (listener: (event: AppUpdateEvent) => void) => {
    const channelListener = (_event: IpcRendererEvent, event: AppUpdateEvent): void => listener(event);
    ipcRenderer.on('app-updates:event', channelListener);
    return () => ipcRenderer.off('app-updates:event', channelListener);
  },
  onProfilesChanged: (listener: () => void) => {
    const channelListener = (): void => listener();
    ipcRenderer.on('profiles:changed', channelListener);
    return () => ipcRenderer.off('profiles:changed', channelListener);
  }
};

/** preload 是 renderer 能访问核心能力的唯一入口。 */
contextBridge.exposeInMainWorld('browserShell', api);

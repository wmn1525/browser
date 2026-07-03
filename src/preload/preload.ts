import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type {
  AppDataDirectoryInfo,
  AppUpdateEvent,
  BrowserKernelDownloadResult,
  BrowserKernelDownloadProgress,
  BrowserKernelInfo,
  BrowserShellApi,
  LaunchResult,
  ManagedExtension,
  ManagedExtensionEngine,
  ManagedExtensionUpdate,
  OpenApiInfo,
  ProfileDetail,
  ProfileDraft,
  ProfileGroup,
  ProfileSummary,
  ProxyPoolItem,
  PublicIpInfo
} from '../shared/types';
import type {
  WindowSyncProfile,
  WindowSyncSession,
  WindowSyncStartRequest
} from '../shared/window-sync-types';

/** 受控暴露给 renderer 的浏览器管理 API。 */
const api: BrowserShellApi = {
  listProfiles: () => ipcRenderer.invoke('profiles:list') as Promise<readonly ProfileSummary[]>,
  getProfile: (profileId: string) =>
    ipcRenderer.invoke('profiles:get', profileId) as Promise<ProfileDetail>,
  createProfile: (draft: ProfileDraft) =>
    ipcRenderer.invoke('profiles:create', draft) as Promise<ProfileSummary>,
  updateProfile: (profileId: string, draft: ProfileDraft) =>
    ipcRenderer.invoke('profiles:update', profileId, draft) as Promise<ProfileSummary>,
  renewProfile: (profileId: string, draft: ProfileDraft) =>
    ipcRenderer.invoke('profiles:renew', profileId, draft) as Promise<ProfileSummary>,
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
  checkProxyPoolItem: (item: ProxyPoolItem) =>
    ipcRenderer.invoke('proxies:check', item) as Promise<ProxyPoolItem>,
  listManagedExtensions: () =>
    ipcRenderer.invoke('extensions:list') as Promise<readonly ManagedExtension[]>,
  importManagedExtensionPackage: (engine: ManagedExtensionEngine, name: string) =>
    ipcRenderer.invoke('extensions:import-package', engine, name) as Promise<ManagedExtension | undefined>,
  importManagedExtensionFolder: (engine: ManagedExtensionEngine, name: string) =>
    ipcRenderer.invoke('extensions:import-folder', engine, name) as Promise<ManagedExtension | undefined>,
  updateManagedExtension: (extensionId: string, update: ManagedExtensionUpdate) =>
    ipcRenderer.invoke('extensions:update', extensionId, update) as Promise<ManagedExtension>,
  deleteManagedExtension: (extensionId: string) =>
    ipcRenderer.invoke('extensions:delete', extensionId) as Promise<void>,
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
  getAppDataDirectoryInfo: () =>
    ipcRenderer.invoke('app-settings:data-directory') as Promise<AppDataDirectoryInfo>,
  chooseAppDataDirectory: () =>
    ipcRenderer.invoke('app-settings:choose-data-directory') as Promise<AppDataDirectoryInfo>,
  resetAppDataDirectory: () =>
    ipcRenderer.invoke('app-settings:reset-data-directory') as Promise<AppDataDirectoryInfo>,
  openAppDataDirectory: () =>
    ipcRenderer.invoke('app-settings:open-data-directory') as Promise<void>,
  getOpenApiInfo: () =>
    ipcRenderer.invoke('open-api:info') as Promise<OpenApiInfo>,
  startOpenApiServer: () =>
    ipcRenderer.invoke('open-api:start') as Promise<OpenApiInfo>,
  stopOpenApiServer: () =>
    ipcRenderer.invoke('open-api:stop') as Promise<OpenApiInfo>,
  regenerateOpenApiKey: () =>
    ipcRenderer.invoke('open-api:regenerate-key') as Promise<OpenApiInfo>,
  listWindowSyncProfiles: () =>
    ipcRenderer.invoke('window-sync:profiles') as Promise<readonly WindowSyncProfile[]>,
  getWindowSyncSession: () =>
    ipcRenderer.invoke('window-sync:session') as Promise<WindowSyncSession>,
  startWindowSync: (request: WindowSyncStartRequest) =>
    ipcRenderer.invoke('window-sync:start', request) as Promise<WindowSyncSession>,
  stopWindowSync: () =>
    ipcRenderer.invoke('window-sync:stop') as Promise<WindowSyncSession>,
  restartWindowSync: (request: WindowSyncStartRequest) =>
    ipcRenderer.invoke('window-sync:restart', request) as Promise<WindowSyncSession>,
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

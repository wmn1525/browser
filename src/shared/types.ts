/** 管理壳、preload 与核心引擎共享的稳定 DTO。 */

import type { WindowSyncProfile, WindowSyncSession, WindowSyncStartRequest } from './window-sync-types';

/** 代理协议限定为浏览器引擎当前支持的类型。 */
export type ProxyType = 'http' | 'https' | 'socks5';

/** 创建或更新 profile 时由管理壳提交的表单数据。 */
export interface ProfileDraft {
  readonly id?: string;
  readonly name: string;
  readonly groupId?: string;
  readonly browserKernel?: string;
  readonly os?: string;
  readonly osVersion?: string;
  readonly userAgent?: string;
  readonly cookiesText?: string;
  readonly searchEngine?: string;
  readonly accountPlatform?: string;
  readonly accountName?: string;
  readonly loadImages?: boolean;
  readonly loadVideos?: boolean;
  readonly proxy?: ProxyDraft;
  readonly timezone?: string;
  readonly fingerprint?: FingerprintDraft;
  readonly disabledGlobalExtensionIds?: readonly string[];
  readonly startUrls: readonly string[];
  readonly tags: readonly string[];
}

/** 本地 profile 分组，保存到 Electron userData，不参与云同步或团队权限。 */
export interface ProfileGroup {
  readonly id: string;
  readonly name: string;
}

/** UI 层的代理输入模型，进入核心引擎前会清理空字段。 */
export interface ProxyDraft {
  readonly type: ProxyType;
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
}

/** 代理池检测后的可视状态。 */
export type ProxyPoolStatus = 'unchecked' | 'checking' | 'ok' | 'failed';

/** 代理池列表行，保存在本地 userData 的稳定数据结构。 */
export interface ProxyPoolItem {
  readonly id: string;
  readonly protocol: ProxyType;
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly remark: string;
  readonly profileCount: number;
  readonly tags: readonly string[];
  readonly status: ProxyPoolStatus;
  readonly exitIp?: string;
  readonly region?: string;
  readonly latency?: number;
  readonly lastCheckedAt?: string;
}

/** 新增或导入代理时使用的输入模型。 */
export interface ProxyPoolDraft {
  readonly protocol: ProxyType;
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly remark: string;
  readonly tags: readonly string[];
}

/** 指纹检测面的运行策略，对齐参考配置并避免用散落字符串表达模式。 */
export type FingerprintHookMode = 'default' | 'value' | 'page' | 'browser' | 'domain' | 'global' | 'enabled' | 'disabled';

/** Chromium 运行时支持的 Canvas 和 Audio 处理方式。 */
export type FingerprintNoiseMode = 'noise' | 'real';

/** Chromium 运行时支持的 WebRTC 处理方式。 */
export type FingerprintWebRtcMode = 'disable' | 'fake' | 'real';

/** 屏幕运行时配置会传给核心库和补充注入脚本共同使用。 */
export interface FingerprintScreenDraft {
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor?: number;
}

/** WebGL 运行时配置保存浏览器对外暴露的厂商与渲染器。 */
export interface FingerprintWebGlDraft {
  readonly vendor?: string;
  readonly renderer?: string;
}

/** Chromium Client Hints 的可保存配置，避免用宽泛对象承载。 */
export interface ClientHintsDraft {
  readonly platform?: string;
  readonly platformVersion?: string;
  readonly architecture?: string;
  readonly mobile?: boolean;
  readonly brandVersion?: string;
}

/** 常用指纹字段，保持小而清晰，按参考检测面覆盖表单和运行时。 */
export interface FingerprintDraft {
  readonly userAgent?: string;
  readonly platform?: string;
  readonly language?: string;
  readonly languages?: string;
  readonly hardwareConcurrency?: number;
  readonly deviceMemory?: number;
  readonly screen?: FingerprintScreenDraft;
  readonly screenWidth?: number;
  readonly screenHeight?: number;
  readonly screenColorDepth?: number;
  readonly screenPixelDepth?: number;
  readonly webgl?: FingerprintWebGlDraft;
  readonly webglVendor?: string;
  readonly webglRenderer?: string;
  readonly hstsMode?: FingerprintHookMode;
  readonly hstsValue?: string;
  readonly webglMode?: FingerprintHookMode;
  readonly webglValue?: string;
  readonly canvasMode?: FingerprintHookMode;
  readonly canvasValue?: string;
  readonly canvas?: FingerprintNoiseMode;
  readonly pluginsMode?: FingerprintHookMode;
  readonly pluginsValue?: string;
  readonly rectsMode?: FingerprintHookMode;
  readonly rectsValue?: string;
  readonly fontsMode?: FingerprintHookMode;
  readonly fontsValue?: string;
  readonly batteryState?: string;
  readonly bluetoothState?: string;
  readonly networkState?: string;
  readonly clientHintsMode?: FingerprintHookMode;
  readonly clientHintsPlatform?: string;
  readonly clientHintsPlatformVersion?: string;
  readonly clientHintsArchitecture?: string;
  readonly clientHintsMobile?: boolean;
  readonly clientHintsBrandVersion?: string;
  readonly audioMode?: FingerprintHookMode;
  readonly audioValue?: string;
  readonly audio?: FingerprintNoiseMode;
  readonly webgpuMode?: FingerprintHookMode;
  readonly webgpuValue?: string;
  readonly webrtcMode?: FingerprintHookMode;
  readonly webrtc?: FingerprintWebRtcMode;
  readonly serviceWorkerMode?: FingerprintHookMode;
}

/** 管理壳展示 profile 时使用的稳定视图模型。 */
export interface ProfileSummary {
  readonly id: string;
  readonly name: string;
  readonly groupId?: string;
  readonly browserKernel?: string;
  readonly proxyLabel: string;
  readonly timezoneLabel: string;
  readonly tags: readonly string[];
  readonly isRunning: boolean;
  readonly lastLaunchedAt?: number;
}

/** Profile 编辑弹窗需要的完整详情。 */
export interface ProfileDetail extends ProfileSummary {
  readonly groupId?: string;
  readonly browserKernel?: string;
  readonly os?: string;
  readonly osVersion?: string;
  readonly userAgent?: string;
  readonly cookiesText?: string;
  readonly searchEngine?: string;
  readonly accountPlatform?: string;
  readonly accountName?: string;
  readonly loadImages?: boolean;
  readonly loadVideos?: boolean;
  readonly proxy?: ProxyDraft;
  readonly timezone?: string;
  readonly fingerprint?: FingerprintDraft;
  readonly disabledGlobalExtensionIds: readonly string[];
  readonly startUrls: readonly string[];
}

/** 已启动浏览器的连接信息，仅暴露管理壳真正需要的字段。 */
export interface LaunchResult {
  readonly profileId: string;
  readonly wsEndpoint?: string;
  readonly port?: number;
  readonly debugPort?: number;
  readonly debugUrl?: string;
}

/** 当前网络出口 IP 展示模型。 */
export interface PublicIpInfo {
  readonly ip: string;
  readonly regionLabel: string;
}

/** 浏览器内核所属引擎，启动链路会按引擎类型分流。 */
export type BrowserKernelEngine = 'chromium' | 'firefox';

/** 应用中心托管扩展使用浏览器内核引擎作为唯一分流维度。 */
export type ManagedExtensionEngine = BrowserKernelEngine;

/** 扩展来源影响存储方式，启动挂载只依赖 effectivePath。 */
export type ManagedExtensionSource = 'package' | 'folder';

/** 应用中心扩展元数据，文件本体保存在 Electron userData 的 extensions 目录中。 */
export interface ManagedExtension {
  readonly id: string;
  readonly engine: ManagedExtensionEngine;
  readonly name: string;
  readonly source: ManagedExtensionSource;
  readonly fileName: string;
  readonly storedPath: string;
  readonly unpackedPath?: string;
  readonly effectivePath: string;
  readonly enabled: boolean;
  readonly exists: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** 扩展列表只允许改显示名和启用状态，避免 renderer 改写文件路径。 */
export interface ManagedExtensionUpdate {
  readonly name?: string;
  readonly enabled?: boolean;
}

/** 管理壳展示和启动时使用的浏览器内核信息。 */
export interface BrowserKernelInfo {
  readonly id: string;
  readonly label: string;
  readonly engine: BrowserKernelEngine;
  readonly majorVersion?: number;
  readonly version: string;
  readonly source: 'system' | 'downloaded' | 'remote';
  readonly isInstalled: boolean;
  readonly executablePath?: string;
}

/** 内核下载完成后返回给 renderer 的稳定结果。 */
export interface BrowserKernelDownloadResult {
  readonly kernel: BrowserKernelInfo;
  readonly message: string;
}

/** 内核下载进度，主进程通过 IPC 推送给 renderer。 */
export interface BrowserKernelDownloadProgress {
  readonly kernelId: string;
  readonly phase: 'downloading' | 'downloaded' | 'extracting' | 'completed';
  readonly percent: number;
  readonly receivedBytes: number;
  readonly totalBytes?: number;
}

/** 应用更新弹窗展示需要的版本信息。 */
export interface AppUpdateInfo {
  readonly version: string;
  readonly currentVersion: string;
  readonly releaseName?: string;
  readonly releaseDate?: string;
  readonly releaseNotes?: string;
}

/** 安装包下载进度，字段保持与 electron-updater 进度语义一致。 */
export interface AppUpdateProgress {
  readonly percent: number;
  readonly transferred: number;
  readonly total: number;
  readonly bytesPerSecond: number;
}

/** 主进程推送给 renderer 的应用更新状态。 */
export interface AppUpdateEvent {
  readonly status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  readonly update?: AppUpdateInfo;
  readonly progress?: AppUpdateProgress;
  readonly message?: string;
}

/** 设置中心展示的数据目录信息；切换目录只影响下次启动，不自动迁移文件。 */
export interface AppDataDirectoryInfo {
  readonly currentPath: string;
  readonly defaultPath: string;
  readonly configuredPath?: string;
  readonly nextStartPath: string;
  readonly restartRequired: boolean;
}

/** 本地 Open API 设置，保存在 Electron userData。 */
export interface OpenApiSettings {
  readonly enabled: boolean;
  readonly apiKey: string;
  readonly port: number;
}

/** 自动化页面展示的本地 Open API 状态。 */
export interface OpenApiInfo extends OpenApiSettings {
  readonly running: boolean;
  readonly baseUrl: string;
  readonly docsUrl: string;
}

/** preload 暴露给 renderer 的最小 API 面。 */
export interface BrowserShellApi {
  readonly listProfiles: () => Promise<readonly ProfileSummary[]>;
  readonly getProfile: (profileId: string) => Promise<ProfileDetail>;
  readonly createProfile: (draft: ProfileDraft) => Promise<ProfileSummary>;
  readonly updateProfile: (profileId: string, draft: ProfileDraft) => Promise<ProfileSummary>;
  readonly duplicateProfile: (profileId: string) => Promise<ProfileSummary>;
  readonly exportProfile: (profileId: string) => Promise<string>;
  readonly launchProfile: (idOrName: string) => Promise<LaunchResult>;
  readonly closeProfile: (profileId: string) => Promise<void>;
  readonly deleteProfile: (profileId: string) => Promise<void>;
  readonly minimizeWindow: () => Promise<void>;
  readonly toggleMaximizeWindow: () => Promise<void>;
  readonly closeWindow: () => Promise<void>;
  readonly getPublicIp: () => Promise<PublicIpInfo>;
  readonly listProfileGroups: () => Promise<readonly ProfileGroup[]>;
  readonly saveProfileGroups: (groups: readonly ProfileGroup[]) => Promise<void>;
  readonly listProxyPool: () => Promise<readonly ProxyPoolItem[]>;
  readonly saveProxyPool: (items: readonly ProxyPoolItem[]) => Promise<void>;
  readonly checkProxyPoolItem: (item: ProxyPoolItem) => Promise<ProxyPoolItem>;
  readonly listManagedExtensions: () => Promise<readonly ManagedExtension[]>;
  readonly importManagedExtensionPackage: (engine: ManagedExtensionEngine, name: string) => Promise<ManagedExtension | undefined>;
  readonly importManagedExtensionFolder: (engine: ManagedExtensionEngine, name: string) => Promise<ManagedExtension | undefined>;
  readonly updateManagedExtension: (extensionId: string, update: ManagedExtensionUpdate) => Promise<ManagedExtension>;
  readonly deleteManagedExtension: (extensionId: string) => Promise<void>;
  readonly listBrowserKernels: () => Promise<readonly BrowserKernelInfo[]>;
  readonly downloadBrowserKernel: (kernelId: string) => Promise<BrowserKernelDownloadResult>;
  readonly onBrowserKernelDownloadProgress: (listener: (progress: BrowserKernelDownloadProgress) => void) => () => void;
  readonly checkForAppUpdates: () => Promise<AppUpdateEvent>;
  readonly downloadAppUpdate: () => Promise<AppUpdateEvent>;
  readonly installAppUpdate: () => Promise<void>;
  readonly onAppUpdateEvent: (listener: (event: AppUpdateEvent) => void) => () => void;
  readonly getAppDataDirectoryInfo: () => Promise<AppDataDirectoryInfo>;
  readonly chooseAppDataDirectory: () => Promise<AppDataDirectoryInfo>;
  readonly resetAppDataDirectory: () => Promise<AppDataDirectoryInfo>;
  readonly openAppDataDirectory: () => Promise<void>;
  readonly getOpenApiInfo: () => Promise<OpenApiInfo>;
  readonly startOpenApiServer: () => Promise<OpenApiInfo>;
  readonly stopOpenApiServer: () => Promise<OpenApiInfo>;
  readonly regenerateOpenApiKey: () => Promise<OpenApiInfo>;
  readonly listWindowSyncProfiles: () => Promise<readonly WindowSyncProfile[]>;
  readonly getWindowSyncSession: () => Promise<WindowSyncSession>;
  readonly startWindowSync: (request: WindowSyncStartRequest) => Promise<WindowSyncSession>;
  readonly stopWindowSync: () => Promise<WindowSyncSession>;
  readonly restartWindowSync: (request: WindowSyncStartRequest) => Promise<WindowSyncSession>;
  readonly onProfilesChanged: (listener: () => void) => () => void;
}

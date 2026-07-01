/** 管理壳、preload 与核心引擎共享的稳定 DTO。 */

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
  readonly startUrls: readonly string[];
  readonly tags: readonly string[];
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

/** 常用指纹字段，保持小而清晰，后续可按检测面继续扩展。 */
export interface FingerprintDraft {
  readonly platform?: string;
  readonly language?: string;
  readonly hardwareConcurrency?: number;
  readonly deviceMemory?: number;
  readonly screenWidth?: number;
  readonly screenHeight?: number;
  readonly webglVendor?: string;
  readonly webglRenderer?: string;
  readonly hstsMode?: string;
  readonly hstsValue?: string;
  readonly webglMode?: string;
  readonly webglValue?: string;
  readonly canvasMode?: string;
  readonly canvasValue?: string;
  readonly pluginsMode?: string;
  readonly pluginsValue?: string;
  readonly rectsMode?: string;
  readonly rectsValue?: string;
  readonly fontsMode?: string;
  readonly fontsValue?: string;
  readonly batteryState?: string;
  readonly bluetoothState?: string;
  readonly networkState?: string;
}

/** 管理壳展示 profile 时使用的稳定视图模型。 */
export interface ProfileSummary {
  readonly id: string;
  readonly name: string;
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
  readonly startUrls: readonly string[];
}

/** 已启动浏览器的连接信息，仅暴露管理壳真正需要的字段。 */
export interface LaunchResult {
  readonly profileId: string;
  readonly wsEndpoint: string;
}

/** 当前网络出口 IP 展示模型。 */
export interface PublicIpInfo {
  readonly ip: string;
  readonly regionLabel: string;
}

/** 管理壳展示和启动时使用的浏览器内核信息。 */
export interface BrowserKernelInfo {
  readonly id: string;
  readonly label: string;
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
  readonly listProxyPool: () => Promise<readonly ProxyPoolItem[]>;
  readonly saveProxyPool: (items: readonly ProxyPoolItem[]) => Promise<void>;
  readonly listBrowserKernels: () => Promise<readonly BrowserKernelInfo[]>;
  readonly downloadBrowserKernel: (kernelId: string) => Promise<BrowserKernelDownloadResult>;
  readonly onBrowserKernelDownloadProgress: (listener: (progress: BrowserKernelDownloadProgress) => void) => () => void;
  readonly checkForAppUpdates: () => Promise<AppUpdateEvent>;
  readonly downloadAppUpdate: () => Promise<AppUpdateEvent>;
  readonly installAppUpdate: () => Promise<void>;
  readonly onAppUpdateEvent: (listener: (event: AppUpdateEvent) => void) => () => void;
  readonly onProfilesChanged: (listener: () => void) => () => void;
}

import { BrowserProfiles } from '@aitofy/browser-profiles';
import type {
  BrowserKernelEngine,
  BrowserKernelDownloadResult,
  BrowserKernelDownloadProgress,
  BrowserKernelInfo,
  LaunchResult,
  ManagedExtension,
  ProfileDetail,
  ProfileDraft,
  ProfileSummary
} from '../shared/types';
import type { StoredProfile } from '@aitofy/browser-profiles';
import type { LaunchResult as BrowserLaunchResult } from '@aitofy/browser-profiles';
import { BrowserKernelManager } from './browser-kernel-manager';
import { injectChromiumFingerprintPatch } from './chromium-fingerprint-runtime';
import { FirefoxProfileLauncher } from './firefox-profile-launcher';
import {
  normalizeProfileDraft,
  toProfileDetail,
  toProfileSummary,
  toProxyDraft,
  type ExtendedProfileConfig,
  type ExtendedStoredProfile
} from './profile-dto-mapper';

/** 浏览器引擎层只封装 profile 生命周期，不持有任何 Electron UI 状态。 */

/** 核心浏览器引擎：集中管理 profile 存储、启动和关闭，不依赖 Electron。 */
export interface ManagedExtensionProvider {
  readonly listManagedExtensions: () => Promise<readonly ManagedExtension[]>;
}

/** 根据内核和 profile 禁用列表选出本次启动需要加载的扩展路径。 */
export function getEnabledExtensionPaths(
  extensions: readonly ManagedExtension[],
  engine: BrowserKernelEngine,
  disabledIds: readonly string[]
): readonly string[] {
  const disabled = new Set(disabledIds);
  return extensions
    .filter((extension) => extension.engine === engine)
    .filter((extension) => extension.enabled && extension.exists)
    .filter((extension) => !disabled.has(extension.id))
    .map((extension) => extension.effectivePath);
}

const emptyExtensionProvider: ManagedExtensionProvider = {
  listManagedExtensions: async () => []
};

export class BrowserEngine {
  private readonly profiles: BrowserProfiles;
  private readonly kernels = new BrowserKernelManager();
  private readonly firefox = new FirefoxProfileLauncher();
  private readonly runningProfiles = new Set<string>();
  private readonly monitors = new Map<string, ReturnType<typeof setInterval>>();
  private readonly changeListeners = new Set<() => void>();

  public constructor(private readonly extensionProvider: ManagedExtensionProvider = emptyExtensionProvider) {
    this.profiles = new BrowserProfiles();
  }

  /** 返回所有 profile，并附带当前进程内的运行状态。 */
  public async listProfiles(): Promise<readonly ProfileSummary[]> {
    const profiles = await this.profiles.list();
    return profiles.map((profile) => this.toSummary(profile));
  }

  /** 创建本地 profile，指纹字段通过 CDP 注入链路在启动后生效。 */
  public async createProfile(draft: ProfileDraft): Promise<ProfileSummary> {
    const profile = await this.profiles.create(normalizeProfileDraft(draft));
    this.notifyChanged();
    return this.toSummary(profile);
  }

  /** 获取 profile 详情，用于编辑弹窗回填。 */
  public async getProfile(profileId: string): Promise<ProfileDetail> {
    const profile = await this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    return this.toDetail(profile);
  }

  /** 更新 profile 配置，运行中的浏览器需要下次启动才完整应用新指纹。 */
  public async updateProfile(profileId: string, draft: ProfileDraft): Promise<ProfileSummary> {
    const profile = await this.profiles.update(profileId, {
      ...normalizeProfileDraft(draft),
      id: undefined
    });
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    this.notifyChanged();
    return this.toSummary(profile);
  }

  /** 复制 profile，沿用核心库的配置克隆能力。 */
  public async duplicateProfile(profileId: string): Promise<ProfileSummary> {
    const profile = await this.profiles.duplicate(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    this.notifyChanged();
    return this.toSummary(profile);
  }

  /** 导出 profile JSON，交给 renderer 展示或复制。 */
  public async exportProfile(profileId: string): Promise<string> {
    const exported = await this.profiles.export(profileId);
    if (!exported) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    return exported;
  }

  /** 启动指定 profile，浏览器进程由 @aitofy/browser-profiles 接管。 */
  public async launchProfile(idOrName: string): Promise<LaunchResult> {
    const profile = await this.profiles.getByIdOrName(idOrName);
    if (!profile) {
      throw new Error(`Profile not found: ${idOrName}`);
    }

    const extendedProfile: ExtendedStoredProfile = profile;
    const kernel = await this.kernels.resolveKernel(extendedProfile.browserKernel);
    if (kernel.engine === 'firefox') {
      return this.launchFirefoxProfile(extendedProfile, kernel.executablePath);
    }

    const extensions = await this.getLaunchExtensionPaths(extendedProfile, kernel.engine);
    const session: BrowserLaunchResult = await this.profiles.launchByIdOrName(idOrName, {
      chromePath: kernel.executablePath,
      extensions: [...extensions],
      headless: false
    });

    const profileId = session.profileId;
    await injectChromiumFingerprintPatch(session.port, extendedProfile);
    this.runningProfiles.add(profileId);
    this.startBrowserMonitor(profileId, session.port);
    this.notifyChanged();

    return {
      profileId,
      wsEndpoint: session.wsEndpoint
    };
  }

  /** 返回本机与可下载 Chrome for Testing 内核。 */
  public async listBrowserKernels(): Promise<readonly BrowserKernelInfo[]> {
    return this.kernels.list();
  }

  /** 下载指定通道的 Chrome for Testing 内核。 */
  public async downloadBrowserKernel(
    kernelId: string,
    onProgress?: (progress: BrowserKernelDownloadProgress) => void
  ): Promise<BrowserKernelDownloadResult> {
    return this.kernels.download(kernelId, onProgress);
  }

  /** 关闭指定 profile 对应的浏览器实例。 */
  public async closeProfile(profileId: string): Promise<void> {
    this.stopBrowserMonitor(profileId);
    if (this.firefox.isRunning(profileId)) {
      await this.firefox.close(profileId);
    } else {
      await this.profiles.close(profileId);
    }
    this.runningProfiles.delete(profileId);
    this.notifyChanged();
  }

  /** 删除 profile 前先尝试关闭，避免残留浏览器进程继续占用用户数据目录。 */
  public async deleteProfile(profileId: string): Promise<void> {
    if (this.runningProfiles.has(profileId)) {
      await this.closeProfile(profileId);
    }

    await this.profiles.delete(profileId);
    this.notifyChanged();
  }

  /** 删除扩展后清理所有 profile 中残留的禁用扩展 id。 */
  public async removeDisabledExtensionId(extensionId: string): Promise<void> {
    const profiles = await this.profiles.list();
    for (const profile of profiles) {
      const extendedProfile: ExtendedStoredProfile = profile;
      const disabledIds = extendedProfile.disabledGlobalExtensionIds ?? [];
      const nextIds = disabledIds.filter((id) => id !== extensionId);
      if (nextIds.length === disabledIds.length) {
        continue;
      }

      const updates: Partial<ExtendedProfileConfig> = {
        disabledGlobalExtensionIds: nextIds
      };
      await this.profiles.update(profile.id, updates);
    }
    this.notifyChanged();
  }

  /** 订阅浏览器运行态变化，供 Electron 主进程转发给 renderer。 */
  public onChanged(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** 通过 CDP HTTP 端点探测外部浏览器是否还活着。 */
  private startBrowserMonitor(profileId: string, port: number): void {
    this.stopBrowserMonitor(profileId);

    let failedChecks = 0;
    const timer = setInterval(() => {
      void this.checkBrowserAlive(port).then((isAlive) => {
        if (isAlive) {
          failedChecks = 0;
          return;
        }

        failedChecks += 1;
        if (failedChecks >= 2) {
          this.markBrowserClosed(profileId);
        }
      });
    }, 2000);

    this.monitors.set(profileId, timer);
  }

  /** 停止指定 profile 的运行态探测器。 */
  private stopBrowserMonitor(profileId: string): void {
    const timer = this.monitors.get(profileId);
    if (!timer) {
      return;
    }

    clearInterval(timer);
    this.monitors.delete(profileId);
  }

  /** 访问 Chrome debug endpoint，失败通常意味着用户已关闭浏览器。 */
  private async checkBrowserAlive(port: number): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: controller.signal
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** 用户从浏览器窗口直接关闭时，清理本进程记录的运行状态。 */
  private markBrowserClosed(profileId: string): void {
    this.stopBrowserMonitor(profileId);
    this.runningProfiles.delete(profileId);
    this.notifyChanged();
  }

  /** 启动真实 Firefox/Gecko 进程，并用子进程生命周期维护运行态。 */
  private async launchFirefoxProfile(
    profile: ExtendedStoredProfile,
    executablePath: string | undefined
  ): Promise<LaunchResult> {
    if (!executablePath) {
      throw new Error('未检测到 Firefox，请先安装 Firefox 后再选择本机 Firefox 内核。');
    }

    const session = await this.firefox.launch({
      id: profile.id,
      proxy: toProxyDraft(profile.proxy),
      userAgent: profile.userAgent,
      timezone: profile.timezone,
      fingerprint: profile.fingerprint,
      loadImages: profile.loadImages,
      loadVideos: profile.loadVideos,
      extensionPaths: await this.getLaunchExtensionPaths(profile, 'firefox'),
      startUrls: profile.startUrls ?? []
    }, executablePath, (profileId) => this.markBrowserClosed(profileId));
    this.runningProfiles.add(session.profileId);
    this.notifyChanged();

    return { profileId: session.profileId };
  }

  /** 广播 profile 或运行态变化。 */
  private notifyChanged(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }

  /** 把核心库 profile 转成管理壳稳定展示模型。 */
  private toSummary(profile: StoredProfile): ProfileSummary {
    return toProfileSummary(profile, this.runningProfiles.has(profile.id));
  }

  /** 把核心库 profile 转成编辑弹窗可用详情。 */
  private toDetail(profile: StoredProfile): ProfileDetail {
    return toProfileDetail(profile, this.runningProfiles.has(profile.id));
  }

  /** 读取全局扩展并排除当前 profile 禁用项。 */
  private async getLaunchExtensionPaths(
    profile: ExtendedStoredProfile,
    engine: BrowserKernelEngine
  ): Promise<readonly string[]> {
    return getEnabledExtensionPaths(
      await this.extensionProvider.listManagedExtensions(),
      engine,
      profile.disabledGlobalExtensionIds ?? []
    );
  }
}

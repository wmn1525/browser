import { BrowserProfiles } from '@aitofy/browser-profiles';

import type {
  BrowserKernelDownloadResult,
  BrowserKernelDownloadProgress,
  BrowserKernelInfo,
  FingerprintDraft,
  LaunchResult,
  ProfileDetail,
  ProfileDraft,
  ProfileSummary,
  ProxyDraft
} from '../shared/types';
import type { ProfileConfig, ProxyConfig, StoredProfile } from '@aitofy/browser-profiles';
import type { LaunchResult as BrowserLaunchResult } from '@aitofy/browser-profiles';
import { BrowserKernelManager } from './browser-kernel-manager';

/** 浏览器引擎层只封装 profile 生命周期，不持有任何 Electron UI 状态。 */

interface ExtendedProfileConfig extends ProfileConfig {
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
}

interface ExtendedStoredProfile extends StoredProfile {
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
}

/** 核心浏览器引擎：集中管理 profile 存储、启动和关闭，不依赖 Electron。 */
export class BrowserEngine {
  private readonly profiles: BrowserProfiles;
  private readonly kernels = new BrowserKernelManager();
  private readonly runningProfiles = new Set<string>();
  private readonly monitors = new Map<string, ReturnType<typeof setInterval>>();
  private readonly changeListeners = new Set<() => void>();

  public constructor() {
    this.profiles = new BrowserProfiles();
  }

  /** 返回所有 profile，并附带当前进程内的运行状态。 */
  public async listProfiles(): Promise<readonly ProfileSummary[]> {
    const profiles = await this.profiles.list();
    return profiles.map((profile) => this.toSummary(profile));
  }

  /** 创建本地 profile，指纹字段通过 CDP 注入链路在启动后生效。 */
  public async createProfile(draft: ProfileDraft): Promise<ProfileSummary> {
    const profile = await this.profiles.create(this.normalizeDraft(draft));
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
      ...this.normalizeDraft(draft),
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
    const profile = await this.profiles.get(idOrName);
    const extendedProfile: ExtendedStoredProfile | undefined = profile ?? undefined;
    const chromePath = await this.kernels.resolveExecutablePath(extendedProfile?.browserKernel);
    const session: BrowserLaunchResult = await this.profiles.launchByIdOrName(idOrName, {
      chromePath,
      headless: false
    });

    const profileId = session.profileId;
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
    await this.profiles.close(profileId);
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

  /** 广播 profile 或运行态变化。 */
  private notifyChanged(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }

  /** 将管理壳 DTO 转为核心库需要的可持久化配置。 */
  private normalizeDraft(draft: ProfileDraft): ExtendedProfileConfig {
    return {
      id: this.cleanText(draft.id),
      name: draft.name.trim(),
      groupId: this.cleanText(draft.groupId),
      browserKernel: this.cleanText(draft.browserKernel),
      os: this.cleanText(draft.os),
      osVersion: this.cleanText(draft.osVersion),
      userAgent: this.cleanText(draft.userAgent),
      cookiesText: this.cleanText(draft.cookiesText),
      searchEngine: this.cleanText(draft.searchEngine),
      accountPlatform: this.cleanText(draft.accountPlatform),
      accountName: this.cleanText(draft.accountName),
      loadImages: draft.loadImages,
      loadVideos: draft.loadVideos,
      proxy: this.normalizeProxy(draft.proxy),
      timezone: this.cleanText(draft.timezone),
      fingerprint: this.normalizeFingerprint(draft.fingerprint),
      startUrls: draft.startUrls.map((url) => url.trim()).filter(Boolean),
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean)
    };
  }

  /** 清理代理字段，缺少 host 或 port 时视为直连。 */
  private normalizeProxy(proxy: ProxyDraft | undefined): ProxyDraft | undefined {
    if (!proxy || proxy.host.trim().length === 0 || proxy.port <= 0) {
      return undefined;
    }

    return {
      type: proxy.type,
      host: proxy.host.trim(),
      port: proxy.port,
      username: this.cleanText(proxy.username),
      password: this.cleanText(proxy.password)
    };
  }

  private normalizeFingerprint(
    fingerprint: FingerprintDraft | undefined
  ): FingerprintDraft | undefined {
    if (!fingerprint) {
      return undefined;
    }

    return {
      platform: this.cleanText(fingerprint.platform),
      language: this.cleanText(fingerprint.language),
      hardwareConcurrency: fingerprint.hardwareConcurrency,
      deviceMemory: fingerprint.deviceMemory,
      screenWidth: fingerprint.screenWidth,
      screenHeight: fingerprint.screenHeight,
      webglVendor: this.cleanText(fingerprint.webglVendor),
      webglRenderer: this.cleanText(fingerprint.webglRenderer)
    };
  }

  /** 统一把空字符串折叠为 undefined，避免写入无意义字段。 */
  private cleanText(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
  }

  /** 把核心库 profile 转成管理壳稳定展示模型。 */
  private toSummary(profile: StoredProfile): ProfileSummary {
    return {
      id: profile.id,
      name: profile.name,
      proxyLabel: this.getProxyLabel(profile.proxy),
      timezoneLabel: profile.timezone ?? 'System',
      tags: profile.tags ?? [],
      isRunning: this.runningProfiles.has(profile.id),
      lastLaunchedAt: profile.lastLaunchedAt
    };
  }

  /** 把核心库 profile 转成编辑弹窗可用详情。 */
  private toDetail(profile: StoredProfile): ProfileDetail {
    const extendedProfile: ExtendedStoredProfile = profile;
    return {
      ...this.toSummary(profile),
      groupId: profile.groupId,
      browserKernel: extendedProfile.browserKernel,
      os: extendedProfile.os,
      osVersion: extendedProfile.osVersion,
      userAgent: extendedProfile.userAgent,
      cookiesText: extendedProfile.cookiesText,
      searchEngine: extendedProfile.searchEngine,
      accountPlatform: extendedProfile.accountPlatform,
      accountName: extendedProfile.accountName,
      loadImages: extendedProfile.loadImages,
      loadVideos: extendedProfile.loadVideos,
      proxy: this.toProxyDraft(profile.proxy),
      timezone: profile.timezone,
      fingerprint: profile.fingerprint,
      startUrls: profile.startUrls ?? []
    };
  }

  /** 生成简短代理标签，避免 UI 泄露代理密码。 */
  private getProxyLabel(proxy: ProxyConfig | null | undefined): string {
    if (!proxy) {
      return 'Direct';
    }

    return `${proxy.type}://${proxy.host}:${proxy.port}`;
  }

  /** 将核心库代理配置转成 UI 编辑模型。 */
  private toProxyDraft(proxy: ProxyConfig | null | undefined): ProxyDraft | undefined {
    const port = Number(proxy?.port);
    if (!proxy || !Number.isFinite(port)) {
      return undefined;
    }

    return {
      type: proxy.type,
      host: proxy.host,
      port,
      username: proxy.username,
      password: proxy.password
    };
  }
}

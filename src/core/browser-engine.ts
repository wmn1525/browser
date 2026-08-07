import { BrowserProfiles, launchChrome } from '@aitofy/browser-profiles';
import type {
  BrowserKernelEngine,
  BrowserKernelDownloadResult,
  BrowserKernelDownloadProgress,
  BrowserKernelInfo,
  LaunchResult,
  ManagedExtension,
  OrphanDataReport,
  ProfileDetail,
  ProfileDraft,
  ProfileSummary
} from '../shared/types';
import type { WindowSyncProfile } from '../shared/window-sync-types';
import type { LaunchResult as BrowserLaunchResult, StoredProfile } from '@aitofy/browser-profiles';
import { BrowserKernelManager } from './browser-kernel-manager';
import { ChromiumBrowserMonitor } from './chromium-browser-monitor';
import { injectChromiumFingerprintPatch } from './chromium-fingerprint-runtime';
import { getEnabledExtensionPaths } from './extension-launch-paths';
import { FirefoxProfileLauncher } from './firefox-profile-launcher';
import { getChromiumProfileDataPath, renewChromiumProfileData } from './profile-data-cleaner';
import { removeDisabledExtensionIdFromProfiles } from './profile-extension-cleaner';
import { purgeOrphanProfileData, scanOrphanProfileData } from './profile-orphan-cleaner';
import { purgeProfileBrowserData } from './profile-purge';
import { isProfileDeleted, listAllProfileIds, markProfileDeleted } from './profile-recycle-bin';
import { toWindowSyncProfile } from './window-sync-profile-mapper';
import {
  normalizeProfileDraft,
  toProfileDetail,
  toProfileSummary,
  toProxyDraft,
  type ExtendedProfileConfig,
  type ExtendedStoredProfile
} from './profile-dto-mapper';

export { getEnabledExtensionPaths } from './extension-launch-paths';

/** 核心浏览器引擎：集中管理 profile 存储、启动和关闭，不依赖 Electron。 */
export interface ManagedExtensionProvider {
  readonly listManagedExtensions: () => Promise<readonly ManagedExtension[]>;
}

const emptyExtensionProvider: ManagedExtensionProvider = {
  listManagedExtensions: async () => []
};

export class BrowserEngine {
  private readonly profiles: BrowserProfiles;
  private readonly kernels = new BrowserKernelManager();
  private readonly firefox = new FirefoxProfileLauncher();
  private readonly chromiumMonitor = new ChromiumBrowserMonitor();
  private readonly runningProfiles = new Set<string>();
  private readonly runningLaunches = new Map<string, LaunchResult>();
  private readonly runningChromiumLaunches = new Map<string, BrowserLaunchResult>();
  private readonly changeListeners = new Set<() => void>();
  private readonly renewingProfiles = new Map<string, Promise<ProfileSummary>>();
  private readonly launchingProfiles = new Map<string, Promise<LaunchResult>>();

  public constructor(private readonly extensionProvider: ManagedExtensionProvider = emptyExtensionProvider) {
    this.profiles = new BrowserProfiles();
  }

  /** 返回所有未删除的 profile，并附带当前进程内的运行状态。 */
  public async listProfiles(): Promise<readonly ProfileSummary[]> {
    const profiles = await this.profiles.list();
    return profiles.filter((profile) => !isProfileDeleted(profile)).map((profile) => this.toSummary(profile));
  }

  /** 返回回收站里的 profile，按删除时间倒序。 */
  public async listDeletedProfiles(): Promise<readonly ProfileSummary[]> {
    const profiles = await this.profiles.list();
    return profiles
      .filter((profile) => isProfileDeleted(profile))
      .map((profile) => this.toSummary(profile))
      .sort((left, right) => (right.deletedAt ?? 0) - (left.deletedAt ?? 0));
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

  /** 换新 profile：先关闭运行实例，清理浏览器用户数据，再保存新的指纹配置。 */
  public async renewProfile(profileId: string, draft: ProfileDraft): Promise<ProfileSummary> {
    const renewing = this.renewingProfiles.get(profileId);
    if (renewing) {
      return renewing;
    }

    const task = this.doRenewProfile(profileId, draft).finally(() => {
      this.renewingProfiles.delete(profileId);
    });
    this.renewingProfiles.set(profileId, task);
    return task;
  }

  /** 执行真正换新流程；外层负责同一 profile 的并发去重。 */
  private async doRenewProfile(profileId: string, draft: ProfileDraft): Promise<ProfileSummary> {
    const existing = await this.profiles.get(profileId);
    if (!existing) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    if (this.runningProfiles.has(profileId)) {
      await this.closeProfile(profileId);
    }

    const existingProfile: ExtendedStoredProfile = existing;
    const chromiumDataDir = await renewChromiumProfileData(profileId, existingProfile.chromiumDataDir);
    await this.firefox.clearProfileData(profileId);
    const updates: Partial<ExtendedProfileConfig> = { ...normalizeProfileDraft(draft), chromiumDataDir, id: undefined };
    const profile = await this.profiles.update(profileId, updates);
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

    // 核心库的 duplicate 是 create({...existing})，会把 deletedAt 一起克隆，副本会一出生就在回收站里
    if (isProfileDeleted(profile)) {
      await markProfileDeleted(this.profiles, profile.id, undefined);
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

    // getByIdOrName 走核心库自己的 list，不受 listProfiles 过滤影响，必须单独挡住回收站里的环境
    if (isProfileDeleted(profile)) {
      throw new Error(`Profile is in recycle bin: ${idOrName}`);
    }

    const extendedProfile: ExtendedStoredProfile = profile;
    const running = this.runningLaunches.get(extendedProfile.id);
    if (this.runningProfiles.has(extendedProfile.id) && running) {
      return running;
    }

    const launching = this.launchingProfiles.get(extendedProfile.id);
    if (launching) {
      return launching;
    }

    const task = this.doLaunchProfile(extendedProfile).finally(() => {
      this.launchingProfiles.delete(extendedProfile.id);
    });
    this.launchingProfiles.set(extendedProfile.id, task);
    return task;
  }

  /** 执行真实启动流程；外层负责同一 profile 的运行态和并发去重。 */
  private async doLaunchProfile(extendedProfile: ExtendedStoredProfile): Promise<LaunchResult> {
    const kernel = await this.kernels.resolveKernel(extendedProfile.browserKernel);
    if (kernel.engine === 'firefox') {
      return this.launchFirefoxProfile(extendedProfile, kernel.executablePath);
    }

    const extensions = await this.getLaunchExtensionPaths(extendedProfile, kernel.engine);
    const session: BrowserLaunchResult = await launchChrome({
      profile: extendedProfile,
      userDataDir: getChromiumProfileDataPath(extendedProfile.id, extendedProfile.chromiumDataDir),
      chromePath: kernel.executablePath,
      extensions: [...extensions],
      headless: false
    });

    const profileId = session.profileId;
    await injectChromiumFingerprintPatch(session.port, extendedProfile);
    const result: LaunchResult = {
      profileId,
      port: session.port,
      debugPort: session.port,
      debugUrl: `http://127.0.0.1:${session.port}`,
      wsEndpoint: session.wsEndpoint
    };
    this.runningProfiles.add(profileId);
    this.runningLaunches.set(profileId, result);
    this.runningChromiumLaunches.set(profileId, session);
    this.chromiumMonitor.start(profileId, session.port, (closedProfileId) => this.markBrowserClosed(closedProfileId));
    this.notifyChanged();
    return result;
  }

  /** 返回窗口同步页需要的运行窗口和 CDP 调试信息。 */
  public async listWindowSyncProfiles(): Promise<readonly WindowSyncProfile[]> {
    const profiles = await this.profiles.list();
    // 这条遍历独立于 listProfiles，不在这里过滤回收站环境就会漏到窗口同步页
    return profiles
      .filter((profile) => !isProfileDeleted(profile))
      .map((profile) => toWindowSyncProfile(this.toSummary(profile), this.runningLaunches.get(profile.id)));
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
    const launching = this.launchingProfiles.get(profileId);
    if (launching) {
      await launching.catch(() => undefined);
    }

    this.chromiumMonitor.stop(profileId);
    if (this.firefox.isRunning(profileId)) {
      await this.firefox.close(profileId);
    } else if (this.runningChromiumLaunches.has(profileId)) {
      await this.runningChromiumLaunches.get(profileId)?.close();
    } else {
      await this.profiles.close(profileId);
    }
    this.runningProfiles.delete(profileId);
    this.runningLaunches.delete(profileId);
    this.runningChromiumLaunches.delete(profileId);
    this.notifyChanged();
  }

  /** 删除 profile：只移入回收站并关闭运行实例，磁盘数据一律保留，等彻底删除再清。 */
  public async deleteProfile(profileId: string): Promise<void> {
    if (this.runningProfiles.has(profileId)) {
      await this.closeProfile(profileId);
    }

    await markProfileDeleted(this.profiles, profileId, Date.now());
    this.notifyChanged();
  }

  /** 从回收站恢复：清掉标记即可，数据从未被动过。整批只广播一次，避免逐条刷新拖慢界面。 */
  public async restoreProfiles(profileIds: readonly string[]): Promise<void> {
    for (const profileId of profileIds) {
      await markProfileDeleted(this.profiles, profileId, undefined);
    }

    this.notifyChanged();
  }

  /** 彻底删除：先清空浏览器数据，再让核心库删掉 config.json，失败时环境仍留在回收站可重试。 */
  public async purgeProfiles(profileIds: readonly string[]): Promise<void> {
    for (const profileId of profileIds) {
      if (this.runningProfiles.has(profileId)) {
        await this.closeProfile(profileId);
      }

      await purgeProfileBrowserData(profileId);
      await this.profiles.delete(profileId);
    }

    this.notifyChanged();
  }

  /** 扫描无主的浏览器数据目录，只统计不删除。 */
  public async scanOrphanData(): Promise<OrphanDataReport> {
    return scanOrphanProfileData(await listAllProfileIds(this.profiles));
  }

  /** 回收无主的浏览器数据目录。 */
  public async purgeOrphanData(): Promise<OrphanDataReport> {
    return purgeOrphanProfileData(await listAllProfileIds(this.profiles));
  }


  /** 删除扩展后清理所有 profile 中残留的禁用扩展 id。 */
  public async removeDisabledExtensionId(extensionId: string): Promise<void> {
    await removeDisabledExtensionIdFromProfiles(this.profiles, extensionId);
    this.notifyChanged();
  }

  /** 订阅浏览器运行态变化，供 Electron 主进程转发给 renderer。 */
  public onChanged(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** 用户从浏览器窗口直接关闭时，清理本进程记录的运行状态。 */
  private markBrowserClosed(profileId: string): void {
    this.chromiumMonitor.stop(profileId);
    this.runningProfiles.delete(profileId);
    this.runningLaunches.delete(profileId);
    this.runningChromiumLaunches.delete(profileId);
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
    this.runningLaunches.set(session.profileId, { profileId: session.profileId });
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

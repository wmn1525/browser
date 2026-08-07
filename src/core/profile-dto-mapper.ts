import type { ProfileConfig, ProxyConfig, StoredProfile } from '@aitofy/browser-profiles';

import type {
  FingerprintDraft,
  FingerprintHookMode,
  FingerprintNoiseMode,
  FingerprintWebRtcMode,
  ProfileDetail,
  ProfileDraft,
  ProfileSummary,
  ProxyDraft
} from '../shared/types';

/** 扩展核心库 profile 配置，保存管理壳额外字段。 */
export interface ExtendedProfileConfig extends ProfileConfig {
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
  readonly disabledGlobalExtensionIds?: readonly string[];
  readonly chromiumDataDir?: string;
  /**
   * 回收站标记：有值表示环境已被软删除。
   * 和 chromiumDataDir 一样属于引擎内部字段，绝不能出现在 normalizeProfileDraft 的返回体里——
   * 那个字面量列出的 key 会在 update 浅合并时把原值覆盖成 undefined，等于每次编辑都把标记抹掉。
   */
  readonly deletedAt?: number;
}

/** 扩展核心库存储模型，读取管理壳额外字段。 */
export interface ExtendedStoredProfile extends StoredProfile {
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
  readonly disabledGlobalExtensionIds?: readonly string[];
  readonly chromiumDataDir?: string;
  /**
   * 回收站标记：有值表示环境已被软删除。
   * 和 chromiumDataDir 一样属于引擎内部字段，绝不能出现在 normalizeProfileDraft 的返回体里——
   * 那个字面量列出的 key 会在 update 浅合并时把原值覆盖成 undefined，等于每次编辑都把标记抹掉。
   */
  readonly deletedAt?: number;
}

/** 将管理壳 DTO 转为核心库需要的可持久化配置。 */
export function normalizeProfileDraft(draft: ProfileDraft): ExtendedProfileConfig {
  return {
    id: cleanText(draft.id),
    name: draft.name.trim(),
    groupId: normalizeGroupId(draft.groupId),
    browserKernel: cleanText(draft.browserKernel),
    os: cleanText(draft.os),
    osVersion: cleanText(draft.osVersion),
    userAgent: cleanText(draft.userAgent),
    cookiesText: cleanText(draft.cookiesText),
    searchEngine: cleanText(draft.searchEngine),
    accountPlatform: cleanText(draft.accountPlatform),
    accountName: cleanText(draft.accountName),
    loadImages: draft.loadImages,
    loadVideos: draft.loadVideos,
    proxy: normalizeProxy(draft.proxy),
    timezone: cleanText(draft.timezone),
    fingerprint: normalizeFingerprint(draft.fingerprint, draft.userAgent),
    disabledGlobalExtensionIds: normalizeIds(draft.disabledGlobalExtensionIds),
    startUrls: draft.startUrls.map((url) => url.trim()).filter(Boolean),
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean)
  };
}

/** 把核心库 profile 转成管理壳稳定展示模型。 */
export function toProfileSummary(profile: StoredProfile, isRunning: boolean): ProfileSummary {
  const extendedProfile: ExtendedStoredProfile = profile;
  return {
    id: profile.id,
    name: profile.name,
    groupId: normalizeGroupId(profile.groupId),
    browserKernel: extendedProfile.browserKernel,
    proxyLabel: getProxyLabel(profile.proxy),
    timezoneLabel: profile.timezone ?? 'System',
    tags: profile.tags ?? [],
    isRunning,
    lastLaunchedAt: profile.lastLaunchedAt,
    deletedAt: extendedProfile.deletedAt
  };
}

/** 把核心库 profile 转成编辑弹窗可用详情。 */
export function toProfileDetail(profile: StoredProfile, isRunning: boolean): ProfileDetail {
  const extendedProfile: ExtendedStoredProfile = profile;
  return {
    ...toProfileSummary(profile, isRunning),
    groupId: normalizeGroupId(profile.groupId),
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
    proxy: toProxyDraft(profile.proxy),
    timezone: profile.timezone,
    fingerprint: profile.fingerprint,
    disabledGlobalExtensionIds: normalizeIds(extendedProfile.disabledGlobalExtensionIds),
    startUrls: profile.startUrls ?? []
  };
}

/** 清理代理字段，缺少 host 或 port 时视为直连。 */
function normalizeProxy(proxy: ProxyDraft | undefined): ProxyDraft | undefined {
  if (!proxy || proxy.host.trim().length === 0 || proxy.port <= 0) {
    return undefined;
  }

  return {
    type: proxy.type,
    host: proxy.host.trim(),
    port: proxy.port,
    username: cleanText(proxy.username),
    password: cleanText(proxy.password)
  };
}

/** 将表单指纹字段整理成业务字段与核心库运行时字段共用的结构。 */
function normalizeFingerprint(fingerprint: FingerprintDraft | undefined, userAgent: string | undefined): FingerprintDraft | undefined {
  if (!fingerprint) {
    return undefined;
  }

  const screen = fingerprint.screenWidth && fingerprint.screenHeight
    ? { width: fingerprint.screenWidth, height: fingerprint.screenHeight }
    : undefined;
  const webgl = fingerprint.webglVendor || fingerprint.webglRenderer
    ? { vendor: cleanText(fingerprint.webglVendor), renderer: cleanText(fingerprint.webglRenderer) }
    : undefined;

  return {
    userAgent: cleanText(userAgent),
    platform: cleanText(fingerprint.platform),
    language: cleanText(fingerprint.language),
    languages: cleanText(fingerprint.languages),
    hardwareConcurrency: fingerprint.hardwareConcurrency,
    deviceMemory: fingerprint.deviceMemory,
    screen,
    screenWidth: fingerprint.screenWidth,
    screenHeight: fingerprint.screenHeight,
    screenColorDepth: fingerprint.screenColorDepth,
    screenPixelDepth: fingerprint.screenPixelDepth,
    webgl,
    webglVendor: cleanText(fingerprint.webglVendor),
    webglRenderer: cleanText(fingerprint.webglRenderer),
    hstsMode: cleanHookMode(fingerprint.hstsMode),
    hstsValue: cleanText(fingerprint.hstsValue),
    webglMode: cleanHookMode(fingerprint.webglMode),
    webglValue: cleanText(fingerprint.webglValue),
    canvasMode: cleanHookMode(fingerprint.canvasMode),
    canvasValue: cleanText(fingerprint.canvasValue),
    canvas: toNoiseMode(fingerprint.canvasMode),
    pluginsMode: cleanHookMode(fingerprint.pluginsMode),
    pluginsValue: cleanText(fingerprint.pluginsValue),
    rectsMode: cleanHookMode(fingerprint.rectsMode),
    rectsValue: cleanText(fingerprint.rectsValue),
    fontsMode: cleanHookMode(fingerprint.fontsMode),
    fontsValue: cleanText(fingerprint.fontsValue),
    batteryState: cleanText(fingerprint.batteryState),
    bluetoothState: cleanText(fingerprint.bluetoothState),
    networkState: cleanText(fingerprint.networkState),
    clientHintsMode: cleanHookMode(fingerprint.clientHintsMode),
    clientHintsPlatform: cleanText(fingerprint.clientHintsPlatform),
    clientHintsPlatformVersion: cleanText(fingerprint.clientHintsPlatformVersion),
    clientHintsArchitecture: cleanText(fingerprint.clientHintsArchitecture),
    clientHintsMobile: fingerprint.clientHintsMobile,
    clientHintsBrandVersion: cleanText(fingerprint.clientHintsBrandVersion),
    audioMode: cleanHookMode(fingerprint.audioMode),
    audioValue: cleanText(fingerprint.audioValue),
    audio: toNoiseMode(fingerprint.audioMode),
    webgpuMode: cleanHookMode(fingerprint.webgpuMode),
    webgpuValue: cleanText(fingerprint.webgpuValue),
    webrtcMode: cleanHookMode(fingerprint.webrtcMode),
    webrtc: toWebRtcMode(fingerprint.webrtcMode),
    serviceWorkerMode: cleanHookMode(fingerprint.serviceWorkerMode)
  };
}

/** 只接受表单声明过的模式值，避免把任意字符串写入 profile。 */
function cleanHookMode(value: FingerprintHookMode | string | undefined): FingerprintHookMode | undefined {
  switch (value) {
    case 'default':
    case 'value':
    case 'page':
    case 'browser':
    case 'domain':
    case 'global':
    case 'enabled':
    case 'disabled':
      return value;
    default:
      return undefined;
  }
}

/** 随机和自定义模式都表示需要扰动对应检测面。 */
function toNoiseMode(value: FingerprintHookMode | string | undefined): FingerprintNoiseMode | undefined {
  const mode = cleanHookMode(value);
  if (!mode || mode === 'default' || mode === 'disabled') {
    return undefined;
  }

  return 'noise';
}

/** WebRTC 的禁用模式映射到核心库支持的运行时值。 */
function toWebRtcMode(value: FingerprintHookMode | string | undefined): FingerprintWebRtcMode | undefined {
  const mode = cleanHookMode(value);
  if (mode === 'disabled') {
    return 'disable';
  }
  if (mode === 'enabled') {
    return 'fake';
  }

  return undefined;
}

/** 统一把空字符串折叠为 undefined，避免写入无意义字段。 */
function cleanText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

/** 清理扩展 id 列表，避免把空字符串保存进 profile 配置。 */
function normalizeIds(values: readonly string[] | undefined): readonly string[] {
  return Array.from(new Set(values?.map((value) => value.trim()).filter(Boolean) ?? []));
}

/** 历史表单曾把“未分组”写成 groupId；读取和保存时统一回到空值语义。 */
function normalizeGroupId(value: string | undefined): string | undefined {
  const normalized = cleanText(value);
  return normalized === '未分组' ? undefined : normalized;
}

/** 生成简短代理标签，避免 UI 泄露代理密码。 */
function getProxyLabel(proxy: ProxyConfig | null | undefined): string {
  if (!proxy) {
    return 'Direct';
  }

  return `${proxy.type}://${proxy.host}:${proxy.port}`;
}

/** 将核心库代理配置转成 UI 编辑模型。 */
export function toProxyDraft(proxy: ProxyConfig | null | undefined): ProxyDraft | undefined {
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

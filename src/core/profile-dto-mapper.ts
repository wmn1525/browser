import type { ProfileConfig, ProxyConfig, StoredProfile } from '@aitofy/browser-profiles';

import type {
  FingerprintDraft,
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
}

/** 将管理壳 DTO 转为核心库需要的可持久化配置。 */
export function normalizeProfileDraft(draft: ProfileDraft): ExtendedProfileConfig {
  return {
    id: cleanText(draft.id),
    name: draft.name.trim(),
    groupId: cleanText(draft.groupId),
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
    fingerprint: normalizeFingerprint(draft.fingerprint),
    startUrls: draft.startUrls.map((url) => url.trim()).filter(Boolean),
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean)
  };
}

/** 把核心库 profile 转成管理壳稳定展示模型。 */
export function toProfileSummary(profile: StoredProfile, isRunning: boolean): ProfileSummary {
  return {
    id: profile.id,
    name: profile.name,
    groupId: profile.groupId,
    proxyLabel: getProxyLabel(profile.proxy),
    timezoneLabel: profile.timezone ?? 'System',
    tags: profile.tags ?? [],
    isRunning,
    lastLaunchedAt: profile.lastLaunchedAt
  };
}

/** 把核心库 profile 转成编辑弹窗可用详情。 */
export function toProfileDetail(profile: StoredProfile, isRunning: boolean): ProfileDetail {
  const extendedProfile: ExtendedStoredProfile = profile;
  return {
    ...toProfileSummary(profile, isRunning),
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
    proxy: toProxyDraft(profile.proxy),
    timezone: profile.timezone,
    fingerprint: profile.fingerprint,
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

function normalizeFingerprint(fingerprint: FingerprintDraft | undefined): FingerprintDraft | undefined {
  if (!fingerprint) {
    return undefined;
  }

  return {
    platform: cleanText(fingerprint.platform),
    language: cleanText(fingerprint.language),
    hardwareConcurrency: fingerprint.hardwareConcurrency,
    deviceMemory: fingerprint.deviceMemory,
    screenWidth: fingerprint.screenWidth,
    screenHeight: fingerprint.screenHeight,
    webglVendor: cleanText(fingerprint.webglVendor),
    webglRenderer: cleanText(fingerprint.webglRenderer),
    hstsMode: cleanText(fingerprint.hstsMode),
    hstsValue: cleanText(fingerprint.hstsValue),
    webglMode: cleanText(fingerprint.webglMode),
    webglValue: cleanText(fingerprint.webglValue),
    canvasMode: cleanText(fingerprint.canvasMode),
    canvasValue: cleanText(fingerprint.canvasValue),
    pluginsMode: cleanText(fingerprint.pluginsMode),
    pluginsValue: cleanText(fingerprint.pluginsValue),
    rectsMode: cleanText(fingerprint.rectsMode),
    rectsValue: cleanText(fingerprint.rectsValue),
    fontsMode: cleanText(fingerprint.fontsMode),
    fontsValue: cleanText(fingerprint.fontsValue),
    batteryState: cleanText(fingerprint.batteryState),
    bluetoothState: cleanText(fingerprint.bluetoothState),
    networkState: cleanText(fingerprint.networkState)
  };
}

/** 统一把空字符串折叠为 undefined，避免写入无意义字段。 */
function cleanText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
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
